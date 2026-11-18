/**
 * CharacterRenderer.js
 * 4-Phase Avatar State Machine, Cosine Prostration, Painter's Algorithm & Skin NLP
 * Complies with ARCHITECTURE.md §4.2 and ASSET_MANIFEST.md
 */

export class CharacterRenderer {
  constructor(floorEngine) {
    this.floorEngine = floorEngine;
    this.spritesheets = new Map();
    this.staticImages = new Map();
    this.avatarLruCache = new Map();
    this.MAX_AVATARS = 150;

    // Active viewer characters: viewerId -> stateObject
    this.characters = new Map();

    // Sacred phrase exclusions: prevent clothing changes during prayers
    this.SACRED_PATTERNS = [
      /nam\s+mô/i,
      /phật\s+bà/i,
      /a\s+di\s+đà/i,
      /bổn\s+sư/i,
      /quán\s+thế\s+âm/i,
      /bồ\s+tát/i,
      /thích\s+ca/i,
      /lạy\s+phật/i
    ];

    // Word boundary & intent keywords for skin selection
    this.SKIN_KEYWORDS = [
      { key: 'char_child', regex: /(?:^|\s)(?:chú\s+tiểu|tiểu\s+đồng|bé)(?:\s|$)/i },
      { key: 'char_master', regex: /(?:^|\s)(?:cao\s+tăng|thượng\s+tọa|hòa\s+thượng)(?:\s|$)/i },
      { key: 'char_monk', regex: /(?:^|\s)(?:sư\s+thầy|đại\s+đức|thầy)(?:\s|$)/i },
      { key: 'char_nun', regex: /(?:^|\s)(?:sư\s+cô|ni\s+cô)(?:\s|$)/i },
      { key: 'char_granny', regex: /(?:^|\s)(?:cụ\s+bà|bà\s+lão|bà)(?:\s|$)/i },
      { key: 'char_man', regex: /(?:^|\s)(?:cư\s+sĩ\s+nam|nam|chú(?!\s+tiểu))(?:\s|$)/i },
      { key: 'char_woman', regex: /(?:^|\s)(?:cư\s+sĩ\s+nữ|nữ|cô)(?:\s|$)/i }
    ];
  }

  normalizeSkin(skin) {
    if (!skin) return 'char_man';
    const s = String(skin).trim().toLowerCase();
    if (s.startsWith('char_')) return s;
    const map = {
      man: 'char_man',
      woman: 'char_woman',
      granny: 'char_granny',
      child: 'char_child',
      monk: 'char_monk',
      nun: 'char_nun',
      master: 'char_master'
    };
    return map[s] || 'char_man';
  }

  async loadCharacterSpritesheets() {
    const list = [
      { id: 'char_man', path: '/assets/characters/anim_man.png', fw: 212, fh: 300, seatedH: 210 },
      { id: 'char_woman', path: '/assets/characters/anim_woman.png', fw: 212, fh: 300, seatedH: 220 },
      { id: 'char_granny', path: '/assets/characters/anim_granny.png', fw: 195, fh: 300, seatedH: 222 },
      { id: 'char_child', path: '/assets/characters/anim_child.png', fw: 180, fh: 260, seatedH: 190 },
      { id: 'char_monk', path: '/assets/characters/anim_monk.png', fw: 212, fh: 300, seatedH: 215 },
      { id: 'char_nun', path: '/assets/characters/anim_nun.png', fw: 212, fh: 300, seatedH: 215 },
      { id: 'char_master', path: '/assets/characters/anim_master.png', fw: 230, fh: 320, seatedH: 230 }
    ];

    for (const item of list) {
      const img = new Image();
      const meta = {
        img,
        fw: item.fw,
        fh: item.fh,
        seatedH: item.seatedH,
        loaded: false
      };
      this.spritesheets.set(item.id, meta);

      img.onload = () => {
        meta.loaded = true;
      };
      img.onerror = () => {
        meta.loaded = false;
      };
      img.src = item.path;
    }

    // Load authentic static portraits
    const staticList = [
      { id: 'char_man', path: '/assets/characters/c_man.png' },
      { id: 'char_woman', path: '/assets/characters/c_woman.png' },
      { id: 'char_granny', path: '/assets/characters/c_granny.png' },
      { id: 'char_child', path: '/assets/characters/c_child.png' },
      { id: 'char_monk', path: '/assets/characters/c_monk.png' },
      { id: 'char_nun', path: '/assets/characters/c_nun.png' },
      { id: 'char_master', path: '/assets/characters/c_monk.png' }
    ];

    for (const item of staticList) {
      const img = new Image();
      img.src = item.path;
      this.staticImages.set(item.id, img);
    }
  }

