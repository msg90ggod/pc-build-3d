import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { sounds } from '../audio/SoundEffects.js';
import { BuildScene } from '../scene/BuildScene.js';
import { ItemThumbnailBaker } from '../scene/ItemThumbnails.js';
import { ASSEMBLY_STEPS, TOTAL_STEPS, stepAccepts, stepPartLabels } from '../data/assemblyPlan.js';
import { CASE_ZONES } from '../scene/caseLayout.js';

const POST_SEQUENCE = [
  { at: 900, state: 'NO_SIGNAL', text: 'Chưa có tín hiệu — đang chờ cấp màn hình' },
  { at: 2400, state: 'POST', text: 'POST: đang nhận diện CPU, RAM, ổ cứng' },
  { at: 5600, state: 'OS', text: 'POST thành công — hệ thống đã khởi động' }
];

const FALLBACK_GLYPH = {
  motherboard: '📚', cpu: '🧮', cooler: '🔮', ram: '🛏',
  gpu: '🎮', storage: '📂', psu: '⚡'
};

/**
 * Build Mode: a guided 12-step assembly of the PC case.
 *
 * Hardware slots render real 3D model thumbnails, the selected part rides the
 * cursor inside the Build Zone, and every step demands the right physical action
 * (seat it, latch it, screw it down) before the next unlocks.
 */
export class BuildModeUI {
  constructor({ inventoryUI, room, onRequestLock, onAssembled, onProgressChange }) {
    this.inventoryUI = inventoryUI;
    this.room = room;
    this.onRequestLock = onRequestLock;
    this.onAssembled = onAssembled;
    // the parts to-do list on the bench is a room prop driven from here: which
    // step is live, and what is done, are both owned by this class
    this.onProgressChange = onProgressChange;

    this.isOpen = false;
    this.completed = new Set();
    this.currentStep = 1;
    this.selectedItem = null;
    this.pendingPress = null;   // part waiting to be latched down
    this.orbiting = false;     // true while the right button is held down
    this._orbitLast = { x: 0, y: 0 };

    this.pasteApplied = false;   // thermal paste on the CPU IHS
    this.postTimers = [];
    this.isFinished = false;
    this._v = new THREE.Vector3();

    this.thumbnails = new ItemThumbnailBaker({ size: 144 });

    this.dom = {
      modal: document.getElementById('build-mode-modal'),
      canvas: document.getElementById('build-case-canvas'),
      close: document.getElementById('btn-close-build-mode'),
      stepBadge: document.getElementById('build-step-badge'),
      stepTitle: document.getElementById('build-step-title'),
      stepDesc: document.getElementById('build-step-desc'),
      stepTip: document.getElementById('build-step-tip'),
    stepParts: document.getElementById('build-step-parts'),
      stepHint: document.getElementById('build-step-hint'),
      progress: document.getElementById('build-progress-fill'),
      checklist: document.getElementById('build-checklist'),
      list: document.getElementById('build-slot-list'),
      listEmpty: document.getElementById('build-slot-empty'),
      glassBtn: document.getElementById('btn-toggle-glass'),
      glassTag: document.getElementById('glass-status-tag'),
      zoomTag: document.getElementById('build-zoom-tag'),
      turnTag: document.getElementById('build-turn-tag'),

      hint: document.getElementById('build-zone-hint'),
      toast: document.getElementById('build-toast'),
      actionBar: document.getElementById('build-action-bar'),
      resetBtn: document.getElementById('btn-build-reset'),
      finishBtn: document.getElementById('btn-build-finish')
    };

    this.scene = this.dom.canvas ? new BuildScene(this.dom.canvas) : null;
    this.setupDOM();
  }

