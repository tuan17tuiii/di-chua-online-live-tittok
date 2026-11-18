/**
 * CanvasFloorEngine.js
 * 2.5D Perspective Trapezoid Floor & Temple Scene Rendering Engine
 * Complies with ARCHITECTURE.md §4.1 and WEBSOCKET_SPEC.md
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

    // Chế độ Chánh Điện Thực Tế: sử dụng trực tiếp ảnh chụp chùa thật,
    // không vẽ đè bàn thờ giả hay tượng hoạt hình lên ảnh thật.
    this.realTempleMode = true;

    // Scene Image Assets
    this.images = {
      background: null,
      altar: null,
      statue: null,
      censer: null,
      candleStand: null,
      cushion: null
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

    // Prioritized allocation order: front rows (rows - 1 down to 0), center aisle outward
    const colOrder = [];
    const mid = cols / 2;
    for (let d = 0; d < mid; d++) {
      colOrder.push(mid - 1 - d); // Left of aisle
      colOrder.push(mid + d);     // Right of aisle
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

    // Normalize column index k into [-1, 1], cols is strictly even
    const u0 = (k - (cols - 1) / 2) / ((cols - 1) / 2);
    // Expand away from center aisle with safety margin
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

  loadAssets() {
    const loadImg = (path) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = path;
      });
    };

    return Promise.all([
      loadImg('/assets/backgrounds/hall.jpg').then(img => this.images.background = img),
      loadImg('/assets/altar/altar_table.png').then(img => this.images.altar = img),
      loadImg('/assets/altar/statue_shakyamuni.png').then(img => this.images.statue = img),
      loadImg('/assets/altar/censer_bronze.png').then(img => this.images.censer = img),
      loadImg('/assets/altar/candle_stand.png').then(img => this.images.candleStand = img),
      loadImg('/assets/altar/meditation_cushion.png').then(img => this.images.cushion = img)
    ]);
  }

  renderBackgroundAndAltar() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, 1080, 1920);

    // 1. Temple Hall Background
    if (this.images.background) {
      ctx.drawImage(this.images.background, 0, 0, 1080, 1920);
    } else {
      // Procedural architectural temple hall fallback (chỉ dùng khi thiếu ảnh thật)
      this.renderProceduralBackground(ctx);
    }

    // Khi bật realTempleMode (Cách 1): Ảnh nền hall.jpg đã có sẵn Bàn thờ, Tượng Phật,
    // câu đối, hoa sen và lư hương thật. Ta giữ nguyên cảnh chùa tự nhiên, không vẽ đè.
    if (this.realTempleMode) {
      return;
    }

    // Render 2.5D Perspective Floor Tile Guidelines
    this.renderFloorPerspective(ctx);

    // 2. Altar Table & Layers
    if (this.images.altar) {
      ctx.drawImage(this.images.altar, 0, 480, 1080, 850);
    } else {
      this.renderProceduralAltar(ctx);
    }

    // 3. Buddha Statue
    if (this.images.statue) {
      ctx.drawImage(this.images.statue, 240, 360, 600, 800);
    } else {
      this.renderProceduralStatue(ctx);
    }

    // 4. Candle Stands
    if (this.images.candleStand) {
      ctx.drawImage(this.images.candleStand, 200, 950, 120, 280);
      ctx.drawImage(this.images.candleStand, 760, 950, 120, 280);
    } else {
      this.renderProceduralCandleStands(ctx);
    }

    // 5. Incense Censer
    if (this.images.censer) {
      ctx.drawImage(this.images.censer, 430, 1080, 220, 180);
    } else {
      this.renderProceduralCenser(ctx);
    }
  }

  renderProceduralBackground(ctx) {
    // Grand hall atmospheric gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#1a0804');
    bgGrad.addColorStop(0.35, '#2e1208');
    bgGrad.addColorStop(0.65, '#240d06');
    bgGrad.addColorStop(1, '#120402');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // Architectural wooden pillars
    ctx.fillStyle = '#2b0f07';
    ctx.fillRect(0, 0, 110, 1920);
    ctx.fillRect(970, 0, 110, 1920);

    // Pillar gold trim highlights
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(105, 0, 5, 1920);
    ctx.strokeRect(970, 0, 5, 1920);
  }

  renderFloorPerspective(ctx) {
    ctx.save();
    // Trapezoid floor boundary
    const xTopL = this.CENTER_X - this.HALF_TOP;
    const xTopR = this.CENTER_X + this.HALF_TOP;
    const xBotL = this.CENTER_X - this.HALF_BOT;
    const xBotR = this.CENTER_X + this.HALF_BOT;

    // Floor surface gradient
    const floorGrad = ctx.createLinearGradient(0, this.Y_TOP, 0, this.Y_BOT);
    floorGrad.addColorStop(0, 'rgba(45, 18, 10, 0.85)');
    floorGrad.addColorStop(0.5, 'rgba(60, 24, 12, 0.85)');
    floorGrad.addColorStop(1, 'rgba(35, 14, 8, 0.95)');

    ctx.beginPath();
    ctx.moveTo(xTopL, this.Y_TOP);
    ctx.lineTo(xTopR, this.Y_TOP);
    ctx.lineTo(xBotR, this.Y_BOT);
    ctx.lineTo(xBotL, this.Y_BOT);
    ctx.closePath();
    ctx.fillStyle = floorGrad;
    ctx.fill();

    // Floor perspective border lines
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center aisle red carpet pathway
    const carpetTopHalf = this.HALF_TOP * this.AISLE_RATIO;
    const carpetBotHalf = this.HALF_BOT * this.AISLE_RATIO;

    const carpetGrad = ctx.createLinearGradient(0, this.Y_TOP, 0, this.Y_BOT);
    carpetGrad.addColorStop(0, 'rgba(90, 15, 15, 0.7)');
    carpetGrad.addColorStop(1, 'rgba(120, 20, 20, 0.85)');

    ctx.beginPath();
    ctx.moveTo(this.CENTER_X - carpetTopHalf, this.Y_TOP);
    ctx.lineTo(this.CENTER_X + carpetTopHalf, this.Y_TOP);
    ctx.lineTo(this.CENTER_X + carpetBotHalf, this.Y_BOT);
    ctx.lineTo(this.CENTER_X - carpetBotHalf, this.Y_BOT);
    ctx.closePath();
    ctx.fillStyle = carpetGrad;
    ctx.fill();

    // Carpet gold borders
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.CENTER_X - carpetTopHalf, this.Y_TOP);
    ctx.lineTo(this.CENTER_X - carpetBotHalf, this.Y_BOT);
    ctx.moveTo(this.CENTER_X + carpetTopHalf, this.Y_TOP);
    ctx.lineTo(this.CENTER_X + carpetBotHalf, this.Y_BOT);
    ctx.stroke();

    ctx.restore();
  }

  renderProceduralAltar(ctx) {
    ctx.save();
    // Multi-tiered wooden altar table
    const grad = ctx.createLinearGradient(0, 900, 0, 1220);
    grad.addColorStop(0, '#5a1e0b');
    grad.addColorStop(0.5, '#3c1306');
    grad.addColorStop(1, '#250b03');

    // Tier 1 (Base)
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(140, 980, 800, 240, [12, 12, 0, 0]);
    ctx.fill();

    // Gold relief moldings
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Tier 2 (Upper platform)
    ctx.fillStyle = '#4a1708';
    ctx.beginPath();
    ctx.roundRect(220, 860, 640, 140, [10, 10, 0, 0]);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Lotus flower cloth draped over altar
    ctx.fillStyle = 'rgba(180, 30, 30, 0.85)';
    ctx.beginPath();
    ctx.moveTo(260, 990);
    ctx.lineTo(820, 990);
    ctx.lineTo(800, 1050);
    ctx.lineTo(280, 1050);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  renderProceduralStatue(ctx) {
    ctx.save();
    const cx = 540;
    const cy = 680;

    // Golden Lotus Throne
    ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 180, 160, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Lotus petals on throne base
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
      const px = cx + Math.cos(angle) * 150;
      const py = cy + 180 + Math.sin(angle) * 35;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcf40';
      ctx.fill();
    }

    // Buddha Body Silhouette with Golden Sheen
    const bodyGrad = ctx.createLinearGradient(0, cy - 150, 0, cy + 170);
    bodyGrad.addColorStop(0, '#ffe882');
    bodyGrad.addColorStop(0.5, '#d4af37');
    bodyGrad.addColorStop(1, '#946d0a');

    // Head
    ctx.beginPath();
    ctx.arc(cx, cy - 80, 55, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#fff2b2';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Ushnisha (crown bump)
    ctx.beginPath();
    ctx.arc(cx, cy - 145, 22, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // Torso / Robe (Kiết già posture)
    ctx.beginPath();
    ctx.ellipse(cx, cy + 50, 110, 120, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.stroke();

    // Folded Legs Base
    ctx.beginPath();
    ctx.ellipse(cx, cy + 140, 150, 50, 0, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  renderProceduralCandleStands(ctx) {
    const stands = [{ x: 260, y: 1040 }, { x: 820, y: 1040 }];
    ctx.save();
    for (const s of stands) {
      // Bronze stand base
      ctx.fillStyle = '#8a6218';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + 80, 36, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shaft
      ctx.fillRect(s.x - 6, s.y - 40, 12, 120);

      // Lotus cup
      ctx.beginPath();
      ctx.ellipse(s.x, s.y - 40, 24, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#d4af37';
      ctx.fill();

      // Red candle wax
      ctx.fillStyle = '#b32424';
      ctx.fillRect(s.x - 8, s.y - 95, 16, 55);

      // Wick
      ctx.strokeStyle = '#2b1b17';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 95);
      ctx.lineTo(s.x, s.y - 105);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderProceduralCenser(ctx) {
    ctx.save();
    const cx = 540;
    const cy = 1140;

    // Bronze incense burner pot
    const bronzeGrad = ctx.createLinearGradient(cx - 70, cy, cx + 70, cy);
    bronzeGrad.addColorStop(0, '#5a4520');
    bronzeGrad.addColorStop(0.5, '#b8903c');
    bronzeGrad.addColorStop(1, '#4c3917');

    ctx.fillStyle = bronzeGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 75, 50, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Burner rim
    ctx.beginPath();
    ctx.ellipse(cx, cy - 35, 68, 20, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#423315';
    ctx.fill();
    ctx.stroke();

    // Incense sticks
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 35);
    ctx.lineTo(cx - 20, cy - 90);
    ctx.moveTo(cx, cy - 35);
    ctx.lineTo(cx, cy - 98);
    ctx.moveTo(cx + 15, cy - 35);
    ctx.lineTo(cx + 20, cy - 90);
    ctx.stroke();

    // Burning glowing tips
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(cx - 20, cy - 90, 3, 0, Math.PI * 2);
    ctx.arc(cx, cy - 98, 3, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy - 90, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderCushion(x, y, scale) {
    const ctx = this.ctx;
    const w = 160 * scale;
    const h = 90 * scale;

    if (this.images.cushion && !this.realTempleMode) {
      ctx.drawImage(this.images.cushion, x - w / 2, y - h, w, h);
    } else {
      // Bồ Đoàn Tọa Thiền Chân Thực: Đệm lụa nâu gụ ấm áp, bóng đổ mềm mại trên sàn chùa
      ctx.save();
      // Bóng đổ mềm mại tự nhiên trên sàn gỗ
      const shadowGrad = ctx.createRadialGradient(x, y - h * 0.25, 0, x, y - h * 0.25, w * 0.55);
      shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
      shadowGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.25)');
      shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.ellipse(x, y - h * 0.25, (w / 2) * 1.15, (h / 2) * 0.85, 0, 0, Math.PI * 2);
      ctx.fillStyle = shadowGrad;
      ctx.fill();

      // Thân đệm lụa gụ trầm
      const cGrad = ctx.createRadialGradient(x, y - h * 0.55, 3 * scale, x, y - h * 0.5, (w / 2));
      cGrad.addColorStop(0, '#7a3b1a');
      cGrad.addColorStop(0.65, '#52240e');
      cGrad.addColorStop(1, '#341407');

      ctx.beginPath();
      ctx.ellipse(x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = cGrad;
      ctx.fill();

      // Viền chỉ vàng đồng thêu tinh tế (mờ nhẹ, không chói)
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
      ctx.stroke();

      // Vòng cánh sen thêu chìm trang nhã
      ctx.beginPath();
      ctx.ellipse(x, y - h / 2, (w / 2) * 0.6, (h / 2) * 0.6, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = Math.max(0.8, 1.5 * scale);
      ctx.stroke();

      ctx.restore();
    }
  }
}
