/**
 * AdminConfigApp.js
 * Full Event-Flow Configuration Studio Controller (/admin.html)
 * Connects via REST `/api/config/*` + WebSocket `role=control` for real-time flow testing & preview.
 */

class AdminConfigStudio {
  constructor() {
    this.config = null;
    this.profiles = [];
    this.availableGifts = [];
    this.ws = null;
    this.isDirty = false;
    this.previewMuted = true;

    this.init();
  }

  async init() {
    this.bindNavigation();
    this.bindStaticActions();
    this.connectWebSocket();
    await this.fetchConfigFromServer();
  }

  toast(title, detail = '', type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `studio-toast ${type}`;
    el.innerHTML = `<div style="font-weight:700;margin-bottom:2px;">${this.esc(title)}</div>${
      detail ? `<div class="text-muted">${this.esc(detail)}</div>` : ''
    }`;
    container.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 3600);
  }

  esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  markDirty(dirty = true) {
    this.isDirty = dirty;
    const badge = document.getElementById('dirty-badge');
    if (badge) {
      badge.classList.toggle('visible', dirty);
    }
  }

  connectWebSocket() {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || '127.0.0.1:3000';
    const url = `${proto}//${host}/ws?role=control`;

    const wsDot = document.getElementById('ws-dot');
    const wsLabel = document.getElementById('ws-label');

    try {
      this.ws = new WebSocket(url);
    } catch {
      return;
    }

    this.ws.onopen = () => {
      if (wsDot) wsDot.className = 'dot green';
      if (wsLabel) wsLabel.textContent = 'WS Connected';
    };

    this.ws.onclose = () => {
      if (wsDot) wsDot.className = 'dot red';
      if (wsLabel) wsLabel.textContent = 'WS Offline';
      setTimeout(() => this.connectWebSocket(), 3000);
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.t === 'state' && msg.tiktok) {
          this.renderTikTokChip(msg.tiktok);
        } else if (msg.t === 'tiktok') {
          this.renderTikTokChip(msg);
        } else if (msg.t === 'gift_catalog' && Array.isArray(msg.gifts)) {
          this.availableGifts = msg.gifts;
          this.renderGiftCatalogPicker();
        }
      } catch {}
    };
  }

  sendWsCmd(cmd, payload = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'ctl', cmd, ...payload }));
      return true;
    }
    this.toast('Chưa kết nối WebSocket', 'Đang tự động kết nối lại...', 'error');
    return false;
  }

  renderTikTokChip(tt) {
    const dot = document.getElementById('tt-dot');
    const lbl = document.getElementById('tt-label');
    if (!dot || !lbl) return;
    if (tt.status === 'connected') {
      dot.className = 'dot green';
      lbl.textContent = `LIVE @${tt.uniqueId} (${tt.viewerCount || 0} xem)`;
    } else if (tt.status === 'connecting') {
      dot.className = 'dot yellow';
      lbl.textContent = `Đang nối @${tt.uniqueId || ''}...`;
    } else if (tt.status === 'error') {
      dot.className = 'dot red';
      lbl.textContent = `Lỗi TikTok`;
    } else {
      dot.className = 'dot';
      lbl.textContent = 'TikTok: Chưa nối';
    }
  }

  bindNavigation() {
    document.querySelectorAll('.flow-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.flow-nav-btn').forEach((b) => b.classList.remove('active'));
        document.querySelectorAll('.section-pane').forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const secId = btn.getAttribute('data-section');
        document.getElementById(secId)?.classList.add('active');
      });
    });
  }

  async fetchConfigFromServer() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      this.config = data.config;
      this.profiles = data.profiles || [];
      this.availableGifts = data.availableGifts || [];
      this.populateAllForms();
      this.markDirty(false);
    } catch (err) {
      this.toast('Lỗi tải cấu hình', err.message, 'error');
    }
  }

  /**
   * Collect current form state into `this.config` and persist via PUT `/api/config`
   */
  async saveConfigToServer(silent = false) {
    if (!this.config) return false;
    this.collectSimpleFieldsIntoConfig();

    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.config)
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Lưu thất bại');
      this.config = data.config;
      this.markDirty(false);
      if (!silent) {
        this.toast('Đã lưu & áp dụng thành công!', 'Mọi sự kiện và màn hình OBS đã cập nhật tức thì.', 'success');
      }
      return true;
    } catch (err) {
      this.toast('Lỗi khi lưu cấu hình', err.message, 'error');
      return false;
    }
  }

  bindStaticActions() {
    // Save & Discard buttons
    document.getElementById('btn-save-top')?.addEventListener('click', () => this.saveConfigToServer());
    document.getElementById('btn-save-bottom')?.addEventListener('click', () => this.saveConfigToServer());
    document.getElementById('btn-discard-changes')?.addEventListener('click', () => {
      this.fetchConfigFromServer();
      this.toast('Đã tải lại', 'Đã khôi phục cấu hình đang chạy trên máy chủ.');
    });

    // Any input/change inside editor marks dirty
    document.getElementById('studio-editor')?.addEventListener('input', (e) => {
      if (e.target.id === 'audition-sample-text' || e.target.id === 'profile-new-name' || e.target.id === 'profile-new-desc') {
        return;
      }
      this.markDirty(true);
    });

    // Section Reset buttons
    document.querySelectorAll('[data-reset-section]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const section = btn.getAttribute('data-reset-section');
        if (!confirm(`Khôi phục mục "${section}" về cấu hình mặc định ban đầu?`)) return;
        const res = await fetch('/api/config/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section })
        });
        const data = await res.json();
        if (data.ok) {
          this.config = data.config;
          this.populateAllForms();
          this.markDirty(false);
          this.toast('Đã khôi phục mặc định', `Mục ${section} đã về mặc định gốc.`, 'success');
        }
      });
    });

    // Factory Reset All
    document.getElementById('btn-factory-reset-all')?.addEventListener('click', async () => {
      if (!confirm('BẠN CHẮC CHẮN MUỐN KHÔI PHỤC TOÀN BỘ 8 NHÓM CẤU HÌNH VỀ MẶC ĐỊNH GỐC?')) return;
      const res = await fetch('/api/config/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      const data = await res.json();
      if (data.ok) {
        this.config = data.config;
        this.populateAllForms();
        this.markDirty(false);
        this.toast('Khôi phục toàn bộ hoàn tất', 'Toàn bộ ứng dụng đã về cấu hình gốc.', 'success');
      }
    });

    // Section 1: Connect / Disconnect & Add Saved Channel
    document.getElementById('cfg-btn-connect-now')?.addEventListener('click', async () => {
      await this.saveConfigToServer(true);
      const uniqueId = document.getElementById('conn-defaultChannel')?.value.trim();
      const roomId = document.getElementById('conn-explicitRoomId')?.value.trim();
      if (!uniqueId) {
        this.toast('Thiếu tên kênh', 'Vui lòng nhập @username TikTok trước khi kết nối.', 'error');
        return;
      }
      this.sendWsCmd('connect', { uniqueId, roomId });
      this.toast('Đang kết nối TikTok LIVE', `Kênh @${uniqueId}...`);
    });

    document.getElementById('cfg-btn-disconnect-now')?.addEventListener('click', () => {
      this.sendWsCmd('disconnect');
      this.toast('Đã ngắt kết nối', 'Đã gửi lệnh dừng phiên TikTok Live.');
    });

    document.getElementById('btn-add-saved-channel')?.addEventListener('click', () => {
      if (!this.config) return;
      this.config.connection.savedChannels.push({
        id: 'ch_' + Date.now().toString(36),
        label: 'Kênh Mới',
        uniqueId: '',
        roomId: ''
      });
      this.renderSavedChannels();
      this.markDirty(true);
    });

    // Generic Micro-Event Flow Test buttons (`data-test-event`)
    document.querySelectorAll('[data-test-event]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (this.isDirty) {
          await this.saveConfigToServer(true);
        }
        const eventType = btn.getAttribute('data-test-event');
        this.sendWsCmd('test_event', { eventType, name: 'Phật Tử Thử Nghiệm' });
        this.toast(`⚡ Đã bắn thử sự kiện: ${eventType.toUpperCase()}`, 'Quan sát màn hình Preview 9:16 bên phải!', 'success');
      });
    });

    // Add Keyword Rule
    document.getElementById('btn-add-keyword-rule')?.addEventListener('click', () => {
      if (!this.config) return;
      this.config.commentFlows.keywordRules.unshift({
        id: 'kw_' + Date.now().toString(36),
        name: 'Rule Từ Khóa Mới',
        enabled: true,
        matchType: 'contains',
        keywords: ['từ khóa mẫu'],
        requireDonor: false,
        minCoins: 0,
        cooldownSec: 10,
        actions: {
          bow: true,
          allBow: false,
          forceSkin: '',
          particleTier: 2,
          pulseHalo: false,
          sfx: 'small_bell',
          bonusCoins: 0,
          showChantBanner: false,
          ttsEnabled: false,
          ttsPriority: 2,
          ttsTemplate: 'Cảm tạ lời nguyện của Phật tử {name}: {text}'
        }
      });
      this.renderKeywordRules();
      this.markDirty(true);
    });

    // Gift Catalog Refresh & Add Gift Override / Tier
    document.getElementById('btn-refresh-gift-catalog')?.addEventListener('click', async () => {
      const res = await fetch('/api/tiktok/gifts?refresh=1');
      const data = await res.json();
      this.availableGifts = data.gifts || [];
      this.renderGiftCatalogPicker();
      this.toast('Đã làm mới Gift Catalog', `Hiện có ${this.availableGifts.length} món quà trong danh mục.`, 'success');
    });

    document.getElementById('btn-add-gift-override')?.addEventListener('click', () => {
      this.addGiftOverrideItem({ giftId: '', giftName: 'Tên Quà Mới', diamonds: 10 });
    });

    document.getElementById('btn-add-gift-tier')?.addEventListener('click', () => {
      if (!this.config) return;
      const nextLevel = (this.config.giftFlows.tiers.length || 0) + 1;
      this.config.giftFlows.tiers.push({
        id: 'tier_' + Date.now().toString(36),
        level: nextLevel,
        name: `Cấp ${nextLevel} · Tầng Quà Tùy Chỉnh`,
        minCoins: 500,
        maxCoins: 2000,
        particleTier: 3,
        sfx: 'great_bell',
        pulseHalo: true,
        allBow: true,
        rainPetals: true,
        showBanner: true,
        bannerTitle: 'ĐẠI LỄ CÚNG DƯỜNG',
        bannerDurationSec: 10,
        grantVip: true,
        forceSkin: '',
        ttsEnabled: true,
        ttsPriority: 1,
        ttsTemplate: 'Nam mô A Di Đà Phật. Phật tử {name} thành tâm cúng dường {countText}{giftName}. {prayer}'
      });
      this.renderGiftTiers();
      this.markDirty(true);
    });

    // Audio Range Sliders Live Label Update
    const bindPctSlider = (id, lblId) => {
      const el = document.getElementById(id);
      const lbl = document.getElementById(lblId);
      el?.addEventListener('input', () => {
        if (lbl) lbl.textContent = `${el.value}%`;
      });
    };
    bindPctSlider('ar-vol-master', 'ar-vol-master-lbl');
    bindPctSlider('ar-vol-bgm', 'ar-vol-bgm-lbl');
    bindPctSlider('ar-vol-sfx', 'ar-vol-sfx-lbl');
    bindPctSlider('ar-vol-bell', 'ar-vol-bell-lbl');
    bindPctSlider('ar-vol-tts', 'ar-vol-tts-lbl');
    bindPctSlider('ar-vol-duckedBgm', 'ar-vol-duckedBgm-lbl');
    bindPctSlider('ss-fx-smokeIntensity', 'ss-fx-smokeIntensity-lbl');
    bindPctSlider('ss-fx-haloIntensity', 'ss-fx-haloIntensity-lbl');

    document.getElementById('ar-bgm-trackSelect')?.addEventListener('change', (e) => {
      const urlInput = document.getElementById('ar-bgm-trackUrl');
      if (urlInput && e.target.value) {
        urlInput.value = e.target.value;
        this.markDirty(true);
      }
    });

    // Voice Audition (plays directly in browser)
    document.getElementById('btn-audition-tts')?.addEventListener('click', async () => {
      const btn = document.getElementById('btn-audition-tts');
      const text = document.getElementById('audition-sample-text')?.value.trim();
      const voice = document.getElementById('ar-tts-voice')?.value;
      const pitch = Number(document.getElementById('ar-tts-pitch')?.value || -18);
      const rate = Number(document.getElementById('ar-tts-rate')?.value || -20);

      if (btn) btn.disabled = true;
      this.toast('Đang tổng hợp giọng đọc AI...', `${voice} (${pitch}Hz, ${rate}%)`);
      try {
        const res = await fetch('/api/tts/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, pitch, rate })
        });
        const data = await res.json();
        if (data.ok && data.dataUri) {
          const audio = new Audio(data.dataUri);
          await audio.play();
          this.toast('Đang phát giọng đọc mẫu!', 'Bạn có thể chỉnh Pitch / Rate rồi bấm nghe lại.', 'success');
        } else {
          this.toast('Không thể phát mẫu TTS', 'Kiểm tra kết nối mạng tới dịch vụ Edge-TTS.', 'error');
        }
      } catch (err) {
        this.toast('Lỗi nghe thử giọng AI', err.message, 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });

    // Profiles & Export / Import
    document.getElementById('btn-save-profile')?.addEventListener('click', async () => {
      await this.saveConfigToServer(true);
      const nameEl = document.getElementById('profile-new-name');
      const descEl = document.getElementById('profile-new-desc');
      const name = nameEl?.value.trim();
      if (!name) {
        this.toast('Thiếu tên hồ sơ', 'Vui lòng nhập tên hồ sơ cấu hình để lưu.', 'error');
        return;
      }
      const res = await fetch('/api/config/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: descEl?.value.trim() || '' })
      });
      const data = await res.json();
      if (data.ok) {
        this.profiles = data.profiles || [];
        if (nameEl) nameEl.value = '';
        if (descEl) descEl.value = '';
        this.renderProfilesList();
        this.toast('Đã lưu Hồ sơ mới!', `Hồ sơ "${name}" đã được cất trữ an toàn.`, 'success');
      }
    });

    document.getElementById('btn-export-json')?.addEventListener('click', () => {
      window.location.href = '/api/config/export?secrets=0';
    });
    document.getElementById('btn-export-json-secrets')?.addEventListener('click', () => {
      window.location.href = '/api/config/export?secrets=1';
    });

    document.getElementById('input-import-json')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const res = await fetch('/api/config/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Import lỗi');
        this.config = data.config;
        this.populateAllForms();
        this.markDirty(false);
        this.toast('Nhập cấu hình thành công!', `Đã áp dụng cấu hình từ file "${file.name}".`, 'success');
      } catch (err) {
        this.toast('File JSON không hợp lệ', err.message, 'error');
      } finally {
        e.target.value = '';
      }
    });

    // Embedded 9:16 Live Preview Controls
    document.getElementById('btn-toggle-preview-audio')?.addEventListener('click', () => {
      this.previewMuted = !this.previewMuted;
      const btn = document.getElementById('btn-toggle-preview-audio');
      if (btn) btn.textContent = this.previewMuted ? '🔇 Bật tiếng' : '🔊 Đang bật tiếng';
      const iframe = document.getElementById('preview-iframe');
      iframe?.contentWindow?.postMessage({ type: 'SET_PREVIEW_MUTE', muted: this.previewMuted }, '*');
    });

    document.getElementById('btn-reload-preview')?.addEventListener('click', () => {
      const iframe = document.getElementById('preview-iframe');
      if (iframe) iframe.src = `/overlay.html?muted=${this.previewMuted ? '1' : '0'}&t=${Date.now()}`;
    });

    document.getElementById('qtest-fill15')?.addEventListener('click', () => this.sendWsCmd('fill', { n: 15 }));
    document.getElementById('qtest-clear')?.addEventListener('click', () => this.sendWsCmd('clear'));
    document.getElementById('qtest-bell')?.addEventListener('click', () => this.sendWsCmd('bell', { isGreatBell: true }));
    document.getElementById('qtest-mo')?.addEventListener('click', () => this.sendWsCmd('mo'));
    document.getElementById('qtest-gift-lotus')?.addEventListener('click', async () => {
      if (this.isDirty) await this.saveConfigToServer(true);
      this.sendWsCmd('gift', { name: 'Phật Tử Minh Tâm', gift: 'Đèn Hoa Sen', giftId: '1002', diamonds: 30, count: 1, prayer: 'Cầu gia đạo bình an' });
    });
    document.getElementById('qtest-gift-grand')?.addEventListener('click', async () => {
      if (this.isDirty) await this.saveConfigToServer(true);
      this.sendWsCmd('gift', { name: 'Đại Thí Chủ Từ Bi', gift: 'Chuông Vàng Đại Lễ', giftId: '1004', diamonds: 200, count: 1, prayer: 'Nguyện quốc thái dân an' });
    });
  }

  // =========================================================================
  // POPULATE FORMS FROM CONFIG OBJECT
  // =========================================================================
  populateAllForms() {
    if (!this.config) return;
    const c = this.config;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val ?? '';
    };
    const setChk = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = Boolean(val);
    };

    // 1. Connection
    setVal('conn-defaultChannel', c.connection.defaultChannel);
    setVal('conn-signApiKey', c.connection.signApiKey);
    setVal('conn-proxyUrl', c.connection.proxyUrl);
    setVal('conn-sessionId', c.connection.sessionId);
    setVal('conn-targetIdc', c.connection.targetIdc);
    setVal('conn-watchdogTimeoutSec', c.connection.watchdogTimeoutSec);
    setChk('conn-autoReconnect', c.connection.autoReconnect);
    setChk('conn-authenticateWs', c.connection.authenticateWs);
    setChk('conn-fetchGiftsOnConnect', c.connection.fetchGiftsOnConnect);

    document.querySelectorAll('[data-ev-toggle]').forEach((chk) => {
      const key = chk.getAttribute('data-ev-toggle');
      chk.checked = c.connection.enabledEvents?.[key] !== false;
    });
    this.renderSavedChannels();

    // 2. Presence & Social
    const pf = c.presenceFlows;
    setChk('pf-member-enabled', pf.memberJoin.enabled);
    setChk('pf-member-seatOnJoin', pf.memberJoin.seatOnJoin);
    setChk('pf-member-bowOnJoin', pf.memberJoin.bowOnJoin);
    setVal('pf-member-minFreeSeatPercent', pf.memberJoin.minFreeSeatPercent);
    setVal('pf-member-defaultSkin', pf.memberJoin.defaultSkin);
    setVal('pf-member-particleTier', pf.memberJoin.particleTier);
    setVal('pf-member-welcomeBubble', pf.memberJoin.welcomeBubble);

    setChk('pf-follow-enabled', pf.follow.enabled);
    setChk('pf-follow-seatOnFollow', pf.follow.seatOnFollow);
    setChk('pf-follow-bowOnFollow', pf.follow.bowOnFollow);
    setVal('pf-follow-bonusCoins', pf.follow.bonusCoins);
    setVal('pf-follow-sfx', pf.follow.sfx);
    setChk('pf-follow-ttsEnabled', pf.follow.ttsEnabled);
    setVal('pf-follow-ttsCooldownSec', pf.follow.ttsCooldownSec);
    setVal('pf-follow-particleTier', pf.follow.particleTier);
    setVal('pf-follow-ttsTemplate', pf.follow.ttsTemplate);

    setChk('pf-share-enabled', pf.share.enabled);
    setChk('pf-share-seatOnShare', pf.share.seatOnShare);
    setChk('pf-share-oncePerSession', pf.share.oncePerSession);
    setVal('pf-share-bonusCoins', pf.share.bonusCoins);
    setVal('pf-share-sfx', pf.share.sfx);
    setChk('pf-share-ttsEnabled', pf.share.ttsEnabled);
    setVal('pf-share-ttsTemplate', pf.share.ttsTemplate);

    setChk('pf-sub-enabled', pf.subscribe.enabled);
    setChk('pf-sub-grantVip', pf.subscribe.grantVip);
    setVal('pf-sub-bonusCoins', pf.subscribe.bonusCoins);
    setVal('pf-sub-ttsTemplate', pf.subscribe.ttsTemplate);

    setChk('pf-env-enabled', pf.envelope.enabled);
    setChk('pf-env-ttsEnabled', pf.envelope.ttsEnabled);

    // 3. Likes & Milestones
    const lf = c.likeFlows;
    setChk('lf-per-enabled', lf.perLike.enabled);
    setChk('lf-per-seatOnLike', lf.perLike.seatOnLike);
    setVal('lf-per-minLikesToSeat', lf.perLike.minLikesToSeat);
    setChk('lf-per-bowOnLike', lf.perLike.bowOnLike);
    setVal('lf-per-particleTier', lf.perLike.particleTier);

    setChk('lf-ms-enabled', lf.milestones.enabled);
    setVal('lf-ms-everyNLikes', lf.milestones.everyNLikes);
    setVal('lf-ms-customThresholds', (lf.milestones.customThresholds || []).join(', '));
    setVal('lf-ms-sfx', lf.milestones.sfx);
    setChk('lf-ms-pulseHalo', lf.milestones.pulseHalo);
    setChk('lf-ms-allBow', lf.milestones.allBow);
    setChk('lf-ms-rainPetals', lf.milestones.rainPetals);
    setChk('lf-ms-showBanner', lf.milestones.showBanner);
    setVal('lf-ms-bannerTitle', lf.milestones.bannerTitle);
    setChk('lf-ms-ttsEnabled', lf.milestones.ttsEnabled);
    setVal('lf-ms-ttsTemplate', lf.milestones.ttsTemplate);

    // 4. Comments, Skin NLP, Keyword Rules & Moderation
    const cf = c.commentFlows;
    setChk('cf-gen-seatOnChat', cf.general.seatOnChat);
    setChk('cf-gen-bowOnChat', cf.general.bowOnChat);
    setChk('cf-gen-showBubble', cf.general.showBubble);
    setVal('cf-gen-bubbleDurationSec', cf.general.bubbleDurationSec);
    setVal('cf-gen-perUserCooldownMs', cf.general.perUserCooldownMs);
    setVal('cf-gen-maxLength', cf.general.maxLength);
    setVal('cf-prayer-ttlSec', cf.prayerCache.ttlSec);
    setVal('cf-prayer-defaultPrayers', (cf.prayerCache.defaultPrayers || []).join('\n'));

    setChk('cf-skin-enabled', cf.skinChange.enabled);
    setVal('cf-skin-exclusions', (cf.skinChange.sacredExclusions || []).join(', '));
    this.renderSkinRules();
    this.renderKeywordRules();

    setChk('cf-mod-enabled', cf.moderation.enabled);
    setVal('cf-mod-fallbackNickname', cf.moderation.fallbackNickname);
    setVal('cf-mod-blockedUsers', (cf.moderation.blockedUserIds || []).join(', '));
    setVal('cf-mod-blacklistWords', (cf.moderation.blacklistWords || []).join(', '));

    // 5. Gifts
    const gf = c.giftFlows;
    setChk('gf-gen-enabled', gf.general.enabled);
    setVal('gf-gen-comboDebounceMs', gf.general.comboDebounceMs);
    setVal('gf-gen-minDiamondsForTts', gf.general.minDiamondsForTts);
    setVal('gf-gen-priority1ThresholdCoins', gf.general.priority1ThresholdCoins);
    setChk('gf-gen-readAllTts', gf.general.readAllTts);
    setChk('gf-gen-intermediateParticles', gf.general.intermediateParticles);
    setChk('gf-gen-autoGrantVipOnGift', gf.general.autoGrantVipOnGift);

    this.renderGiftCatalogPicker();
    this.renderGiftOverrides();
    this.renderGiftTiers();

    // 6. Audio & Ritual
    const ar = c.audioRitual;
    setChk('ar-bgm-enabled', ar.bgm.enabled);
    setVal('ar-bgm-trackUrl', ar.bgm.trackUrl);

    const trackSel = document.getElementById('ar-bgm-trackSelect');
    if (trackSel) {
      const tracks = ar.bgm.availableTracks || [];
      trackSel.innerHTML = tracks
        .map((t) => `<option value="${this.esc(t.url)}">${this.esc(t.name)}</option>`)
        .join('');
      trackSel.value = ar.bgm.trackUrl;
    }

    const setPct = (id, lblId, ratio) => {
      const pct = Math.round((Number(ratio ?? 1) || 0) * 100);
      setVal(id, pct);
      const lbl = document.getElementById(lblId);
      if (lbl) lbl.textContent = `${pct}%`;
    };
    setPct('ar-vol-master', 'ar-vol-master-lbl', ar.volumes.master);
    setPct('ar-vol-bgm', 'ar-vol-bgm-lbl', ar.volumes.bgm);
    setPct('ar-vol-sfx', 'ar-vol-sfx-lbl', ar.volumes.sfx);
    setPct('ar-vol-bell', 'ar-vol-bell-lbl', ar.volumes.bell);
    setPct('ar-vol-tts', 'ar-vol-tts-lbl', ar.volumes.tts);
    setPct('ar-vol-duckedBgm', 'ar-vol-duckedBgm-lbl', ar.volumes.duckedBgm);

    setVal('ar-tts-voice', ar.tts.voice);
    setVal('ar-tts-pitch', ar.tts.pitch);
    setVal('ar-tts-rate', ar.tts.rate);
    setVal('ar-tts-maxQueueSize', ar.tts.maxQueueSize);

    setChk('ar-mo-enabled', ar.mo.enabled);
    setVal('ar-mo-bpm', ar.mo.bpm);
    setChk('ar-chant-enabled', ar.chant.enabled);
    setVal('ar-chant-everyMin', ar.chant.everyMin);
    setVal('ar-chant-items', (ar.chant.items || []).join('\n'));

    // 7. Scene & Seating
    const ss = c.sceneSeating;
    setVal('ss-bg-url', ss.background.url);
    this.renderBackgroundCards();

    setVal('ss-plaque-title', ss.plaque.title);
    setVal('ss-plaque-subtitle', ss.plaque.subtitle);
    setChk('ss-plaque-visible', ss.plaque.visible);

    setChk('ss-fx-smokeEnabled', ss.fx.smokeEnabled);
    setChk('ss-fx-haloEnabled', ss.fx.haloEnabled);
    setChk('ss-fx-candlesEnabled', ss.fx.candlesEnabled);
    setPct('ss-fx-smokeIntensity', 'ss-fx-smokeIntensity-lbl', ss.fx.smokeIntensity);
    setPct('ss-fx-haloIntensity', 'ss-fx-haloIntensity-lbl', ss.fx.haloIntensity);

    setChk('ss-hud-showMeritBoard', ss.hud.showMeritBoard);
    setChk('ss-hud-showPills', ss.hud.showPills);
    setChk('ss-hud-showNametags', ss.hud.showNametags);
    setVal('ss-hud-meritTopLimit', ss.hud.meritTopLimit);

    setVal('ss-seat-seatMode', ss.seating.seatMode);
    setVal('ss-seat-donorIdleEvictMin', ss.seating.donorIdleEvictMin);

    // 8. Presets & Profiles
    this.renderScenePresets();
    this.renderProfilesList();
  }

  // =========================================================================
  // COLLECT FORM FIELDS BACK INTO `this.config`
  // =========================================================================
  collectSimpleFieldsIntoConfig() {
    const c = this.config;
    const val = (id) => document.getElementById(id)?.value ?? '';
    const num = (id, def = 0) => {
      const v = Number(document.getElementById(id)?.value);
      return Number.isFinite(v) ? v : def;
    };
    const chk = (id) => Boolean(document.getElementById(id)?.checked);
    const csv = (id) =>
      val(id)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    const lines = (id) =>
      val(id)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

    // 1. Connection
    c.connection.defaultChannel = val('conn-defaultChannel').trim();
    c.connection.signApiKey = val('conn-signApiKey').trim();
    c.connection.proxyUrl = val('conn-proxyUrl').trim();
    c.connection.sessionId = val('conn-sessionId').trim();
    c.connection.targetIdc = val('conn-targetIdc').trim() || 'alisg';
    c.connection.watchdogTimeoutSec = num('conn-watchdogTimeoutSec', 60);
    c.connection.autoReconnect = chk('conn-autoReconnect');
    c.connection.authenticateWs = chk('conn-authenticateWs');
    c.connection.fetchGiftsOnConnect = chk('conn-fetchGiftsOnConnect');

    document.querySelectorAll('[data-ev-toggle]').forEach((el) => {
      const key = el.getAttribute('data-ev-toggle');
      c.connection.enabledEvents[key] = Boolean(el.checked);
    });

    // 2. Presence & Social
    const pf = c.presenceFlows;
    pf.memberJoin.enabled = chk('pf-member-enabled');
    pf.memberJoin.seatOnJoin = chk('pf-member-seatOnJoin');
    pf.memberJoin.bowOnJoin = chk('pf-member-bowOnJoin');
    pf.memberJoin.minFreeSeatPercent = num('pf-member-minFreeSeatPercent', 20);
    pf.memberJoin.defaultSkin = val('pf-member-defaultSkin') || 'random';
    pf.memberJoin.particleTier = num('pf-member-particleTier', 0);
    pf.memberJoin.welcomeBubble = val('pf-member-welcomeBubble').trim();

    pf.follow.enabled = chk('pf-follow-enabled');
    pf.follow.seatOnFollow = chk('pf-follow-seatOnFollow');
    pf.follow.bowOnFollow = chk('pf-follow-bowOnFollow');
    pf.follow.bonusCoins = num('pf-follow-bonusCoins', 0);
    pf.follow.sfx = val('pf-follow-sfx') || 'none';
    pf.follow.ttsEnabled = chk('pf-follow-ttsEnabled');
    pf.follow.ttsCooldownSec = num('pf-follow-ttsCooldownSec', 30);
    pf.follow.particleTier = num('pf-follow-particleTier', 1);
    pf.follow.ttsTemplate = val('pf-follow-ttsTemplate');

    pf.share.enabled = chk('pf-share-enabled');
    pf.share.seatOnShare = chk('pf-share-seatOnShare');
    pf.share.oncePerSession = chk('pf-share-oncePerSession');
    pf.share.bonusCoins = num('pf-share-bonusCoins', 0);
    pf.share.sfx = val('pf-share-sfx') || 'mo';
    pf.share.ttsEnabled = chk('pf-share-ttsEnabled');
    pf.share.ttsTemplate = val('pf-share-ttsTemplate');

    pf.subscribe.enabled = chk('pf-sub-enabled');
    pf.subscribe.grantVip = chk('pf-sub-grantVip');
    pf.subscribe.bonusCoins = num('pf-sub-bonusCoins', 50);
    pf.subscribe.ttsTemplate = val('pf-sub-ttsTemplate');

    pf.envelope.enabled = chk('pf-env-enabled');
    pf.envelope.ttsEnabled = chk('pf-env-ttsEnabled');

    // 3. Likes & Milestones
    const lf = c.likeFlows;
    lf.perLike.enabled = chk('lf-per-enabled');
    lf.perLike.seatOnLike = chk('lf-per-seatOnLike');
    lf.perLike.minLikesToSeat = num('lf-per-minLikesToSeat', 10);
    lf.perLike.bowOnLike = chk('lf-per-bowOnLike');
    lf.perLike.particleTier = num('lf-per-particleTier', 1);

    lf.milestones.enabled = chk('lf-ms-enabled');
    lf.milestones.everyNLikes = num('lf-ms-everyNLikes', 2000);
    lf.milestones.customThresholds = csv('lf-ms-customThresholds')
      .map((n) => parseInt(n, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    lf.milestones.sfx = val('lf-ms-sfx') || 'great_bell';
    lf.milestones.pulseHalo = chk('lf-ms-pulseHalo');
    lf.milestones.allBow = chk('lf-ms-allBow');
    lf.milestones.rainPetals = chk('lf-ms-rainPetals');
    lf.milestones.showBanner = chk('lf-ms-showBanner');
    lf.milestones.bannerTitle = val('lf-ms-bannerTitle');
    lf.milestones.ttsEnabled = chk('lf-ms-ttsEnabled');
    lf.milestones.ttsTemplate = val('lf-ms-ttsTemplate');

    // 4. Comments & Moderation
    const cf = c.commentFlows;
    cf.general.seatOnChat = chk('cf-gen-seatOnChat');
    cf.general.bowOnChat = chk('cf-gen-bowOnChat');
    cf.general.showBubble = chk('cf-gen-showBubble');
    cf.general.bubbleDurationSec = num('cf-gen-bubbleDurationSec', 6);
    cf.general.perUserCooldownMs = num('cf-gen-perUserCooldownMs', 3000);
    cf.general.maxLength = num('cf-gen-maxLength', 120);
    cf.prayerCache.ttlSec = num('cf-prayer-ttlSec', 90);
    cf.prayerCache.defaultPrayers = lines('cf-prayer-defaultPrayers');

    cf.skinChange.enabled = chk('cf-skin-enabled');
    cf.skinChange.sacredExclusions = csv('cf-skin-exclusions');

    cf.moderation.enabled = chk('cf-mod-enabled');
    cf.moderation.fallbackNickname = val('cf-mod-fallbackNickname').trim() || 'Phật tử hữu duyên';
    cf.moderation.blockedUserIds = csv('cf-mod-blockedUsers');
    cf.moderation.blacklistWords = csv('cf-mod-blacklistWords');

    // 5. Gifts
    const gf = c.giftFlows;
    gf.general.enabled = chk('gf-gen-enabled');
    gf.general.comboDebounceMs = num('gf-gen-comboDebounceMs', 1500);
    gf.general.minDiamondsForTts = num('gf-gen-minDiamondsForTts', 1);
    gf.general.priority1ThresholdCoins = num('gf-gen-priority1ThresholdCoins', 99);
    gf.general.readAllTts = chk('gf-gen-readAllTts');
    gf.general.intermediateParticles = chk('gf-gen-intermediateParticles');
    gf.general.autoGrantVipOnGift = chk('gf-gen-autoGrantVipOnGift');

    // 6. Audio & Ritual
    const ar = c.audioRitual;
    ar.bgm.enabled = chk('ar-bgm-enabled');
    ar.bgm.trackUrl = val('ar-bgm-trackUrl').trim() || '/assets/audio/bgm/music1.mp3';
    ar.volumes.master = num('ar-vol-master', 100) / 100;
    ar.volumes.bgm = num('ar-vol-bgm', 55) / 100;
    ar.volumes.sfx = num('ar-vol-sfx', 85) / 100;
    ar.volumes.bell = num('ar-vol-bell', 95) / 100;
    ar.volumes.tts = num('ar-vol-tts', 100) / 100;
    ar.volumes.duckedBgm = num('ar-vol-duckedBgm', 12) / 100;

    ar.tts.voice = val('ar-tts-voice') || 'vi-VN-NamMinhNeural';
    ar.tts.pitch = num('ar-tts-pitch', -18);
    ar.tts.rate = num('ar-tts-rate', -20);
    ar.tts.maxQueueSize = num('ar-tts-maxQueueSize', 10);

    ar.mo.enabled = chk('ar-mo-enabled');
    ar.mo.bpm = num('ar-mo-bpm', 52);
    ar.chant.enabled = chk('ar-chant-enabled');
    ar.chant.everyMin = num('ar-chant-everyMin', 3);
    ar.chant.items = lines('ar-chant-items');

    // 7. Scene & Seating
    const ss = c.sceneSeating;
    ss.background.url = val('ss-bg-url').trim() || '/assets/backgrounds/hall.jpg';
    ss.plaque.title = val('ss-plaque-title').trim() || 'Chánh Điện Tịnh Tâm';
    ss.plaque.subtitle = val('ss-plaque-subtitle').trim();
    ss.plaque.visible = chk('ss-plaque-visible');

    ss.fx.smokeEnabled = chk('ss-fx-smokeEnabled');
    ss.fx.haloEnabled = chk('ss-fx-haloEnabled');
    ss.fx.candlesEnabled = chk('ss-fx-candlesEnabled');
    ss.fx.smokeIntensity = num('ss-fx-smokeIntensity', 100) / 100;
    ss.fx.haloIntensity = num('ss-fx-haloIntensity', 100) / 100;

    ss.hud.showMeritBoard = chk('ss-hud-showMeritBoard');
    ss.hud.showPills = chk('ss-hud-showPills');
    ss.hud.showNametags = chk('ss-hud-showNametags');
    ss.hud.meritTopLimit = num('ss-hud-meritTopLimit', 5);

    ss.seating.seatMode = val('ss-seat-seatMode') || 'auto';
    ss.seating.donorIdleEvictMin = num('ss-seat-donorIdleEvictMin', 15);
  }

  // =========================================================================
  // DYNAMIC REPEATERS (Saved Channels, Keyword Rules, Skin Rules, Gifts, Profiles)
  // =========================================================================

  renderSavedChannels() {
    const box = document.getElementById('saved-channels-list');
    if (!box || !this.config) return;
    const list = this.config.connection.savedChannels || [];

    box.innerHTML = list
      .map(
        (ch, idx) => `
      <div class="subrule-item" style="padding:10px 12px;">
        <div class="grid-4" style="align-items:center;">
          <input type="text" class="input" data-sch-field="label" data-idx="${idx}" value="${this.esc(ch.label)}" placeholder="Tên gợi nhớ">
          <input type="text" class="input mono" data-sch-field="uniqueId" data-idx="${idx}" value="${this.esc(ch.uniqueId)}" placeholder="@username">
          <input type="text" class="input mono" data-sch-field="roomId" data-idx="${idx}" value="${this.esc(ch.roomId || '')}" placeholder="Room ID (tùy chọn)">
          <div style="display:flex;gap:6px;justify-content:flex-end;">
            <button class="btn btn-xs btn-test" data-sch-connect="${idx}">⚡ Nối ngay</button>
            <button class="btn btn-xs btn-danger" data-sch-del="${idx}">✕</button>
          </div>
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('[data-sch-field]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const i = Number(inp.getAttribute('data-idx'));
        const field = inp.getAttribute('data-sch-field');
        if (list[i]) list[i][field] = inp.value.trim().replace(/^@/, '');
      });
    });

    box.querySelectorAll('[data-sch-connect]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const i = Number(btn.getAttribute('data-sch-connect'));
        const ch = list[i];
        if (!ch?.uniqueId) return this.toast('Chưa có username', 'Hãy nhập @username cho kênh này.', 'error');
        document.getElementById('conn-defaultChannel').value = ch.uniqueId;
        await this.saveConfigToServer(true);
        this.sendWsCmd('connect', { uniqueId: ch.uniqueId, roomId: ch.roomId || undefined });
        this.toast('Đang kết nối kênh đã lưu', `@${ch.uniqueId}`);
      });
    });

    box.querySelectorAll('[data-sch-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-sch-del'));
        list.splice(i, 1);
        this.renderSavedChannels();
        this.markDirty(true);
      });
    });
  }

  renderSkinRules() {
    const box = document.getElementById('skin-rules-container');
    if (!box || !this.config) return;
    const rules = this.config.commentFlows.skinChange.rules || [];

    box.innerHTML = rules
      .map(
        (r, idx) => `
      <div class="subrule-item" style="padding:10px 14px;">
        <div class="grid-3" style="align-items:center;">
          <div><strong class="text-gold">${this.esc(r.label || r.skin)}</strong> <span class="mono text-xs text-muted">(${this.esc(r.skin)})</span></div>
          <div style="grid-column: span 2;">
            <input type="text" class="input" data-skinrule-idx="${idx}" value="${this.esc((r.keywords || []).join(', '))}" placeholder="Từ khóa cách nhau dấu phẩy">
          </div>
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('[data-skinrule-idx]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.getAttribute('data-skinrule-idx'));
        if (rules[idx]) {
          rules[idx].keywords = inp.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      });
    });
  }

  renderKeywordRules() {
    const box = document.getElementById('keyword-rules-container');
    if (!box || !this.config) return;
    const rules = this.config.commentFlows.keywordRules || [];

    if (rules.length === 0) {
      box.innerHTML = '<div class="text-muted">Chưa có rule từ khóa nào. Nhấn "+ Thêm Rule Từ Khóa Mới" ở góc trên để tạo.</div>';
      return;
    }

    box.innerHTML = rules
      .map((r, idx) => {
        const act = r.actions || {};
        return `
        <div class="subrule-item">
          <div class="subrule-top">
            <div style="display:flex;align-items:center;gap:10px;flex:1;">
              <label class="switch"><input type="checkbox" data-kwr-chk="enabled" data-idx="${idx}" ${r.enabled ? 'checked' : ''}><span class="switch-slider"></span></label>
              <input type="text" class="input" style="max-width:280px;font-weight:700;" data-kwr-field="name" data-idx="${idx}" value="${this.esc(r.name)}">
            </div>
            <div style="display:flex;gap:6px;">
              <button class="btn btn-xs btn-test" data-kwr-test="${idx}">⚡ Chạy Thử Rule</button>
              <button class="btn btn-xs btn-danger" data-kwr-del="${idx}">🗑 Xóa</button>
            </div>
          </div>

          <div class="grid-4">
            <div class="field">
              <label>Kiểu khớp từ khóa:</label>
              <select class="select" data-kwr-field="matchType" data-idx="${idx}">
                <option value="contains" ${r.matchType === 'contains' ? 'selected' : ''}>Chứa cụm từ (Contains)</option>
                <option value="startsWith" ${r.matchType === 'startsWith' ? 'selected' : ''}>Bắt đầu bằng (StartsWith)</option>
                <option value="exact" ${r.matchType === 'exact' ? 'selected' : ''}>Khớp chính xác 100%</option>
                <option value="regex" ${r.matchType === 'regex' ? 'selected' : ''}>Biểu thức Regex</option>
              </select>
            </div>
            <div class="field" style="grid-column: span 2;">
              <label>Danh sách từ khóa kích hoạt (cách nhau dấu phẩy):</label>
              <input type="text" class="input" data-kwr-keywords="${idx}" value="${this.esc((r.keywords || []).join(', '))}">
            </div>
            <div class="field">
              <label>Cooldown rule (giây):</label>
              <input type="number" class="input mono" data-kwr-num="cooldownSec" data-idx="${idx}" value="${r.cooldownSec ?? 10}" min="0">
            </div>
          </div>

          <div class="grid-4">
            <label class="check-row"><input type="checkbox" data-kwr-chk="requireDonor" data-idx="${idx}" ${r.requireDonor ? 'checked' : ''}> Chỉ người đã cúng dường</label>
            <label class="check-row"><input type="checkbox" data-kwr-actchk="bow" data-idx="${idx}" ${act.bow ? 'checked' : ''}> Nhân vật cúi lạy</label>
            <label class="check-row"><input type="checkbox" data-kwr-actchk="allBow" data-idx="${idx}" ${act.allBow ? 'checked' : ''}> Cả chánh điện đồng lạy</label>
            <label class="check-row"><input type="checkbox" data-kwr-actchk="pulseHalo" data-idx="${idx}" ${act.pulseHalo ? 'checked' : ''}> Bừng sáng Hào quang Phật</label>
          </div>

          <div class="grid-4">
            <div class="field">
              <label>Âm thanh kích hoạt:</label>
              <select class="select" data-kwr-actfield="sfx" data-idx="${idx}">
                <option value="none" ${act.sfx === 'none' ? 'selected' : ''}>Không phát âm</option>
                <option value="mo" ${act.sfx === 'mo' ? 'selected' : ''}>🪵 Tiếng Mõ</option>
                <option value="tier1_chime" ${act.sfx === 'tier1_chime' ? 'selected' : ''}>✨ Chuông Gió Nhẹ</option>
                <option value="small_bell" ${act.sfx === 'small_bell' ? 'selected' : ''}>🛎️ Chuông Gia Trì</option>
                <option value="great_bell" ${act.sfx === 'great_bell' ? 'selected' : ''}>🔔 Đại Hồng Chung</option>
              </select>
            </div>
            <div class="field">
              <label>Cấp hạt hoa sen:</label>
              <select class="select" data-kwr-actnum="particleTier" data-idx="${idx}">
                <option value="0" ${!act.particleTier ? 'selected' : ''}>Tắt</option>
                <option value="1" ${act.particleTier === 1 ? 'selected' : ''}>Cấp 1 (Nhẹ)</option>
                <option value="2" ${act.particleTier === 2 ? 'selected' : ''}>Cấp 2 (Vừa)</option>
                <option value="3" ${act.particleTier === 3 ? 'selected' : ''}>Cấp 3 (Rực rỡ)</option>
              </select>
            </div>
            <div class="field">
              <label>Ép đổi trang phục:</label>
              <select class="select" data-kwr-actfield="forceSkin" data-idx="${idx}">
                <option value="">Giữ nguyên</option>
                <option value="monk" ${act.forceSkin === 'monk' ? 'selected' : ''}>Sư Thầy</option>
                <option value="nun" ${act.forceSkin === 'nun' ? 'selected' : ''}>Ni Cô</option>
                <option value="master" ${act.forceSkin === 'master' ? 'selected' : ''}>Cao Tăng</option>
                <option value="child" ${act.forceSkin === 'child' ? 'selected' : ''}>Chú Tiểu</option>
                <option value="man" ${act.forceSkin === 'man' ? 'selected' : ''}>Cư Sĩ Nam</option>
                <option value="woman" ${act.forceSkin === 'woman' ? 'selected' : ''}>Cư Sĩ Nữ</option>
              </select>
            </div>
            <div class="field">
              <label>Thưởng xu công đức:</label>
              <input type="number" class="input mono" data-kwr-actnum="bonusCoins" data-idx="${idx}" value="${act.bonusCoins || 0}" min="0">
            </div>
          </div>

          <div class="grid-3" style="align-items:center;">
            <label class="check-row"><input type="checkbox" data-kwr-actchk="ttsEnabled" data-idx="${idx}" ${act.ttsEnabled ? 'checked' : ''}> Đọc câu phản hồi bằng giọng AI</label>
            <div class="field" style="grid-column: span 2;">
              <input type="text" class="input" data-kwr-actfield="ttsTemplate" data-idx="${idx}" value="${this.esc(act.ttsTemplate || '')}" placeholder="Mẫu câu đọc TTS (dùng {name}, {text})">
            </div>
          </div>
        </div>
      `;
      })
      .join('');

    box.querySelectorAll('[data-kwr-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const r = rules[Number(el.getAttribute('data-idx'))];
        if (r) r[el.getAttribute('data-kwr-field')] = el.value;
      });
    });
    box.querySelectorAll('[data-kwr-num]').forEach((el) => {
      el.addEventListener('input', () => {
        const r = rules[Number(el.getAttribute('data-idx'))];
        if (r) r[el.getAttribute('data-kwr-num')] = Number(el.value) || 0;
      });
    });
    box.querySelectorAll('[data-kwr-chk]').forEach((el) => {
      el.addEventListener('change', () => {
        const r = rules[Number(el.getAttribute('data-idx'))];
        if (r) r[el.getAttribute('data-kwr-chk')] = el.checked;
      });
    });
    box.querySelectorAll('[data-kwr-keywords]').forEach((el) => {
      el.addEventListener('input', () => {
        const r = rules[Number(el.getAttribute('data-kwr-keywords'))];
        if (r) {
          r.keywords = el.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      });
    });
    box.querySelectorAll('[data-kwr-actchk]').forEach((el) => {
      el.addEventListener('change', () => {
        const r = rules[Number(el.getAttribute('data-idx'))];
        if (r?.actions) r.actions[el.getAttribute('data-kwr-actchk')] = el.checked;
      });
    });
    box.querySelectorAll('[data-kwr-actfield]').forEach((el) => {
      el.addEventListener('input', () => {
        const r = rules[Number(el.getAttribute('data-idx'))];
        if (r?.actions) r.actions[el.getAttribute('data-kwr-actfield')] = el.value;
      });
    });
    box.querySelectorAll('[data-kwr-actnum]').forEach((el) => {
      el.addEventListener('input', () => {
        const r = rules[Number(el.getAttribute('data-idx'))];
        if (r?.actions) r.actions[el.getAttribute('data-kwr-actnum')] = Number(el.value) || 0;
      });
    });
    box.querySelectorAll('[data-kwr-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        rules.splice(Number(btn.getAttribute('data-kwr-del')), 1);
        this.renderKeywordRules();
        this.markDirty(true);
      });
    });
    box.querySelectorAll('[data-kwr-test]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const r = rules[Number(btn.getAttribute('data-kwr-test'))];
        if (!r) return;
        r.enabled = true;
        await this.saveConfigToServer(true);
        this.renderKeywordRules();
        const sampleKw = r.keywords?.[0] || 'Nam mô A Di Đà Phật';
        const sampleMsg = r.matchType === 'startsWith' ? `${sampleKw} gia đình bình an` : sampleKw;
        this.sendWsCmd('chat', { name: 'Phật Tử Thử Rule', text: sampleMsg });
        this.toast(`⚡ Đã test Rule "${r.name}"`, `Bình luận mẫu: "${sampleMsg}"`, 'success');
      });
    });
  }

  renderGiftCatalogPicker() {
    const picker = document.getElementById('gift-catalog-picker');
    if (!picker) return;
    picker.innerHTML = (this.availableGifts || [])
      .map(
        (g, idx) => `
      <button type="button" class="catalog-gift-btn" data-pick-gift="${idx}" title="Nhấp để thêm cấu hình riêng cho món quà này">
        <div class="catalog-gift-icon">
          ${g.imageUrl ? `<img src="${this.esc(g.imageUrl)}" alt="">` : `<span>${this.esc(g.icon || '🎁')}</span>`}
        </div>
        <div class="catalog-gift-name">${this.esc(g.name)}</div>
        <div class="catalog-gift-coins">${g.diamonds} xu · #${this.esc(g.giftId)}</div>
      </button>
    `
      )
      .join('');

    picker.querySelectorAll('[data-pick-gift]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = this.availableGifts[Number(btn.getAttribute('data-pick-gift'))];
        if (g) {
          this.addGiftOverrideItem(g);
        }
      });
    });
  }

  addGiftOverrideItem(giftInfo) {
    if (!this.config) return;
    const list = this.config.giftFlows.giftOverrides;
    const cleanName = String(giftInfo.name || '').replace(/\s*\(.*?\)\s*/g, '').trim() || giftInfo.name || 'Quà Tặng';
    const diamonds = Number(giftInfo.diamonds) || 10;

    list.unshift({
      id: 'ov_' + Date.now().toString(36),
      enabled: true,
      giftId: String(giftInfo.giftId || ''),
      giftName: cleanName,
      previewDiamonds: diamonds,
      meritMultiplier: 1,
      particleTier: diamonds >= 100 ? 3 : diamonds >= 10 ? 2 : 1,
      sfx: diamonds >= 100 ? 'great_bell' : diamonds >= 10 ? 'small_bell' : 'mo',
      pulseHalo: diamonds >= 30,
      allBow: diamonds >= 100,
      rainPetals: diamonds >= 50,
      showBanner: diamonds >= 30,
      bannerTitle: `CÚNG DƯỜNG ${cleanName.toUpperCase()}`,
      bannerDurationSec: 9,
      grantVip: true,
      forceSkin: '',
      ttsMode: 'custom',
      ttsPriority: diamonds >= 99 ? 1 : 2,
      ttsTemplate: `Nam mô A Di Đà Phật. Phật tử {name} thành tâm dâng {countText}${cleanName}. {prayer}`
    });

    this.renderGiftOverrides();
    this.markDirty(true);
    this.toast('Đã thêm Mapping Quà riêng!', `Hãy tùy chỉnh hành động cho "${cleanName}" bên dưới.`, 'success');
  }

  renderGiftOverrides() {
    const box = document.getElementById('gift-overrides-container');
    if (!box || !this.config) return;
    const list = this.config.giftFlows.giftOverrides || [];

    if (list.length === 0) {
      box.innerHTML = '<div class="text-muted">Chưa có món quà riêng nào. Nhấp vào 1 món quà trên Danh mục phía trên để tạo ngay!</div>';
      return;
    }

    box.innerHTML = list
      .map(
        (ov, idx) => `
      <div class="subrule-item">
        <div class="subrule-top">
          <div style="display:flex;align-items:center;gap:10px;">
            <label class="switch"><input type="checkbox" data-gov-chk="enabled" data-idx="${idx}" ${ov.enabled ? 'checked' : ''}><span class="switch-slider"></span></label>
            <strong class="text-gold">🎁 Quà Cụ Thể: ${this.esc(ov.giftName || 'Chưa đặt tên')}</strong>
            <span class="mono text-xs text-muted">(ID: ${this.esc(ov.giftId || 'theo tên')})</span>
          </div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-xs btn-test" data-gov-test="${idx}">⚡ Bắn Thử Quà Này</button>
            <button class="btn btn-xs btn-danger" data-gov-del="${idx}">🗑 Xóa</button>
          </div>
        </div>

        <div class="grid-4">
          <div class="field">
            <label>Tên quà khớp (`giftName`):</label>
            <input type="text" class="input" data-gov-field="giftName" data-idx="${idx}" value="${this.esc(ov.giftName)}">
          </div>
          <div class="field">
            <label>Mã Gift ID TikTok (`giftId`):</label>
            <input type="text" class="input mono" data-gov-field="giftId" data-idx="${idx}" value="${this.esc(ov.giftId)}">
          </div>
          <div class="field">
            <label>Hệ số nhân điểm Công Đức:</label>
            <input type="number" class="input mono" data-gov-num="meritMultiplier" data-idx="${idx}" value="${ov.meritMultiplier ?? 1}" min="1" max="100" step="0.5">
          </div>
          <div class="field">
            <label>Âm thanh riêng:</label>
            <select class="select" data-gov-field="sfx" data-idx="${idx}">
              <option value="inherit" ${ov.sfx === 'inherit' ? 'selected' : ''}>Theo tầng mặc định</option>
              <option value="mo" ${ov.sfx === 'mo' ? 'selected' : ''}>🪵 Tiếng Mõ</option>
              <option value="tier1_chime" ${ov.sfx === 'tier1_chime' ? 'selected' : ''}>✨ Chuông Chúc Phúc 1</option>
              <option value="tier2_chime" ${ov.sfx === 'tier2_chime' ? 'selected' : ''}>🌟 Chuông Chúc Phúc 2</option>
              <option value="small_bell" ${ov.sfx === 'small_bell' ? 'selected' : ''}>🛎️ Chuông Gia Trì</option>
              <option value="great_bell" ${ov.sfx === 'great_bell' ? 'selected' : ''}>🔔 Đại Hồng Chung</option>
              <option value="none" ${ov.sfx === 'none' ? 'selected' : ''}>Tắt tiếng</option>
            </select>
          </div>
        </div>

        <div class="grid-4">
          <label class="check-row"><input type="checkbox" data-gov-chk="pulseHalo" data-idx="${idx}" ${ov.pulseHalo ? 'checked' : ''}> Bừng sáng Hào quang</label>
          <label class="check-row"><input type="checkbox" data-gov-chk="allBow" data-idx="${idx}" ${ov.allBow ? 'checked' : ''}> Cả chánh điện đồng lạy</label>
          <label class="check-row"><input type="checkbox" data-gov-chk="rainPetals" data-idx="${idx}" ${ov.rainPetals ? 'checked' : ''}> Mưa hoa sen toàn cảnh</label>
          <label class="check-row"><input type="checkbox" data-gov-chk="showBanner" data-idx="${idx}" ${ov.showBanner ? 'checked' : ''}> Hiện Banner Vinh Danh</label>
        </div>

        <div class="grid-3">
          <div class="field">
            <label>Tiêu đề Banner (nếu bật):</label>
            <input type="text" class="input" data-gov-field="bannerTitle" data-idx="${idx}" value="${this.esc(ov.bannerTitle || '')}">
          </div>
          <div class="field">
            <label>Ép đổi trang phục cho người tặng:</label>
            <select class="select" data-gov-field="forceSkin" data-idx="${idx}">
              <option value="">Giữ nguyên</option>
              <option value="master" ${ov.forceSkin === 'master' ? 'selected' : ''}>Cao Tăng Viện Chủ</option>
              <option value="monk" ${ov.forceSkin === 'monk' ? 'selected' : ''}>Sư Thầy</option>
              <option value="nun" ${ov.forceSkin === 'nun' ? 'selected' : ''}>Ni Cô</option>
              <option value="man" ${ov.forceSkin === 'man' ? 'selected' : ''}>Cư Sĩ Nam</option>
              <option value="woman" ${ov.forceSkin === 'woman' ? 'selected' : ''}>Cư Sĩ Nữ</option>
            </select>
          </div>
          <div class="field">
            <label>Chế độ đọc giọng AI (TTS):</label>
            <select class="select" data-gov-field="ttsMode" data-idx="${idx}">
              <option value="inherit" ${ov.ttsMode === 'inherit' ? 'selected' : ''}>Dùng mẫu câu của Tầng Xu</option>
              <option value="custom" ${ov.ttsMode === 'custom' ? 'selected' : ''}>Dùng câu chúc riêng bên dưới</option>
              <option value="mute" ${ov.ttsMode === 'mute' ? 'selected' : ''}>Tắt đọc TTS cho món quà này</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>Mẫu câu đọc TTS riêng cho món quà này (`{name}`, `{giftName}`, `{countText}`, `{prayer}`):</label>
          <input type="text" class="input" data-gov-field="ttsTemplate" data-idx="${idx}" value="${this.esc(ov.ttsTemplate || '')}">
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('[data-gov-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const item = list[Number(el.getAttribute('data-idx'))];
        if (item) item[el.getAttribute('data-gov-field')] = el.value;
      });
    });
    box.querySelectorAll('[data-gov-num]').forEach((el) => {
      el.addEventListener('input', () => {
        const item = list[Number(el.getAttribute('data-idx'))];
        if (item) item[el.getAttribute('data-gov-num')] = Number(el.value) || 1;
      });
    });
    box.querySelectorAll('[data-gov-chk]').forEach((el) => {
      el.addEventListener('change', () => {
        const item = list[Number(el.getAttribute('data-idx'))];
        if (item) item[el.getAttribute('data-gov-chk')] = el.checked;
      });
    });
    box.querySelectorAll('[data-gov-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        list.splice(Number(btn.getAttribute('data-gov-del')), 1);
        this.renderGiftOverrides();
        this.markDirty(true);
      });
    });
    box.querySelectorAll('[data-gov-test]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const ov = list[Number(btn.getAttribute('data-gov-test'))];
        if (!ov) return;
        ov.enabled = true;
        await this.saveConfigToServer(true);
        this.renderGiftOverrides();
        this.sendWsCmd('gift', {
          name: 'Phật Tử Thử Quà',
          gift: ov.giftName || 'Đèn Hoa Sen',
          giftId: ov.giftId || undefined,
          diamonds: ov.previewDiamonds || 30,
          count: 1,
          prayer: 'Nguyện cầu gia đạo bình an, sở nguyện tòng tâm'
        });
        this.toast(`⚡ Đã bắn thử quà "${ov.giftName}"`, 'Kiểm tra hiệu ứng trên màn hình Preview 9:16!', 'success');
      });
    });
  }

  renderGiftTiers() {
    const box = document.getElementById('gift-tiers-container');
    if (!box || !this.config) return;
    const tiers = this.config.giftFlows.tiers || [];

    box.innerHTML = tiers
      .map(
        (t, idx) => `
      <div class="subrule-item">
        <div class="subrule-top">
          <input type="text" class="input" style="max-width:340px;font-weight:700;color:var(--gold-light);" data-gt-field="name" data-idx="${idx}" value="${this.esc(t.name)}">
          <div style="display:flex;gap:6px;">
            <button class="btn btn-xs btn-test" data-gt-test="${idx}">⚡ Test Tầng Này</button>
            ${tiers.length > 1 ? `<button class="btn btn-xs btn-danger" data-gt-del="${idx}">🗑</button>` : ''}
          </div>
        </div>

        <div class="grid-4">
          <div class="field">
            <label>Từ số xu (`minCoins`):</label>
            <input type="number" class="input mono" data-gt-num="minCoins" data-idx="${idx}" value="${t.minCoins}" min="1">
          </div>
          <div class="field">
            <label>Đến số xu (`maxCoins`):</label>
            <input type="number" class="input mono" data-gt-num="maxCoins" data-idx="${idx}" value="${t.maxCoins}" min="1">
          </div>
          <div class="field">
            <label>Âm thanh nghi lễ:</label>
            <select class="select" data-gt-field="sfx" data-idx="${idx}">
              <option value="mo" ${t.sfx === 'mo' ? 'selected' : ''}>🪵 Tiếng Mõ</option>
              <option value="tier1_chime" ${t.sfx === 'tier1_chime' ? 'selected' : ''}>✨ Chuông Chúc Phúc 1</option>
              <option value="tier2_chime" ${t.sfx === 'tier2_chime' ? 'selected' : ''}>🌟 Chuông Chúc Phúc 2</option>
              <option value="small_bell" ${t.sfx === 'small_bell' ? 'selected' : ''}>🛎️ Chuông Gia Trì</option>
              <option value="great_bell" ${t.sfx === 'great_bell' ? 'selected' : ''}>🔔 Đại Hồng Chung</option>
              <option value="none" ${t.sfx === 'none' ? 'selected' : ''}>Không phát âm</option>
            </select>
          </div>
          <div class="field">
            <label>Cấp hạt hoa sen:</label>
            <select class="select" data-gt-num="particleTier" data-idx="${idx}">
              <option value="1" ${t.particleTier === 1 ? 'selected' : ''}>Cấp 1 (6 hạt)</option>
              <option value="2" ${t.particleTier === 2 ? 'selected' : ''}>Cấp 2 (15 hoa sen)</option>
              <option value="3" ${t.particleTier >= 3 ? 'selected' : ''}>Cấp 3 (40 sen đại lễ)</option>
            </select>
          </div>
        </div>

        <div class="grid-4">
          <label class="check-row"><input type="checkbox" data-gt-chk="pulseHalo" data-idx="${idx}" ${t.pulseHalo ? 'checked' : ''}> Bừng Hào quang Phật</label>
          <label class="check-row"><input type="checkbox" data-gt-chk="allBow" data-idx="${idx}" ${t.allBow ? 'checked' : ''}> Cả chánh điện đồng lạy</label>
          <label class="check-row"><input type="checkbox" data-gt-chk="rainPetals" data-idx="${idx}" ${t.rainPetals ? 'checked' : ''}> Mưa hoa sen toàn cảnh</label>
          <label class="check-row"><input type="checkbox" data-gt-chk="showBanner" data-idx="${idx}" ${t.showBanner ? 'checked' : ''}> Hiện Banner Vinh Danh</label>
        </div>

        <div class="grid-3">
          <div class="field">
            <label>Tiêu đề Banner:</label>
            <input type="text" class="input" data-gt-field="bannerTitle" data-idx="${idx}" value="${this.esc(t.bannerTitle || '')}">
          </div>
          <div class="field">
            <label>Thời lượng Banner (giây):</label>
            <input type="number" class="input mono" data-gt-num="bannerDurationSec" data-idx="${idx}" value="${t.bannerDurationSec || 10}" min="3" max="30">
          </div>
          <label class="check-row" style="align-self:end;"><input type="checkbox" data-gt-chk="ttsEnabled" data-idx="${idx}" ${t.ttsEnabled !== false ? 'checked' : ''}> Đọc giọng AI ở tầng này</label>
        </div>

        <div class="field">
          <label>Mẫu câu đọc TTS của tầng này:</label>
          <input type="text" class="input" data-gt-field="ttsTemplate" data-idx="${idx}" value="${this.esc(t.ttsTemplate || '')}">
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('[data-gt-field]').forEach((el) => {
      el.addEventListener('input', () => {
        const item = tiers[Number(el.getAttribute('data-idx'))];
        if (item) item[el.getAttribute('data-gt-field')] = el.value;
      });
    });
    box.querySelectorAll('[data-gt-num]').forEach((el) => {
      el.addEventListener('input', () => {
        const item = tiers[Number(el.getAttribute('data-idx'))];
        if (item) item[el.getAttribute('data-gt-num')] = Number(el.value) || 1;
      });
    });
    box.querySelectorAll('[data-gt-chk]').forEach((el) => {
      el.addEventListener('change', () => {
        const item = tiers[Number(el.getAttribute('data-idx'))];
        if (item) item[el.getAttribute('data-gt-chk')] = el.checked;
      });
    });
    box.querySelectorAll('[data-gt-del]').forEach((btn) => {
      btn.addEventListener('click', () => {
        tiers.splice(Number(btn.getAttribute('data-gt-del')), 1);
        this.renderGiftTiers();
        this.markDirty(true);
      });
    });
    box.querySelectorAll('[data-gt-test]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const t = tiers[Number(btn.getAttribute('data-gt-test'))];
        if (!t) return;
        await this.saveConfigToServer(true);
        const testCoins = Math.max(1, Number(t.minCoins) || 1);
        this.sendWsCmd('gift', {
          name: 'Thí Chủ Kiểm Thử',
          gift: `Lễ Vật ${testCoins} Xu`,
          diamonds: testCoins,
          count: 1,
          prayer: 'Cầu an lạc cát tường'
        });
        this.toast(`⚡ Đã test ${t.name}`, `Số xu mô phỏng: ${testCoins} xu`, 'success');
      });
    });
  }

  renderBackgroundCards() {
    const grid = document.getElementById('scene-bg-grid');
    if (!grid || !this.config) return;
    const bgs = this.config.sceneSeating.background.availableBackgrounds || [];
    const current = this.config.sceneSeating.background.url;

    grid.innerHTML = bgs
      .map(
        (b) => `
      <div class="bg-choice-card ${current === b.url ? 'selected' : ''}" data-bg-url="${this.esc(b.url)}">
        <div class="bg-choice-thumb" style="background-image:url('${this.esc(b.url)}');"></div>
        <div class="bg-choice-label">${this.esc(b.name)}</div>
      </div>
    `
      )
      .join('');

    grid.querySelectorAll('[data-bg-url]').forEach((card) => {
      card.addEventListener('click', async () => {
        const url = card.getAttribute('data-bg-url');
        this.config.sceneSeating.background.url = url;
        const input = document.getElementById('ss-bg-url');
        if (input) input.value = url;
        this.renderBackgroundCards();
        await this.saveConfigToServer(true);
        this.toast('Đã đổi cảnh Chánh Điện!', 'Quan sát cảnh mới trên màn hình Preview bên phải.', 'success');
      });
    });
  }

  renderScenePresets() {
    const box = document.getElementById('scene-presets-cards');
    if (!box || !this.config) return;
    const presets = this.config.scenePresets || [];

    box.innerHTML = presets
      .map(
        (p) => `
      <div class="subrule-item" style="justify-content:space-between;">
        <div>
          <strong class="text-gold" style="font-size:13.5px;">${this.esc(p.name)}</strong>
          <p class="text-muted text-xs" style="margin-top:4px;">${this.esc(p.description)}</p>
        </div>
        <button class="btn btn-sm btn-gold" data-apply-preset="${this.esc(p.id)}">⚡ Áp Dụng Kịch Bản Này Ngay</button>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('[data-apply-preset]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const presetId = btn.getAttribute('data-apply-preset');
        const res = await fetch('/api/config/preset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presetId })
        });
        const data = await res.json();
        if (data.ok) {
          this.config = data.config;
          this.populateAllForms();
          this.markDirty(false);
          this.toast('Đã kích hoạt Kịch bản!', data.preset.name, 'success');
        }
      });
    });
  }

  renderProfilesList() {
    const box = document.getElementById('saved-profiles-list');
    if (!box) return;
    if (!this.profiles.length) {
      box.innerHTML = '<div class="text-muted text-xs">Chưa có hồ sơ cấu hình nào được lưu riêng.</div>';
      return;
    }

    box.innerHTML = this.profiles
      .map(
        (p) => `
      <div class="subrule-item" style="flex-direction:row;align-items:center;justify-content:space-between;">
        <div>
          <strong class="text-gold">${this.esc(p.name)}</strong>
          <div class="text-xs text-muted">${this.esc(p.description || 'Không có ghi chú')} · Lưu lúc ${new Date(p.savedAt).toLocaleString('vi-VN')}</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-xs btn-gold" data-prof-load="${this.esc(p.id)}">📂 Nạp & Áp Dụng</button>
          <button class="btn btn-xs btn-danger" data-prof-del="${this.esc(p.id)}">🗑 Xóa</button>
        </div>
      </div>
    `
      )
      .join('');

    box.querySelectorAll('[data-prof-load]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-prof-load');
        const res = await fetch(`/api/config/profiles/${encodeURIComponent(id)}/load`, { method: 'POST' });
        const data = await res.json();
        if (data.ok) {
          this.config = data.config;
          this.populateAllForms();
          this.markDirty(false);
          this.toast('Đã nạp Hồ sơ cấu hình!', data.profile.name, 'success');
        }
      });
    });

    box.querySelectorAll('[data-prof-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-prof-del');
        if (!confirm('Xóa hồ sơ cấu hình này?')) return;
        const res = await fetch(`/api/config/profiles/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const data = await res.json();
        this.profiles = data.profiles || [];
        this.renderProfilesList();
      });
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__adminStudio = new AdminConfigStudio();
});

