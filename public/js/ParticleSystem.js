/**
 * ParticleSystem.js
 * Object-Pooled Incense Smoke, Candle Flame, Divine Halo & Petal Particle Engine
 * Complies with ARCHITECTURE.md §4.3
 */

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 1. Incense Smoke Pool (18 object-pooled particles)
    this.smokePool = Array.from({ length: 18 }, (_, i) => ({
      index: i,
      active: true,
      age: (i / 18) * 4.0, // Staggered initial ages for seamless flow
      maxAge: 4.0,
      baseX: 540,
      baseY: 1080
    }));

    // 2. Candle Locations (Left & Right of Altar)
    this.candles = [
      { x: 260, y: 960 },
      { x: 820, y: 960 }
    ];

    // 3. Lotus & Petal Pool (50 object-pooled particles)
    this.petalPool = Array.from({ length: 50 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 16,
      alpha: 0,
      rot: 0,
      vRot: 0,
      type: 'petal' // 'petal' or 'lotus'
    }));

    // 4. Divine Halo State
    this.haloPulse = 0.0;
    this.enableCandles = false; // Tắt ngọn lửa nến lơ lửng khi dùng ảnh chùa thật

    // 5. Authentic Image FX Assets từ repo tham khảo
    this.images = {
      halo: null,
      lotus: null,
      petal: null,
      bell: null
    };
    this.loadFxImages();
  }

  loadFxImages() {
    const load = (src) => {
      const img = new Image();
      img.src = src;
      return img;
    };
    this.images.halo = load('/assets/fx/fx_halo.png');
    this.images.lotus = load('/assets/fx/fx_lotus.png');
    this.images.petal = load('/assets/fx/fx_petal.png');
    this.images.bell = load('/assets/fx/fx_bell.png');
  }

  pulseHalo() {
    this.haloPulse = 1.0;
  }

  spawnGiftParticles(x, y, tier = 1) {
    const t = Number(tier) || 1;
    const count = t === 1 ? 6 : t === 2 ? 15 : 40;
    let spawned = 0;

    for (const p of this.petalPool) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 40;
        p.y = y - 20;
        p.vx = (Math.random() - 0.5) * 90;
        p.vy = -(90 + Math.random() * 130);
        p.size = t >= 3 ? 24 : t === 2 ? 18 : 14;
        p.alpha = 1.0;
        p.rot = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 3;
        p.type = t >= 2 && Math.random() > 0.45 ? 'lotus' : 'petal';
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  update(deltaTimeSec) {
    const dt = Number(deltaTimeSec) || 0;

    // Update Smoke Particles
    for (const p of this.smokePool) {
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.age = 0;
      }
    }

    // Update Petals & Lotuses
    for (const p of this.petalPool) {
      if (p.active) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // Gentle air resistance and gravity
        p.vy += 45 * dt;
        p.rot += p.vRot * dt;
        p.alpha -= dt * 0.35;

        if (p.alpha <= 0 || p.y > 1920 || p.y < -60) {
          p.active = false;
        }
      }
    }

    // Decay Halo Pulse
    if (this.haloPulse > 0) {
      this.haloPulse = Math.max(0, this.haloPulse - dt * 0.85);
    }
  }

  render(timeSec) {
    const ctx = this.ctx;

    // 1. Divine Halo (Hào quang kim quang tỏa mờ dịu ấm phía sau tượng Phật thật)
    this.renderHalo(ctx, timeSec);

    // 2. Incense Smoke (Khói trầm hương thoang thoảng bay lên)
    this.renderSmoke(ctx);

    // 3. Candle Flame Glow (Chỉ bật khi có chân nến thật)
    if (this.enableCandles) {
      this.renderCandles(ctx, timeSec);
    }

    // 4. Petals & Lotuses (Hoa sen và mưa cánh hoa khi có cúng dường)
    this.renderPetals(ctx);
  }

  renderHalo(ctx, timeSec) {
    const img = this.images.halo;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (img && img.naturalWidth) {
      // Dùng ảnh fx_halo.png từ repo gốc
      const pulse = this.haloPulse;
      ctx.globalAlpha = 0.25 + 0.08 * Math.sin(timeSec * 1.2) + pulse * 0.45;
      const s = 2.7 + pulse * 0.35;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, 540 - w / 2, 560 - h / 2, w, h);
    } else {
      // Fallback radial aura nếu ảnh chưa load xong
      const centerX = 540;
      const centerY = 560;
      const baseRadius = 200 + 15 * Math.sin(timeSec * 1.2);
      const pulseAdd = this.haloPulse * 85;
      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        baseRadius * 0.15,
        centerX,
        centerY,
        baseRadius + pulseAdd
      );
      grad.addColorStop(0, `rgba(255, 230, 140, ${0.30 + this.haloPulse * 0.35})`);
      grad.addColorStop(0.5, `rgba(212, 175, 55, ${0.15 + this.haloPulse * 0.25})`);
      grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + pulseAdd, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderSmoke(ctx) {
    ctx.save();
    for (const p of this.smokePool) {
      const ageFrac = p.age / p.maxAge;
      // Procedural smoke wave equation
      const x = p.baseX + Math.sin(p.age * 6.5 + p.index) * 25 * p.age;
      const y = p.baseY - p.age * 65;
      const radius = 3 + 16 * ageFrac;
      const alpha = Math.sin(ageFrac * Math.PI) * 0.35;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(245, 235, 215, ${alpha})`);
      grad.addColorStop(0.6, `rgba(215, 205, 185, ${alpha * 0.5})`);
      grad.addColorStop(1, 'rgba(190, 180, 160, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderCandles(ctx, timeSec) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (const c of this.candles) {
      // Dual-frequency resonance flicker: alpha = 0.85 + 0.15 * sin(t * 11) * cos(t * 7)
      const flicker = 0.85 + 0.15 * Math.sin(timeSec * 11) * Math.cos(timeSec * 7);

      const grad = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 42);
      grad.addColorStop(0, `rgba(255, 248, 190, ${0.95 * flicker})`);
      grad.addColorStop(0.3, `rgba(255, 170, 45, ${0.65 * flicker})`);
      grad.addColorStop(0.7, `rgba(255, 90, 15, ${0.25 * flicker})`);
      grad.addColorStop(1, 'rgba(255, 60, 10, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 42, 0, Math.PI * 2);
      ctx.fill();

      // Flame Teardrop Core
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 2, 4 * flicker, 9 * flicker, 0, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 230, ${0.98 * flicker})`;
      ctx.fill();
    }
    ctx.restore();
  }

  renderPetals(ctx) {
    ctx.save();
    for (const p of this.petalPool) {
      if (!p.active) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

      const img = p.type === 'lotus' ? this.images.lotus : this.images.petal;
      if (img && img.naturalWidth) {
        // Dùng ảnh hoa sen thật và cánh hoa sen thật từ fx_lotus.png / fx_petal.png
        const s = p.size / 64;
        const w = img.naturalWidth * s;
        const h = img.naturalHeight * s;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else if (p.type === 'lotus') {
        // Blooming Pink Lotus Flower Fallback
        ctx.fillStyle = '#ff77a9';
        for (let i = 0; i < 6; i++) {
          const petalAngle = (i / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(
            Math.cos(petalAngle) * (p.size * 0.35),
            Math.sin(petalAngle) * (p.size * 0.35),
            p.size * 0.38,
            p.size * 0.22,
            petalAngle,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.22, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Golden Falling Petal Fallback
        const pGrad = ctx.createLinearGradient(-p.size / 2, 0, p.size / 2, 0);
        pGrad.addColorStop(0, '#ffe875');
        pGrad.addColorStop(1, '#d4af37');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size / 2, p.size / 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();
    }
    ctx.restore();
  }
}