  detectSkinNLP(text) {
    if (!text || typeof text !== 'string') return null;
    const clean = text.trim();

    // Sacred phrase exclusion
    if (this.SACRED_PATTERNS.some((pat) => pat.test(clean))) {
      return null;
    }

    for (const entry of this.SKIN_KEYWORDS) {
      if (entry.regex.test(clean)) {
        return entry.key;
      }
    }
    return null;
  }

  addOrUpdateViewer(viewer) {
    if (!viewer || !viewer.id) return;
    const id = String(viewer.id);
    const existing = this.characters.get(id);
    const skin = this.normalizeSkin(viewer.skin);
    const slotIndex = Number(viewer.slotIndex ?? 0);
    const targetSlot = this.floorEngine.getSlot(slotIndex);

    if (existing) {
      existing.name = viewer.name || existing.name;
      existing.coins = Number(viewer.coins ?? existing.coins);
      existing.isVip = Boolean(viewer.isVip ?? existing.isVip);
      existing.skin = skin;
      existing.slotIndex = slotIndex;
      existing.targetSlot = targetSlot;
      return;
    }

    // New viewer: starts in WALK phase entering from center aisle
    this.characters.set(id, {
      id,
      name: viewer.name || 'Phật tử',
      skin,
      coins: Number(viewer.coins || 0),
      isVip: Boolean(viewer.isVip || false),
      slotIndex,
      targetSlot,
      currentX: 540,
      currentY: 2020,
      phase: 'walk', // 'walk' -> 'sitting' -> 'sit' -> 'bowing'
      phaseTime: 0,
      bowTheta: 0,
      breathOffset: slotIndex * 1.37
    });

    // Profile avatar image LRU Cache
    if (viewer.avatar && typeof viewer.avatar === 'string' && !this.avatarLruCache.has(viewer.avatar)) {
      if (this.avatarLruCache.size >= this.MAX_AVATARS) {
        const oldest = this.avatarLruCache.keys().next().value;
        this.avatarLruCache.delete(oldest);
      }
      const aImg = new Image();
      aImg.src = viewer.avatar;
      this.avatarLruCache.set(viewer.avatar, aImg);
    }
  }

  removeViewer(id) {
    if (!id) return;
    this.characters.delete(String(id));
  }

  triggerBow(id) {
    if (!id) return;
    const char = this.characters.get(String(id));
    if (char && char.phase === 'sit') {
      char.phase = 'bowing';
      char.phaseTime = 0;
      char.bowTheta = 0;
    }
  }

  triggerAllBow() {
    for (const char of this.characters.values()) {
      if (char.phase === 'sit') {
        char.phase = 'bowing';
        char.phaseTime = 0;
        char.bowTheta = 0;
      }
    }
  }

  update(deltaTimeSec) {
    const dt = Number(deltaTimeSec) || 0;

    for (const char of this.characters.values()) {
      char.phaseTime += dt;
      const target = this.floorEngine.getSlot(char.slotIndex);
      char.targetSlot = target;

      if (char.phase === 'walk') {
        // Step 1: Walk along center aisle (x=540) to target Y
        const dy = target.y - char.currentY;
        const walkSpeed = 380 * dt;

        if (Math.abs(dy) > 4) {
          char.currentY += Math.sign(dy) * Math.min(walkSpeed, Math.abs(dy));
          char.currentX = 540;
        } else {
          char.currentY = target.y;
          // Step 2: Step laterally to target X cushion
          const dx = target.x - char.currentX;
          if (Math.abs(dx) > 4) {
            char.currentX += Math.sign(dx) * Math.min(walkSpeed, Math.abs(dx));
          } else {
            char.currentX = target.x;
            char.phase = 'sitting';
            char.phaseTime = 0;
          }
        }
      } else if (char.phase === 'sitting') {
        char.currentX = target.x;
        char.currentY = target.y;
        // 4-frame sitting transition (~0.6s)
        if (char.phaseTime >= 0.6) {
          char.phase = 'sit';
          char.phaseTime = 0;
        }
      } else if (char.phase === 'sit') {
        char.currentX = target.x;
        char.currentY = target.y;
      } else if (char.phase === 'bowing') {
        char.currentX = target.x;
        char.currentY = target.y;
        // Full cosine compression prostration over 1.4s
        const BOW_DURATION = 1.4;
        char.bowTheta = (char.phaseTime / BOW_DURATION) * (Math.PI * 2);
        if (char.phaseTime >= BOW_DURATION) {
          char.phase = 'sit';
          char.phaseTime = 0;
          char.bowTheta = 0;
        }
      }
    }
  }

