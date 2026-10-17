import { ASSEMBLY_STEPS, TOTAL_STEPS, stepPartLabels } from '../data/assemblyPlan.js';
import { sounds } from '../audio/SoundEffects.js';

/**
 * The full parts list, opened by left-clicking the clipboard on the bench.
 *
 * The clipboard prop can only carry the step the player is on - it is a quarter
 * of a metre tall. This panel is the whole plan: every one of the twelve steps,
 * what each one consumes, and which of those parts are already in the backpack.
 *
 * It reads the same `assemblyPlan` data as the build panel and the clipboard, so
 * all three can never disagree about what the next step needs. And like the
 * clipboard, a line ticks off on *fetching*, not on fitting: a part sitting in
 * the backpack is ticked, because that is the moment it stopped being something
 * the player still had to go and get.
 */
export class TodoListPanel {
  constructor({ onRequestLock, onOpen } = {}) {
    this.onRequestLock = onRequestLock;
    this.onOpen = onOpen;
    this.isOpen = false;

    this.modalEl = document.getElementById('todo-list-modal');
    this.listEl = document.getElementById('todo-list-rows');
    this.badgeEl = document.getElementById('todo-list-badge');
    this.fillEl = document.getElementById('todo-list-progress-fill');
    this.summaryEl = document.getElementById('todo-list-summary');

    this.modalEl?.querySelector('.todo-list-close')?.addEventListener('click', () => this.close());

    // Clicking anywhere outside the sheet closes the list.
    //
    // The guard has to read `target !== modalEl && modalEl.contains(target)`, not
    // `modalEl.contains(target)` alone. `contains()` returns true for the element
    // itself, and the backdrop *is* the modal, so the naive check counted every
    // outside click as an inside one and the panel never closed at all.
    document.addEventListener('mousedown', e => {
      if (!this.isOpen || !this.modalEl) return;
      const onBackdrop = e.target === this.modalEl;
      const onSheet = !onBackdrop && this.modalEl.contains(e.target);
      if (onSheet) return;
      sounds.playClick();
      this.close();
    });

    window.addEventListener('keydown', e => {
      if (!this.isOpen) return;
      if (e.code === 'Escape') {
        e.preventDefault();
        sounds.playClick();
        this.close();
      }
    });
  }

  /**
   * @param {object} state
   * @param {Set<number>} state.completed  step numbers already finished
   * @param {number} state.currentStep
   * @param {boolean} state.allDone
   * @param {Array<object>} state.bag       what the player is carrying
   * @param {Array<object>} state.catalogue every item the game knows about
   */
  open(state) {
    if (!this.modalEl) return;
    this.isOpen = true;
    sounds.playClick();
    this.modalEl.classList.add('active');
    this.render(state);
    this.onOpen?.();
  }

  close() {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.classList.remove('active');
    this.onRequestLock?.();
  }

  toggle(state) {
    if (this.isOpen) this.close();
    else this.open(state);
  }

  render(state) {
    if (!this.listEl) return;
    const completed = state?.completed || new Set();
    const bag = state?.bag || [];
    const catalogue = state?.catalogue || [];
    const allDone = !!state?.allDone || completed.size >= TOTAL_STEPS;

    if (this.badgeEl) {
      this.badgeEl.textContent = allDone
        ? `HOÀN THÀNH ${TOTAL_STEPS}/${TOTAL_STEPS}`
        : `BƯỚC ${state?.currentStep || 1} / ${TOTAL_STEPS}`;
    }

    if (this.fillEl) {
      this.fillEl.style.width = `${(completed.size / TOTAL_STEPS) * 100}%`;
    }

    // How much of the kit is physically in the backpack, across every step that
    // consumes something. This is the number the player is really playing against
    // while they walk back and forth to the rack.
    const bagTagCounts = this.#bagCounts(bag);
    let wanted = 0;
    let carried = 0;
    for (const step of ASSEMBLY_STEPS) {
      for (const part of stepPartLabels(step, catalogue)) {
        wanted += part.count;
        carried += Math.min(bagTagCounts.get((part.tag || '').toLowerCase()) || 0, part.count);
      }
    }

    if (this.summaryEl) {
      this.summaryEl.textContent = allDone
        ? `Đã lắp ráp xong cả ${TOTAL_STEPS} bước.`
        : `Trong túi: ${carried}/${wanted} linh kiện · ${completed.size}/${TOTAL_STEPS} bước đã xong`;
    }

    this.listEl.innerHTML = ASSEMBLY_STEPS.map(step => this.#rowFor(step, {
      completed,
      bagTagCounts,
      catalogue,
      current: !allDone && step.step === state?.currentStep
    })).join('');
  }

  /**
   * One step: its number, its name, its state, and - for the steps that consume
   * something - how many parts the step needs against how many the player is
   * actually carrying.
   *
   * The two lines under the step answer the only question that matters while
   * walking back and forth to the rack: "do I have everything for this yet?"
   *
   *   Cần: 2 cái.
   *   Đã lấy: 1 cái (chưa đủ)
   *
   * A tick box used to sit there instead, saying "Chưa hoàn thành" - which
   * answered neither question: it repeated the step's own status, and a box the
   * player cannot click is a promise of state rather than a fact. The counts are
   * read from the backpack, so the row is true at the moment it is drawn rather
   * than a verdict about the whole step.
   */
  #rowFor(step, { completed, bagTagCounts, catalogue, current }) {
    const done = completed.has(step.step);
    const state = done ? 'done' : (current ? 'current' : 'todo');

    const parts = stepPartLabels(step, catalogue);
    let partsHtml = '';
    if (parts.length) {
      // One step asks for one kind of part, so these are single numbers in
      // practice - but both are summed, so a step that ever takes two kinds
      // still reads correctly.
      let need = 0;
      let have = 0;
      for (const part of parts) {
        need += part.count;
        const carried = bagTagCounts.get((part.tag || '').toLowerCase()) || 0;
        have += Math.min(carried, part.count);
      }
      // A finished step was necessarily fetched, and the part has since been
      // fitted - so it is no longer in the backpack to be counted.
      if (done) have = need;
      const enough = have >= need;

      partsHtml = `
        <p class="todo-parts-line">Cần: ${need} cái.</p>
        <p class="todo-parts-line todo-parts-have${enough ? ' enough' : ' short'}">Đã lấy: ${have} cái (${enough ? 'đủ' : 'chưa đủ'})</p>`;
    } else {
      partsHtml = '<p class="todo-parts-none">Bước này không cần linh kiện.</p>';
    }

    const marker = done ? '✓' : (current ? '▶' : step.step);

    return `
      <li class="todo-step ${state}">
        <div class="todo-step-head">
          <span class="todo-step-num">${marker}</span>
          <span class="todo-step-name">${this.#escape(step.shortName || `Bước ${step.step}`)}</span>
          <span class="todo-step-state">${
            done ? 'đã xong' : (current ? 'đang làm' : 'chưa làm')
          }</span>
        </div>
        ${partsHtml}
      </li>`;
  }

  #bagCounts(bag) {
    const counts = new Map();
    for (const item of bag) {
      if (!item) continue;
      const tag = (item.tag || '').toLowerCase();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    return counts;
  }

  /** Part names come from the catalogue, so they are escaped before going into HTML. */
  #escape(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}