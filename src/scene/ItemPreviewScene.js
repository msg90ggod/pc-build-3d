import * as THREE from 'three';
import { loadModelCopy } from './ModelCache.js';
import { computeFlatAlignment, measureModel } from './ModelFit.js';

export class ItemPreviewScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
    this.camera.position.set(0, 0, 1.7);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(canvas.clientWidth || 360, canvas.clientHeight || 360, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.currentModel = null;
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.autoRotate = true;
    this.viewTilt = 0.26;
    this.framedAspect = null;

    this.setupLighting();
    this.setupControls();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(2, 4, 3);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-2, -1, -2);
    this.scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xa855f7, 0.8);
    fillLight.position.set(-2, 2, 2);
    this.scene.add(fillLight);
  }

  setupControls() {
    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.autoRotate = false;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', e => {
      if (!this.isDragging || !this.currentModel) return;
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.currentModel.rotation.y += deltaX * 0.01;
      this.currentModel.rotation.x += deltaY * 0.01;

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch support
    this.canvas.addEventListener('touchstart', e => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.autoRotate = false;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    });

    window.addEventListener('touchmove', e => {
      if (!this.isDragging || !this.currentModel || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
      this.currentModel.rotation.y += deltaX * 0.01;
      this.currentModel.rotation.x += deltaY * 0.01;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  loadItemModel(modelPath, options = {}) {
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }

    // Shared with the bench and the build zone, so previewing a part the player
    // is already looking at costs a clone rather than another parse.
    loadModelCopy(modelPath).then(model => {
      if (model) this.setModel(model, options);
    });
  }

  setModel(model, options = {}) {
    const { alignFlat = true, autoFit = 0.95, tilt = this.viewTilt, realDims = null } = options;

    this.resize();

    const { size } = measureModel(model);
    const nativeMax = Math.max(size.x, size.y, size.z) || 1;

    // Same tidy pose the world uses: thinnest axis up, longest edge horizontal
    const baseWrapper = new THREE.Group();
    baseWrapper.add(model);
    if (alignFlat) baseWrapper.quaternion.copy(computeFlatAlignment(size));

    // Compute bounding box strictly AFTER applying the alignment
    baseWrapper.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(baseWrapper);
    const center = box.getCenter(new THREE.Vector3());

    // Shift baseWrapper so its true geometric centre is at (0, 0, 0): the camera
    // aims at the origin, so this is what keeps the part centred in the panel
    baseWrapper.position.set(-center.x, -center.y, -center.z);

    const scaleGroup = new THREE.Group();
    // Frame the part to fill the panel, but in its REAL proportions: a plain
    // uniform scale showed the Corsair Dominator (native cross-section nearly
    // square) as a 55 mm-thick brick, while the same item on the bench and in
    // the Build Zone is a 7 mm DIMM. The per-axis ratio is renormalised so the
    // framing is unchanged.
    const auto = autoFit / nativeMax;
    if (realDims) {
      const aligned = box.getSize(new THREE.Vector3());
      const wanted = [
        realDims.length ?? aligned.x,
        realDims.height ?? realDims.thickness ?? aligned.y,
        realDims.width ?? aligned.z
      ];
      const ratio = new THREE.Vector3(
        wanted[0] / (aligned.x || 1),
        wanted[1] / (aligned.y || 1),
        wanted[2] / (aligned.z || 1)
      );
      scaleGroup.scale.copy(ratio).multiplyScalar(auto / Math.max(ratio.x, ratio.y, ratio.z, 1e-9));
    } else {
      scaleGroup.scale.setScalar(auto);
    }
    scaleGroup.add(baseWrapper);

    // Outer pivot: view tilt here, auto-spin added on top during render
    const pivot = new THREE.Group();
    pivot.rotation.x = tilt;
    pivot.add(scaleGroup);

    this.currentModel = pivot;
    this.scene.add(this.currentModel);
    this.autoRotate = true;

    this.frameModel();
  }

  /**
   * Pulls the camera to whatever distance makes the part fill the panel evenly.
   * Fitting the actual projected corners (instead of a fixed distance) means flat
   * parts such as a motherboard or a GPU use the whole box instead of showing up
   * as a thin sliver in a wide viewport.
   */
  frameModel() {
    if (!this.currentModel) return;

    this.currentModel.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.currentModel);
    const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);

    const cam = this.camera;
    const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const tanH = tanV * cam.aspect;
    const margin = 1.1;

    const dist = Math.max(half.y / tanV, half.x / tanH) * margin + half.z;

    cam.position.set(0, 0, dist);
    cam.lookAt(0, 0, 0);
    cam.near = Math.max(0.01, dist - half.z * 2 - 0.05);
    cam.far = dist + half.z * 2 + 10;
    cam.updateProjectionMatrix();

    this.framedAspect = cam.aspect;
  }

  resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;

    // Match the drawing buffer, not the CSS box, otherwise the comparison below
    // is never satisfied and the renderer gets resized on every single frame.
    const bufferW = Math.floor(width * this.pixelRatio);
    const bufferH = Math.floor(height * this.pixelRatio);
    if (this.canvas.width !== bufferW || this.canvas.height !== bufferH) {
      this.renderer.setSize(width, height, false);
    }

    const aspect = width / height;
    if (Math.abs(aspect - this.camera.aspect) < 1e-6) return;

    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    // Panel proportions changed: re-fit so the part stays centred and full size
    this.frameModel();
  }

  render() {
    this.resize();
    if (this.currentModel && this.autoRotate && !this.isDragging) {
      this.currentModel.rotation.y += 0.008;
    }
    this.renderer.render(this.scene, this.camera);
  }
}
