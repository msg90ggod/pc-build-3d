import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sounds } from '../audio/SoundEffects.js';
import { buildFittedModel, fitOptionsFor } from './ModelFit.js';

export class PlacedItemManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.loader = new GLTFLoader();
    this.placedItems = new Map(); // id -> THREE.Group
    this.interactables = [];

    this.scene.add(this.group);
  }

  placeItemAt(itemData, worldPosition) {
    sounds.playDrop();

    this.loader.load(
      itemData.modelPath,
      gltf => {
        // Real-world metres, laid flat and straight, resting on y = 0. The same
        // per-axis fit the shelf and the Build Zone use: a part dropped on the
        // workbench has to be the same shape it was on the bench.
        const { group } = buildFittedModel(gltf.scene, fitOptionsFor(itemData));

        // Long edge along the world X axis, label side towards the room
        const yaw = new THREE.Group();
        yaw.rotation.y = -Math.PI / 2;
        yaw.add(group);

        const outerWrapper = new THREE.Group();
        outerWrapper.add(yaw);
        // Hairline offset above the surface to avoid z-fighting
        outerWrapper.position.set(worldPosition.x, worldPosition.y + 0.002, worldPosition.z);

        outerWrapper.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData = { itemId: itemData.id, itemName: itemData.name, isPlaced: true };
          }
        });

        outerWrapper.userData = { itemId: itemData.id, itemName: itemData.name, isPlaced: true };

        this.group.add(outerWrapper);
        this.placedItems.set(itemData.id, outerWrapper);
        this.interactables.push(outerWrapper);
      },
      undefined,
      err => console.warn(`Error placing ${itemData.name}:`, err)
    );
  }

  removeItem(itemId) {
    const mesh = this.placedItems.get(itemId);
    if (mesh) {
      this.group.remove(mesh);
      this.placedItems.delete(itemId);
      const idx = this.interactables.indexOf(mesh);
      if (idx !== -1) this.interactables.splice(idx, 1);
    }
  }
}
