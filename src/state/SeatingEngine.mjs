/**
 * SeatingEngine: Manages the 2.5D seating floor with 24/36/64/100 slots,
 * center-outward priority allocation, LRU quiet non-donor eviction, and
 * 100% donor saturation deadlock resolution.
 */
export class SeatingEngine {
  static CAPACITIES = [24, 36, 64, 100];
  static INACTIVITY_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * @param {Object} [options]
   * @param {'auto' | '24' | '36' | '64' | '100'} [options.seatMode='auto']
   * @param {number} [options.initialCapacity=36]
   */
  constructor(options = {}) {
    this.seatMode = options.seatMode || 'auto';
    this.capacity = this._parseCapacity(options.initialCapacity || (this.seatMode === 'auto' ? 36 : this.seatMode));

    this.slots = new Array(this.capacity).fill(null);
    this.viewers = new Map(); // userId -> ViewerState & { lastActivityAt: number }
    this.lockedSlots = new Set();
    this.vipSlots = new Set();

    this.priorityOrder = this._generatePriorityOrder(this.capacity);
  }

  _parseCapacity(cap) {
    const num = Number(cap);
    if (SeatingEngine.CAPACITIES.includes(num)) return num;
    return 36;
  }

  /**
   * Calculate grid dimensions: rows x cols (cols must be even)
   * @param {number} cap
   * @returns {{ rows: number, cols: number }}
   */
  _getGridDimensions(cap) {
    switch (cap) {
      case 24: return { rows: 4, cols: 6 };
      case 36: return { rows: 6, cols: 6 };
      case 64: return { rows: 8, cols: 8 };
      case 100: return { rows: 10, cols: 10 };
      default: return { rows: 6, cols: 6 };
    }
  }

  /**
   * Generate center-outward, front-to-back priority order of slot indices.
   * @param {number} cap
   * @returns {number[]}
   */
  _generatePriorityOrder(cap) {
    const { rows, cols } = this._getGridDimensions(cap);
    const order = [];

    const centerLeft = cols / 2 - 1;
    const centerRight = cols / 2;
    const colOrder = [];
    for (let offset = 0; offset < cols / 2; offset++) {
      colOrder.push(centerLeft - offset);
      colOrder.push(centerRight + offset);
    }

    for (let r = 0; r < rows; r++) {
      for (const c of colOrder) {
        order.push(r * cols + c);
      }
    }

    return order;
  }

  /**
   * Auto scale capacity up to next tier: 24 -> 36 -> 64 -> 100
   * @returns {boolean} true if scaled, false if already at 100
   */
  autoScaleCapacity() {
    const currentIdx = SeatingEngine.CAPACITIES.indexOf(this.capacity);
    if (currentIdx < SeatingEngine.CAPACITIES.length - 1) {
      const nextCap = SeatingEngine.CAPACITIES[currentIdx + 1];
      this.resize(nextCap);
      return true;
    }
    return false;
  }

  /**
   * Resize seating floor capacity
   * @param {number} newCap
   */
  resize(newCap) {
    const validCap = this._parseCapacity(newCap);
    if (validCap === this.capacity) return;

    const oldSlots = this.slots;
    this.capacity = validCap;
    this.slots = new Array(validCap).fill(null);
    this.priorityOrder = this._generatePriorityOrder(validCap);

    // Re-place existing viewers if within new capacity
    for (let i = 0; i < Math.min(oldSlots.length, validCap); i++) {
      if (oldSlots[i]) {
        this.slots[i] = oldSlots[i];
      }
    }

    // Clean up viewers that fell outside if downsizing
    for (const [userId, v] of this.viewers.entries()) {
      if (v.slotIndex >= validCap) {
        this.viewers.delete(userId);
      }
    }
  }

  /**
   * Set seat mode ('auto', '24', '36', '64', '100')
   * @param {string} mode
   */
  setSeatMode(mode) {
    this.seatMode = mode;
    if (mode !== 'auto') {
      const cap = Number(mode);
      if (SeatingEngine.CAPACITIES.includes(cap)) {
        this.resize(cap);
      }
    }
  }

  /**
   * Touch activity timestamp of seated user
   * @param {string} userId
   */
  touchActivity(userId) {
    const v = this.viewers.get(userId);
    if (v) {
      v.lastActivityAt = Date.now();
    }
  }

  /**
   * Add merit coins to seated user
   * @param {string} userId
   * @param {number} amount
   */
  addCoins(userId, amount) {
    const v = this.viewers.get(userId);
    if (v) {
      v.coins = (v.coins || 0) + amount;
      v.lastActivityAt = Date.now();
      if (this.slots[v.slotIndex]) {
        this.slots[v.slotIndex].coins = v.coins;
      }
    }
  }

