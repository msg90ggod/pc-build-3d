import * as THREE from 'three';
import { realDimsFor } from '../data/hardwareDims.js';

/**
 * The fitting options every path must use, so a part is the same shape on the
 * bench, in the hand, dropped on the workbench and in the Build Zone.
 *
 * This exists because one path used to pass only `realSize`. Uniform scaling
 * keeps whatever proportions the downloader authored, which for the Corsair
 * Dominator GLB (a box whose cross-section is nearly square) produced a
 * 133 x 54 x 55 mm brick, and for the G.Skill Trident a stick three times too
 * thick that stood on its edge. Both were wrong while the shelf and the Build
 * Zone showed the correct 133 x 7 x 45 mm DIMM, because they *did* pass the
 * real per-axis dimensions.
 *
 * `extra` lets a caller add its own constraints - the held part, for instance,
 * clamps the uniform size - without losing the per-axis shape.
 */
export function fitOptionsFor(item, extra = null) {
  const options = {
    realSize: item.realSize,
    realDims: realDimsFor(item),
    flat: true
  };
  // A CPU is a slab of dark green/black substrate with a metal lid on it. The
  // shipped models are authored almost black (one is literally rgb 0,0,0), which
  // turns the part into a hole in the case. Lifting the darks to a readable PCB
  // grey, plus a touch of flat emissive for the textured ones, keeps the IHS
  // readable without washing out the detail.
  if (item.categoryKey === 'cpu') options.brighten = 0.42;
  return extra ? { ...options, ...extra } : options;
}

/**
 * Raises near-black materials to a readable lightness and gives everything a
 * small flat lift, so a part does not disappear into a dark chassis.
 *
 * Materials that carry a texture are left alone on colour - the map already
 * decides the tone - and only get the emissive lift.
 */
export function brightenModel(root, minLightness = 0.42, emissive = 0.07) {
  if (!root || !root.traverse) return root;
  const hsl = { h: 0, s: 0, l: 0 };
  root.traverse(node => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat.color && !mat.map) {
        mat.color.getHSL(hsl);
        if (hsl.l < minLightness) {
          // keep the hue, drop some of the saturation: a saturated lift reads as
          // plastic rather than as a lit PCB
          mat.color.setHSL(hsl.h, Math.min(hsl.s, 0.35), minLightness);
        }
      }
      if (mat.emissive && emissive > 0) {
        mat.emissive.setScalar(emissive);
        if (mat.emissiveIntensity === undefined) mat.emissiveIntensity = 1;
      }
    }
  });
  return root;
}

const AXES = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, 0, 1)
];

const ANGLE_EPSILON = 1e-4;

export function measureModel(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object);
  return {
    box,
    size: box.getSize(new THREE.Vector3()),
    center: box.getCenter(new THREE.Vector3())
  };
}

/**
 * Works out the rotation that turns an arbitrary authored model into a tidy
 * retail pose: thinnest native axis becomes vertical (it lies flat, never on
 * its end), longest native axis runs along local +X (the shelf length).
 * Among all valid sign permutations the smallest rotation from identity wins,
 * so models that are already lying flat keep their authored "face up" side.
 */
export function computeFlatAlignment(size) {
  const ranked = AXES
    .map((vector, index) => ({ vector, index, length: size.getComponent(index) }))
    .sort((a, b) => a.length - b.length);

  const thin = ranked[0];
  const mid = ranked[1];
  const long = ranked[2];

  let best = null;

  for (const longSign of [1, -1]) {
    for (const thinSign of [1, -1]) {
      // THREE.Matrix4.makeBasis(a, b, c) expects the *images* of the source
      // X / Y / Z axes, so slot each target direction by native axis index.
      const longDir = new THREE.Vector3(1, 0, 0).multiplyScalar(longSign);
      const thinDir = new THREE.Vector3(0, 1, 0).multiplyScalar(thinSign);
      const midDir = new THREE.Vector3().crossVectors(longDir, thinDir);

      const images = new Array(3);
      images[long.index] = longDir;
      images[thin.index] = thinDir;
      images[mid.index] = midDir;

      // An odd axis permutation flips handedness - mirror the spare axis so the
      // result is always a pure rotation.
      if (new THREE.Matrix4().makeBasis(images[0], images[1], images[2]).determinant() < 0) {
        images[mid.index] = midDir.negate();
      }

      const quaternion = new THREE.Quaternion().setFromRotationMatrix(
        new THREE.Matrix4().makeBasis(images[0], images[1], images[2])
      );
      const angle = 2 * Math.acos(Math.min(1, Math.abs(quaternion.w)));

      // Tie-break: prefer the pose that keeps the authored up-axis pointing up,
      // then forward (so a DIMM shows its light bar towards the room).
      const mappedUp = images[1];
      let facing;
      if (mappedUp.y > 0.9) facing = 0;
      else if (mappedUp.z > 0.9) facing = 1;
      else if (mappedUp.x > 0.9) facing = 2;
      else facing = 3;

      const better =
        best === null ||
        angle < best.angle - ANGLE_EPSILON ||
        (Math.abs(angle - best.angle) <= ANGLE_EPSILON && facing < best.facing);

      if (better) best = { quaternion, angle, facing };
    }
  }

  return best ? best.quaternion : new THREE.Quaternion();
}

