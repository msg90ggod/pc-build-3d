import * as THREE from 'three';
import { CASE } from './caseLayout.js';
import { loadModelCopy } from './ModelCache.js';

/**
 * The chassis, as a real model: a mid-tower with a tempered glass side.
 *
 * The export is authored at roughly 1:1 but in its own units, so it is fitted to
 * the layout's own chassis measurements - the same height, centred on the
 * footprint, standing on y = 0 - which is what keeps every snap anchor in
 * `caseLayout.js` meaning what it means.
 *
 * Which way it faces is measured rather than assumed, so swapping the file for
 * another chassis does not silently mount it backwards: see `orientToLayout`.
 */
export const CASE_MODEL = {
  modelPath: '/models/PC_Case_model/cabinet.glb',
  // fitted by height: the layout's chassis plus its feet
  targetHeight: CASE.height + CASE.feet
};

/**
 * Loads and fits the chassis.
 *
 * @param {object}  [options]
 * @param {boolean} [options.xray]      make the shell translucent, as the build
 *                                      view needs to see the parts inside
 * @param {1|-1}   [options.glassSide] which side of the chassis the tempered
 *                                      glass must end up on.
 *                                      `+1` is the layout's own convention -
 *                                      glass on +X, motherboard tray on -X -
 *                                      which is what the build view needs, so
 *                                      the camera looks through the glass at
 *                                      the parts on the tray.
 *                                      `-1` leaves the glass where the maker
 *                                      put it, which for a real tower is the
 *                                      left-hand side seen from the front, and
 *                                      is what the bench wants.
 * @returns {Promise<{group: THREE.Group, sideGlass: THREE.Mesh|null,
 *                    interactables: THREE.Mesh[], fitted: object}|null>}
 */
export async function loadCaseModel({ xray = false, glassSide = 1 } = {}) {
  const copy = await loadModelCopy(CASE_MODEL.modelPath);
  if (!copy) return null;

  copy.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(copy);
  if (rawBox.isEmpty()) return null;

  // uniform scale so the chassis is exactly as tall as the layout says it is
  const rawSize = rawBox.getSize(new THREE.Vector3());
  const scale = CASE_MODEL.targetHeight / (rawSize.y || 1);

  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(copy);
  group.add(inner);
  group.scale.set(scale, scale, scale);
  group.updateMatrixWorld(true);

  // seat it: base on the floor, centred in plan
  const fitted = new THREE.Box3().setFromObject(group);
  group.position.set(
    -(fitted.min.x + fitted.max.x) / 2,
    -fitted.min.y,
    -(fitted.min.z + fitted.max.z) / 2
  );
  group.updateMatrixWorld(true);

  // Which way the export faces is measured, never assumed: an earlier chassis
  // was mounted facing away from the player and the mistake only showed up by
  // eye. Both poses below are settled from the geometry, so any chassis dropped
  // in later lands the right way round on its own.
  const facing = orientToLayout(group, glassSide);

  const sideGlass = findGlass(group);
  const interactables = [];
  group.traverse(child => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    // A mirrored pose reverses winding order, so the surfaces are drawn
    // two-sided: that is what makes three.js light them correctly through a
    // negative scale.
    if (facing.mirrored) forceDoubleSide(child);
    if (xray) makeSeeThrough(child);
    interactables.push(child);
  });

  // the glass is looked up by this name when the finished machine is handed over
  if (sideGlass) sideGlass.name = 'sideGlass';

  return {
    group, sideGlass, interactables, facing,
    scale, fitted: new THREE.Box3().setFromObject(group)
  };
}

/**
 * Turns the fitted chassis to face the way the layout is written.
 *
 * The layout's chassis faces +Z (front panel). Which way the glass has to end up
 * depends on who is looking at it, so it is asked for rather than assumed:
 *
 *   1. front to +Z. The fans give it away - radiator fans live at the front of
 *      every tower. A 180 degree turn about Y fixes the front, and it swaps the
 *      left and right sides over as well.
 *   2. glass onto `glassSide`, by mirroring X only, which leaves the front where
 *      it is.
 *
 * Mirroring reverses the surface winding, so the textures go with it: the U
 * coordinate is flipped to put the artwork - the badge on the front panel
 * included - back the right way round.
 *
 * @param {THREE.Object3D} group
 * @param {1|-1} glassSide  the side of the chassis the glass must end up on
 */