  render(ctx, timeSec) {
    const renderables = [];

    // 1. Gather all cushions
    const slots = this.floorEngine.slotCoords;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      renderables.push({
        y: slot.y,
        type: 'cushion',
        render: () => this.floorEngine.renderCushion(slot.x, slot.y, slot.scale)
      });
    }

    // 2. Gather all active avatars
    for (const char of this.characters.values()) {
      renderables.push({
        y: char.currentY + 0.1, // Slight offset ensures avatar renders on top of cushion at same Y
        type: 'avatar',
        render: () => this.renderAvatar(ctx, char, timeSec)
      });
    }

    // 3. Painter's Algorithm: Sort ascending by Y coordinate
    renderables.sort((a, b) => a.y - b.y);

    for (const item of renderables) {
      item.render();
    }
  }

  renderAvatar(ctx, char, timeSec) {
    const slot = this.floorEngine.getSlot(char.slotIndex);
    const sheet = this.spritesheets.get(char.skin) || this.spritesheets.get('char_man');
    const scale = slot.scale;

    let frameIndex = 7; // Default Frame 7: Sit Idle
    let yScale = 1.0;
    let yOffset = 0;

    if (char.phase === 'walk') {
      frameIndex = Math.floor(char.phaseTime * 8) % 4; // Frames 0..3
    } else if (char.phase === 'sitting') {
      frameIndex = 4 + Math.min(2, Math.floor((char.phaseTime / 0.6) * 3)); // Frames 4..6
    } else if (char.phase === 'sit') {
      frameIndex = 7;
      // Idle harmonic breathing: deltaY = sin(t * 1.1 + phi) * 2.0 * scale
      yOffset = Math.sin(timeSec * 1.1 + char.breathOffset) * 2.0 * scale;
    } else if (char.phase === 'bowing') {
      frameIndex = 7;
      // Procedural Cosine Compression: y_scale = 1 - 0.45 * (1 - cos(theta))
      yScale = 1.0 - 0.45 * (1.0 - Math.cos(char.bowTheta));
    }

    ctx.save();
    // Pivot Anchor: (centerX, bottomY) at floor contact
    ctx.translate(char.currentX, char.currentY + yOffset);
    ctx.scale(scale, scale * yScale);

    if (sheet && sheet.loaded) {
      const sx = frameIndex * sheet.fw;
      ctx.drawImage(
        sheet.img,
        sx,
        0,
        sheet.fw,
        sheet.fh,
        -sheet.fw / 2,
        -sheet.fh,
        sheet.fw,
        sheet.fh
      );
    } else {
      const staticImg = this.staticImages.get(char.skin) || this.staticImages.get('char_man');
      if (staticImg && staticImg.naturalWidth) {
        const sw = staticImg.naturalWidth;
        const sh = staticImg.naturalHeight;
        ctx.drawImage(
          staticImg,
          -sw / 2,
          -sh,
          sw,
          sh
        );
      } else {
        // Procedural Vector Meditator Fallback
        this.renderProceduralAvatar(ctx, char.skin, char.phase);
      }
    }

    ctx.restore();
  }

  renderProceduralAvatar(ctx, skin, phase) {
    ctx.save();

    // Robe color based on skin type
    let robeColor = '#705335'; // Monk/layperson brown
    let trimColor = '#d4af37';

    if (skin === 'char_woman') {
      robeColor = '#4a6572'; // Grey-blue lam robe
      trimColor = '#b0bec5';
    } else if (skin === 'char_monk') {
      robeColor = '#9c551f'; // Saffron orange
      trimColor = '#ffd54f';
    } else if (skin === 'char_nun') {
      robeColor = '#6d4c41'; // Brown sồng robe
      trimColor = '#bcaaa4';
    } else if (skin === 'char_master') {
      robeColor = '#b71c1c'; // Red-gold ceremonial robe
      trimColor = '#ffd700';
    } else if (skin === 'char_child') {
      robeColor = '#8d6e63';
      trimColor = '#ffecb3';
    }

    // Seated Robe Base (Ellipse)
    ctx.beginPath();
    ctx.ellipse(0, -55, 75, 55, 0, 0, Math.PI * 2);
    ctx.fillStyle = robeColor;
    ctx.fill();
    ctx.strokeStyle = trimColor;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Torso
    ctx.beginPath();
    ctx.ellipse(0, -115, 52, 60, 0, 0, Math.PI * 2);
    ctx.fillStyle = robeColor;
    ctx.fill();
    ctx.stroke();

    // Hands folded in Dhyana Mudra
    ctx.beginPath();
    ctx.ellipse(0, -65, 26, 12, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdbac';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(0, -175, 32, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdbac';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Serene closed eyes
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-11, -175, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(11, -175, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Subtle gentle smile
    ctx.beginPath();
    ctx.arc(0, -165, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }
}