/**
 * Normalises a GLB scene to real-world metres and returns a group whose origin
 * sits at the centre of the footprint with the item resting on y = 0.
 *
 * Sizing comes in two flavours:
 *   realSize    - uniform scale so the longest edge is this many metres. Keeps
 *                 whatever proportions the downloader happened to author, which
 *                 is why two models of the same part can disagree: a DIMM from
 *                 one site is 133 x 3.5 x 31 mm and the "same" DIMM from
 *                 another is 2085 x 2017 x 5017 mm.
 *   realDims    - `{ length, width, height }` in metres, applied per axis after
 *                 the flat alignment. Every variant of a part then normalises to
 *                 the same true shape, so a RAM stick is always a DIMM
 *                 regardless of how its source file was built.
 *
 * The three values are given in the part's OWN terms (longest / middle /
 * thinnest) and matched to the aligned axes, so the caller does not have to know
 * which native axis the downloader put where.
 */
export function buildFittedModel(model, options = {}) {
  const {
    realSize = 0.15,
    realDims = null,
    minSize = 0,
    maxSize = Number.POSITIVE_INFINITY,
    flat = true,
    brighten = 0
  } = options;

  const { size: nativeSize, center: nativeCenter } = measureModel(model);
  const nativeMax = Math.max(nativeSize.x, nativeSize.y, nativeSize.z) || 1;

  const target = Math.min(Math.max(realSize, minSize), maxSize);
  const uniformScale = target / nativeMax;

  model.position.set(-nativeCenter.x, -nativeCenter.y, -nativeCenter.z);

  // The alignment rotation lives INSIDE the scale node, so a per-axis scale is
  // expressed in the part's own terms (longest / middle / thinnest) rather than
  // in whichever native axes the downloader happened to author.
  const alignGroup = new THREE.Group();
  if (flat) alignGroup.quaternion.copy(computeFlatAlignment(nativeSize));
  alignGroup.add(model);

  const scaleGroup = new THREE.Group();
  scaleGroup.add(alignGroup);

  let scale = uniformScale;
  if (realDims) {
    // After the flat alignment the local X axis is the longest edge, Y is the
    // thinnest and Z is the remainder - that is exactly the order the caller
    // describes its part in.
    scaleGroup.updateMatrixWorld(true);
    const aligned = new THREE.Box3().setFromObject(alignGroup).getSize(new THREE.Vector3());
    const wanted = [
      realDims.length ?? aligned.x,
      realDims.height ?? realDims.thickness ?? aligned.y,
      realDims.width ?? aligned.z
    ];
    const perAxis = [
      wanted[0] / (aligned.x || 1),
      wanted[1] / (aligned.y || 1),
      wanted[2] / (aligned.z || 1)
    ];
    scaleGroup.scale.set(perAxis[0], perAxis[1], perAxis[2]);
    scale = perAxis[0];
  } else {
    scaleGroup.scale.setScalar(uniformScale);
  }

  scaleGroup.updateMatrixWorld(true);
  const alignedBox = new THREE.Box3().setFromObject(scaleGroup);
  const alignedSize = alignedBox.getSize(new THREE.Vector3());

  const root = new THREE.Group();
  root.add(scaleGroup);
  root.position.set(
    -alignedBox.min.x - alignedSize.x / 2,
    -alignedBox.min.y,
    -alignedBox.min.z - alignedSize.z / 2
  );

  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);

  if (brighten > 0) brightenModel(root, brighten, Math.min(0.09, brighten * 0.18));

  return { group: root, box, size: box.getSize(new THREE.Vector3()), scale };
}
