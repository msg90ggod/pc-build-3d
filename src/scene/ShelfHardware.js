import * as THREE from 'three';
import { ALL_HARDWARE_ITEMS } from '../data/hardware.js';
import { buildFittedModel, fitOptionsFor } from './ModelFit.js';
import { getShelfLayout } from './shelfLayout.js';
import { loadModelCopy, streamModels } from './ModelCache.js';

// Fitted models rest with minY = 0; lift by a hair so flat parts (SSD, CPU,
// RAM) do not z-fight with the bench they are sitting on.
const SEAT_OFFSET = 0.0005;

/**
 * The hardware on the parts bench.
 *
 * Models arrive progressively: each file is fetched and parsed once (shared with
 * the build-mode thumbnails through ModelCache) and a cheap placeholder box is
 * put in its place straight away, so the bench reads as a full bench within a
 * frame or two instead of sitting empty while 300 MB downloads.
 */
export class ShelfHardware {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.items = [...ALL_HARDWARE_ITEMS];
    this.shelfMeshes = new Map();
    this.placeholders = new Map();
    this.interactables = [];
    this.layout = getShelfLayout();
    this.onProgress = options.onProgress || null;
    this.onReady = options.onReady || null;

    // Resolves once every model has been parsed and swapped in, so callers (and
    // tests) can wait for a fully populated bench instead of polling.
    this.ready = new Promise(resolve => { this._resolveReady = resolve; });

    this.scene.add(this.group);

    // Some parts are variants that deliberately share one model file (the two
    // G.Skill sticks, the two Corsair sticks), so the download list is the set
    // of distinct files and each file then fills every slot that uses it.
    const paths = [...new Set(this.items.map(item => item.modelPath))];
    this.stream = streamModels(
      paths,
      (path, root) => this.addItem(path, root),
      {
        perFrame: options.perFrame ?? 4,
        onDone: () => {
          this._resolveReady?.();
          this.onReady?.();
        }
      }
    );
  }

  /** One consistent stand-in for a part that has not finished downloading. */
  _makePlaceholder(item) {
    const box = new THREE.BoxGeometry(
      Math.max(item.realSize, 0.02),
      Math.max(item.realSize * 0.12, 0.008),
      Math.max(item.footprint?.depth || item.realSize * 0.4, 0.02)
    );
    const mesh = new THREE.Mesh(
      box,
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1, roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0.55
      })
    );
    return mesh;
  }

  /** Positions the part on its slot, turns it to face the room, and tags it. */
  _place(wrapper, slot, item) {
    wrapper.position.set(
      slot.position.x,
      slot.position.y + SEAT_OFFSET,
      slot.position.z
    );
    wrapper.traverse(child => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData = { itemId: item.id, itemName: item.name, isPlaceholder: !!child.userData.isPlaceholder };
    });
    wrapper.userData = { itemId: item.id, itemName: item.name };
    this.shelfMeshes.set(item.id, wrapper);
    this.interactables.push(wrapper);
    this.group.add(wrapper);
  }

  /** Swaps in the real model for every slot that this file belongs to. */
  addItem(modelPath, root) {
    this.items
      .filter(item => item.modelPath === modelPath)
      .forEach(item => this._swapIn(item, root));
    this.onProgress?.(this.stream.loaded, this.stream.total);
  }

  _swapIn(item, root) {
    const slot = this.layout.tiers.flatMap(t => t.entries).find(e => e.item.id === item.id);
    if (!slot) return;

    // Real-world metres per axis + auto flat/straight alignment (rests on y = 0)
    const copy = root.clone(true);
    const { group } = buildFittedModel(copy, fitOptionsFor(item));

    // Long edge runs along the bench, front face turns into the room
    const yaw = new THREE.Group();
    yaw.rotation.y = -Math.PI / 2;
    yaw.add(group);

    const wrapper = new THREE.Group();
    wrapper.add(yaw);

    // swap the placeholder out for the real mesh
    const placeholder = this.placeholders.get(item.id);
    if (placeholder) {
      this.group.remove(placeholder);
      this.placeholders.delete(item.id);
      const at = this.interactables.indexOf(placeholder);
      if (at >= 0) this.interactables.splice(at, 1);
      placeholder.traverse(child => {
        if (!child.isMesh) return;
        child.geometry?.dispose?.();
        child.material?.dispose?.();
      });
    }
    this._place(wrapper, slot, item);
  }

  /**
   * Fills the bench with placeholders up front. Cheap, synchronous, and it makes
   * the bench look right while the real models are still on the wire.
   */
  seedPlaceholders() {
    const slots = new Map(
      this.layout.tiers.flatMap(t => t.entries).map(e => [e.item.id, e])
    );
    this.items.forEach(item => {
      const slot = slots.get(item.id);
      if (!slot) return;
      const mesh = this._makePlaceholder(item);
      mesh.userData.isPlaceholder = true;
      this._place(mesh, slot, item);
      this.placeholders.set(item.id, mesh);
    });
  }

  hideItem(itemId) {
    const mesh = this.shelfMeshes.get(itemId);
    if (mesh) mesh.visible = false;
  }

  showItem(itemId) {
    const mesh = this.shelfMeshes.get(itemId);
    if (mesh) mesh.visible = true;
  }
}
