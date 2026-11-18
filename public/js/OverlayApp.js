/**
 * OverlayApp.js
 * Master Application Coordinator & WebSocket Client (role=overlay)
 * Complies with WEBSOCKET_SPEC.md and ARCHITECTURE.md
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

    // DOM HUD Element Cache
    this.domPlaqueTitle = document.getElementById('plaque-title');
    this.domPlaqueSubtitle = document.getElementById('plaque-subtitle');
    this.domViewerCount = document.getElementById('viewer-count');
    this.domCapCount = document.getElementById('capacity-count');
    this.domLikeCount = document.getElementById('like-count');
    this.domMeritList = document.getElementById('merit-list');
    this.domChantBanner = document.getElementById('chant-banner');
    this.domChantText = document.getElementById('chant-text');
    this.domGiftBanner = document.getElementById('gift-banner');
    this.domGiftDonor = document.getElementById('gift-banner-donor');
    this.domGiftText = document.getElementById('gift-banner-gift');
    this.domGiftPrayer = document.getElementById('gift-banner-prayer');
    this.domBubbles = document.getElementById('speech-bubbles');
    this.domNametags = document.getElementById('nametags');

    // DOM Element Pools
    this.bubblePool = new Map(); // slotIndex -> HTMLDivElement
    this.nametagPool = new Map(); // slotIndex -> HTMLDivElement

    // Timers
    this._chantTimer = null;
    this._giftBannerTimer = null;
  }

  async init() {
    // 1. Preload Temple Graphics & Audio
    await Promise.all([
      this.floorEngine.loadAssets(),
      this.characterRenderer.loadCharacterSpritesheets(),
      this.audioEngine.preloadManifestAudio()
    ]);

    // 2. Start 60fps Compositing Loop
    requestAnimationFrame((ts) => this.renderLoop(ts));

    // 3. Establish WebSocket Connection (role=overlay)
    this.connectWebSocket();
  }

  connectWebSocket() {
    const isHttps = window.location.protocol === 'https:';
    const protocol = isHttps ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:3000';
    const wsUrl = `${protocol}//${host}/ws?role=overlay`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
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
        } catch (e) {}
      }
    };
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, up to 10s max
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

      case 'tts':
        if (msg.dataUri) {
          this.audioEngine.playTtsDataUri(msg.dataUri);
        }
        break;

      case 'chant':
        if (msg.text) {
          this.showChant(msg.text);
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

    if (Array.isArray(snapshot.viewers)) {
      for (const v of snapshot.viewers) {
        this.characterRenderer.addOrUpdateViewer(v);
      }
    }

    if (snapshot.tiktok && snapshot.tiktok.likeCount !== undefined && this.domLikeCount) {
      this.domLikeCount.textContent = Number(snapshot.tiktok.likeCount).toLocaleString();
    }

    this.updatePills();
    this.updateMeritBoard();
  }

  applySettings(data) {
    const s = data.settings;
    if (!s) return;

    if (s.title && this.domPlaqueTitle) {
      this.domPlaqueTitle.textContent = s.title;
    }
    if (s.subtitle && this.domPlaqueSubtitle) {
      this.domPlaqueSubtitle.textContent = s.subtitle;
    }

    if (data.cap) {
      this.floorEngine.setCapacity(data.cap);
      if (this.domCapCount) this.domCapCount.textContent = data.cap;
    }

    if (s.music) {
      this.audioEngine.startBgm();
    } else {
      this.audioEngine.stopBgm();
    }
  }

  handleChat(msg) {
    const text = msg.text || '';
    const id = String(msg.id || '');
    let char = this.characterRenderer.characters.get(id);

    // If slotIndex is provided and char found, anchor bubble
    const slotIndex = char ? char.slotIndex : (typeof msg.slotIndex === 'number' ? msg.slotIndex : -1);
    if (slotIndex >= 0) {
      this.showChatBubble(slotIndex, text);
    }

    if (id) {
      this.characterRenderer.triggerBow(id);

      // Check if user requested skin change via NLP
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
    if (slotIndex >= 0) {
      const slot = this.floorEngine.getSlot(slotIndex);
      this.particleSystem.spawnGiftParticles(slot.x, slot.y, tier);
    }

    if (id) {
      this.characterRenderer.triggerBow(id);
      if (char) {
        char.coins = Number(gift.total ?? (char.coins + (gift.coins || 0)));
        char.isVip = true;
      }
    }

    this.updateMeritBoard();

    if (tier === 3) {
      this.particleSystem.pulseHalo();
      this.audioEngine.playBell(true);
      this.showGiftBanner(gift);
    } else if (gift.repeatEnd) {
      this.audioEngine.playMo();
    }
  }

  handleLike(like) {
    const id = String(like.id || '');
    const char = this.characterRenderer.characters.get(id);
    const slotIndex = char ? char.slotIndex : (typeof like.slotIndex === 'number' ? like.slotIndex : -1);

    if (slotIndex >= 0) {
      const slot = this.floorEngine.getSlot(slotIndex);
      this.particleSystem.spawnGiftParticles(slot.x, slot.y, 1);
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

  updateMeritBoard() {
    if (!this.domMeritList) return;

    // Filter viewers with positive coins, sort descending
    const donors = Array.from(this.characterRenderer.characters.values())
      .filter((c) => c.coins > 0)
      .sort((a, b) => b.coins - a.coins)
      .slice(0, 5);

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
          <span class="merit-coins">${donor.coins.toLocaleString()} ✧</span>
        </div>
      `;
    });

    this.domMeritList.innerHTML = html;
  }

  showChatBubble(slotIndex, text) {
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

    // Auto dismiss bubble after 6 seconds
    clearTimeout(bubble._timer);
    bubble._timer = setTimeout(() => {
      bubble.classList.remove('visible');
    }, 6000);
  }

  removeBubble(slotIndex) {
    const bubble = this.bubblePool.get(slotIndex);
    if (bubble) {
      bubble.classList.remove('visible');
    }
  }

  showGiftBanner(gift) {
    if (!this.domGiftBanner) return;
    if (this.domGiftDonor) this.domGiftDonor.textContent = `Phật tử ${gift.name || 'Ẩn Danh'}`;
    if (this.domGiftText) this.domGiftText.textContent = `Cúng dường ${gift.giftName || 'Bảo Vật'} (x${gift.count || 1})`;
    if (this.domGiftPrayer) this.domGiftPrayer.textContent = gift.prayer ? `"${gift.prayer}"` : '';

    this.domGiftBanner.classList.add('active');

    clearTimeout(this._giftBannerTimer);
    this._giftBannerTimer = setTimeout(() => {
      if (this.domGiftBanner) {
        this.domGiftBanner.classList.remove('active');
      }
    }, 10000);
  }

  showChant(text) {
    if (!this.domChantBanner || !this.domChantText) return;
    this.domChantText.textContent = text;
    this.domChantBanner.classList.add('active');

    clearTimeout(this._chantTimer);
    this._chantTimer = setTimeout(() => {
      if (this.domChantBanner) {
        this.domChantBanner.classList.remove('active');
      }
    }, 12000);
  }

  syncNametags() {
    if (!this.domNametags) return;

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

    // Hide unassigned nametags
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

    // 1. Update Game States
    this.characterRenderer.update(deltaTimeSec);
    this.particleSystem.update(deltaTimeSec);

    // 2. Render Layer 1: Canvas 2D
    this.floorEngine.renderBackgroundAndAltar();
    this.particleSystem.render(timeSec);
    this.characterRenderer.render(this.floorEngine.ctx, timeSec);

    // 3. Sync DOM Layer Anchors
    this.syncNametags();

    requestAnimationFrame((ts) => this.renderLoop(ts));
  }
}

// Auto bootstrap on DOM content ready in browser
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new OverlayApp();
    app.init();
    window.__overlayApp = app;
  });
}
