import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * One parse per model file, shared by every consumer.
 *
 * The bench and the build-mode slot thumbnails both need the same GLBs, and the
 * inventory preview needs a third copy. Parsing a 30 MB board takes far longer
 * than instantiating one, so each file is fetched and parsed a single time and
 * every consumer takes a cheap `clone()` of the parsed scene.
 *
 * Clones share geometry and materials, so the memory cost of a second copy is
 * just the node graph, not another copy of the buffers.
 */
const loader = new GLTFLoader();
const templates = new Map();   // modelPath -> Promise<THREE.Object3D>
const resolved = new Map();    // modelPath -> parsed root
const stats = { requested: 0, parsed: 0, reused: 0 };

/** Parses `modelPath` once; every call after the first shares the result. */
export function loadModelTemplate(modelPath) {
  stats.requested++;
  if (templates.has(modelPath)) {
    stats.reused++;
    return templates.get(modelPath);
  }

  const job = new Promise(resolve => {
    loader.load(
      modelPath,
      gltf => {
        stats.parsed++;
        const root = gltf.scene;
        root.updateMatrixWorld(true);
        resolved.set(modelPath, root);
        resolve(root);
      },
      undefined,
      err => {
        console.warn(`Could not load model ${modelPath}:`, err);
        resolve(null);
      }
    );
  });

  templates.set(modelPath, job);
  return job;
}

/**
 * A fresh, independent copy of a parsed model, ready to be re-scaled and
 * re-oriented. Returns null if the file could not be loaded.
 */
export async function loadModelCopy(modelPath) {
  const root = await loadModelTemplate(modelPath);
  if (!root) return null;
  return root.clone(true);
}

/**
 * Streams a list of models a few at a time so the main thread stays responsive.
 * `onItem` is called as each one arrives, which is what lets the bench fill in
 * progressively instead of appearing all at once.
 *
 * @param {string[]} paths
 * @param {(path: string, root: THREE.Object3D) => void} onItem
 * @param {object} [options]
 * @param {number} [options.perFrame]  how many to start per batch
 * @param {() => void} [options.onDone]
 */
export function streamModels(paths, onItem, options = {}) {
  const { perFrame = 3, onDone } = options;
  const queue = [...paths];
  const started = [];
  let finished = 0;
  let cancelled = false;

  const pump = () => {
    if (cancelled) return;
    const slice = queue.splice(0, perFrame);
    if (!slice.length) {
      Promise.all(started).then(() => { if (!cancelled) onDone?.(); });
      return;
    }

    const batch = slice.map(path => {
      const job = loadModelTemplate(path)
        .then(root => {
          finished++;
          if (root && !cancelled) onItem(path, root);
        })
        .catch(() => { finished++; });
      started.push(job);
      return job;
    });

    // Yield to the browser between batches so painting and input keep running.
    // Deliberately setTimeout rather than requestAnimationFrame: rAF stops
    // entirely in a background tab, which would strand the queue half-loaded.
    if (cancelled) return batch;
    Promise.resolve().then(() => setTimeout(pump, 0));
    return batch;
  };

  pump();

  return {
    cancel() { cancelled = true; },
    get loaded() { return finished; },
    get total() { return paths.length; }
  };
}

export function modelCacheStats() {
  return { ...stats, live: resolved.size };
}