export function orientToLayout(group, glassSide = 1) {
  const fans = collectMeshes(group, /fan/i);
  let turned = false;

  if (fans.length) {
    const frontZ = Math.max(...fans.map(mesh => centreOf(mesh).z));
    if (frontZ < 0) {
      group.rotation.y = Math.PI;
      group.updateMatrixWorld(true);
      turned = true;
    }
  }

  const glass = findGlass(group);
  let mirrored = false;
  if (glass) {
    const onNegativeSide = centreOf(glass).x < 0;
    const wantsNegative = glassSide < 0;
    if (onNegativeSide !== wantsNegative) {
      group.scale.x *= -1;
      group.updateMatrixWorld(true);
      mirrorUvX(group);
      mirrored = true;
    }
  }

  return { turned, mirrored };
}

/** Every mesh in a subtree whose name matches a pattern. */
function collectMeshes(root, pattern) {
  const found = [];
  root.traverse(child => {
    if (child.isMesh && pattern.test(child.name || '')) found.push(child);
  });
  return found;
}

const _centre = new THREE.Vector3();
function centreOf(mesh) {
  return new THREE.Box3().setFromObject(mesh).getCenter(_centre).clone();
}

/** Mirrors the U coordinate of every texture in a subtree, once per geometry. */
function mirrorUvX(root) {
  const seen = new Set();
  root.traverse(child => {
    if (!child.isMesh || !child.geometry) return;
    const geometry = child.geometry;
    if (seen.has(geometry.uuid)) return;
    seen.add(geometry.uuid);
    const uv = geometry.getAttribute('uv');
    if (!uv) return;
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, 1 - uv.getX(i));
    }
    uv.needsUpdate = true;
  });
}

/** Draws every surface of a mesh from both sides, for the mirrored pose. */
function forceDoubleSide(mesh) {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const patched = materials.map(mat => {
    if (!mat) return mat;
    if (mat.side === THREE.DoubleSide) return mat;
    const copy = mat.clone();
    copy.side = THREE.DoubleSide;
    return copy;
  });
  mesh.material = Array.isArray(mesh.material) ? patched : patched[0];
}

/**
 * Puts the real materials back on a chassis that was loaded for the build view.
 *
 * The x-ray skin is a swap, not a new model: the originals are kept on the mesh,
 * so the machine the player carries away from the bench is a solid chassis again
 * rather than a ghost of one.
 */
export function restoreCaseMaterials(root) {
  root.traverse(child => {
    if (!child.isMesh || !child.userData.solidMaterial) return;
    child.material = child.userData.solidMaterial;
    child.renderOrder = 0;
  });
}

/** The tempered side panel, matched by name across the usual export naming. */
function findGlass(root) {
  let found = null;
  root.traverse(child => {
    if (found || !child.isMesh) return;
    if (/glass|tempered/i.test(child.name || '')) found = child;
  });
  return found;
}

/**
 * X-ray look: the shell has to stay readable as a chassis while showing what is
 * inside it, so every opaque surface is dropped to a thin, see-through skin and
 * the glass - which is already see-through in the real thing - is left alone.
 *
 * Two-sided throughout, which also covers the mirrored pose where front faces
 * point the other way.
 */
function makeSeeThrough(mesh) {
  mesh.userData.solidMaterial = mesh.material;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const patched = materials.map(source => {
    if (!source) return source;
    if (/glass|tempered/i.test(source.name || '')) {
      const glass = source.clone();
      glass.transparent = true;
      glass.opacity = Math.min(source.opacity ?? 1, 0.22);
      glass.depthWrite = false;
      glass.side = THREE.DoubleSide;
      return glass;
    }
    const skin = new THREE.MeshStandardMaterial({
      color: 0xf5f5f4,
      transparent: true,
      opacity: 0.16,
      roughness: 0.45,
      metalness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    return skin;
  });
  mesh.material = Array.isArray(mesh.material) ? patched : patched[0];
  mesh.castShadow = false;
  mesh.renderOrder = 1;
}