  /**
   * Change skin of seated user
   * @param {string} userId
   * @param {string} skin
   * @returns {boolean}
   */
  setSkin(userId, skin) {
    const v = this.viewers.get(userId);
    if (v) {
      v.skin = skin;
      if (this.slots[v.slotIndex]) {
        this.slots[v.slotIndex].skin = skin;
      }
      return true;
    }
    return false;
  }

  /**
   * Set VIP protection for a slot
   * @param {number} slotIndex
   * @param {boolean} isVip
   */
  setVip(slotIndex, isVip) {
    if (slotIndex < 0 || slotIndex >= this.capacity) return;
    if (isVip) {
      this.vipSlots.add(slotIndex);
    } else {
      this.vipSlots.delete(slotIndex);
    }

    const v = this.slots[slotIndex];
    if (v) {
      v.isVip = isVip;
      const cached = this.viewers.get(v.id);
      if (cached) cached.isVip = isVip;
    }
  }

  /**
   * Set lock status for a slot
   * @param {number} slotIndex
   * @param {boolean} isLocked
   * @returns {Object | null} Evicted user if slot was occupied
   */
  setLock(slotIndex, isLocked) {
    if (slotIndex < 0 || slotIndex >= this.capacity) return null;
    let evicted = null;
    if (isLocked) {
      this.lockedSlots.add(slotIndex);
      if (this.slots[slotIndex]) {
        evicted = this.freeSlot(slotIndex, 'admin_lock');
      }
    } else {
      this.lockedSlots.delete(slotIndex);
    }
    return evicted;
  }

  /**
   * Free slot by index
   * @param {number} slotIndex
   * @param {string} reason
   * @returns {Object | null}
   */
  freeSlot(slotIndex, reason = 'unknown') {
    if (slotIndex < 0 || slotIndex >= this.capacity) return null;
    const v = this.slots[slotIndex];
    if (!v) return null;

    this.slots[slotIndex] = null;
    this.viewers.delete(v.id);
    return { ...v, reason };
  }

  /**
   * Free slot by user id
   * @param {string} userId
   * @param {string} reason
   * @returns {Object | null}
   */
  freeUser(userId, reason = 'kicked') {
    const v = this.viewers.get(userId);
    if (!v) return null;
    return this.freeSlot(v.slotIndex, reason);
  }

  /**
   * Evict a viewer when full according to multi-tier policy:
   * 1. Longest-quiet non-donor (coins === 0, !isVip, not locked)
   * 2. 100% Donor Saturation Deadlock Resolution: Inactive donor (>15m idle), lowest coins first
   * @returns {Object | null} Evicted viewer or null
   */
  evictIfNeeded() {
    if (this.viewers.size < this.capacity) {
      return null;
    }

    if (this.seatMode === 'auto' && this.capacity < 100) {
      const expanded = this.autoScaleCapacity();
      if (expanded) return null;
    }

    // Step 1: Evict quietest non-donor (coins === 0)
    const nonDonors = Array.from(this.viewers.values()).filter(
      (v) => (v.coins === 0 || !v.coins) && !v.isVip && !this.lockedSlots.has(v.slotIndex) && !this.vipSlots.has(v.slotIndex)
    );

    if (nonDonors.length > 0) {
      nonDonors.sort((a, b) => a.lastActivityAt - b.lastActivityAt);
      const evictee = nonDonors[0];
      return this.freeSlot(evictee.slotIndex, 'evicted_quiet_non_donor');
    }

    // Step 2: 100% Donor Saturation Deadlock Resolution
    const now = Date.now();
    const candidateDonors = Array.from(this.viewers.values()).filter(
      (v) => !v.isVip && !this.lockedSlots.has(v.slotIndex) && !this.vipSlots.has(v.slotIndex) &&
             (now - v.lastActivityAt > SeatingEngine.INACTIVITY_THRESHOLD_MS)
    );

    if (candidateDonors.length > 0) {
      // Sort by coins ascending (lowest coins first), then by lastActivityAt ascending (most idle first)
      candidateDonors.sort((a, b) => {
        if (a.coins !== b.coins) return a.coins - b.coins;
        return a.lastActivityAt - b.lastActivityAt;
      });
      const evictee = candidateDonors[0];
      return this.freeSlot(evictee.slotIndex, 'evicted_inactive_donor');
    }

    return null;
  }

