import * as THREE from 'three';
import { loadModelCopy } from '../scene/ModelCache.js';
import { sounds } from '../audio/SoundEffects.js';
import { buildFittedModel, fitOptionsFor } from '../scene/ModelFit.js';

export class HeldItemManager {
  constructor(camera, scene, playerControls) {
    this.camera = camera;
    this.scene = scene;
    this.playerControls = playerControls;

    this.heldItemData = null;
    this.heldObjectGroup = new THREE.Group();
    this.camera.add(this.heldObjectGroup);

    // Pivot group inside heldObjectGroup for clean rotation
    this.rotationPivot = new THREE.Group();
    this.heldObjectGroup.add(this.rotationPivot);

    // Hand positioning
    this.defaultPos = new THREE.Vector3(0.35, -0.28, -0.65);
    this.centerPos = new THREE.Vector3(0, -0.02, -0.52); // Centered right in front of camera
    this.currentPos = this.defaultPos.clone();
    this.heldObjectGroup.position.copy(this.currentPos);


    // Inspection state
    this.isInspecting = false;
    this.itemRotation = { x: 0, y: 0, z: 0 };

    this.setupMouseEvents();
  }

  setPlayerControls(controls) {
    this.playerControls = controls;
  }

  setupMouseEvents() {
    window.addEventListener('mousedown', e => {
      // Right Mouse Button (button === 2)
      if (e.button === 2 && this.heldItemData) {
        this.isInspecting = true;
        if (this.playerControls) {
          this.playerControls.isLookLocked = true; // Freeze camera look
        }
        this.showInspectHint(true);
      }
    });

    window.addEventListener('mouseup', e => {
      if (e.button === 2 && this.isInspecting) {
        this.isInspecting = false;
        if (this.playerControls) {
          this.playerControls.isLookLocked = false; // Restore camera look
        }
        this.showInspectHint(false);
      }
    });

    window.addEventListener('contextmenu', e => {
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (this.isInspecting && this.heldItemData) {
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;

        // Rotate object around its center in view
        this.itemRotation.y += movementX * 0.009;
        this.itemRotation.x += movementY * 0.009;

        // Upright-only items (a single hard part) may spin, never tip over.
        // A free-standing object such as the finished machine has no such
        // constraint and keeps all three axes.
        if (this.heldItemData.noTilt) this.itemRotation.x = 0;

        // Apply rotation to pivot
        this.rotationPivot.rotation.x = this.itemRotation.x;
        this.rotationPivot.rotation.y = this.itemRotation.y;
        this.rotationPivot.rotation.z = this.itemRotation.z;
      }
    });

    // Roll cannot come from a 2D mouse, so the scroll wheel takes the third
    // axis while inspecting. This is what lets the finished PC be turned on
    // all three axes, which a mouse alone cannot express.
    window.addEventListener('wheel', e => {
      if (!this.isInspecting || !this.heldItemData) return;
      e.preventDefault();
      const step = this.heldItemData.noTilt ? 0 : -Math.sign(e.deltaY) * 0.12;
      this.itemRotation.z += step;
      this.rotationPivot.rotation.set(
        this.itemRotation.x,
        this.itemRotation.y,
        this.itemRotation.z
      );
    }, { passive: false });
  }


  showInspectHint(show) {
    let hintEl = document.getElementById('inspect-hint');
    if (!hintEl) {
      hintEl = document.createElement('div');
      hintEl.id = 'inspect-hint';
      document.body.appendChild(hintEl);
    }
    if (show && this.heldItemData) {
      // Roll needs a second axis the mouse cannot give, so the hint says so.
      hintEl.textContent = this.heldItemData.noTilt
        ? `🔍 Đang quan sát ${this.heldItemData.name} • Rê chuột để xoay 360°`
        : `🔍 Đang quan sát ${this.heldItemData.name} • Rê chuột để xoay • Lăn chuột để xoay ngang`;
      hintEl.classList.add('active');
    } else {
      hintEl.classList.remove('active');
    }

  }

  holdItem(itemData) {
    this.clearHeldItem();
    this.heldItemData = itemData;
    sounds.playPickup();

    // loadModelCopy hands back an independent clone, ready to be re-fitted.
    const loadAndAttach = cloned => {
      // Real-world metres, laid flat. Tiny parts (CPU pins, RAM chips) get a
      // readability floor so they stay visible in the hand.
      const { group, size } = buildFittedModel(cloned, fitOptionsFor(itemData, {
        minSize: 0.05,
        maxSize: 0.34
      }));
      // buildFittedModel seats the part with minY = 0, so its centre sits half a
      // height above the origin: pull it back so the part rests in the palm.
      group.position.y -= size.y / 2;

      this.rotationPivot.add(group);
      this.setDefaultPose();
    };

    if (itemData.prebuilt) {
      // A finished machine arrives already assembled: attach the group as-is
      // instead of loading and re-fitting a model.
      const holder = new THREE.Group();
      holder.add(itemData.prebuilt);
      itemData.prebuilt.position.set(0, 0, 0);
      itemData.prebuilt.rotation.set(0, 0, 0);
      holder.position.y = -itemData.prebuiltSizeY / 2 || 0;
      this.rotationPivot.add(holder);
      this.setDefaultPose();
      // Picking it back up restores the pose it was parked in, so the two paths
      // (E and left-click) agree and the machine does not jump.
      if (itemData.pose) {
        this.itemRotation = { ...itemData.pose };
        this.rotationPivot.rotation.set(
          this.itemRotation.x,
          this.itemRotation.y,
          this.itemRotation.z
        );
      }
      return;
    }


    // One shared parse per model file: by the time a part reaches the hand it is
    // almost always already on the bench, so this is a clone.
    loadModelCopy(itemData.modelPath).then(model => {
      if (model) loadAndAttach(model);
    });
  }

  /** Inspection pose. `noTilt` parts (a single loose item) stay upright. */
  setDefaultPose() {
    this.itemRotation = { x: this.heldItemData?.noTilt ? 0 : 0.15, y: -0.35, z: 0 };
    this.rotationPivot.rotation.set(this.itemRotation.x, this.itemRotation.y, 0);
  }


  clearHeldItem() {
    this.showInspectHint(false);
    if (this.isInspecting && this.playerControls) {
      this.playerControls.isLookLocked = false;
    }
    this.isInspecting = false;

    while (this.rotationPivot.children.length > 0) {
      this.rotationPivot.remove(this.rotationPivot.children[0]);
    }
    const oldItem = this.heldItemData;
    this.heldItemData = null;
    this.rotationPivot.rotation.set(0, 0, 0);
    return oldItem;
  }

  getHeldItem() {
    return this.heldItemData;
  }

  update(delta, time) {
    if (!this.heldItemData) return;

    // Smooth transition between default holding position and center inspection position
    const targetPos = this.isInspecting ? this.centerPos : this.defaultPos;
    const lerpSpeed = Math.min(1.0, 14.0 * delta);
    this.currentPos.lerp(targetPos, lerpSpeed);

    if (!this.isInspecting) {
      // Natural subtle idle breathing sway
      const swayY = Math.sin(time * 2.2) * 0.005;
      const swayX = Math.cos(time * 1.6) * 0.003;
      this.heldObjectGroup.position.set(
        this.currentPos.x + swayX,
        this.currentPos.y + swayY,
        this.currentPos.z
      );
    } else {
      this.heldObjectGroup.position.copy(this.currentPos);
    }
  }
}
