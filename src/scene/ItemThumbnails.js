import * as THREE from 'three';
import { buildFittedModel, fitOptionsFor } from './ModelFit.js';
import { loadModelCopy } from './ModelCache.js';

/**
 * Bakes a small PNG of each hardware model for the build-mode slot list.
 *
 * One shared offscreen WebGL context renders every part once and caches the data
 * URL, so the list can show real 3D models without spinning up a renderer per
 * slot (browsers cap live WebGL contexts at around 16). The model itself comes
 * from the shared ModelCache, so baking a thumbnail for a part that is already
 * on the bench costs a clone rather than a second parse of the file.
 */
export class ItemThumbnailBaker {
  constructor({ size = 128 } = {}) {
    this.size = size;
    this.cache = new Map();
    this.pending = new Map();
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.unavailable = false;
  }


  _ensureContext() {
    if (this.renderer || this.disposed) return !!this.renderer;

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true
      });
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(this.size, this.size, false);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
    } catch (err) {
      // No WebGL (private mode, blocklisted driver): fall back to the glyph
      this.renderer = null;
      this.unavailable = true;
      console.warn('Thumbnail context unavailable:', err);
      return false;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rim.position.set(-3, -1, -2);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    return true;
  }

  /** Resolves to a data-URL, or null if the model could not be baked. */
  get(item) {
    if (!item || this.disposed || this.unavailable) return Promise.resolve(null);
    if (this.cache.has(item.id)) return Promise.resolve(this.cache.get(item.id));
    if (this.pending.has(item.id)) return this.pending.get(item.id);

    const job = new Promise(resolve => {
      let settled = false;
      const done = url => {
        if (settled) return;
        settled = true;
        resolve(url);
      };

      try {
        if (!this._ensureContext()) return done(null);
      } catch (err) {
        console.warn(`Thumbnail context failed for ${item.name}:`, err);
        return done(null);
      }

      loadModelCopy(item.modelPath)
        .then(copy => {
          if (!copy) return done(null);
          try {
            const { group, size } = buildFittedModel(copy, fitOptionsFor(item));
            const maxDim = Math.max(...size.toArray()) || 1;

            // Same 3/4 pose the inventory preview uses, so the list and the
            // detail panel read as the same product.
            const pivot = new THREE.Group();
            pivot.rotation.x = 0.28;
            const scaleGroup = new THREE.Group();
            scaleGroup.scale.setScalar((this.size * 0.78) / (maxDim * 1.9));
            scaleGroup.add(group);
            pivot.add(scaleGroup);

            this.scene.add(pivot);
            this.scene.updateMatrixWorld(true);

            // Frame from the tilted bounding box so nothing is clipped
            const box = new THREE.Box3().setFromObject(pivot);
            const bhalf = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
            const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
            const dist = Math.max(bhalf.y / tanV, bhalf.x / tanV) * 1.12 + bhalf.z;
            this.camera.position.set(0, 0, dist);
            this.camera.lookAt(0, 0, 0);
            this.camera.updateProjectionMatrix();

            this.renderer.render(this.scene, this.camera);
            const url = this.renderer.domElement.toDataURL('image/png');
            this.scene.remove(pivot);
            this.cache.set(item.id, url);
            done(url);
          } catch (err) {
            console.warn(`Thumbnail failed for ${item.name}:`, err);
            done(null);
          }
        })
        .catch(() => done(null));
    });

    this.pending.set(item.id, job);
    job.then(
      () => this.pending.delete(item.id),
      () => this.pending.delete(item.id)
    );
    return job;
  }

  /** Warms the cache for many items at once. */
  prime(items) {
    items.forEach(item => this.get(item));
  }

  dispose() {
    this.disposed = true;
    this.cache.clear();
    this.pending.clear();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}
