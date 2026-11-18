/**
 * CharacterRenderer.js
 * 4-Phase Avatar State Machine, Cosine Prostration, Painter's Algorithm & Dynamic Skin NLP
 */

export class CharacterRenderer {
  constructor(floorEngine) {
    this.floorEngine = floorEngine;
    this.spritesheets = new Map();
    this.staticImages = new Map();
    this.avatarLruCache = new Map();
    this.MAX_AVATARS = 150;

    this.characters = new Map();
    this.skinChangeEnabled = true;

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

  _escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Synchronize Skin NLP rules from Admin Config Studio
   * @param {Object} skinCfg
   */
  setSkinChangeConfig(skinCfg) {
    if (!skinCfg || typeof skinCfg !== 'object') return;
    this.skinChangeEnabled = skinCfg.enabled !== false;

    if (Array.isArray(skinCfg.sacredExclusions)) {
      this.SACRED_PATTERNS = skinCfg.sacredExclusions
        .map((p) => String(p || '').trim())
        .filter(Boolean)
        .map((p) => new RegExp(p.split(/\s+/).map((w) => this._escapeRegex(w)).join('\\s+'), 'iu'));
    }

    if (Array.isArray(skinCfg.rules)) {
      const compiled = [];
      for (const r of skinCfg.rules) {
        if (!r?.skin || !Array.isArray(r.keywords) || r.keywords.length === 0) continue;
        const kws = r.keywords.map((k) => String(k || '').trim()).filter(Boolean);
        if (!kws.length) continue;
        const alt = kws.map((k) => this._escapeRegex(k)).join('|');
        compiled.push({
          key: this.normalizeSkin(r.skin),
          regex: new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${alt})(?:$|[^\\p{L}\\p{N}])`, 'iu')
        });
      }
      if (compiled.length > 0) {
        this.SKIN_KEYWORDS = compiled;
      }
    }
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
    if (!this.skinChangeEnabled || !text || typeof text !== 'string') return null;
    const clean = text.trim();

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
      phase: 'walk',
      phaseTime: 0,
      bowTheta: 0,
      breathOffset: slotIndex * 1.37
    });

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

  clearAll() {
    this.characters.clear();
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
        const dy = target.y - char.currentY;
        const walkSpeed = 380 * dt;

        if (Math.abs(dy) > 4) {
          char.currentY += Math.sign(dy) * Math.min(walkSpeed, Math.abs(dy));
          char.currentX = 540;
        } else {
          char.currentY = target.y;
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

    const slots = this.floorEngine.slotCoords;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      renderables.push({
        y: slot.y,
        type: 'cushion',
        render: () => this.floorEngine.renderCushion(slot.x, slot.y, slot.scale)
      });
    }

    for (const char of this.characters.values()) {
      renderables.push({
        y: char.currentY + 0.1,
        type: 'avatar',
        render: () => this.renderAvatar(ctx, char, timeSec)
      });
    }

    renderables.sort((a, b) => a.y - b.y);

    for (const item of renderables) {
      item.render();
    }
  }

  renderAvatar(ctx, char, timeSec) {
    const slot = this.floorEngine.getSlot(char.slotIndex);
    const sheet = this.spritesheets.get(char.skin) || this.spritesheets.get('char_man');
    const scale = slot.scale;

    let frameIndex = 7;
    let yScale = 1.0;
    let yOffset = 0;

    if (char.phase === 'walk') {
      frameIndex = Math.floor(char.phaseTime * 8) % 4;
    } else if (char.phase === 'sitting') {
      frameIndex = 4 + Math.min(2, Math.floor((char.phaseTime / 0.6) * 3));
    } else if (char.phase === 'sit') {
      frameIndex = 7;
      yOffset = Math.sin(timeSec * 1.1 + char.breathOffset) * 2.0 * scale;
    } else if (char.phase === 'bowing') {
      frameIndex = 7;
      yScale = 1.0 - 0.45 * (1.0 - Math.cos(char.bowTheta));
    }

    ctx.save();
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
        ctx.drawImage(staticImg, -sw / 2, -sh, sw, sh);
      }
    }

    ctx.restore();
  }
}
