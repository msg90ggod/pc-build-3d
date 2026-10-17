This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/ui/**/*, src/style.css
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
src/
  ui/
    AssemblyGuideUI.js
    InventoryUI.js
  style.css
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="src/ui/AssemblyGuideUI.js">
import { ASSEMBLY_STEPS } from '../data/hardware.js';
import confetti from 'canvas-confetti';

export class AssemblyGuideUI {
  constructor() {
    this.steps = ASSEMBLY_STEPS;
    this.currentStepIndex = 0; // 0-indexed (Step 1 is index 0)
    this.completedSteps = new Set();
    this.isExpanded = false;

    this.hudContainer = document.getElementById('assembly-hud');
    this.setupDOM();
    this.render();
  }

  setupDOM() {
    const toggleBtn = document.getElementById('btn-toggle-steps');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        const listEl = document.getElementById('steps-list');
        if (listEl) {
          listEl.style.display = this.isExpanded ? 'block' : 'none';
        }
        toggleBtn.textContent = this.isExpanded ? '▲ Thu gọn' : '▼ Xem 12 bước chuẩn';
      });
    }
  }

  render() {
    const step = this.steps[this.currentStepIndex] || this.steps[this.steps.length - 1];

    // Current step badge
    const badgeEl = document.getElementById('current-step-badge');
    if (badgeEl) {
      badgeEl.textContent = `BƯỚC ${step.step} / ${this.steps.length}`;
    }

    // Title
    const titleEl = document.getElementById('current-step-title');
    if (titleEl) {
      titleEl.textContent = step.title;
    }

    // Instruction
    const descEl = document.getElementById('current-step-desc');
    if (descEl) {
      descEl.textContent = step.instruction;
    }

    // Pro tip
    const tipEl = document.getElementById('current-step-tip');
    if (tipEl) {
      tipEl.innerHTML = `<strong>💡 Mẹo thực tế:</strong> ${step.tip}`;
    }

    // Progress bar
    const progressEl = document.getElementById('assembly-progress-fill');
    if (progressEl) {
      const pct = (this.completedSteps.size / this.steps.length) * 100;
      progressEl.style.width = `${pct}%`;
    }

    // Steps checklist
    const listEl = document.getElementById('steps-list');
    if (listEl) {
      listEl.innerHTML = '';
      this.steps.forEach((s, idx) => {
        const item = document.createElement('div');
        const isDone = this.completedSteps.has(s.step);
        const isCurrent = idx === this.currentStepIndex;

        item.className = `step-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`;
        item.innerHTML = `
          <div class="step-num">${isDone ? '✓' : s.step}</div>
          <div class="step-text">
            <div class="step-name">${s.shortName}</div>
          </div>
        `;
        listEl.appendChild(item);
      });
    }
  }

  completeStep(stepNumber) {
    this.completedSteps.add(stepNumber);

    // Show toast
    this.showToast(`Hoàn thành Bước ${stepNumber}: ${this.steps[stepNumber - 1]?.shortName || ''}!`);

    // Advance to next uncompleted step
    if (stepNumber >= this.currentStepIndex + 1) {
      this.currentStepIndex = Math.min(stepNumber, this.steps.length - 1);
    }

    this.render();

    // If final step completed: celebration!
    if (stepNumber === 12) {
      this.celebrate();
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'hud-toast';
    toast.innerHTML = `
      <div class="toast-icon">✨</div>
      <div class="toast-msg">${message}</div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  celebrate() {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });
    }, 400);
  }
}
</file>

<file path="src/ui/InventoryUI.js">
import { HARDWARE_ITEMS, HARDWARE_CATEGORIES } from '../data/hardware.js';
import { sounds } from '../audio/SoundEffects.js';

export class InventoryUI {
  constructor(previewScene, onEquipItem, onInstallItem, onDropItem, onRequestLock) {
    this.previewScene = previewScene;
    this.onEquipItem = onEquipItem;
    this.onInstallItem = onInstallItem;
    this.onDropItem = onDropItem;
    this.onRequestLock = onRequestLock;

    this.isOpen = false;
    this.maxSlots = 24; // 24 square slots
    this.slots = new Array(this.maxSlots).fill(null);
    this.selectedSlotIndex = null;
    this.selectedItem = null;

    // Initial state: first 4 items in inventory slots, others on shelf
    HARDWARE_ITEMS.forEach((item, idx) => {
      if (idx < 4) {
        this.slots[idx] = item;
      }
    });

    this.modalEl = document.getElementById('inventory-modal');
    this.setupDOM();
  }

  setupDOM() {
    // Close button
    const closeBtn = document.getElementById('btn-close-inventory');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sounds.playClick();
        this.close();
      });
    }

    // Action button: Equip (Cầm trên tay)
    const btnEquip = document.getElementById('btn-inv-equip');
    if (btnEquip) {
      btnEquip.addEventListener('click', () => {
        if (!this.selectedItem) return;
        sounds.playClick();
        const itemToEquip = this.selectedItem;
        const slotIdx = this.selectedSlotIndex;

        // Clear from inventory slot and equip
        this.slots[slotIdx] = null;
        this.deselect();
        this.renderGrid();

        if (this.onEquipItem) this.onEquipItem(itemToEquip);
        this.close();
      });
    }

    // Action button: Drop / Vứt ra ngoài (Phím E)
    const btnDrop = document.getElementById('btn-inv-drop');
    if (btnDrop) {
      btnDrop.addEventListener('click', () => {
        this.dropCurrentSelectedItem();
      });
    }

    // Keyboard listener for E key inside inventory
    window.addEventListener('keydown', e => {
      if (!this.isOpen) return;

      // ESC or R to close
      if (e.code === 'KeyR' || e.code === 'Escape') {
        e.preventDefault();
        sounds.playClick();
        this.close();
        return;
      }

      // E key while a slot is selected: Drop item to crosshair
      if (e.code === 'KeyE') {
        if (this.selectedItem && this.selectedSlotIndex !== null) {
          e.preventDefault();
          this.dropCurrentSelectedItem();
        }
      }
    });
  }

  dropCurrentSelectedItem() {
    if (!this.selectedItem || this.selectedSlotIndex === null) return;
    sounds.playDrop();

    const itemToDrop = this.selectedItem;
    const slotIdx = this.selectedSlotIndex;

    // Vacate the slot
    this.slots[slotIdx] = null;
    this.deselect();
    this.renderGrid();

    // Call drop callback to spawn in 3D world at crosshair
    if (this.onDropItem) {
      this.onDropItem(itemToDrop);
    }
  }

  open(heldItem = null) {
    this.isOpen = true;
    sounds.playClick();
    this.modalEl.classList.add('active');

    // Deselect any previous selection when opening fresh
    this.deselect();
    this.renderGrid();
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.remove('active');
    this.deselect();
    if (this.onRequestLock) {
      this.onRequestLock();
    }
  }

  toggle(heldItem = null) {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(heldItem);
    }
  }

  selectSlot(index) {
    const item = this.slots[index];
    if (!item) return;

    sounds.playClick();

    // If clicking already selected slot: DESELECT
    if (this.selectedSlotIndex === index) {
      this.deselect();
      this.renderGrid();
      return;
    }

    // Otherwise SELECT this slot
    this.selectedSlotIndex = index;
    this.selectedItem = item;
    this.renderGrid();
    this.showDetailPanel(item);

    if (this.previewScene) {
      this.previewScene.loadItemModel(item.modelPath, item.baseRotation);
    }
  }

  deselect() {
    this.selectedSlotIndex = null;
    this.selectedItem = null;
    this.hideDetailPanel();
  }

  showDetailPanel(item) {
    const emptyPanel = document.getElementById('inv-empty-detail');
    const activePanel = document.getElementById('inv-active-detail');
    if (emptyPanel) emptyPanel.style.display = 'none';
    if (activePanel) activePanel.style.display = 'flex';

    // Tag
    const tagEl = document.getElementById('inv-item-tag');
    if (tagEl) {
      tagEl.textContent = `Tag: ${item.tag}`;
      tagEl.className = `inv-tag tag-${item.categoryKey}`;
    }

    // Name & Brand
    const nameEl = document.getElementById('inv-item-name');
    if (nameEl) nameEl.textContent = item.name;

    const brandEl = document.getElementById('inv-item-brand');
    if (brandEl) brandEl.textContent = `${item.brand} • ${item.price}`;

    // Specs list
    const specsListEl = document.getElementById('inv-specs-list');
    if (specsListEl) {
      specsListEl.innerHTML = '';
      item.specs.forEach(s => {
        const row = document.createElement('div');
        row.className = 'spec-row';
        row.innerHTML = `
          <span class="spec-label">${s.label}:</span>
          <span class="spec-value">${s.value}</span>
        `;
        specsListEl.appendChild(row);
      });
    }

    // Beginner Tip & Role
    const tipEl = document.getElementById('inv-item-tip');
    if (tipEl) tipEl.textContent = item.beginnerTip;
  }

  hideDetailPanel() {
    const emptyPanel = document.getElementById('inv-empty-detail');
    const activePanel = document.getElementById('inv-active-detail');
    if (emptyPanel) emptyPanel.style.display = 'flex';
    if (activePanel) activePanel.style.display = 'none';
  }

  renderGrid() {
    const gridEl = document.getElementById('inventory-grid');
    if (!gridEl) return;
    gridEl.innerHTML = '';

    let occupiedCount = 0;

    for (let i = 0; i < this.maxSlots; i++) {
      const item = this.slots[i];
      const isSelected = this.selectedSlotIndex === i;

      const slot = document.createElement('div');
      slot.className = `inv-slot ${item ? 'occupied' : 'empty'} ${isSelected ? 'selected' : ''}`;
      slot.dataset.slotIndex = i;

      if (item) {
        occupiedCount++;
        slot.innerHTML = `
          <div class="slot-image-wrap">
            ${item.iconSvg || '<div class="slot-emoji">📦</div>'}
          </div>
          <div class="slot-name-label">${item.name}</div>
          <div class="slot-tag-badge">${item.tag}</div>
        `;

        slot.addEventListener('click', () => {
          this.selectSlot(i);
        });
      } else {
        // Empty slot box
        slot.innerHTML = `
          <div class="slot-empty-cross">+</div>
          <div class="slot-empty-num">${i + 1}</div>
        `;
      }

      gridEl.appendChild(slot);
    }

    // Update capacity badge
    const capBadge = document.getElementById('inv-capacity-badge');
    if (capBadge) {
      capBadge.textContent = `${occupiedCount} / ${this.maxSlots} Ô CHỨA`;
    }
  }

  addItem(item) {
    const emptyIndex = this.slots.findIndex(s => s === null);
    if (emptyIndex === -1) {
      return false; // Inventory full
    }
    this.slots[emptyIndex] = item;
    if (this.isOpen) {
      this.renderGrid();
    }
    return true;
  }

  removeItem(itemId) {
    const index = this.slots.findIndex(s => s && s.id === itemId);
    if (index !== -1) {
      this.slots[index] = null;
      if (this.selectedSlotIndex === index) {
        this.deselect();
      }
      if (this.isOpen) {
        this.renderGrid();
      }
      return true;
    }
    return false;
  }

  hasItem(itemId) {
    return this.slots.some(s => s && s.id === itemId);
  }
}
</file>

<file path="src/style.css">
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');

:root {
  --bg-dark: #0a0f18;
  --panel-bg: rgba(13, 20, 33, 0.85);
  --panel-border: rgba(56, 189, 248, 0.25);
  --accent-cyan: #38bdf8;
  --accent-gold: #fbbf24;
  --accent-green: #22c55e;
  --accent-purple: #c084fc;
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --slot-bg: rgba(255, 255, 255, 0.04);
  --slot-border: rgba(255, 255, 255, 0.1);
  --slot-hover: rgba(56, 189, 248, 0.15);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  user-select: none;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-dark);
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: var(--text-main);
}

#webgl-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  outline: none;
}

/* Enhanced Crosshair */
#crosshair {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  pointer-events: none;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, opacity 0.2s ease;
}

/* Center dot */
#crosshair::before {
  content: '';
  position: absolute;
  width: 4px;
  height: 4px;
  background-color: #ffffff;
  border-radius: 50%;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.9), 0 0 6px rgba(56, 189, 248, 0.9);
  transition: all 0.15s ease;
}

/* Outer reticle ring */
#crosshair::after {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  border: 1.5px solid rgba(255, 255, 255, 0.65);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.8);
  transition: all 0.2s ease;
}

/* Crosshair highlight when pointing at interactable */
#crosshair.highlight::before {
  background-color: var(--accent-cyan);
  transform: scale(1.6);
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.9), 0 0 12px var(--accent-cyan);
}

#crosshair.highlight::after {
  border-color: var(--accent-cyan);
  width: 24px;
  height: 24px;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.8), 0 0 10px rgba(56, 189, 248, 0.6);
}

#crosshair.unlocked {
  opacity: 0.25;
}

/* On-screen inspection banner when holding RMB */
#inspect-hint {
  position: fixed;
  top: 75px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border: 1.5px solid var(--accent-cyan);
  color: #38bdf8;
  font-weight: 700;
  font-size: 14px;
  padding: 8px 24px;
  border-radius: 24px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(56, 189, 248, 0.4);
  z-index: 100;
  pointer-events: none;
  opacity: 0;
  transition: all 0.2s ease;
}

#inspect-hint.active {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

/* Interaction prompt */
#hud-prompt {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: none;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  border: 1px solid var(--accent-cyan);
  padding: 8px 18px;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(56, 189, 248, 0.3);
  pointer-events: none;
}

.prompt-text {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  letter-spacing: 0.3px;
}

/* Status bar & Hotkeys */
#hud-top-bar {
  position: absolute;
  top: 20px;
  left: 24px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 16px;
}

.game-logo {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 20px rgba(56, 189, 248, 0.3);
}

#shiftlock-status {
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

#shiftlock-status.active {
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.6);
  color: #4ade80;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
}

#shiftlock-status.inactive {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.6);
  color: #f87171;
}

/* Bottom Controls Bar */
#hud-bottom-bar {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 8px 20px;
  border-radius: 30px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.key-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
}

.key-tag {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 3px 8px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 12px;
  color: #ffffff;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
}

.key-hint.active .key-tag {
  background: var(--accent-cyan);
  color: #0f172a;
  border-color: #38bdf8;
}

/* Assembly Quest HUD */
#assembly-hud {
  position: absolute;
  top: 20px;
  right: 24px;
  z-index: 10;
  width: 380px;
  background: var(--panel-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--panel-border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.1);
}

.hud-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

#current-step-badge {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.5px;
}

#btn-toggle-steps {
  background: transparent;
  border: none;
  color: var(--accent-cyan);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.2s;
}

#btn-toggle-steps:hover {
  color: #7dd3fc;
}

#assembly-progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 14px;
}

#assembly-progress-fill {
  height: 100%;
  width: 8.33%;
  background: linear-gradient(90deg, #38bdf8, #22c55e);
  border-radius: 3px;
  transition: width 0.4s ease;
}

#current-step-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
  line-height: 1.4;
}

#current-step-desc {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.5;
  margin-bottom: 10px;
}

#current-step-tip {
  font-size: 12px;
  color: #93c5fd;
  background: rgba(56, 189, 248, 0.08);
  border-left: 3px solid var(--accent-cyan);
  padding: 8px 12px;
  border-radius: 0 8px 8px 0;
  line-height: 1.4;
}

#steps-list {
  display: none;
  margin-top: 14px;
  max-height: 260px;
  overflow-y: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 10px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.step-item.done {
  color: #4ade80;
}

.step-item.current {
  background: rgba(56, 189, 248, 0.12);
  color: #38bdf8;
  font-weight: 600;
}

.step-num {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  font-size: 11px;
  font-weight: 700;
}

.step-item.done .step-num {
  background: #22c55e;
  color: #0f172a;
}

/* RPG INVENTORY MODAL */
#inventory-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(8, 12, 20, 0.72);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  opacity: 0;
  transition: opacity 0.25s ease;
}

#inventory-modal.active {
  display: flex;
  opacity: 1;
}

.rpg-inv-container {
  width: 1040px;
  max-width: 95vw;
  height: 760px;
  max-height: 94vh;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.94) 0%, rgba(10, 15, 26, 0.96) 100%);
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 20px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(56, 189, 248, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

/* Inventory Header */
.inv-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
}

.inv-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.inv-title {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: 0.8px;
  color: #ffffff;
}

.inv-capacity-badge {
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--accent-cyan);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 600;
}

#btn-close-inventory {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;
}

#btn-close-inventory:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
  color: #ffffff;
  transform: scale(1.05);
}

/* Inventory Header Hints */
.inv-header-hints {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inv-hint-tag {
  font-size: 11px;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* Inventory Body: 2-Column Layout */
.inv-body {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  padding: 20px 24px;
  flex: 1;
  overflow: hidden;
}

/* Left: Slots Grid Section */
.inv-grid-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.inv-section-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
  font-weight: 800;
  font-size: 13px;
  color: var(--accent-cyan);
  letter-spacing: 0.5px;
}

.inv-section-sub {
  font-size: 11px;
  font-weight: normal;
  color: var(--text-muted);
}

/* Grid of 24 Square Slots */
.inventory-slots-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  overflow-y: auto;
  padding-right: 6px;
}

/* Base Square Slot */
.inv-slot {
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 6px;
  user-select: none;
}

/* Empty Slot */
.inv-slot.empty {
  background: rgba(255, 255, 255, 0.02);
  border: 1.5px dashed rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.2);
  cursor: default;
}

.inv-slot.empty:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.2);
}

.slot-empty-cross {
  font-size: 22px;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.15);
}

.slot-empty-num {
  position: absolute;
  bottom: 4px;
  right: 6px;
  font-size: 9px;
  font-family: 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.2);
}

/* Occupied Slot */
.inv-slot.occupied {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%);
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.inv-slot.occupied:hover {
  border-color: rgba(56, 189, 248, 0.6);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 0 12px rgba(56, 189, 248, 0.25);
}

.inv-slot.occupied.selected {
  border: 2px solid var(--accent-cyan);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.22) 0%, rgba(15, 23, 42, 0.95) 100%);
  box-shadow: 0 0 20px rgba(56, 189, 248, 0.45), inset 0 0 12px rgba(56, 189, 248, 0.2);
  transform: scale(1.03);
}

.slot-image-wrap {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2px;
}

.slot-image-wrap svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6));
}

.slot-name-label {
  font-size: 9.5px;
  font-weight: 700;
  color: #f8fafc;
  text-align: center;
  max-width: 90%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slot-tag-badge {
  font-size: 8px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(56, 189, 248, 0.18);
  color: #38bdf8;
  margin-top: 2px;
}

/* Right: Detail Panel */
.inv-detail-panel {
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* Empty detail state */
.inv-empty-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 24px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 12px;
  line-height: 1.6;
}

/* Active detail state */
.inv-active-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 3D Model Preview Box */
.inv-preview-box {
  width: 100%;
  height: 220px;
  background: radial-gradient(circle at center, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 25px rgba(0, 0, 0, 0.6);
  flex-shrink: 0;
}

#item-preview-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
}

#item-preview-canvas:active {
  cursor: grabbing;
}

.preview-overlay-hint {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.75);
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 10px;
  color: var(--text-muted);
  pointer-events: none;
}

/* Specs Panel */
.inv-specs-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.specs-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.inv-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding: 3px 10px;
  border-radius: 6px;
  margin-bottom: 4px;
}

.tag-motherboard { background: rgba(56, 189, 248, 0.2); border: 1px solid #38bdf8; color: #38bdf8; }
.tag-cpu { background: rgba(251, 191, 36, 0.2); border: 1px solid #fbbf24; color: #fbbf24; }
.tag-cooler { background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; color: #a855f7; }
.tag-ram { background: rgba(236, 72, 153, 0.2); border: 1px solid #ec4899; color: #ec4899; }
.tag-gpu { background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; color: #22c55e; }
.tag-storage { background: rgba(14, 165, 233, 0.2); border: 1px solid #0ea5e9; color: #0ea5e9; }
.tag-psu { background: rgba(249, 115, 22, 0.2); border: 1px solid #f97316; color: #f97316; }

#inv-item-name {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 2px;
}

#inv-item-brand {
  font-size: 12px;
  color: var(--text-muted);
}

.inv-specs-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 8px 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  font-size: 11px;
  max-height: 160px;
  overflow-y: auto;
}

.spec-row {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  padding-bottom: 3px;
}

.spec-label {
  color: var(--text-muted);
  font-size: 10.5px;
}

.spec-value {
  color: #f1f5f9;
  font-weight: 600;
  text-align: right;
  max-width: 60%;
}

.inv-item-tip {
  font-size: 11.5px;
  color: #bae6fd;
  background: rgba(56, 189, 248, 0.08);
  border-left: 3px solid var(--accent-cyan);
  padding: 6px 10px;
  border-radius: 0 6px 6px 0;
  line-height: 1.4;
}

.inv-action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.btn-rpg {
  flex: 1;
  padding: 9px 12px;
  border-radius: 8px;
  font-weight: 700;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
}

.btn-primary {
  background: linear-gradient(135deg, #0284c7, #2563eb);
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(2, 132, 199, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #0369a1, #1d4ed8);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.3);
  color: #ffffff;
}

/* Toast Notifications */
.hud-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid var(--accent-cyan);
  padding: 10px 24px;
  border-radius: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 15px rgba(56, 189, 248, 0.3);
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  z-index: 200;
  animation: slideUp 0.3s ease;
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.hud-toast.fade-out {
  opacity: 0;
  transform: translate(-50%, 10px);
}

@keyframes slideUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* Loading Screen */
#loading-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #080c14;
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.6s ease;
}

#loading-screen.hidden {
  opacity: 0;
  pointer-events: none;
}

.loading-logo {
  font-size: 32px;
  font-weight: 900;
  background: linear-gradient(135deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
}

.loading-subtitle {
  color: var(--text-muted);
  font-size: 14px;
  margin-bottom: 24px;
}

#loading-bar-wrap {
  width: 320px;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

#loading-bar-fill {
  width: 0%;
  height: 100%;
  background: linear-gradient(90deg, #38bdf8, #6366f1);
  border-radius: 4px;
  transition: width 0.2s ease;
}

#loading-text {
  font-size: 12px;
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
}
</file>

</files>
