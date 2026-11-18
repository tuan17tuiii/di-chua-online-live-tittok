/**
 * ParticleSystem.js
 * Object-Pooled Incense Smoke, Candle Flame, Divine Halo, Per-Slot Lotus Burst & Full-Screen Petal Rain.
 * Dynamically configurable in real time from Admin Config Studio.
 */

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 1. Incense Smoke Pool (18 object-pooled particles)
    this.smokePool = Array.from({ length: 18 }, (_, i) => ({
      index: i,
      active: true,
      age: (i / 18) * 4.0,
      maxAge: 4.0,
      baseX: 540,
      baseY: 1080
    }));

    // 2. Candle Locations (Left & Right of Altar)
    this.candles = [
      { x: 260, y: 960 },
      { x: 820, y: 960 }
    ];

    // 3. Lotus & Petal Pool (90 object-pooled particles for bursts + screen-wide rain)
    this.petalPool = Array.from({ length: 90 }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      gravity: 45,
      size: 16,
      alpha: 0,
      fadeRate: 0.35,
      rot: 0,
      vRot: 0,
      type: 'petal'
    }));

    // 4. Configurable FX Intensities & Toggles
    this.haloPulse = 0.0;
    this.enableSmoke = true;
    this.smokeIntensity = 1.0;
    this.enableCandles = false;
    this.enableHalo = true;
    this.haloIntensity = 1.0;

    // 5. Image FX Assets
    this.images = {
      halo: null,
      lotus: null,
      petal: null,
      bell: null
    };
    this.loadFxImages();
  }

  /**
   * Apply real-time visual FX settings from Admin Config
   * @param {Object} fxCfg
   */
  configureFx(fxCfg = {}) {
    if (fxCfg.smokeEnabled !== undefined) this.enableSmoke = Boolean(fxCfg.smokeEnabled);
    if (fxCfg.smokeIntensity !== undefined) {
      this.smokeIntensity = Math.max(0, Math.min(2.5, Number(fxCfg.smokeIntensity) || 1.0));
    }
    if (fxCfg.candlesEnabled !== undefined) this.enableCandles = Boolean(fxCfg.candlesEnabled);
    if (fxCfg.haloEnabled !== undefined) this.enableHalo = Boolean(fxCfg.haloEnabled);
    if (fxCfg.haloIntensity !== undefined) {
      this.haloIntensity = Math.max(0, Math.min(2.5, Number(fxCfg.haloIntensity) || 1.0));
    }
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
    if (t <= 0) return;
    const count = t === 1 ? 6 : t === 2 ? 15 : 40;
    let spawned = 0;

    for (const p of this.petalPool) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 40;
        p.y = y - 20;
        p.vx = (Math.random() - 0.5) * 90;
        p.vy = -(90 + Math.random() * 130);
        p.gravity = 45;
        p.size = t >= 3 ? 24 : t === 2 ? 18 : 14;
        p.alpha = 1.0;
        p.fadeRate = 0.35;
        p.rot = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 3;
        p.type = t >= 2 && Math.random() > 0.45 ? 'lotus' : 'petal';
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  /**
   * Spawn celestial lotus & golden petal rain across top of 1080x1920 screen
   * (Triggered by Like Milestones, Grand Tier 3/4 Gifts, Envelopes)
   * @param {number} [count=36]
   */
  spawnScreenRain(count = 36) {
    const target = Math.max(6, Math.min(70, Number(count) || 36));
    let spawned = 0;

    for (const p of this.petalPool) {
      if (!p.active) {
        p.active = true;
        p.x = 60 + Math.random() * 960;
        p.y = -40 - Math.random() * 260;
        p.vx = (Math.random() - 0.5) * 55;
        p.vy = 95 + Math.random() * 110;
        p.gravity = 18;
        p.size = 18 + Math.random() * 14;
        p.alpha = 1.0;
        p.fadeRate = 0.14;
        p.rot = Math.random() * Math.PI * 2;
        p.vRot = (Math.random() - 0.5) * 2.4;
        p.type = Math.random() > 0.65 ? 'lotus' : 'petal';
        spawned++;
        if (spawned >= target) break;
      }
    }
  }

  update(deltaTimeSec) {
    const dt = Number(deltaTimeSec) || 0;

    for (const p of this.smokePool) {
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.age = 0;
      }
    }

    for (const p of this.petalPool) {
      if (p.active) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (p.gravity ?? 45) * dt;
        p.rot += p.vRot * dt;
        p.alpha -= dt * (p.fadeRate ?? 0.35);

        if (p.alpha <= 0 || p.y > 1950 || p.y < -350) {
          p.active = false;
        }
      }
    }

    if (this.haloPulse > 0) {
      this.haloPulse = Math.max(0, this.haloPulse - dt * 0.85);
    }
  }

  render(timeSec) {
    const ctx = this.ctx;

    if (this.enableHalo) {
      this.renderHalo(ctx, timeSec);
    }

    if (this.enableSmoke && this.smokeIntensity > 0) {
      this.renderSmoke(ctx);
    }

    if (this.enableCandles) {
      this.renderCandles(ctx, timeSec);
    }

    this.renderPetals(ctx);
  }

  renderHalo(ctx, timeSec) {
    const img = this.images.halo;
    const mult = this.haloIntensity;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (img && img.naturalWidth) {
      const pulse = this.haloPulse;
      ctx.globalAlpha = Math.min(1, (0.25 + 0.08 * Math.sin(timeSec * 1.2) + pulse * 0.45) * mult);
      const s = 2.7 + pulse * 0.35;
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      ctx.drawImage(img, 540 - w / 2, 560 - h / 2, w, h);
    } else {
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
      grad.addColorStop(0, `rgba(255, 230, 140, ${Math.min(1, (0.30 + this.haloPulse * 0.35) * mult)})`);
      grad.addColorStop(0.5, `rgba(212, 175, 55, ${Math.min(1, (0.15 + this.haloPulse * 0.25) * mult)})`);
      grad.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + pulseAdd, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderSmoke(ctx) {
    const mult = this.smokeIntensity;
    ctx.save();
    for (const p of this.smokePool) {
      const ageFrac = p.age / p.maxAge;
      const x = p.baseX + Math.sin(p.age * 6.5 + p.index) * 25 * p.age;
      const y = p.baseY - p.age * 65;
      const radius = (3 + 16 * ageFrac) * (0.75 + 0.25 * mult);
      const alpha = Math.min(0.85, Math.sin(ageFrac * Math.PI) * 0.35 * mult);

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
        const s = p.size / 64;
        const w = img.naturalWidth * s;
        const h = img.naturalHeight * s;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } else if (p.type === 'lotus') {
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