  /**
   * Assign a seat to a user from center-outward priority.
   * @param {Object} user User data: { id, name, skin, avatar, coins, isVip, demo }
   * @returns {{ slotIndex: number, evicted: Object | null }}
   */
  assignSeat(user) {
    // If already seated, touch activity and update
    const existing = this.viewers.get(user.id);
    if (existing) {
      existing.lastActivityAt = Date.now();
      if (user.coins !== undefined) existing.coins = user.coins;
      if (user.name) existing.name = user.name;
      if (user.avatar) existing.avatar = user.avatar;
      if (user.skin) existing.skin = user.skin;
      this.slots[existing.slotIndex] = { ...existing };
      return { slotIndex: existing.slotIndex, evicted: null };
    }

    let evicted = null;

    // Check if full or no slot available
    const hasAvailableSlot = this.priorityOrder.some(
      (slotIdx) => slotIdx < this.capacity && !this.slots[slotIdx] && !this.lockedSlots.has(slotIdx)
    );

    if (!hasAvailableSlot || this.viewers.size >= this.capacity) {
      evicted = this.evictIfNeeded();
    }

    // Find first available slot in priorityOrder
    let targetSlot = -1;
    for (const slotIdx of this.priorityOrder) {
      if (slotIdx < this.capacity && !this.slots[slotIdx] && !this.lockedSlots.has(slotIdx)) {
        targetSlot = slotIdx;
        break;
      }
    }

    if (targetSlot === -1) {
      // Emergency fallback: search linear
      for (let i = 0; i < this.capacity; i++) {
        if (!this.slots[i] && !this.lockedSlots.has(i)) {
          targetSlot = i;
          break;
        }
      }
    }

    if (targetSlot === -1) {
      return { slotIndex: -1, evicted };
    }

    const isVip = Boolean(user.isVip || this.vipSlots.has(targetSlot));
    const viewerState = {
      id: String(user.id),
      name: user.name || 'Phật tử',
      skin: user.skin || 'man',
      avatar: user.avatar || '',
      coins: Number(user.coins) || 0,
      slotIndex: targetSlot,
      isVip,
      demo: Boolean(user.demo),
      lastActivityAt: Date.now()
    };

    this.slots[targetSlot] = viewerState;
    this.viewers.set(viewerState.id, viewerState);

    return { slotIndex: targetSlot, evicted };
  }

  /**
   * Fill demo viewers
   * @param {number} count
   * @returns {Array<Object>} assigned viewers
   */
  fillDemo(count) {
    const demoNames = [
      'Diệu Hạnh', 'Minh Tâm', 'Tuệ Đức', 'Tịnh Quang', 'Thiện Nhân',
      'Diệu Âm', 'Quang Minh', 'Bảo Ngọc', 'Chân Như', 'An Lạc',
      'Trí Dũng', 'Phúc Hậu', 'Từ Bi', 'Thanh Tịnh', 'Như Ý',
      'Đức Trí', 'Tuệ Giác', 'Bồ Đề', 'Viên Thông', 'Chân Tâm'
    ];
    const demoSkins = ['man', 'woman', 'granny', 'child', 'monk', 'nun', 'master'];
    const added = [];

    const targetCount = Math.min(count, this.capacity);
    for (let i = 0; i < targetCount; i++) {
      const name = `${demoNames[i % demoNames.length]} ${Math.floor(i / demoNames.length) > 0 ? (Math.floor(i / demoNames.length) + 1) : ''}`.trim();
      const skin = demoSkins[i % demoSkins.length];
      const user = {
        id: `demo_${i + 1}`,
        name,
        skin,
        avatar: `/assets/characters/c_${skin}.png`,
        coins: (i % 3 === 0) ? (i * 10) : 0,
        demo: true
      };
      const { slotIndex } = this.assignSeat(user);
      if (slotIndex !== -1 && this.slots[slotIndex]) {
        added.push(this.slots[slotIndex]);
      }
    }
    return added;
  }

  /**
   * Clear all seats
   */
  clearAll() {
    this.slots.fill(null);
    this.viewers.clear();
  }

  /**
   * Get active seated viewers list
   * @returns {Array<Object>}
   */
  getSnapshot() {
    return Array.from(this.viewers.values()).map((v) => ({
      id: v.id,
      name: v.name,
      skin: v.skin,
      avatar: v.avatar,
      coins: v.coins,
      slotIndex: v.slotIndex,
      isVip: v.isVip,
      demo: v.demo
    }));
  }
}

export default SeatingEngine;
