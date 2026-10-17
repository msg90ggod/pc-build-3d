import * as THREE from 'three';
import { loadModelCopy } from './ModelCache.js';
import { buildFittedModel, fitOptionsFor } from './ModelFit.js';
import { realDimsFor } from '../data/hardwareDims.js';
import { loadCaseModel, restoreCaseMaterials } from './CaseModel.js';
import { CASE, CASE_REF, CASE_ZONES, CASE_BOUNDS, RAM_SLOT_FACE_X, mountQuaternion } from './caseLayout.js';

const ZONE_TINT = {
  active: 0x38bdf8,
  locked: 0x22c55e,
  hint: 0xfbbf24
};

const GLASS_X = CASE_REF.xGlassOuter - CASE.glass / 2;
const GLASS_SLIDE = 0.26;
const ZOOM_MIN = 0.35;
const ZOOM_MAX = 3.2;

/**
 * Interactive "Build Zone": a 50% x-ray case with snap zones, a ghost part that
 * tracks the cursor, fastener targets and per-step camera framing.
 *
  * The eye can be orbit around the chassis on two axes, and the chassis is
  * never turned itself. Everything the builder cares about lives under
  * `caseRoot` - the zone markers, the carried ghost, the fasteners and every
  * part already installed - so there is no risk of a placed part losing track
  * of its seat when the view changes.
  */
