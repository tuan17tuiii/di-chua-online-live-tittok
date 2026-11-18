/**
 * OverlayApp.js
 * Master Application Coordinator & WebSocket Client (role=overlay)
 * Hot-applies all Admin Config Studio settings (5-ch audio, scene background, FX, HUD, flows).
 */

import { CanvasFloorEngine } from './CanvasFloorEngine.js';
import { CharacterRenderer } from './CharacterRenderer.js';
import { ParticleSystem } from './ParticleSystem.js';
import { WebAudioEngine } from './WebAudioEngine.js';

export class OverlayApp {
  constructor() {
    this.canvas = document.getElementById('templeCanvas');
    this.floorEngine = new CanvasFloorEngine(this.canvas);
    this.characterRenderer = new CharacterRenderer(this.floorEngine);
    this.particleSystem = new ParticleSystem(this.canvas);
    this.audioEngine = new WebAudioEngine();

    this.ws = null;
    this.reconnectAttempts = 0;
    this.lastFrameTime = performance.now();

    // Configurable HUD & Display state
    this.meritTopLimit = 5;
    this.showNametags = true;
    this.showBubbleDefault = true;
    this.bubbleDurationSec = 6;
    this.chantBannerDurationSec = 12;

    // DOM HUD Element Cache
    this.domPlaque = document.getElementById('plaque');
    this.domPlaqueTitle = document.getElementById('plaque-title');
    this.domPlaqueSubtitle = document.getElementById('plaque-subtitle');
    this.domMerit = document.getElementById('merit');
    this.domMeritList = document.getElementById('merit-list');
    this.domPills = document.getElementById('pills');
    this.domViewerCount = document.getElementById('viewer-count');
    this.domCapCount = document.getElementById('capacity-count');
    this.domLikeCount = document.getElementById('like-count');
    this.domChantBanner = document.getElementById('chant-banner');
    this.domChantText = document.getElementById('chant-text');
    this.domGiftBanner = document.getElementById('gift-banner');
    this.domGiftBannerTitle =
      typeof this.domGiftBanner?.querySelector === 'function'
        ? this.domGiftBanner.querySelector('.gift-banner-title')
        : null;
    this.domGiftDonor = document.getElementById('gift-banner-donor');
    this.domGiftText = document.getElementById('gift-banner-gift');
    this.domGiftPrayer = document.getElementById('gift-banner-prayer');
    this.domBubbles = document.getElementById('speech-bubbles');
    this.domNametags = document.getElementById('nametags');

    this.bubblePool = new Map();
    this.nametagPool = new Map();

    this._chantTimer = null;
    this._giftBannerTimer = null;

    // Allow parent Admin Config Studio iframe postMessage to toggle preview mute
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('message', (ev) => {
        if (ev.data && ev.data.type === 'SET_PREVIEW_MUTE') {
          this.audioEngine.setLocalMuted(Boolean(ev.data.muted));
        }
      });
    }
  }

  async init() {
    await Promise.all([
      this.floorEngine.loadAssets(),
      this.characterRenderer.loadCharacterSpritesheets(),
      this.audioEngine.preloadManifestAudio()
    ]);

    requestAnimationFrame((ts) => this.renderLoop(ts));
    this.connectWebSocket();
  }

  connectWebSocket() {
    const isHttps = window.location.protocol === 'https:';
    const protocol = isHttps ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:3000';
    const wsUrl = `${protocol}//${host}/ws?role=overlay`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.audioEngine.ensureContextRunning();
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (err) {
        console.warn('[OverlayApp] Message parsing error:', err);
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      if (this.ws) {
        try {
          this.ws.close();
        } catch {}
      }
    };
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(10000, Math.pow(2, this.reconnectAttempts - 1) * 1000);
    setTimeout(() => this.connectWebSocket(), delay);
  }

  handleMessage(msg) {
    if (!msg || !msg.t) return;
    this.audioEngine.ensureContextRunning();

    switch (msg.t) {
      case 'state':
        this.applyStateSnapshot(msg);
        break;

      case 'settings':
        this.applySettings(msg);
        break;

      case 'join':
        if (msg.v) {
          this.characterRenderer.addOrUpdateViewer(msg.v);
          if (msg.cap) {
            this.floorEngine.setCapacity(msg.cap);
            if (this.domCapCount) this.domCapCount.textContent = msg.cap;
          }
          this.updatePills();
          this.updateMeritBoard();
        }
        break;

      case 'leave':
        this.characterRenderer.removeViewer(msg.id);
        if (msg.slotIndex !== undefined) {
          this.removeBubble(msg.slotIndex);
        }
        this.updatePills();
        this.updateMeritBoard();
        break;

      case 'skin':
        if (msg.id && msg.skin) {
          const char = this.characterRenderer.characters.get(String(msg.id));
          if (char) {
            char.skin = this.characterRenderer.normalizeSkin(msg.skin);
          }
        }
        break;

      case 'chat':
        this.handleChat(msg);
        break;

      case 'gift':
        this.handleGift(msg);
        break;

      case 'like':
        this.handleLike(msg);
        break;

      case 'fx':
        this.handleCustomFx(msg);
        break;

      case 'tts':
        if (msg.dataUri) {
          this.audioEngine.playTtsDataUri(msg.dataUri);
        }
        break;

      case 'tts_stop':
        this.audioEngine.stopTts();
        break;

      case 'chant':
        if (msg.text) {
          this.showChant(msg.text, msg.durationSec);
        }
        break;

      case 'bell':
        this.audioEngine.playBell(msg.isGreatBell !== false);
        this.particleSystem.pulseHalo();
        this.characterRenderer.triggerAllBow();
        break;

      case 'mo':
      case 'mo1':
        this.audioEngine.playMo();
        break;

      case 'tiktok':
        if (msg.likeCount !== undefined && this.domLikeCount) {
          this.domLikeCount.textContent = Number(msg.likeCount).toLocaleString();
        }
        break;
    }
  }

  applyStateSnapshot(snapshot) {
    if (snapshot.cap) {
      this.floorEngine.setCapacity(snapshot.cap);
      if (this.domCapCount) this.domCapCount.textContent = snapshot.cap;
    }

    if (snapshot.settings) {
      this.applySettings({ settings: snapshot.settings, cap: snapshot.cap });
    }

    // Reconcile active characters cleanly (handles full clear / session reset)
    if (Array.isArray(snapshot.viewers)) {
      const incomingIds = new Set(snapshot.viewers.map((v) => String(v.id)));
      for (const existingId of Array.from(this.characterRenderer.characters.keys())) {
        if (!incomingIds.has(existingId)) {
          this.characterRenderer.removeViewer(existingId);
        }
      }
      if (snapshot.viewers.length === 0) {
        for (const bubble of this.bubblePool.values()) {
          bubble.classList.remove('visible');
        }
      }
      for (const v of snapshot.viewers) {
        this.characterRenderer.addOrUpdateViewer(v);
      }
    }

    if (snapshot.tiktok && snapshot.tiktok.likeCount !== undefined && this.domLikeCount) {
      this.domLikeCount.textContent = Number(snapshot.tiktok.likeCount).toLocaleString();
    }

    this.updatePills();
    this.updateMeritBoard(snapshot.topDonors);
  }

  applySettings(data) {
    const s = data.settings;
    if (!s) return;

    if (s.title !== undefined && this.domPlaqueTitle) {
      this.domPlaqueTitle.textContent = s.title;
    }
    if (s.subtitle !== undefined && this.domPlaqueSubtitle) {
      this.domPlaqueSubtitle.textContent = s.subtitle;
    }
    if (s.chantBannerDurationSec) {
      this.chantBannerDurationSec = Number(s.chantBannerDurationSec) || 12;
    }

    if (data.cap) {
      this.floorEngine.setCapacity(data.cap);
      if (this.domCapCount) this.domCapCount.textContent = data.cap;
    }

    if (s.volumes) {
      this.audioEngine.setVolumes(s.volumes);
    }

    if (s.bgmUrl) {
      this.audioEngine.setBgmTrack(s.bgmUrl, Boolean(s.music));
    } else if (s.music) {
      this.audioEngine.startBgm();
    } else {
      this.audioEngine.stopBgm();
    }

    if (s.overlay) {
      const ov = s.overlay;
      if (ov.backgroundUrl) {
        this.floorEngine.setBackgroundUrl(ov.backgroundUrl);
      }
      if (ov.plaqueVisible !== undefined && this.domPlaque) {
        this.domPlaque.style.display = ov.plaqueVisible ? '' : 'none';
      }
      if (ov.fx) {
        this.particleSystem.configureFx(ov.fx);
      }
      if (ov.hud) {
        if (ov.hud.showMeritBoard !== undefined && this.domMerit) {
          this.domMerit.style.display = ov.hud.showMeritBoard ? '' : 'none';
        }
        if (ov.hud.meritTopLimit) {
          this.meritTopLimit = Math.max(1, Math.min(10, Number(ov.hud.meritTopLimit) || 5));
          this.updateMeritBoard();
        }
        if (ov.hud.showPills !== undefined && this.domPills) {
          this.domPills.style.display = ov.hud.showPills ? '' : 'none';
        }
        if (ov.hud.showNametags !== undefined) {
          this.showNametags = Boolean(ov.hud.showNametags);
          if (this.domNametags) {
            this.domNametags.style.display = this.showNametags ? '' : 'none';
          }
        }
      }
      if (ov.bubbleDurationSec !== undefined) {
        this.bubbleDurationSec = Math.max(2, Number(ov.bubbleDurationSec) || 6);
      }
      if (ov.showBubble !== undefined) {
        this.showBubbleDefault = Boolean(ov.showBubble);
      }
      if (ov.skinChange) {
        this.characterRenderer.setSkinChangeConfig(ov.skinChange);
      }
    }
  }

  handleCustomFx(fx) {
    if (fx.pulseHalo) {
      this.particleSystem.pulseHalo();
    }
    if (fx.allBow) {
      this.characterRenderer.triggerAllBow();
    } else if (fx.userId) {
      this.characterRenderer.triggerBow(fx.userId);
    }
    if (fx.rainPetals) {
      this.particleSystem.spawnScreenRain(fx.rainCount || 36);
    }
    if (fx.particleTier > 0 && fx.slotIndex >= 0) {
      const slot = this.floorEngine.getSlot(fx.slotIndex);
      this.particleSystem.spawnGiftParticles(slot.x, slot.y, fx.particleTier);
    }
    if (fx.chime) {
      this.audioEngine.playChime(fx.chime);
    }
    if (fx.banner) {
      this.showCustomBanner(fx.banner);
    }
  }

  handleChat(msg) {
    const text = msg.text || '';
    const id = String(msg.id || '');
    const char = this.characterRenderer.characters.get(id);

    const slotIndex = char ? char.slotIndex : (typeof msg.slotIndex === 'number' ? msg.slotIndex : -1);
    const shouldShowBubble = msg.showBubble !== undefined ? Boolean(msg.showBubble) : this.showBubbleDefault;
    if (slotIndex >= 0 && shouldShowBubble) {
      this.showChatBubble(slotIndex, text, msg.bubbleDurationSec || this.bubbleDurationSec);
    }

    if (id) {
      if (msg.bow !== false) {
        this.characterRenderer.triggerBow(id);
      }
      const detectedSkin = this.characterRenderer.detectSkinNLP(text);
      if (detectedSkin && char) {
        char.skin = detectedSkin;
      }
    }
  }

  handleGift(gift) {
    const id = String(gift.id || '');
    const char = this.characterRenderer.characters.get(id);
    const slotIndex = char ? char.slotIndex : (typeof gift.slotIndex === 'number' ? gift.slotIndex : -1);

    const tier = Number(gift.tier || 1);
    if (slotIndex >= 0 && tier > 0) {
      const slot = this.floorEngine.getSlot(slotIndex);
      this.particleSystem.spawnGiftParticles(slot.x, slot.y, tier);
    }

    if (id) {
      this.characterRenderer.triggerBow(id);
      if (char) {
        char.coins = Number(char.coins || 0) + Number(gift.total ?? gift.coins ?? 0);
        char.isVip = true;
      }
    }

    this.updateMeritBoard();

    if (!gift.repeatEnd) return;

    // Finalized gift visual & audio orchestration
    const pulseHalo = gift.pulseHalo !== undefined ? Boolean(gift.pulseHalo) : tier >= 3;
    const allBow = gift.allBow !== undefined ? Boolean(gift.allBow) : false;
    const rainPetals = gift.rainPetals !== undefined ? Boolean(gift.rainPetals) : false;
    const showBanner = gift.showBanner !== undefined ? Boolean(gift.showBanner) : tier >= 3;
    const sfx = gift.sfx || (tier >= 3 ? 'great_bell' : 'mo');

    if (pulseHalo) this.particleSystem.pulseHalo();
    if (allBow) this.characterRenderer.triggerAllBow();
    if (rainPetals) this.particleSystem.spawnScreenRain(36);
    if (showBanner) this.showGiftBanner(gift);

    if (sfx === 'mo') {
      this.audioEngine.playMo();
    } else if (sfx === 'tier1_chime' || sfx === 'tier2_chime') {
      this.audioEngine.playChime(sfx);
    }
    // Note: 'great_bell' & 'small_bell' are broadcast via dedicated `{ t: 'bell' }` packet from StateManager
  }

  handleLike(like) {
    const id = String(like.id || '');
    const char = this.characterRenderer.characters.get(id);
    const slotIndex = char ? char.slotIndex : (typeof like.slotIndex === 'number' ? like.slotIndex : -1);
    const pTier = like.particleTier !== undefined ? Number(like.particleTier) : 1;

    if (slotIndex >= 0 && pTier > 0) {
      const slot = this.floorEngine.getSlot(slotIndex);
      this.particleSystem.spawnGiftParticles(slot.x, slot.y, pTier);
    }
    if (id && like.bow) {
      this.characterRenderer.triggerBow(id);
    }

    if (like.totalLikes !== undefined && this.domLikeCount) {
      this.domLikeCount.textContent = Number(like.totalLikes).toLocaleString();
    }
  }

  updatePills() {
    if (this.domViewerCount) {
      this.domViewerCount.textContent = this.characterRenderer.characters.size;
    }
    if (this.domCapCount) {
      this.domCapCount.textContent = this.floorEngine.cap;
    }
  }

  updateMeritBoard(explicitTopDonors) {
    if (!this.domMeritList) return;

    const sourceList = Array.isArray(explicitTopDonors) && explicitTopDonors.length > 0
      ? explicitTopDonors
      : Array.from(this.characterRenderer.characters.values());

    const donors = sourceList
      .filter((c) => c.coins > 0)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, this.meritTopLimit || 5);

    if (donors.length === 0) {
      this.domMeritList.innerHTML = '<div class="merit-item" style="justify-content:center;color:#a89578;">Chưa có công đức</div>';
      return;
    }

    let html = '';
    donors.forEach((donor, idx) => {
      const rank = idx + 1;
      const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;
      html += `
        <div class="merit-item">
          <span class="merit-rank">${rankIcon}</span>
          <span class="merit-name">${this.escapeHtml(donor.name)}</span>
          <span class="merit-coins">${Number(donor.coins || 0).toLocaleString()} ✧</span>
        </div>
      `;
    });

    this.domMeritList.innerHTML = html;
  }

  showChatBubble(slotIndex, text, durationSec = 6) {
    if (!this.domBubbles || slotIndex < 0) return;
    const slot = this.floorEngine.getSlot(slotIndex);
    let bubble = this.bubblePool.get(slotIndex);

    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'bubble';
      this.domBubbles.appendChild(bubble);
      this.bubblePool.set(slotIndex, bubble);
    }

    bubble.textContent = text;
    const seatedH = 220;
    const scale = slot.scale;
    bubble.style.left = `${slot.x}px`;
    bubble.style.top = `${slot.y - seatedH * scale - 15}px`;
    bubble.classList.add('visible');

    clearTimeout(bubble._timer);
    bubble._timer = setTimeout(() => {
      bubble.classList.remove('visible');
    }, Math.max(2, Number(durationSec) || 6) * 1000);
  }

  removeBubble(slotIndex) {
    const bubble = this.bubblePool.get(slotIndex);
    if (bubble) {
      bubble.classList.remove('visible');
    }
  }

  showGiftBanner(gift) {
    this.showCustomBanner({
      title: gift.bannerTitle || 'ĐẠI LỄ CÚNG DƯỜNG',
      donor: `Phật tử ${gift.name || 'Ẩn Danh'}`,
      subtitle: `Cúng dường ${gift.giftName || 'Bảo Vật'} (x${gift.count || 1})`,
      prayer: gift.prayer || '',
      durationSec: gift.bannerDurationSec || 10
    });
  }

  showCustomBanner({ title, donor, subtitle, prayer, durationSec = 10 }) {
    if (!this.domGiftBanner) return;
    if (this.domGiftBannerTitle) this.domGiftBannerTitle.textContent = title || 'ĐẠI LỄ CÚNG DƯỜNG';
    if (this.domGiftDonor) this.domGiftDonor.textContent = donor || '';
    if (this.domGiftText) this.domGiftText.textContent = subtitle || '';
    if (this.domGiftPrayer) this.domGiftPrayer.textContent = prayer ? `"${prayer}"` : '';

    this.domGiftBanner.classList.add('active');

    clearTimeout(this._giftBannerTimer);
    this._giftBannerTimer = setTimeout(() => {
      if (this.domGiftBanner) {
        this.domGiftBanner.classList.remove('active');
      }
    }, Math.max(3, Number(durationSec) || 10) * 1000);
  }

  showChant(text, durationSec) {
    if (!this.domChantBanner || !this.domChantText) return;
    this.domChantText.textContent = text;
    this.domChantBanner.classList.add('active');

    const durMs = Math.max(4, Number(durationSec || this.chantBannerDurationSec || 12)) * 1000;
    clearTimeout(this._chantTimer);
    this._chantTimer = setTimeout(() => {
      if (this.domChantBanner) {
        this.domChantBanner.classList.remove('active');
      }
    }, durMs);
  }

  syncNametags() {
    if (!this.domNametags || !this.showNametags) return;

    const activeIndices = new Set();

    for (const char of this.characterRenderer.characters.values()) {
      const slot = this.floorEngine.getSlot(char.slotIndex);
      activeIndices.add(char.slotIndex);

      let tag = this.nametagPool.get(char.slotIndex);
      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'nametag';
        this.domNametags.appendChild(tag);
        this.nametagPool.set(char.slotIndex, tag);
      }

      tag.textContent = char.name;
      const isVip = char.isVip || char.coins > 0;
      tag.className = `nametag ${isVip ? 'vip' : ''}`;
      tag.style.left = `${slot.x}px`;
      tag.style.top = `${slot.y + 4}px`;
      tag.style.display = 'block';
    }

    for (const [idx, tag] of this.nametagPool.entries()) {
      if (!activeIndices.has(idx)) {
        tag.style.display = 'none';
      }
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  renderLoop(timestamp) {
    const deltaTimeSec = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000.0);
    this.lastFrameTime = timestamp;
    const timeSec = timestamp / 1000.0;

    this.characterRenderer.update(deltaTimeSec);
    this.particleSystem.update(deltaTimeSec);

    this.floorEngine.renderBackgroundAndAltar();
    this.particleSystem.render(timeSec);
    this.characterRenderer.render(this.floorEngine.ctx, timeSec);

    this.syncNametags();

    requestAnimationFrame((ts) => this.renderLoop(ts));
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new OverlayApp();
    app.init();
    window.__overlayApp = app;
  });
}