  // ------------------------------------------------------------------ DOM
  setupDOM() {
    const { close, glassBtn, resetBtn, finishBtn, canvas, modal } = this.dom;
    if (!modal) return;

    close?.addEventListener('click', () => this.close());
    glassBtn?.addEventListener('click', () => this.toggleGlass());
    resetBtn?.addEventListener('click', () => this.reset());
    finishBtn?.addEventListener('click', () => this.finishBuild());

    modal.addEventListener('click', e => {
      if (e.target === modal) this.close();
    });

    window.addEventListener('keydown', e => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }
      // Home pulls the eye back to the authored front view. Without an obvious
      // way back, an orbit that left the glass side turned away would make the
      // build zone hard to read.
      if (e.code === 'Home') {
        e.preventDefault();
        this.resetView();
      }
    });

    // An orbit that ends outside the window, or the button being released over
    // another element, would otherwise leave the view stuck to the cursor.
    window.addEventListener('pointerup', () => this.endOrbit());
    window.addEventListener('pointercancel', () => this.endOrbit());
    window.addEventListener('blur', () => this.endOrbit());


    if (canvas) {
      canvas.addEventListener('pointermove', e => this.onPointerMove(e));
      canvas.addEventListener('pointerenter', e => this.onPointerMove(e));
      canvas.addEventListener('pointerleave', () => this.onPointerLeave());
      canvas.addEventListener('pointerdown', e => this.onPointerDown(e));
      canvas.addEventListener('pointerup', e => this.onPointerUp(e));
      canvas.addEventListener('contextmenu', e => e.preventDefault());
      // Scroll wheel zooms the Build Zone. Orbiting the camera is on the right
      // mouse button, because the left one is already busy with screws, paste and
      // seating a part, and the wheel is the only free zoom on a modal.
      canvas.addEventListener('wheel', e => {
        e.preventDefault();
        if (!this.scene) return;
        this.scene.zoomBy(e.deltaY / 100);
        this.setZoomBadge();
      }, { passive: false });
    }
  }


  setZoomBadge() {
    const el = this.dom.zoomTag;
    if (!el || !this.scene) return;
    el.textContent = `🔍 Thu phóng ${Math.round(this.scene.zoom * 100)}%`;
  }

  /**
   * Shows that the view has been dragged off the authored front angle, which is
   * the moment the player might want to pull it square again with Home.
   */
  setViewBadge() {
    const el = this.dom.turnTag;
    if (!el || !this.scene) return;
    const deg = r => Math.round(THREE.MathUtils.radToDeg(r));
    const off = this.scene.isOrbitingOff;
    if (!off) {
      const text = '🔄 Chuột phải: xoay góc nhìn';
      if (el.textContent !== text) el.textContent = text;
      el.classList.remove('turned');
      return;
    }
    const text = `🔄 Góc nhìn: ↻${deg(this.scene.orbitYaw)}° ↕${deg(this.scene.orbitPitch)}°`;
    if (el.textContent !== text) el.textContent = text;
    el.classList.add('turned');
  }


  // ------------------------------------------------------------ lifecycle
  open() {
    if (!this.dom.modal) return;
    this.dom.modal.classList.add('active');
    this.isOpen = true;
    sounds.playClick();
    // Each build session starts from the authored front view, so an orbit left
    // off-axis from the last run cannot greet the player that way.
    this.scene?.resetView();
    this.setViewBadge();
    this.renderStep();
    this.renderChecklist();
    this.renderSlots();

    if (this.scene) {
      this.scene.resize();
      this.scene.setFocusZone(this.activeStep()?.zone || null);
      this.scene.snapCamera();
      this.scene.setZoneState(this.activeStep()?.zone || null, 'active');
    }
    this.updateGlassUi();
    this.warnIfHardwareMissing();
    this.onProgressChange?.();
  }

  /** Tells the player exactly which part to go and fetch from the rack. */
  warnIfHardwareMissing() {
    const step = this.activeStep();
    if (!step || !step.accepts.length) return;
    const have = this.availableItems();
    const missing = [];
    for (const rule of step.accepts) {
      const match = rule.startsWith('tag:')
        ? have.find(i => (i.tag || '').toLowerCase() === rule.slice(4).toLowerCase())
        : have.find(i => i.id === rule);
      if (!match) missing.push(rule.startsWith('tag:') ? rule.slice(4) : rule);
    }
    if (missing.length) {
      this.setToast(
        `Buước ${step.step} cần ${missing.join(' / ')} — hãy nhặt ở bàn linh kiện và bỏ vào túi (phím E) trước đã.`,
        'warn'
      );
    }
  }

  close() {
    if (!this.dom.modal) return;
    this.clearPostTimers();
    this.dom.modal.classList.remove('active');
    this.isOpen = false;
    this.endOrbit();
    this.scene?.clearPointer();
    this.scene?.clearGhost();
    this.setZoneHint(null);
    this.setToast(null);
    this.onRequestLock?.();
    this.onProgressChange?.();
  }


  reset() {
    this.completed.clear();
    this.currentStep = 1;
    this.isFinished = false;
    this.pendingPress = null;
    this.pasteApplied = false;
    this.clearPostTimers();
    this.onProgressChange?.();
    if (this.scene) {
      // take every installed part back out, otherwise a rebuild is impossible
      this.returnPartsToBackpack();
      this.scene.hideScrews();
      this.scene.setPower(false);
      this.scene.lockedZone = null;
      // a fresh chassis arrives closed, exactly like one on the bench
      this.scene.setGlass(true, true);
      this.scene.setFocusZone(this.activeStep()?.zone || null);
      this.scene.snapCamera();
    }
    this.selectedItem = null;
    this.room.setMonitorState('OFF');
    this.renderStep();
    this.renderChecklist();
    this.renderSlots();
    this.updateGlassUi();
    this.setToast('↺ Đặt lại toàn bệ quy trình lắp ráp.', 'info');
  }

  /** Gives every part currently seated in the case back to the backpack. */
  returnPartsToBackpack() {
    if (!this.scene) return 0;
    const items = [...this.scene.placedParts.values()].map(entry => entry.item);
    items.forEach(item => this.inventoryUI.addItem(item));
    this.scene.clearParts();
    return items.length;
  }

  /**
   * Bolt the glass back on and hand the finished machine to the world as one
   * grouped object. Everything installed during the session travels with it.
   */
  finishBuild() {
    if (!this.scene || this.isFinished) return null;
    if (this.completed.size < TOTAL_STEPS) {
      this.setToast(`Cần ${TOTAL_STEPS - this.completed.size} bước chưa hoàn thành.`, 'warn');
      return null;
    }
    if (!this.scene.placedParts.size) {
      this.setToast('Chưa có linh kiện nào nằm trong thùng.', 'warn');
      return null;
    }

    sounds.playSnap();
    const result = this.scene.finalize();
    this.isFinished = true;
    this.scene.clearZoneStates();

    // drop the build-mode chrome: the machine now lives in the room
    if (this.dom.finishBtn) this.dom.finishBtn.style.display = 'none';
    if (this.dom.resetBtn) this.dom.resetBtn.style.display = 'none';
    if (this.dom.glassBtn) this.dom.glassBtn.style.display = 'none';
    this.setZoneHint(null);
    this.setToast('🔒 Vặn nắp kính. Máy tính của bạn đã sẵn sàng!', 'ok');
    this.renderStep();
    this.renderActionBar();
    this.close();
    if (this.onAssembled) this.onAssembled(result);
    return result;
  }

  // ----------------------------------------------------------- step logic
  activeStep() {
    return ASSEMBLY_STEPS.find(s => s.step === this.currentStep) || null;
  }

  isStepDone(stepNumber) {
    return this.completed.has(stepNumber);
  }

  get allDone() {
    return this.completed.size >= TOTAL_STEPS;
  }

  completeStep(stepNumber, message) {
    if (this.completed.has(stepNumber)) return;
    this.completed.add(stepNumber);
    this.pendingPress = null;
    this.pasteApplied = false;
    sounds.playSnap();
    this.setToast(message || `Hoàn thành bước ${stepNumber}.`, 'ok');
    this.renderStep();
    this.renderChecklist();
    this.renderSlots();

    if (this.completed.size >= TOTAL_STEPS) {
      this.currentStep = TOTAL_STEPS;
      this.onPowered();
      this.onProgressChange?.();
      return;
    }
    this.currentStep = Math.max(this.currentStep, stepNumber + 1);
    this.scene?.setFocusZone(this.activeStep()?.zone || null);
    this.updateGhostItem();
    this.onProgressChange?.();
  }

  /** How many parts of the current step are seated *and* latched down. */
  pressedCount(zoneId) {
    let n = 0;
    this.scene?.placedParts.forEach(entry => {
      if (entry.zoneId === zoneId && entry.pressed) n++;
    });
    return n;
  }

  // ------------------------------------------------------------- pointers
  /**
   * The carried part only follows the cursor while the step is actually a
   * placement. On fastener, paste and press steps the cursor is driving
   * something else, and a part swimming around the canvas is
   * both misleading and the reason it appeared to escape the chassis.
   */
  get ghostArmed() {
    if (!this.selectedItem) return false;
    const step = this.activeStep();
    if (!step || !step.need) return false;
    if (this.scene.screwsFor(step.zone) > 0) return false;
    if (this.pendingPress) return false;
    return true;
  }

  onPointerMove(e) {
    if (!this.scene) return;

    // Orbiting the view: the delta is taken against the previous position and the
    // ghost is deliberately not refreshed, otherwise it would chase the cursor
    // across the interior mid-drag.
    if (this.orbiting) {
      const dx = e.clientX - this._orbitLast.x;
      const dy = e.clientY - this._orbitLast.y;
      this._orbitLast.x = e.clientX;
      this._orbitLast.y = e.clientY;
      this.scene.orbitBy(dx, dy);
      this.setViewBadge();
      return;
    }

    this.scene.setPointer(e.clientX, e.clientY);
    this.scene.updateGhost(this.activeStep()?.zone, this.ghostArmed);
    this.updateCursorHint();
  }

  onPointerLeave() {
    if (!this.scene) return;
    if (this.orbiting) return;
    this.scene.clearPointer();
    this.scene.updateGhost(this.activeStep()?.zone, this.ghostArmed);
    this.setZoneHint(null);
  }

  onPointerUp(e) {
    if (e.button === 2) this.endOrbit();
  }

  /** Returns the eye to the authored front view. */
  resetView() {
    if (!this.scene) return;
    this.endOrbit();
    this.scene.resetView();
    this.setViewBadge();
    this.setToast('↺ Đưa góc nhìn thùng máy về góc mặc định.');
    this.refreshGhost();
  }

  endOrbit() {
    if (!this.orbiting) return;
    // Pointer moves are swallowed during the orbit, so the scene's cursor
    // position is whatever it was when the button went down. Re-seat it on the
    // last known spot or the ghost reappears where the player left it.
    this.scene.setPointer(this._orbitLast.x, this._orbitLast.y);
    this.orbiting = false;
    this.scene.endOrbit();
    document.body.classList.remove('build-orbiting');
    // The view may now frame something new, so re-seat the ghost on the part
    this.refreshGhost();
  }

  /** Re-runs the ghost after something invalidated its cached pointer position. */
  refreshGhost() {
    if (!this.scene) return;
    this.scene.updateGhost(this.activeStep()?.zone, this.ghostArmed);
    this.updateCursorHint();
  }

  async onPointerDown(e) {
    if (!this.scene) return;

    // Right mouse button orbits the eye around the chassis. The case and its
    // cargo stay put; only the camera moves.
    if (e.button === 2) {
      this.orbiting = true;
      this._orbitLast = { x: e.clientX, y: e.clientY };
      this.scene.beginOrbit(e.clientX, e.clientY);
      document.body.classList.add('build-orbiting');
      return;
    }
    if (e.button !== 0) return;

    this.scene.setPointer(e.clientX, e.clientY);

    const step = this.activeStep();
    if (!step) return;
    const zoneId = step.zone;

    // 1. Fasteners first, once a part is bolted down
    if (this.scene.screwsFor(zoneId) > 0) {
      const result = this.scene.hitScrew(e.clientX, e.clientY, zoneId);
      if (result === 'tightened') {
        sounds.playScrew();
        this.renderActionBar();
        this.updateCursorHint();
        if (this.scene.screwsFor(zoneId) === 0) this.finishScrewStep(step);
      } else {
        this.setToast('Bấm đúng vào đầu ốc mũi vặn để siết.', 'warn');
      }
      return;
    }

    // 2. Thermal paste gate before the cooler can be screwed down
    if (step.action === 'paste' && this.pendingPress && !this.pasteApplied) {
      if (this.scene.isOverZone('cpu')) {
        this.pasteApplied = true;
        this.scene.flashZone('cpu');
        sounds.playClick();
        this.setToast('🧑 Bôi keo tản nhiệt lên nắp lưng CPU. Giờ siết 4 ốc của tản khí.', 'ok');
        this.startScrewStep(step);
      } else {
        this.setToast('Bấm vào vị trí CPU trên bo mạch để bôi keo tản nhiệt.', 'warn');
      }
      return;
    }

    // 3. Press the part down / close the retention latch
    if (step.action === 'seat' && this.pendingPress) {
      if (this.scene.isOverZone(zoneId)) {
        const entry = this.scene.placedParts.get(this.pendingPress);
        if (entry) entry.pressed = true;
        this.scene.flashZone(zoneId);
        sounds.playSnap();
        const done = this.pressedCount(zoneId);
        if (done >= step.need) {
          this.pendingPress = null;
          this.completeStep(step.step, done > 1
            ? `✅ Đã cắm ${done} thanh, khe chờt kín khít.`
            : '⬇️ Lắp về ổ khắt vào socket.');
        } else {
          this.pendingPress = null;
          this.setToast(`🧩 Lắp ${done}/${step.need}. Chọn thanh tiếp theo trong danh sách.`, 'info');
          this.updateGhostItem();
        }
        this.renderActionBar();
      } else {
        this.setToast(`Bấm vào ${CASE_ZONES[zoneId].label.toLowerCase()} để ấn linh kiện xuống cho khớt.`, 'warn');
      }
      return;
    }

    // 4. Steps that need no hardware
    if (step.need === 0) {
      this.handleActionStep(step, e);
      return;
    }

    // 5. Seat a hardware part
    if (!this.selectedItem) {
      this.setToast('Chọn linh kiện ở danh sách bên phải trước đã.', 'warn');
      return;
    }
    if (!stepAccepts(step, this.selectedItem)) {
      this.setToast(`${this.selectedItem.name} không dùng được cho bước này.`, 'warn');
      return;
    }
    if (!this.scene.ghostOverTarget) {
      this.setToast(`📤 Đưa model tối ${CASE_ZONES[zoneId].label.toLowerCase()} rồi bấm chuột trái.`, 'warn');
      return;
    }

    await this.seatPart(step);
  }

  async seatPart(step) {
    const item = this.selectedItem;
    const zoneId = step.zone;
    const partKey = `${zoneId}:${item.id}:${this.pressedCount(zoneId)}`;

    if (this.scene.placedParts.size && this.scene.partAt(zoneId) &&
        [...this.scene.placedParts.values()].filter(p => p.zoneId === zoneId).length >= step.need) {
      this.setToast('Vị trí này đã đủ linh kiện rồi.', 'warn');
      return;
    }

    this.scene.clearGhost();
    const ok = await this.scene.placePart(item, zoneId, partKey);
    if (!ok) {
      this.setToast('Không tải được model linh kiện này.', 'warn');
      this.updateGhostItem();
      return;
    }

    this.scene.flashZone(zoneId);
    sounds.playClick();
    this.moveToBackpack(item);
    this.scene.setFocusZone(zoneId);
    this.renderActionBar();

    if (step.action === 'paste' || step.action === 'seat') {
      this.pendingPress = partKey;
      this.setToast(
        step.action === 'paste'
          ? 'Tản khí đã đặt lên socket. Bấm vào CPU để bôi keo tản nhiệt.'
          : 'Bấm chuột trái lần nữa vào vị trí này để ấn linh kiện xuống cho khớt.',
        'info'
      );
      this.updateGhostItem();
      return;
    }

    this.startScrewStep(step);
  }

  startScrewStep(step) {
    const count = step.screws ?? CASE_ZONES[step.zone]?.screws ?? 0;
    if (!count) {
      this.completeStep(step.step);
      return;
    }
    this.scene.showScrews(step.zone, count);
    this.scene.setFocusZone(step.zone);
    this.setToast(`Cần ${count} ốc. Bấm vào từng đầu ốc mũi vặn để siết chặt.`, 'info');
    this.renderActionBar();
    this.updateGhostItem();
    this.updateCursorHint();
  }

  finishScrewStep(step) {
    this.scene.hideScrews(step.zone);
    this.renderActionBar();
    this.updateCursorHint();
    this.completeStep(
      step.step,
      step.action === 'paste'
        ? 'Kẻo tản nhiệt đã bôi, tản khí siết chặt.'
        : '🔤 Đã siết đủ ốc, linh kiện cố định trong thùng.'
    );
  }

  // ------------------------------------------------- action-only steps
  handleActionStep(step, e) {
    const zoneId = step.zone;

    if (step.action === 'glass') {
      const wantOn = step.step === TOTAL_STEPS;
      if (this.scene.glassOn !== wantOn) {
        this.toggleGlass();
      } else {
        this.setToast(wantOn
          ? 'Nắp kính đã được lắp lại. Bấm nút để tháo ra nừu cần.'
          : 'Nắp kính đã tháo rồi.', 'info');
      }
      return;
    }

    if (step.action === 'display') {
      if (this.scene.isOverZone(zoneId)) {
        this.scene.flashZone(zoneId);
        sounds.playSnap();
        this.completeStep(step.step, '🔌 Cắm DisplayPort từ card đồ hịa ra màn hình.');
      } else {
        this.setToast('Bấm vào cổng DisplayPort ở mặt sau thùng.', 'warn');
      }
      return;
    }

    if (step.action === 'power') {
      if (this.scene.isOverZone(zoneId)) {
        this.scene.setPower(true);
        this.scene.flashZone(zoneId);
        sounds.playPowerSwitch();
        this.room.setMonitorState('NO_SIGNAL');
        this.completeStep(step.step, '🔛 Bật nguồn. Hệ thống đang chạy POST...');
        this.schedulePost();
      } else {
        this.setToast('Bấm vào nút nguồn trên nắp trên của thùng.', 'warn');
      }
    }
  }

  // ------------------------------------------------------------ POST / OS
  schedulePost() {
    this.clearPostTimers();
    POST_SEQUENCE.forEach(entry => {
      this.postTimers.push(setTimeout(() => {
        this.room.setMonitorState(entry.state);
        this.setToast(entry.text, 'info');
      }, entry.at));
    });
  }

  clearPostTimers() {
    this.postTimers.forEach(t => clearTimeout(t));
    this.postTimers = [];
  }

  onPowered() {
    this.setToast('Chúc mừng! Bạn đã lắp ráp thành công đủ 12 bước.', 'ok');
    this.renderStep();
    this.renderChecklist();
    // confetti needs a real 2D canvas, so never let it break the win state
    try {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 90, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 90, angle: 120, spread: 55, origin: { x: 1 } });
      }, 400);
    } catch (err) {
      console.warn('Confetti unavailable:', err);
    }
  }

  // ------------------------------------------------------------ inventory
  moveToBackpack(item) {
    this.inventoryUI.removeItem(item.id);
    this.selectedItem = null;
    this.renderSlots();
  }

  availableItems() {
    return this.inventoryUI.slots.filter(Boolean);
  }

  renderSlots() {
    const { list, listEmpty } = this.dom;
    if (!list) return;
    const step = this.activeStep();
    list.innerHTML = '';
    const items = this.availableItems();
    if (listEmpty) listEmpty.style.display = items.length ? 'none' : 'flex';

    items.forEach(item => {
      const usable = step ? stepAccepts(step, item) : false;
      const chosen = this.selectedItem?.id === item.id;
      const row = document.createElement('div');
      row.className = 'build-slot' + (usable ? ' usable' : '') + (chosen ? ' selected' : '');
      row.innerHTML = `
        <div class="build-slot-thumb">
          <img alt="" />
          <span class="build-slot-fallback">${FALLBACK_GLYPH[item.categoryKey] || '❓'}</span>
        </div>
        <div class="build-slot-text">
          <div class="build-slot-name">${item.name}</div>
          <div class="build-slot-tag tag-${item.categoryKey}">${item.tag}</div>
        </div>
        <div class="build-slot-state">${usable ? 'Dùng được' : ''}</div>
      `;
      row.addEventListener('click', () => this.selectSlotItem(item));
      list.appendChild(row);

      const img = row.querySelector('img');
      const cached = this.thumbnails.cache.get(item.id);
      if (cached) {
        img.src = cached;
        img.classList.add('ready');
      } else if (usable) {
        // Only the parts this step can actually take get baked. Rendering a
        // thumbnail is a GPU readback per part, and the list may hold two dozen
        // items of which two or three are usable right now.
        this.thumbnails.get(item).then(url => {
          if (!url || !img.isConnected) return;
          img.src = url;
          img.classList.add('ready');
        }).catch(() => {});
      }
      // Anything unusable keeps the category glyph until its own step arrives.
    });

    // Warm the next step's options while the player reads this one, so the
    // thumbnails are usually ready before they are needed.
    const next = ASSEMBLY_STEPS.find(s => s.step === (this.activeStep()?.step || 0) + 1);
    if (next) {
      this.thumbnails.prime(items.filter(item => stepAccepts(next, item)));
    }
  }

  async selectSlotItem(item) {
    const step = this.activeStep();
    sounds.playClick();
    if (step && !stepAccepts(step, item)) {
      this.setToast(`${item.name} không dùng được cho bước ${step.step}.`, 'warn');
      return;
    }
    this.selectedItem = item;
    this.renderSlots();
    await this.updateGhostItem(item);
    this.setToast(`📦 Cầm ${item.name}. Rê chuột trong Build Zone rồi bấm chuột trái để lắp.`, 'info');
  }

  async updateGhostItem(item) {
    if (!this.scene) return;
    if (!item) {
      this.scene.clearGhost();
      this.setZoneHint(null);
      return;
    }
    const step = this.activeStep();
    if (!step) return;
    await this.scene.setGhostItem(item);
    this.scene.setZoneState(step.zone, 'active');
    this.scene.updateGhost(step.zone, this.ghostArmed);
  }

  updateCursorHint() {
    if (!this.scene) return;
    const step = this.activeStep();
    if (!step) return this.setZoneHint(null);
    const zoneId = step.zone;

    if (this.scene.screwsFor(zoneId) > 0) {
      return this.setZoneHint('🔩 Bấm vào đầu ốc vặn để siết chặt', 'action');
    }
    if (step.action === 'paste' && this.pendingPress && !this.pasteApplied) {
      return this.setZoneHint('🧑️ Bấm vào CPU để bôi keo tản nhiệt', 'action');
    }
    if (step.action === 'seat' && this.pendingPress) {
      return this.setZoneHint('⬇️ Bấm vào linh kiện để ấn xuống cho khớt', 'action');
    }
    if (step.need === 0) {
      const labels = {
        glass: '🔓 Dùng nút THÁO / LẮP NắP KÍNH',
        display: '🔌 Bấm vào cổng DisplayPort phía sau thùng',
        power: '🔛 Bấm nút nguồn trên nắp trên'
      };
      return this.setZoneHint(labels[step.action] || '', 'action');
    }
    if (!this.selectedItem) {
      return this.setZoneHint('📦 Chọn linh kiện ở danh sách bên phải', 'idle');
    }
    if (this.scene.ghostOverTarget) {
      return this.setZoneHint(`➡ ${CASE_ZONES[zoneId].label} — bấm chuột trái để lắp`, 'ready');
    }
    return this.setZoneHint(`📥 Đưa tối ${CASE_ZONES[zoneId].label}`, 'idle');
  }

  setZoneHint(text, kind) {
    const el = this.dom.hint;
    if (!el) return;
    el.textContent = text || '';
    el.className = 'build-zone-hint' + (text ? ` show ${kind || 'idle'}` : '');
  }

  // -------------------------------------------------------------- chrome
  renderStep() {
    const { stepBadge, stepTitle, stepDesc, stepTip, stepHint, stepParts, progress } = this.dom;
    const step = this.activeStep();
    if (!step) return;

    if (stepBadge) stepBadge.textContent = `BƯỚC ${step.step} / ${TOTAL_STEPS}`;
    if (stepTitle) stepTitle.textContent = step.title;
    if (stepDesc) stepDesc.textContent = step.instruction;
    if (stepTip) stepTip.innerHTML = `<strong>💡 Mẹo thực tế:</strong> ${step.tip}`;
    if (stepHint) stepHint.textContent = step.shortHint || '';
    if (progress) progress.style.width = `${(this.completed.size / TOTAL_STEPS) * 100}%`;
    this.renderStepParts(step);
    this.updateGlassUi();
    this.renderActionBar();
  }

  /**
   * Names the kind of hardware this step calls for.
   *
   * Without this, steps 4 and 7 just say "lắp tản khí" or "lắp bộ nguồn" and a
   * first-time builder has no idea which part on the bench to pick up. The label
   * is the *kind* of part rather than a model: the rack carries six different
   * DIMMs and three coolers, so naming one would send the player looking for a
   * brand that is not what they are actually holding.
   */
  renderStepParts(step) {
    const el = this.dom.stepParts;
    if (!el) return;

    const catalogue = this.inventoryUI?.slots.filter(Boolean) || [];
    const parts = stepPartLabels(step, catalogue);
    if (!parts.length) {
      el.innerHTML = '';
      el.style.display = 'none';
      return;
    }

    el.style.display = '';
    el.innerHTML = [
      `<div class="build-step-parts-label">📦 Linh kiện cần chuẩn bị</div>`,
      ...parts.map(p => `
        <div class="build-step-part-row">
          <span class="build-step-part-tag">${p.tag}</span>
          <span class="build-step-part-name">${p.label}</span>
          ${p.variants > 1 ? `<span class="build-step-part-alt">${p.variants} lựa chọn</span>` : ''}
        </div>`)
    ].join('');
  }

  updateGlassUi() {
    const { glassTag, glassBtn } = this.dom;
    const on = this.scene?.glassOn;
    if (glassTag) glassTag.textContent = on ? '🔒 Nắp kính: đang lắp' : '🔓 Nắp kính: đã tháo';
    if (glassBtn) glassBtn.textContent = on ? '🔓 Tháo Nắp Kính' : '🔒 Lắp Lại Nắp Kính';
  }

  toggleGlass() {
    if (!this.scene) return;
    const on = !this.scene.glassOn;
    this.scene.setGlass(on);
    sounds.playSnap();
    this.updateGlassUi();

    const step = this.activeStep();
    if (step?.action === 'glass') {
      const wantOn = step.step === TOTAL_STEPS;
      if (this.scene.glassOn === wantOn) {
        this.completeStep(step.step, wantOn
          ? '🔒 Đóng nắp kính và siết 4 núm vặn.'
          : '🔓 Tháo nắp kính, ruột thùng đang mở.');
      }
    }
  }

  renderActionBar() {
    const bar = this.dom.actionBar;
    if (!bar) return;
    const step = this.activeStep();
    if (!step) { bar.innerHTML = ''; return; }

    const chips = [];
    const screws = this.scene ? this.scene.screwsFor(step.zone) : 0;
    if (screws > 0) chips.push(`<div class="build-chip amber">🔩 Còn ${screws} ốc chưa siết</div>`);
    if (step.action === 'paste' && this.pendingPress && !this.pasteApplied) {
      chips.push('<div class="build-chip cyan">💧 Cần bôi keo tản nhiệt</div>');
    }
    if (step.action === 'seat' && this.pendingPress) {
      chips.push('<div class="build-chip cyan">📦 Cần ấn linh kiện xuống</div>');
    }
    if (this.completed.size >= TOTAL_STEPS) {
      chips.push('<div class="build-chip green">✅ Đã hoàn thành cả 12 bước</div>');
    }
    if (this.dom.finishBtn) {
      const ready = this.completed.size >= TOTAL_STEPS && !this.isFinished;
      this.dom.finishBtn.style.display = ready ? '' : 'none';
      this.dom.finishBtn.disabled = !ready;
    }
    bar.innerHTML = chips.join('');
  }

  renderChecklist() {
    const el = this.dom.checklist;
    if (!el) return;
    el.innerHTML = ASSEMBLY_STEPS.map(step => {
      const done = this.completed.has(step.step);
      const current = step.step === this.currentStep && !done;
      return `
        <div class="build-check${done ? ' done' : ''}${current ? ' current' : ''}">
          <span class="build-check-num">${done ? '✓' : step.step}</span>
          <span class="build-check-name">${step.shortName}</span>
        </div>
      `;
    }).join('');
  }

  setToast(message, kind = 'info') {
    const el = this.dom.toast;
    if (!el) return;
    el.textContent = message || '';
    el.className = 'build-toast' + (message ? ` show ${kind}` : '');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      el.className = 'build-toast';
    }, 4600);
  }

  // ------------------------------------------------------------- per frame
  update(delta, now) {
    if (!this.isOpen || !this.scene) return;
    this.scene.update(delta, now);
  }
}