export class BuildScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.disposed = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    this.camera.position.set(0, 0, 1.2);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;


    this.raycaster = new THREE.Raycaster();
    this.pointerNdc = new THREE.Vector2();
    this.pointerInside = false;
    this.pointerPlane = new THREE.Plane();

    this.caseGroup = null;
    this.sideGlass = null;
    this.glassOn = true;
    this.glassT = 1;
    this.glassGoal = 1;

    this.zoneMeshes = new Map();
    this.zoneList = [];
    this.screwGroups = new Map();
    this.placedParts = new Map();
    this.ghost = null;
    this.activeZone = null;
    this.lockedZone = null;
    this.powered = false;
    this._lastFocusZone = null;
    this.zoom = 1;
    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    // Orbit view: the camera circles the chassis instead of the chassis turning.
    // yaw/pitch are measured from the authored glass-side-on view so that
    // (0, 0) reproduces exactly the framing this builder has always had.
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this.orbiting = false;   // right-button held: the ghost stays hidden
    this._orbitLast = { x: 0, y: 0 };
    this._orbitDist = 1;


    // caseRoot owns the ONE transform that turns the chassis so its glass side
    // faces the viewer. Everything placed inside the case is authored in plain
    // case-local coordinates and parented here, so a zone anchor in caseLayout.js
    // always means the same point in the room, the case mesh and the part.
    this.caseRoot = new THREE.Group();
    this.caseRoot.rotation.y = -Math.PI / 2;
    this.caseRoot.position.set(0, -CASE.feet, 0);
    this.pivot.add(this.caseRoot);

    this.cameraGoal = new THREE.Vector3();

    this.lookGoal = new THREE.Vector3();
    this.cameraMoving = false;

    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._half = new THREE.Vector3();
    this._centre = new THREE.Vector3();
    this._hit = new THREE.Vector3();
    this._screwAxis = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0) };

    this.setupLights();
    this.buildCase();
  }

  // ------------------------------------------------------------- lighting
  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xf1f5f9, 0.75));

    const key = new THREE.DirectionalLight(0xffffff, 1.9);
    key.position.set(1.4, 2.4, 2.6);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x7dd3fc, 1.0);
    fill.position.set(-2.4, 0.6, 1.2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xa855f7, 0.9);
    rim.position.set(0.4, 1.6, -2.4);
    this.scene.add(rim);

    // Glows once the machine is powered on
    this.powerLight = new THREE.PointLight(0x38bdf8, 0, 0.6);
    this.powerLight.position.set(...CASE_ZONES.power.anchor);
    this.caseRoot.add(this.powerLight);
  }

  // ----------------------------------------------------------------- case
  /**
   * The chassis: a real Corsair 4000D, mirrored so its motherboard tray lands on
   * the -X side the layout is authored for, and see-through so the builder can
   * work on the parts inside it.
   *
   * The file is fetched in the background, so an empty holder stands in for it
   * from the first frame: the zone markers, the ghost and the fasteners all have
   * somewhere to live while it is on the wire.
   */
  buildCase() {
    this.caseGroup = new THREE.Group();
    this.caseRoot.add(this.caseGroup);

    this.buildZoneMarkers();
    this.setGlass(true, true);
    this.focusCase();
    this.snapCamera();

    loadCaseModel({ xray: true }).then(built => {
      if (!built || this.disposed) return;
      built.group.traverse(child => {
        if (!child.isMesh) return;
        // a build view is a diagram, not a scene: nothing in it casts a shadow
        child.castShadow = false;
        child.receiveShadow = false;
      });
      this.caseGroup.add(built.group);
      this.pivot.updateMatrixWorld(true);
      this.sideGlass = built.sideGlass;
      // the panel slides from wherever the model carries it, not from an
      // authored number: this is the real glass, in the real place
      this.glassHomeX = built.sideGlass ? built.sideGlass.position.x : 0;
      this.applyGlass();
    });
  }

  /**
   /**
   * Snap-target boxes, one per zone.
   *
   * These are the hardware placeholders - the "grid spots" the builder aims at -
   * and they are deliberately NOT drawn: as translucent white slabs they sat
   * over the parts they were introducing. They stay in the graph because
   * `isOverZone` projects their centre and extent to work out the snap, so
   * placing a part behaves exactly as before, there is simply nothing white
   * floating in the chassis any more. The step hint in the HUD names the zone.
   */
  buildZoneMarkers() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    Object.entries(CASE_ZONES).forEach(([id, zone]) => {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: ZONE_TINT.hint,
        transparent: true,
        opacity: 0,
        depthWrite: false
      }));
      mesh.position.set(...zone.anchor);
      mesh.scale.set(
        Math.max(zone.size[0], 0.022),
        Math.max(zone.size[1], 0.022),
        Math.max(zone.size[2], 0.022)
      );
      mesh.visible = false;
      mesh.renderOrder = 5;
      mesh.userData.zoneId = id;
      mesh.userData.placeholder = true;
      this.caseRoot.add(mesh);
      this.zoneMeshes.set(id, mesh);
      this.zoneList.push(mesh);
    });
  }

  // ---------------------------------------------------------- glass panel
  setGlass(on, instant = false) {
    this.glassOn = on;
    this.glassGoal = on ? 1 : 0;
    if (instant) {
      this.glassT = this.glassGoal;
      this.applyGlass();
    }
  }

  applyGlass() {
    if (!this.sideGlass) return;
    this.sideGlass.visible = this.glassT > 0.02;
    const home = this.glassHomeX ?? GLASS_X;
    this.sideGlass.position.x = home + (1 - this.glassT) * GLASS_SLIDE;
  }

  // ----------------------------------------------------------- view orbiting
  /** The camera circles the chassis rather than the chassis turning. */
  beginOrbit(x, y) {
    this.orbiting = true;
    this._orbitLast.x = x;
    this._orbitLast.y = y;
    this._orbitDist = this.camera.position.distanceTo(this.lookGoal);
    // cancel any zone glide so it does not fight the drag
    this.cameraMoving = false;
  }

  orbitBy(dx, dy) {
    if (!this.orbiting) return;
    const step = 0.0075;
    this.orbitYaw -= dx * step;
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch - dy * step, -1.2, 1.2);
    const dist = this._orbitDist;
    const cp = Math.cos(this.orbitPitch);
    this.camera.position.set(
      this.lookGoal.x + dist * Math.sin(this.orbitYaw) * cp,
      this.lookGoal.y + dist * Math.sin(this.orbitPitch),
      this.lookGoal.z + dist * Math.cos(this.orbitYaw) * cp
    );
    this.camera.lookAt(this.lookGoal);
  }

  endOrbit() {
    this.orbiting = false;
  }

  get isOrbiting() {
    return this.orbiting;
  }

  /** True once the eye has been dragged off the authored front view. */
  get isOrbitingOff() {
    return Math.abs(this.orbitYaw) > 0.03 || Math.abs(this.orbitPitch) > 0.03;
  }

  /** Back to the authored glass-side-on view. */
  resetView() {
    this.orbitYaw = 0;
    this.orbitPitch = 0;
    this._refocus();
  }

  // --------------------------------------------------------- camera moves
  focusCase() {
    this._lastFocusZone = null;
    this.frameBox(
      new THREE.Box3(new THREE.Vector3(...CASE_BOUNDS.min), new THREE.Vector3(...CASE_BOUNDS.max)),
      1.18
    );
  }

  /** Close in on one zone so a 4cm CPU is actually workable. */
  focusZone(zoneId) {
    const zone = CASE_ZONES[zoneId];
    if (!zone) return this.focusCase();
    this._lastFocusZone = zoneId;

    const pad = 0.05;
    const half = new THREE.Vector3(
      Math.max(zone.size[0], 0.03) / 2 + pad,
      Math.max(zone.size[1], 0.03) / 2 + pad,
      Math.max(zone.size[2], 0.03) / 2 + pad
    );
    const centre = new THREE.Vector3(...zone.anchor);
    this.frameBox(
      new THREE.Box3(centre.clone().sub(half), centre.clone().add(half)),
      1.35
    );
  }

  setFocusZone(zoneId) {
    if (zoneId) this.focusZone(zoneId);
    else this.focusCase();
  }

  /**
   * Fit a case-local box to the viewport, then glide the camera there.
   * The chassis is turned -90 degrees about Y to face the glass at you, so a
   * case-local box has to be carried into pivot space before it means anything
   * to the camera - otherwise the frame is fitted to the wrong axis.
   */
  frameBox(box, margin) {
    this.caseRoot.updateMatrixWorld(true);
    const world = new THREE.Box3();
    for (let i = 0; i < 8; i++) {
      world.expandByPoint(this._v1.set(
        i & 1 ? box.max.x : box.min.x,
        i & 2 ? box.max.y : box.min.y,
        i & 4 ? box.max.z : box.min.z
      ).applyMatrix4(this.caseRoot.matrixWorld));
    }

    const size = world.getSize(new THREE.Vector3());
    const centre = world.getCenter(new THREE.Vector3());
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const tanH = tanV * Math.max(this.camera.aspect, 0.2);
    const dist =
      (Math.max(size.y / 2 / tanV, size.x / 2 / tanH) * margin + size.z / 2) / this.zoom;

    this.lookGoal.copy(centre);
    // Frame from the current view angle: turning the eye to the side of the
    // chassis must survive a zoom or a step change, not snap back to the front.
    const cp = Math.cos(this.orbitPitch);
    this.cameraGoal.set(
      centre.x + dist * Math.sin(this.orbitYaw) * cp,
      centre.y + dist * Math.sin(this.orbitPitch),
      centre.z + dist * Math.cos(this.orbitYaw) * cp
    );
    this.cameraMoving = true;
  }

  /**
 * Scroll wheel dollies the camera in and out. Turning the chassis is on the right
 * mouse button, so this stays the only zoom gesture in the Build Zone.
 */

  zoomBy(notches) {
    const next = THREE.MathUtils.clamp(
      this.zoom * Math.pow(1.15, -notches),
      ZOOM_MIN,
      ZOOM_MAX
    );
    if (Math.abs(next - this.zoom) < 1e-4) return this.zoom;
    this.zoom = next;
    this._refocus();
    return this.zoom;
  }

  resetZoom() {
    this.zoom = 1;
    this._refocus();
  }

  _refocus() {
    if (this._lastFocusZone) this.focusZone(this._lastFocusZone);
    else this.focusCase();
    this.snapCamera();
  }

  snapCamera() {
    this.camera.position.copy(this.cameraGoal);
    this.camera.lookAt(this.lookGoal);
    this.cameraMoving = false;
  }

  // -------------------------------------------------------------- pointer
  setPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    this.pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.pointerInside =
      clientX >= rect.left && clientX <= rect.right &&
      clientY >= rect.top && clientY <= rect.bottom;
    return this.pointerInside;
  }

  clearPointer() {
    this.pointerInside = false;
  }

  /** Cursor position in case-local space, on the plane the camera looks at. */
  pointerWorld() {
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const normal = this._v2.set(0, 0, 1).applyQuaternion(this.camera.quaternion).negate();
    this.pointerPlane.setFromNormalAndCoplanarPoint(normal, this.lookGoal);
    if (!this.raycaster.ray.intersectPlane(this.pointerPlane, this._hit)) return null;
    this.caseRoot.updateMatrixWorld(true);
    return this.caseRoot.worldToLocal(this._hit.clone());
  }

  /**
   * Screen-space containment test for a zone. Resolution independent and far
   * more forgiving than a 3D distance test, which matters when the target is a
   * 40mm CPU socket filling a fraction of the canvas.
   */
  isOverZone(zoneId, extraPx = 24) {
    const zone = CASE_ZONES[zoneId];
    const marker = this.zoneMeshes.get(zoneId);
    if (!zone || !marker || !this.pointerInside) return false;

    this.pivot.updateMatrixWorld(true);
    marker.updateMatrixWorld(true);

    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;

    const toPx = v => {
      const ndc = v.clone().project(this.camera);
      return [((ndc.x + 1) / 2) * rect.width, ((-ndc.y + 1) / 2) * rect.height, ndc.z];
    };

    const centre = new THREE.Vector3();
    marker.getWorldPosition(centre);
    const [cx, cy, cz] = toPx(centre);
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || cz > 1) return false;

    const cursorX = ((this.pointerNdc.x + 1) / 2) * rect.width;
    const cursorY = ((-this.pointerNdc.y + 1) / 2) * rect.height;

    const half = new THREE.Vector3(
      Math.max(zone.size[0], 0.03) / 2,
      Math.max(zone.size[1], 0.03) / 2,
      Math.max(zone.size[2], 0.03) / 2
    );
    let radX = 0;
    let radY = 0;
    for (let i = 0; i < 8; i++) {
      const [ex, ey] = toPx(this._v1.set(
        centre.x + (i & 1 ? half.x : -half.x),
        centre.y + (i & 2 ? half.y : -half.y),
        centre.z + (i & 4 ? half.z : -half.z)
      ));
      radX = Math.max(radX, Math.abs(ex - cx));
      radY = Math.max(radY, Math.abs(ey - cy));
    }
    radX = Math.max(radX, 12);
    radY = Math.max(radY, 12);

    return (
      Math.abs(cursorX - cx) <= radX + extraPx &&
      Math.abs(cursorY - cy) <= radY + extraPx
    );
  }

  // ----------------------------------------------------------------- ghost
  /**
   * The interior of the chassis in case-local space. The ghost is clamped into
   * this box (minus the part's own half-extent) so a carried part can never drift
   * out through the panels while the cursor roams the canvas.
   */
  get caseInterior() {
    if (!this._interior) {
      const pad = CASE.sheet + 0.004;
      this._interior = new THREE.Box3(
        new THREE.Vector3(-CASE.width / 2 + pad, pad, -CASE.depth / 2 + pad),
        new THREE.Vector3(CASE.width / 2 - pad, CASE.feet + CASE.height - pad, CASE.depth / 2 - pad)
      );
    }
    return this._interior;
  }

  setGhostItem(item) {
    this.clearGhost();
    if (!item) return Promise.resolve(false);
    return this._loadFitted(item).then(fitted => {
      if (!fitted || this.disposed) return false;
      const holder = new THREE.Group();
      holder.add(fitted);
      holder.visible = false;
      this.caseRoot.add(holder);

      // Bounds and the centre offset are measured per zone in _applyGhostMount,
      // once the mount turn is known.
      this.ghost = {
        item,
        group: holder,
        zoneId: null,
        mountZone: null,
        bounds: null,
        centreOffset: new THREE.Vector3(),
        half: new THREE.Vector3()
      };
      return true;
    });
  }

  clearGhost() {
    if (this.ghost) {
      this.caseRoot.remove(this.ghost.group);
      this.ghost = null;
    }
    if (this.activeZone) this.setZoneState(this.activeZone, 'active');
  }

  get ghostOverTarget() {
    return !!(this.ghost && this.ghost.zoneId);
  }

  /**
   * Where the next part for `zoneId` goes.
   *
   * Most zones hold one part, so this is just the zone anchor. A zone with
   * several seats - the DIMM bank is four slots wide - lists them in `slots`
   * and each part seated takes the next free one, which is how two sticks end
   * up in A2 and B2 instead of stacked in the same place.
   *
   * The bank's slot pitch is real, but each stick's depth out of the board is
   * its own: slim sticks (31/34 mm, no heatspreader) seated on the 45 mm
   * authored centre floated in front of the slot body. The board-facing face is
   * one shared plane (RAM_SLOT_FACE_X), so the seat recentres on the stick the
   * caller is actually carrying.
   */
  zoneAnchorFor(zoneId, item) {
    const zone = CASE_ZONES[zoneId];
    if (!zone) return null;
    let anchor;
    if (zone.slots && zone.slots.length) {
      let used = 0;
      for (const entry of this.placedParts.values()) {
        if (entry.zoneId === zoneId) used++;
      }
      anchor = zone.slots[Math.min(used, zone.slots.length - 1)];
    } else {
      anchor = zone.anchor;
    }
    if (zoneId === 'ram' && item) {
      const dims = realDimsFor(item);
      if (dims) anchor = [RAM_SLOT_FACE_X + dims.width / 2, anchor[1], anchor[2]];
    }
    return anchor;
  }

  /**
   * Puts the ghost in its mount orientation for `zoneId` and measures where the
   * part's centre and extents land in case-local space. Cached per zone so a
   * pointer move never walks the model's bounding box.
   */
  _applyGhostMount(zoneId, zone) {
    const ghost = this.ghost;
    if (ghost.mountZone === zoneId) return;

    const mount = mountQuaternion(zone);
    if (mount) ghost.group.quaternion.copy(mount);
    ghost.group.position.set(0, 0, 0);
    ghost.group.updateMatrixWorld(true);

    // A bounding box comes out in world space, and the chassis is turned -90
    // degrees, so the corners are mapped back into the holder's parent frame -
    // the same frame the zone anchor and the clamp live in.
    const world = new THREE.Box3().setFromObject(ghost.group);
    const toCase = new THREE.Matrix4().copy(ghost.group.parent.matrixWorld).invert();
    const box = new THREE.Box3();
    for (let i = 0; i < 8; i++) {
      box.expandByPoint(this._v1.set(
        i & 1 ? world.max.x : world.min.x,
        i & 2 ? world.max.y : world.min.y,
        i & 4 ? world.max.z : world.min.z
      ).applyMatrix4(toCase));
    }
    ghost.bounds = box;
    ghost.centreOffset.copy(box.getCenter(this._centre));
    ghost.half.copy(box.getSize(this._half)).multiplyScalar(0.5);
    ghost.mountZone = zoneId;
  }

  /**
   * Ghost tracks the cursor, magnetised onto the target zone when close.
   *
   * `armed` is false for steps the cursor is not carrying a part through -
   * tightening fasteners, spreading paste, pressing a part down or flipping the
   * power switch. Without it the part would swim around the canvas during
   * those clicks, which is what made it look like it had escaped the case.
   */
  updateGhost(zoneId, armed = true) {
    if (!this.ghost) return;
    // While the view is being orbited the carried part is put away: it would
    // otherwise slide across the interior chasing the cursor mid-drag. Enforced
    // here as well as in the UI so the scene stays consistent on its own.
    if (!armed || !zoneId || !this.pointerInside || this.orbiting) {
      this.ghost.group.visible = false;
      this.ghost.zoneId = null;
      return;
    }
    const point = this.pointerWorld();
    if (!point) return;

    const zone = CASE_ZONES[zoneId];
    const snap = this.isOverZone(zoneId);
    this.ghost.group.visible = true;
    // the ghost carries the part, so its seat depth out of the board follows
    // the stick it is holding rather than the bank's authored default
    const anchor = this.zoneAnchorFor(zoneId, this.ghost.item) || zone.anchor;

    // Orient the preview exactly as it will be seated, so the player reads the
    // part the right way up from whatever camera angle they are at. The offset
    // between the part's own origin and its centre is measured once per zone,
    // not per pointer move.
    this._applyGhostMount(zoneId, zone);

    if (snap) {
      this.ghost.group.position.set(...anchor).sub(this.ghost.centreOffset);
      this.ghost.zoneId = zoneId;
      this.setZoneState(zoneId, 'active');
    } else {
      this.ghost.group.position.copy(point);
      // slight pull so the player feels the magnet without it teleporting
      this.ghost.group.position.lerp(this._v1.fromArray(anchor), 0.16);
      this.ghost.zoneId = null;
      this.setZoneState(zoneId, 'hint');
    }

    this.clampGhostInside();
  }

  /**
   * Keeps the whole carried part within the chassis walls.
   *
   * buildFittedModel rests the part on y = 0 and only centres it in x/z, so the
   * part is not symmetric about the holder's origin and a plain half-extent
   * clamp pushes it out through the roof. This uses the real rotated offset of
   * the local bounding box instead.
   */
  clampGhostInside() {
    if (!this.ghost) return;
    const box = this.caseInterior;
    const { centre, half } = this._mountedExtents();
    const p = this.ghost.group.position;

    // A part that cannot fit at any orientation is centred rather than shoved
    // through a wall, which is what a naive clamp would do.
    const axis = (v, lo, hi) => (lo > hi ? (lo + hi) / 2 : THREE.MathUtils.clamp(v, lo, hi));
    p.x = axis(p.x, box.min.x - centre.x + half.x, box.max.x - centre.x - half.x);
    p.y = axis(p.y, box.min.y - centre.y + half.y, box.max.y - centre.y - half.y);
    p.z = axis(p.z, box.min.z - centre.z + half.z, box.max.z - centre.z - half.z);
  }

  /**
   * The part occupies [position + centre - half, position + centre + half].
   *
   * `bounds` is measured with the holder already in its mount orientation, so
   * this is a straight read: no further rotation of the extents is needed.
   */
  _mountedExtents() {
    const g = this.ghost;
    return { centre: g?.centreOffset || this._centre.set(0, 0, 0), half: g?.half || this._half.set(0, 0, 0) };
  }

  /**
   * Centres a mounted part on `anchor`.
   *
   * buildFittedModel bakes an offset into the root's own position (it rests the
   * part on y = 0 and centres it in x/z), and the mount turn rotates that
   * offset, so working it out from the box algebra is easy to get wrong.
   * Measuring the mounted holder is exact instead.
   *
   * The holder must already carry its mount rotation and be at the origin.
   */
  _centreOnAnchor(holder, anchor) {
    holder.position.set(0, 0, 0);
    holder.updateMatrixWorld(true);
    const centre = new THREE.Box3().setFromObject(holder).getCenter(new THREE.Vector3());
    holder.position.set(...anchor).sub(centre);
  }

  /** Half extent of the carried part along the case axes, after its mount turn. */
  _mountedHalfExtent() {
    return this._mountedExtents().half;
  }

  // ----------------------------------------------------------------- zones
  setZoneState(zoneId, state) {
    // Nothing is drawn: these boxes are snap maths, not furniture. The colour is
    // still tracked so the state is inspectable, but `visible` stays false - a
    // white translucent slab over the hardware is exactly what the builder asked
    // to be rid of.
    Object.entries(this.zoneMeshes).forEach(([id, mesh]) => {
      const locked = this.lockedZone === id;
      const isThis = id === zoneId;
      mesh.material.color.setHex(
        locked ? ZONE_TINT.locked : isThis ? ZONE_TINT[state] : 0xffffff
      );
      mesh.visible = false;
    });
  }

  clearZoneStates() {
    this.zoneMeshes.forEach(mesh => {
      mesh.visible = false;
      mesh.material.opacity = 0;
    });
  }

  // --------------------------------------------------------------- screws
  /**
   * Fastener markers around a zone. They always sit on the same face the part is
   * bolted through, so what you see through the glass matches the real part.
   */
  showScrews(zoneId, count) {
    this.hideScrews();
    const zone = CASE_ZONES[zoneId];
    if (!zone || !count) return;

    const face = zone.face || [1, 0, 0];
    const lift = zone.faceLift ?? 0.008;
    const vertical = Math.abs(face[1]) > 0.5;   // screwed in from above
    const rearward = face[2] < -0.5;           // screwed in from the back

    const group = new THREE.Group();
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0x7a5200, emissiveIntensity: 1.3,
      roughness: 0.35, metalness: 0.85
    });
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24, transparent: true, opacity: 0.65, depthWrite: false
    });
    const headGeo = new THREE.CylinderGeometry(0.008, 0.007, 0.005, 14);
    const ringGeo = new THREE.TorusGeometry(0.014, 0.0022, 8, 22);

    const points = (zone.screwPts || this._gridPoints(zone, count)).slice(0, count);
    points.forEach(([a, b]) => {
      const pos = [...zone.anchor];
      if (vertical) {
        // [along the rack, across]
        pos[1] += lift;
        pos[2] += a;
        pos[0] += b;
      } else if (rearward) {
        // [across, up]
        pos[2] -= lift;
        pos[0] += a;
        pos[1] += b;
      } else {
        // [up, along the rack]
        pos[0] += face[0] * lift;
        pos[1] += a;
        pos[2] += b;
      }

      const holder = new THREE.Group();
      const head = new THREE.Mesh(headGeo, headMat);
      const halo = new THREE.Mesh(ringGeo, haloMat);
      if (vertical) {
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.0008;
      } else if (rearward) {
        head.rotation.x = Math.PI / 2;
        halo.position.z = -0.0008;
      } else {
        head.rotation.z = Math.PI / 2;
        halo.rotation.y = Math.PI / 2;
        halo.position.x = 0.0008 * Math.sign(face[0] || 1);
      }
      holder.add(head, halo);
      holder.position.set(...pos);

      holder.userData.screwAxis = vertical ? this._screwAxis.y : this._screwAxis.x;
      group.add(holder);
      this.screwHolders.push(holder);
    });

    this.caseRoot.add(group);
    this.screwGroups.set(zoneId, { group, remaining: Math.min(count, points.length), total: count });
  }

  /** Fallback when a zone has no authored fastener pattern. */
  _gridPoints(zone, count) {
    const pts = [];
    const cols = Math.ceil(Math.sqrt(count));
    for (let i = 0; i < count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const rows = Math.ceil(count / cols);
      pts.push([
        rows === 1 ? 0 : (r / (rows - 1) - 0.5) * zone.size[1] * 0.7,
        cols === 1 ? 0 : (c / (cols - 1) - 0.5) * zone.size[2] * 0.7
      ]);
    }
    return pts;
  }

  hideScrews(zoneId) {
    const keys = zoneId ? [zoneId] : [...this.screwGroups.keys()];
    keys.forEach(key => {
      const entry = this.screwGroups.get(key);
      if (entry) this.caseRoot.remove(entry.group);
      this.screwGroups.delete(key);
    });
    this.screwHolders = [];
  }

  get screwsRemaining() {
    let total = 0;
    this.screwGroups.forEach(e => { total += e.remaining; });
    return total;
  }

  screwsFor(zoneId) {
    const entry = this.screwGroups.get(zoneId);
    return entry ? entry.remaining : 0;
  }

  /**
   * Drive the fastener under the cursor.
   *
   * Each screw is a distinct target: once driven it is flagged and can no longer
   * be hit, so the count goes down by exactly one per click. Previously the
   * nearest screw won regardless of whether it had already been driven, which
   * let one click site empty the whole pattern.
   *
   * @returns 'tightened' | 'miss' | 'none'
   */
  hitScrew(clientX, clientY, zoneId) {
    const entry = this.screwGroups.get(zoneId);
    if (!entry || entry.remaining === 0) return 'none';

    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return 'miss';
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;

    let best = null;
    let bestDist = Infinity;
    entry.group.children.forEach(holder => {
      // already driven: not a target any more
      if (holder.userData.driven) return;
      const world = new THREE.Vector3();
      holder.getWorldPosition(world);
      const ndc = world.project(this.camera);
      if (ndc.z > 1) return;
      const sx = ((ndc.x + 1) / 2) * rect.width;
      const sy = ((-ndc.y + 1) / 2) * rect.height;
      const d = Math.hypot(sx - cx, sy - cy);
      if (d < bestDist) { bestDist = d; best = holder; }
    });
    if (!best) return 'none';

    // The last screw gets a generous radius so finishing never feels fiddly
    const radius = entry.remaining === 1 ? 90 : 36;
    if (bestDist > radius) return 'miss';

    best.userData.driven = true;
    best.userData.driving = 0.0001;
    entry.remaining--;
    if (entry.remaining === 0) this.hideScrews(zoneId);
    return 'tightened';
  }

  // -------------------------------------------------------------- placing
  /**
   * Seat a part for good. It is rotated into the zone's mount orientation so it
   * reads correctly from the glass pane, not lying flat like it does on a shelf.
   */
  placePart(item, zoneId, partKey) {
    const zone = CASE_ZONES[zoneId];
    if (!zone) return Promise.resolve(false);
    return this._loadFitted(item).then(fitted => {
      if (!fitted || this.disposed) return false;
      fitted.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false; } });
      const mount = mountQuaternion(zone);
      if (mount) fitted.quaternion.copy(mount);

      const holder = new THREE.Group();
      holder.add(fitted);
      this._centreOnAnchor(holder, this.zoneAnchorFor(zoneId, item));
      this.caseRoot.add(holder);

      this.placedParts.set(partKey, { item, zoneId, group: holder });
      this.lockedZone = zoneId;
      this.setZoneState(zoneId, 'locked');
      return true;
    });
  }

  _loadFitted(item) {
    // The shared cache means a part the player just picked off the bench is
    // already parsed - this is a clone, not a second download.
    return loadModelCopy(item.modelPath).then(copy => {
      if (!copy) {
        console.warn(`Build zone could not load ${item.name}`);
        return null;
      }
      const { group } = buildFittedModel(copy, fitOptionsFor(item));
      return group;
    });
  }

  hasPart(partKey) {
    return this.placedParts.has(partKey);
  }

  partAt(zoneId) {
    for (const [key, entry] of this.placedParts) {
      if (entry.zoneId === zoneId) return key;
    }
    return null;
  }

  removePart(partKey) {
    const entry = this.placedParts.get(partKey);
    if (!entry) return false;
    this.caseRoot.remove(entry.group);
    this.placedParts.delete(partKey);
    if (this.lockedZone === entry.zoneId) this.lockedZone = null;
    return true;
  }

  clearParts() {
    [...this.placedParts.keys()].forEach(key => this.removePart(key));
  }

  flashZone(zoneId) {
    const marker = this.zoneMeshes.get(zoneId);
    if (marker) marker.userData.flash = 0.55;
  }

  setPower(on) {
    this.powered = on;
    if (!on) this.powerLight.intensity = 0;
  }

  // ---------------------------------------------------------------- frame

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    const bufferW = Math.floor(width * this.pixelRatio);
    const bufferH = Math.floor(height * this.pixelRatio);
    if (this.canvas.width !== bufferW || this.canvas.height !== bufferH) {
      this.renderer.setSize(width, height, false);
    }
    const aspect = width / height;
    if (Math.abs(aspect - this.camera.aspect) > 1e-6) {
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      if (!this.cameraMoving) this._refocus();
    }
  }

  setFocusZone(zoneId) {
    if (zoneId) this.focusZone(zoneId);
    else this.focusCase();
  }

  /**
   * Per-frame work is deliberately allocation free. Zone markers and fastener
   * handles are tracked in plain arrays, so animating a handful of screws never
   * walks the 120+ case meshes twice a frame.
   */
  update(delta, now) {
    if (Math.abs(this.glassT - this.glassGoal) > 0.001) {
      this.glassT += (this.glassGoal - this.glassT) * Math.min(1, delta * 6);
      this.applyGlass();
    }

    if (this.cameraMoving) {
      const k = Math.min(1, delta * 5.5);
      this.camera.position.lerp(this.cameraGoal, k);
      if (this.camera.position.distanceTo(this.cameraGoal) < 0.004) this.snapCamera();
      else this.camera.lookAt(this.lookGoal);
    }

    // Fasteners spin in, then sink flush and stay sunk
    for (let i = 0; i < this.screwHolders.length; i++) {
      const obj = this.screwHolders[i];
      const data = obj.userData;
      if (data.driving === undefined || data.driving >= 1) continue;
      data.driving = Math.min(1, data.driving + delta * 4.5);
      if (data.screwAxis) obj.rotateOnAxis(data.screwAxis, delta * 30);
      obj.scale.setScalar(1 - data.driving * 0.2);
      if (data.driving >= 1) {
        delete data.driving;
        // A driven screw is finished, not pending: it shrinks to a small seated
        // head and its halo is removed, so it stops reading as a click target.
        // Leaving it at full size made it look like the click had done nothing.
        // Only this screw's own halo is hidden - the head and halo materials are
        // shared across all screws, so they must not be mutated.
        obj.scale.setScalar(0.55);
        if (obj.children[1]) obj.children[1].visible = false;
      }
    }


    // Zone highlight pulse, plus a bright flash on a successful placement
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.005);
    for (let i = 0; i < this.zoneList.length; i++) {
      const marker = this.zoneList[i];
      if (!marker.visible) continue;
      let base = marker.userData.zoneId === this.lockedZone ? 0.26 : 0.18;
      if (marker.userData.zoneId === this.activeZone) base = 0.2 + pulse * 0.1;
      if (marker.userData.flash > 0) {
        marker.userData.flash = Math.max(0, marker.userData.flash - delta);
        base = Math.max(base, 0.55);
      }
      marker.material.opacity = base;
    }

    if (this.powered) {
      this.powerLight.intensity = 1.1 + Math.sin(now * 0.004) * 0.3;
    }


    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Finish the build: bolt the glass back on, then hand the whole assembled
   * machine over as one group so the player can carry it around the room.
   */
  finalize() {
    this.hideScrews();
    this.clearZoneStates();
    this.clearGhost();
    this.setGlass(true, true);
    this.setPower(true);

    this.caseRoot.updateMatrixWorld(true);

    // The finished machine keeps caseRoot's turn, so it walks into the room at
    // the same orientation the builder saw through the glass.
    const assembled = new THREE.Group();
    assembled.name = 'assembledPC';
    assembled.position.copy(this.caseRoot.position);
    assembled.quaternion.copy(this.caseRoot.quaternion);
    assembled.scale.copy(this.caseRoot.scale);



    const caseClone = this.caseGroup.clone(true);
    caseClone.position.copy(this.caseGroup.position);
    caseClone.quaternion.copy(this.caseGroup.quaternion);
    caseClone.scale.copy(this.caseGroup.scale);
    caseClone.traverse(o => {
      if (!o.isMesh) return;
      // a finished chassis is a real object again: solid panels, shadow casting
      restoreCaseMaterials(o);
      o.castShadow = true;
      o.receiveShadow = true;
    });
    caseClone.name = 'assembledCase';
    assembled.add(caseClone);

    const parts = [];
    this.placedParts.forEach((entry, key) => {
      const holder = entry.group.clone(true);
      holder.position.copy(entry.group.position);
      holder.quaternion.copy(entry.group.quaternion);
      holder.scale.copy(entry.group.scale);
      holder.name = 'installedPart';
      assembled.add(holder);
      parts.push({ key, item: entry.item, zoneId: entry.zoneId });
      this.caseRoot.remove(entry.group);
    });

    this.placedParts.clear();
    this.lockedZone = null;

    const glass = caseClone.getObjectByName('sideGlass') || null;
    return { group: assembled, parts, glass };
  }

  dispose() {
    this.disposed = true;
    this.clearGhost();
    this.clearParts();
    this.hideScrews();
    if (this.caseRoot) this.pivot.remove(this.caseRoot);

    this.renderer.dispose();

    if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
  }
}
