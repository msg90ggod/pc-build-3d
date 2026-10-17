import * as THREE from 'three';
import { getTableObstacle } from '../scene/shelfLayout.js';

/**
 * True when the object and every ancestor up to the root are drawn. A hidden
 * part is normally only flagged on its own wrapper, and the wrapper's own
 * parent chain is what decides whether the hit is real.
 */
function isVisibleChain(object) {
  for (let node = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  return true;
}

/**
 * How much of a frame's time movement is allowed to act on, and in what slices.
 *
 * A frame that overran is NOT caught up: the excess time is dropped. That is the
 * whole point. A stalled frame used to be integrated in one go, so a 100 ms
 * hitch moved the camera 420 mm in a single drawn frame - the view visibly
 * snapping somewhere else, and it happened exactly when walking into the bench,
 * where the crosshair ray starts hitting the whole workbench and frames get
 * longer. Dropping the excess turns that teleport into at most a couple of
 * strides of slow motion for the one bad frame.
 *
 * Two ordinary frames of budget, so a machine holding 30 fps still walks at full
 * speed - only a genuine stall loses time.
 */
const MOVE_SLICE = 1 / 60;
const MOVE_MAX_FRAME = 2 * MOVE_SLICE;

/** Walking speed, metres per second. */
const MOVE_SPEED = 4.2;

/** How quickly velocity reaches its target: a fraction per second. */
const MOVE_ACCEL = 12;

export class PlayerControls {
  constructor(camera, domElement, onInteract, onStow, onToggleInventory) {
    this.camera = camera;
    this.domElement = domElement;
    this.onInteract = onInteract;
    this.onStow = onStow;
    this.onToggleInventory = onToggleInventory;

    // Movement keys
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity = new THREE.Vector3(0, 0, 0);

    // Shift-Lock / Pointer Lock state
    this.isLocked = false;
    this.isLookLocked = false; // When true, mouse movement does not rotate camera (e.g. while inspecting held item)

    // Camera angles
    this.pitch = 0;
    this.yaw = 0;

    // Scratch vectors for the movement maths, allocated once
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();

    // Collision boundaries (room walls and central table)
    this.bounds = { minX: -5.4, maxX: 5.4, minZ: -4.4, maxZ: 4.4 };
    this.obstacles = [
      { minX: -1.35, maxX: 1.35, minZ: -0.75, maxZ: 0.75 }, // Workbench
      getTableObstacle()                                        // Parts table
    ];

    // Movement is integrated in slices this long at most. See `moveBy`.
    this.targetVelX = 0;
    this.targetVelZ = 0;

    // Raycaster for interactions and placement
    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);
    this.hoveredObject = null;
    this.lastRaycastHit = null;

    // The hover raycast was the single most expensive thing in the frame, at
    // roughly 1 ms - two thirds of all the script work - because it walked every
    // mesh in the room sixty times a second. The result only changes when the
    // camera or the world does, so it is cached against the pose it was taken
    // from and only redone when that pose actually differs.
    this.lastRayPos = new THREE.Vector3(NaN, NaN, NaN);
    this.lastRayQuat = new THREE.Quaternion(NaN, NaN, NaN, NaN);
    this.rayDirty = true;

    // Cached HUD nodes and the last values written to them. Writing
    // `textContent` or `style.display` every frame is cheap on its own but
    // invalidates style and layout for the whole document, so both are only
    // touched when the value actually changes.
    this.hud = {
      crosshair: document.getElementById('crosshair'),
      prompt: document.getElementById('hud-prompt'),
      promptText: document.getElementById('hud-prompt')?.querySelector('.prompt-text') || null
    };
    this.lastPromptText = null;
    this.lastPromptShown = false;
    this.lastHighlighted = false;
    this.movementEnabled = true;

    this.setupPointerLock();
    this.setupKeyboard();
    this.setupMouse();
  }

  /**
   * The tables the player cannot walk through.
   *
   * The room measures each bench as it builds it, so its boxes are the single
   * source of truth: a bench that is moved or resized carries its own collider
   * with it. The hard-coded pair in the constructor is only what is used before
   * the room hands its own over (and what a test without a room falls back to).
   */
  setObstacles(colliders) {
    if (Array.isArray(colliders) && colliders.length) this.obstacles = colliders;
  }

  /**
   * Forces the hover test to run on the next update. The world calls this when
   * something appears, disappears or moves, so the crosshair never lags behind
   * a part that was just picked up.
   */
  markRaycastDirty() {
    this.rayDirty = true;
  }

  setupPointerLock() {
    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === this.domElement;
      const indicator = document.getElementById('shiftlock-status');
      if (indicator) {
        indicator.textContent = this.isLocked ? 'Shift-Lock: BẬT (Khóa tâm)' : 'Shift-Lock: TẮT (Tự do chuột)';
        indicator.className = this.isLocked ? 'active' : 'inactive';
      }
      const crosshair = document.getElementById('crosshair');
      if (crosshair) {
        crosshair.classList.toggle('unlocked', !this.isLocked);
      }
    });

    this.domElement.addEventListener('click', () => {
      const invModal = document.getElementById('inventory-modal');
      const isInvOpen = invModal && invModal.classList.contains('active');
      if (!this.isLocked && !isInvOpen) {
        this.lockPointer();
      }
    });
  }

  lockPointer() {
    try {
      this.domElement.requestPointerLock();
    } catch (err) {
      console.warn('Pointer lock error:', err);
    }
  }

  unlockPointer() {
    try {
      document.exitPointerLock();
    } catch (err) {
      console.warn('Pointer unlock error:', err);
    }
  }

  toggleShiftLock() {
    if (this.isLocked) {
      this.unlockPointer();
    } else {
      this.lockPointer();
    }
  }

  setupKeyboard() {
    window.addEventListener('keydown', e => {
      if (e.key === 'Shift') {
        e.preventDefault();
        this.toggleShiftLock();
        return;
      }

      if (e.code === 'KeyE') {
        if (this.onStow) this.onStow();
        return;
      }

      if (e.code === 'KeyR') {
        if (this.onToggleInventory) this.onToggleInventory();
        return;
      }

      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = true;
          break;
      }
    });

    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.moveForward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.moveLeft = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.moveBackward = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.moveRight = false;
          break;
      }
    });
  }

  setupMouse() {
    window.addEventListener('mousemove', e => {
      // If pointer is not locked, or if camera look is temporarily locked (RMB inspect), do not rotate camera
      if (!this.isLocked || this.isLookLocked) return;

      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;

      // Mouse sensitivity
      this.yaw -= movementX * 0.0022;
      this.pitch -= movementY * 0.0022;

      // Clamp vertical look angle
      this.pitch = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));

      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.x = this.pitch;
      euler.y = this.yaw;
      this.camera.quaternion.setFromEuler(euler);
    });

    window.addEventListener('mousedown', e => {
      if (e.button === 0 && this.isLocked) { // Left click
        if (this.onInteract) {
          this.onInteract(this.hoveredObject, this.lastRaycastHit);
        }
      }
    });
  }

  /**
   * Whether WASD is allowed to move the camera at all.
   *
   * A screen-filling overlay reads as a menu, so the player should not be able to
   * walk off behind it. Disabling also drops any key still held, otherwise closing
   * the overlay mid-stride would launch the player forward.
   */
  setMovementEnabled(on) {
    this.movementEnabled = on;
    if (on) return;
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;
    this.velocity.set(0, 0, 0);
  }

  /**
   * Walks the player forward by `delta` seconds, in slices no longer than
   * MOVE_SLICE.
   *
   * Two things this fixes. A stalled frame used to be caught up in one step, so a
   * 100 ms hitch moved the camera 420 mm in a single drawn frame - which reads as
   * the view snapping somewhere else, and it happened exactly when walking into
   * the bench, where the frame is heaviest. And a blocked axis kept its full
   * velocity: pressing into the bench left the player accelerating into it, so the
   * moment they slid past the corner they were flung along it.
   */
  moveBy(delta) {
    if (delta <= 0) return;
    const budget = Math.min(delta, MOVE_MAX_FRAME);
    const slices = Math.max(1, Math.ceil(budget / MOVE_SLICE));
    const dt = budget / slices;

    for (let i = 0; i < slices; i++) {
      const smooth = Math.min(1.0, MOVE_ACCEL * dt);
      this.velocity.x += (this.targetVelX - this.velocity.x) * smooth;
      this.velocity.z += (this.targetVelZ - this.velocity.z) * smooth;

      const targetX = this.camera.position.x + this.velocity.x * dt;
      const targetZ = this.camera.position.z + this.velocity.z * dt;

      // per axis, so a blocked axis does not cancel the slide along the other
      if (!this.checkCollision(targetX, this.camera.position.z)) {
        this.camera.position.x = targetX;
      } else {
        this.velocity.x = 0;   // do not keep charging into what stopped us
      }
      if (!this.checkCollision(this.camera.position.x, targetZ)) {
        this.camera.position.z = targetZ;
      } else {
        this.velocity.z = 0;
      }
    }
  }

  checkCollision(newX, newZ) {
    if (newX < this.bounds.minX || newX > this.bounds.maxX) return true;
    if (newZ < this.bounds.minZ || newZ > this.bounds.maxZ) return true;

    for (const obs of this.obstacles) {
      if (newX >= obs.minX && newX <= obs.maxX && newZ >= obs.minZ && newZ <= obs.maxZ) {
        return true;
      }
    }
    return false;
  }

  /**
   * True when the crosshair ray would land somewhere different than last frame.
   * The camera pose is the only thing that moves the ray on its own; everything
   * else in the world signals its changes through `markRaycastDirty`.
   */
  rayMoved() {
    const p = this.camera.position;
    const q = this.camera.quaternion;
    if (p.x !== this.lastRayPos.x || p.y !== this.lastRayPos.y || p.z !== this.lastRayPos.z) return true;
    if (
      q.x !== this.lastRayQuat.x || q.y !== this.lastRayQuat.y ||
      q.z !== this.lastRayQuat.z || q.w !== this.lastRayQuat.w
    ) return true;
    return false;
  }

  /**
   * @param {number} delta
   * @param {THREE.Object3D[]} targets everything the crosshair may hit, as one
   *   list: hardware, dropped parts, the case, and the surfaces a part can be
   *   dropped onto. Interactables still win over surfaces, because a tagged
   *   ancestor is looked up first.
   */
  update(delta, targets = []) {
    // 1. Calculate inputs
    const move = this.movementEnabled;
    const inputForward = move ? (this.moveForward ? 1 : 0) - (this.moveBackward ? 1 : 0) : 0;
    const inputRight = move ? (this.moveRight ? 1 : 0) - (this.moveLeft ? 1 : 0) : 0;

    // 2. Camera-relative horizontal direction vectors:
    // forward: looking direction projected on horizontal X-Z plane
    // right: perpendicular vector pointing 90 deg clockwise to the right
    // Reused vectors: this runs every frame, and three fresh Vector3s per frame
    // is 180 allocations a second for values that never escape this method.
    const forward = this._forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = this._moveDir.set(0, 0, 0);
    if (inputForward !== 0 || inputRight !== 0) {
      moveDir.addScaledVector(forward, inputForward);
      moveDir.addScaledVector(right, inputRight);
      moveDir.normalize();
    }

    // 3. Smooth velocity interpolation, integrated in bounded slices
    this.targetVelX = moveDir.x * MOVE_SPEED;
    this.targetVelZ = moveDir.z * MOVE_SPEED;
    this.moveBy(delta);

    this.camera.position.y = 1.65; // Eye height

    // 4. Raycasting for object hover and surface targeting
    if (!this.isLocked) {
      this.hoveredObject = null;
      this.lastRaycastHit = null;
      this.setHighlight(false);
      this.setPrompt(null);
      this.lastRayPos.copy(this.camera.position);
      this.lastRayQuat.copy(this.camera.quaternion);
      this.rayDirty = false;
      return;
    }

    if (this.rayDirty || this.rayMoved()) {
      this.lastRayPos.copy(this.camera.position);
      this.lastRayQuat.copy(this.camera.quaternion);
      this.rayDirty = false;
      // The camera's world matrix is otherwise only refreshed by the renderer,
      // which runs after this, so without this the ray would be aimed with the
      // previous frame's orientation.
      this.camera.updateMatrixWorld();
      this.raycaster.setFromCamera(this.center, this.camera);
      const intersects = this.raycaster.intersectObjects(targets, true);

      let foundInteractable = null;
      let surfaceHit = null;

      for (const hit of intersects) {
        // `intersects` is sorted near-to-far, so once the reach is exceeded
        // nothing later can be a candidate either.
        if (hit.distance >= 4.0) break;
        // three.js happily raycasts objects that are not drawn, and taking a
        // part off the shelf only sets `visible = false` rather than removing
        // it. Without this, a part that had already been picked up stayed
        // highlighted and could be clicked again while invisible.
        if (!isVisibleChain(hit.object)) continue;
        let curr = hit.object;
        while (curr && !curr.userData?.type && !curr.userData?.snapType && !curr.userData?.itemId && curr.parent) {
          curr = curr.parent;
        }
        if (curr && (curr.userData?.type || curr.userData?.snapType || curr.userData?.itemId)) {
          foundInteractable = curr;
          surfaceHit = hit;
          break;
        }
        // If hit an environment surface (table, shelf, floor)
        if (!surfaceHit && (hit.object.isMesh || hit.point)) {
          surfaceHit = hit;
        }
      }

      this.hoveredObject = foundInteractable;
      this.lastRaycastHit = surfaceHit;
      this.setHighlight(!!foundInteractable);
      this.setPrompt(foundInteractable);
    }
  }

  /** Only touches the DOM when the crosshair highlight actually flips. */
  setHighlight(on) {
    if (on === this.lastHighlighted) return;
    this.lastHighlighted = on;
    this.hud.crosshair?.classList.toggle('highlight', on);
  }

  /** Only touches the DOM when the prompt text or its visibility changes. */
  setPrompt(hovered) {
    const text = hovered ? this.promptTextFor(hovered.userData) : null;
    if (text === this.lastPromptText && !!text === this.lastPromptShown) return;
    this.lastPromptText = text;
    this.lastPromptShown = !!text;
    const prompt = this.hud.prompt;
    if (!prompt) return;
    prompt.style.display = text ? 'flex' : 'none';
    if (text && this.hud.promptText) this.hud.promptText.textContent = text;
  }

  promptTextFor(uData = {}) {
    if (uData.itemId) {
      return `[Chuột trái] Nhặt ${uData.itemName || 'Linh kiện'}`;
    }
    if (uData.type === 'glass_side') {
      return `[Chuột trái] Tháo / Lắp Nắp kính thùng máy`;
    }
    if (uData.type === 'power_button') {
      return `[Chuột trái] BẬT NGUỒN MÁY TÍNH`;
    }
    if (uData.type === 'cables') {
      return `[Chuột trái] Cắm Dây nguồn & Cáp tín hiệu`;
    }
    if (uData.snapType) {
      return `[Chuột trái] Lắp ráp: ${uData.snapType.toUpperCase()}`;
    }
    if (uData.type === 'computerCase') {
      return `[Chuột trái] Mở Menu Thùng Máy`;
    }
    if (uData.type === 'todoList') {
      return `[Chuột trái] Xem các bước cần làm`;
    }
    if (uData.type === 'monitor') {
      return `[Chuột trái] Cắm cáp màn hình`;
    }
    return null;
  }
}
