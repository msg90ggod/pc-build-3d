import * as THREE from 'three';
import { ASSEMBLY_STEPS } from '../data/assemblyPlan.js';

/**
 * A clipboard lying on the near-right corner of the workbench, carrying the
 * whole build plan as a nine-line checklist.
 *
 * Why this is a prop and not another HUD panel: the player works in the room, not
 * in a menu. The guided build panel only opens once they are already standing at
 * the case, but the fetching happens out at the rack, and this board is what tells
 * them where they are in the job before they get there. Left-clicking it opens the
 * same nine steps with the parts spelled out.
 *
 * It reads `assemblyPlan` directly, so the board can never drift from the steps
 * the build panel is running.
 */

// Authored at the near-right corner of the bench, clear of the case and the
// antistatic pad on the left, the keyboard and mouse inboard of it, and well
// forward of the monitor: this bench is 2.6 x 1.2 m with the 27" panel at
// (0.75, -0.2), and anything standing near z = 0 lines up dead in front of that
// screen from most angles. The player stands at +Z, so "right, near corner" is
// +X and +Z. It sits at the far right edge because the mouse mat is centred on
// the mouse at x = 0.82 and reaches to 1.03; the two are 17 mm apart, which is
// the smallest gap that still reads as two separate objects rather than one
// dropped on top of the other.
const PLACEMENT = {
  x: 1.17,
  z: 0.4,
  yaw: -0.05
};

// The sheet lies flat (face up) on the bench, not propped on a ledge: 230 x
// 290 mm fits in the corner without reaching the 27" panel, and the player
// looks down at it from where they stand rather than at a standing sign.
const BOARD = {
  width: 0.23,
  height: 0.29,
  depth: 0.012,
  flat: true,
  surfaceY: 0.82   // the workbench top
};

// Paper is portrait 3:4 so the rows stay legible at arm's length.
const PAPER = { width: 768, height: 1024 };

const INK = '#1f2937';
const MUTED = '#9aa4b2';
const RULE = '#e4dfd4';
const PAPER_BG = '#f7f5f0';
const DONE = '#16a34a';

/**
 * The board itself. Returns a group the room parents to the bench; `update`
 * repaints the paper, and nothing else about the prop ever changes.
 */
export class BenchTodoList {
  constructor() {
    this.group = new THREE.Group();
    // flat on the bench: half the board's thickness above the surface so the
    // back of the clipboard rests on the wood instead of sinking into it
    this.group.position.set(PLACEMENT.x, BOARD.surfaceY + BOARD.depth / 2, PLACEMENT.z);
    this.group.rotation.y = PLACEMENT.yaw;

    this.canvas = document.createElement('canvas');
    this.canvas.width = PAPER.width;
    this.canvas.height = PAPER.height;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.anisotropy = 4;

    this.#buildProp();

    // The crosshair can reach the whole prop, not just the printed sheet.
    this.interactables = [this.plate, this.paper];

    // The last painted state, so a refresh that changes nothing costs no upload.
    this.painted = null;
  }

