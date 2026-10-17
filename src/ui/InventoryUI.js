import { ALL_HARDWARE_ITEMS, HARDWARE_CATEGORIES } from '../data/hardware.js';
import { realDimsFor } from '../data/hardwareDims.js';
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

    // Initial state: all items start on the shelf
    this.slots = new Array(this.maxSlots).fill(null);

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
      // real proportions, so the panel shows the part that is actually on the bench
      this.previewScene.loadItemModel(item.modelPath, { realDims: realDimsFor(item) });
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
