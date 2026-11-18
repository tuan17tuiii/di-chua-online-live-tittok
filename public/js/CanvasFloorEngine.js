/**
 * CanvasFloorEngine.js
 * 2.5D Perspective Trapezoid Floor & Temple Scene Rendering Engine
 * Supports live dynamic background switching from Admin Config Studio.
 */

export class CanvasFloorEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 1080x1920 9:16 Floor Projection Constants
    this.Y_TOP = 1215;
    this.Y_BOT = 1845;
    this.HALF_TOP = 290;
    this.HALF_BOT = 430;
    this.CENTER_X = 540;
    this.AISLE_RATIO = 0.15;
    this.MARGIN_RATIO = 0.12;

    this.cap = 36;
    this.grid = this.resolveGrid(this.cap);
    this.slotCoords = [];
    this.rebuildSlots();

    this.realTempleMode = true;
    this.currentBgUrl = '/assets/backgrounds/hall.jpg';

    this.images = {
      background: null
    };
  }

  resolveGrid(cap) {
    switch (Number(cap)) {
      case 24: return { rows: 4, cols: 6 };
      case 36: return { rows: 6, cols: 6 };
      case 64: return { rows: 8, cols: 8 };
      case 100: return { rows: 10, cols: 10 };
      default: return { rows: 6, cols: 6 };
    }
  }

  setCapacity(cap) {
    const numericCap = Number(cap);
    if (numericCap === this.cap) return;
    this.cap = numericCap;
    this.grid = this.resolveGrid(numericCap);
    this.rebuildSlots();
  }

  rebuildSlots() {
    const { rows, cols } = this.grid;
    this.slotCoords = [];

    const colOrder = [];
    const mid = cols / 2;
    for (let d = 0; d < mid; d++) {
      colOrder.push(mid - 1 - d);
      colOrder.push(mid + d);
    }

    const slots = [];
    for (let r = rows - 1; r >= 0; r--) {
      for (const k of colOrder) {
        slots.push(this.computeSlotMath(r, k, rows, cols));
      }
    }

    this.slotCoords = slots;
  }

  computeSlotMath(r, k, rows, cols) {
    const t = rows <= 1 ? 0.5 : r / (rows - 1);
    const y = this.Y_TOP + (this.Y_BOT - this.Y_TOP) * t;
    const halfWidth = this.HALF_TOP + (this.HALF_BOT - this.HALF_TOP) * t;
    const scale = (0.26 + 0.24 * t) * Math.pow(6 / cols, 0.75);

    const u0 = (k - (cols - 1) / 2) / ((cols - 1) / 2);
    const u = Math.sign(u0) * (this.AISLE_RATIO + (1.0 - this.MARGIN_RATIO - this.AISLE_RATIO) * Math.abs(u0));
    const x = this.CENTER_X + u * halfWidth;

    return { row: r, col: k, x, y, scale };
  }

  getSlot(index) {
    if (!this.slotCoords.length) {
      this.rebuildSlots();
    }
    const safeIdx = Math.max(0, Math.min(Number(index) || 0, this.slotCoords.length - 1));
    return this.slotCoords[safeIdx] || { row: 0, col: 0, x: 540, y: 1530, scale: 0.38 };
  }

  _loadImg(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = path;
    });
  }

  loadAssets() {
    return Promise.all([
      this._loadImg(this.currentBgUrl).then((img) => {
        this.images.background = img;
      })
    ]);
  }

  /**
   * Hot-swap temple background image URL without flickering
   * @param {string} url
   */
  async setBackgroundUrl(url) {
    if (!url || url === this.currentBgUrl) return;
    this.currentBgUrl = url;
    const loaded = await this._loadImg(url);
    if (loaded) {
      this.images.background = loaded;
    }
  }

  renderBackgroundAndAltar() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1080, 1920);

    if (this.images.background) {
      ctx.drawImage(this.images.background, 0, 0, 1080, 1920);
    }
  }

  renderCushion(x, y, scale) {
    const ctx = this.ctx;
    const w = 160 * scale;
    const h = 90 * scale;

    ctx.save();
    const shadowGrad = ctx.createRadialGradient(x, y - h * 0.25, 0, x, y - h * 0.25, w * 0.55);
    shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
    shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.ellipse(x, y - h * 0.25, (w / 2) * 1.15, (h / 2) * 0.85, 0, 0, Math.PI * 2);
    ctx.fillStyle = shadowGrad;
    ctx.fill();

    const cGrad = ctx.createRadialGradient(x, y - h * 0.55, 3 * scale, x, y - h * 0.5, w / 2);
    cGrad.addColorStop(0, '#7a3b1a');
    cGrad.addColorStop(0.65, '#52240e');
    cGrad.addColorStop(1, '#341407');

    ctx.beginPath();
    ctx.ellipse(x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = cGrad;
    ctx.fill();

    ctx.lineWidth = Math.max(1, 2 * scale);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(x, y - h / 2, (w / 2) * 0.6, (h / 2) * 0.6, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = Math.max(0.8, 1.5 * scale);
    ctx.stroke();

    ctx.restore();
  }
}