  /**
   * The clipboard: a board with a printed sheet and the clip that holds it.
   *
   * It lies flat, face up, on the bench. The sheet faces +Z in the board's own
   * frame, so laying it down is one -90 degree turn about X: the printed side
   * ends up pointing at the ceiling and the top of the list runs towards the
   * back of the bench, which is the way you read a sheet on a table.
   */
  #buildProp() {
    const { width, height, depth } = BOARD;

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8a5a2b,
      roughness: 0.55,
      metalness: 0.08
    });
    const clipMat = new THREE.MeshStandardMaterial({
      color: 0xb9c0c8,
      roughness: 0.3,
      metalness: 0.85
    });

    const plate = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), frameMat);
    plate.castShadow = true;
    plate.receiveShadow = true;
    plate.userData = { type: 'todoList' };
    this.plate = plate;

    // The sheet is unlit on purpose: a checklist nobody can read in a dim corner
    // of the workshop is no checklist at all. The monitor panel in this same room
    // takes the same trade.
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.9, height * 0.87),
      new THREE.MeshBasicMaterial({ map: this.texture })
    );
    paper.position.set(0, -height * 0.035, depth / 2 + 0.0012);
    // the sheet is the big click target; the frame and clip make the whole prop
    // reachable too, so aiming at the board never falls through to the bench
    paper.userData = { type: 'todoList' };
    this.paper = paper;

    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.022, 0.018), clipMat);
    clip.position.set(0, height / 2 - 0.016, depth / 2 + 0.006);
    clip.castShadow = true;

    // Laid flat: one turn about X puts the printed side up and the top of the
    // list towards the back of the bench.
    const laid = new THREE.Group();
    laid.add(plate, paper, clip);
    laid.rotation.x = -Math.PI / 2;
    this.group.add(laid);
  }

  /**
   * Repaints the sheet.
   *
   * @param {object} state
   * @param {number} state.currentStep
   * @param {number} state.totalSteps
   * @param {Set<number>} state.completed  steps already done
   * @param {boolean} state.allDone
   */
  update(state) {
    if (!this.ctx) return;
    const key = this.#fingerprint(state);
    if (key === this.painted) return;
    this.painted = key;

    this.#paint(state);
    this.texture.needsUpdate = true;
  }

  /** Cheap identity for "is the list actually different from what is on the board". */
  #fingerprint(state) {
    if (!state) return 'none';
    const done = state.completed ? state.completed.size : 0;
    return `${state.currentStep || 0}/${state.totalSteps || 0}:${done}:${state.allDone ? 1 : 0}`;
  }

  /**
   * The whole plan, every step on one sheet.
   *
   * It used to print only the live step and the parts it wanted. That is the
   * guided build panel's job; standing out in the room, the player wants the
   * shape of the whole job at a glance instead - what is done, what is next, how
   * much is left. Clicking the board opens the same list with the parts spelled
   * out.
   */
  #paint(state) {
    const ctx = this.ctx;
    const w = PAPER.width;
    const h = PAPER.height;
    const margin = 46;
    const total = state?.totalSteps || ASSEMBLY_STEPS.length;
    const completed = state?.completed || new Set();
    const current = state?.currentStep || 1;
    const allDone = !!state?.allDone || completed.size >= total;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = PAPER_BG;
    ctx.fillRect(0, 0, w, h);

    // ---- header band
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, w, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = this.#font(44, 800);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QUY TRÌNH LẮP RÁP', w / 2, 52);

    // ---- progress line
    ctx.textAlign = 'left';
    ctx.fillStyle = INK;
    ctx.font = this.#font(36, 800);
    ctx.fillText(`BƯỚC ${Math.min(current, total)} / ${total}`, margin, 150);

    ctx.textAlign = 'right';
    ctx.fillStyle = allDone ? DONE : MUTED;
    ctx.font = this.#font(28, 700);
    ctx.fillText(`${completed.size}/${total} xong`, w - margin, 150);

    ctx.fillStyle = RULE;
    ctx.fillRect(margin, 178, w - margin * 2, 3);

    // ---- one ruled row per step
    const box = 40;
    const top = 232;
    const pitch = 76;
    const nameX = margin + box + 54;

    ASSEMBLY_STEPS.forEach((step, i) => {
      const y = top + i * pitch;
      const done = completed.has(step.step);
      const live = !allDone && step.step === current;

      // the live step gets a band so it is findable without reading every number
      if (live) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fillRect(margin - 12, y - 26, w - (margin - 12) * 2, 58);
      }

      // tick box
      ctx.fillStyle = done ? DONE : '#ffffff';
      ctx.strokeStyle = done ? DONE : '#9aa4b2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.rect(margin, y - box / 2, box, box);
      ctx.fill();
      ctx.stroke();
      if (done) this.#check(ctx, margin + box / 2, y, 14, '#ffffff', 5);

      // step number
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = MUTED;
      ctx.font = this.#font(24, 700);
      ctx.fillText(String(step.step), margin + box + 26, y);

      // the step itself
      ctx.textAlign = 'left';
      ctx.fillStyle = done ? MUTED : INK;
      ctx.font = this.#font(28, live ? 800 : 600);
      ctx.fillText(
        this.#ellipsize(ctx, step.shortName || `Bước ${step.step}`, w - nameX - margin, 28, live ? 800 : 600),
        nameX, y
      );

      // ruled line under the row
      ctx.strokeStyle = RULE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin - 12, y + pitch / 2 - 8);
      ctx.lineTo(w - margin + 12, y + pitch / 2 - 8);
      ctx.stroke();
    });

    this.#paintHint(
      ctx, w, h,
      allDone ? `✓ Xong hết ${total} bước` : 'Chuột trái vào bảng này để xem chi tiết'
    );
  }

  /** The instruction strip along the bottom of the sheet. */
  #paintHint(ctx, w, h, text) {
    ctx.fillStyle = '#e7e2d8';
    ctx.fillRect(0, h - 96, w, 96);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(0, h - 96, w, 4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#78350f';
    ctx.font = this.#font(25, 600);
    ctx.fillText(this.#ellipsize(ctx, text, w - 80, 25, 600), w / 2, h - 46);
  }

  /** A tick drawn as two strokes rather than a glyph, so no font can lose it. */
  #check(ctx, cx, cy, r, colour, width) {
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy + r * 0.05);
    ctx.lineTo(cx - r * 0.25, cy + r * 0.7);
    ctx.lineTo(cx + r, cy - r * 0.65);
    ctx.stroke();
    ctx.restore();
  }

  /** The font stack every line on the sheet uses. */
  #font(size, weight) {
    return `${weight} ${size}px "Segoe UI", "Noto Sans", sans-serif`;
  }

  /**
   * Shortens `text` until it fits `maxWidth`, so a long step name can never run
   * off the paper.
   */
  #ellipsize(ctx, text, maxWidth, startSize = 40, weight = 400) {
    if (!text) return '';
    if (maxWidth <= 0) return '';
    for (let size = startSize; size >= 18; size -= 2) {
      ctx.font = this.#font(size, weight);
      if (ctx.measureText(text).width <= maxWidth) return text;
    }
    ctx.font = this.#font(18, weight);
    let cut = text;
    while (cut.length > 1 && ctx.measureText(`${cut}...`).width > maxWidth) {
      cut = cut.slice(0, -1);
    }
    return `${cut}...`;
  }
}