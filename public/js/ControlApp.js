/**
 * ==============================================================================
 * CHÁNH ĐIỆN TỊNH TÂM · TRUNG TÂM CHỈ HUY QUẢN TRỊ (CONTROL CLIENT)
 * File: public/js/ControlApp.js
 * Architecture: Pluggable Modular Registry with Reactive State Store
 * Protocol: WebSocket Role-Based Client (`role=control`)
 * WebSocket Specification: Strict adherence to all 16 `ctl` commands
 * ==============================================================================
 */

/**
 * ------------------------------------------------------------------------------
 * 1. CORE TYPES & STATE STORE (Reactive State Management)
 * ------------------------------------------------------------------------------
 */

class AdminStateStore {
  constructor() {
    // WebSocket Connection State
    this.wsStatus = 'disconnected'; // 'connecting' | 'connected' | 'disconnected' | 'error'
    this.reconnectAttempts = 0;

    // TikTok Stream Telemetry
    this.tiktok = {
      status: 'idle', // 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'
      uniqueId: 'kenh_phat_phap',
      roomId: '',
      viewerCount: 0,
      likeCount: 0,
      error: ''
    };

    // Room Settings
    this.settings = {
      title: 'Chánh Điện Tịnh Tâm',
      subtitle: 'Nam Mô Bổn Sư Thích Ca Mâu Ni Phật',
      voice: 'vi-VN-NamMinhNeural',
      pitch: -18,
      rate: -20,
      music: true,
      mo: true,
      moBpm: 52,
      autoChant: true,
      chantEveryMin: 3,
      seatMode: 'auto',
      joinOnEnter: false,
      gifts: {
        readAll: true,
        minDiamonds: 1
      }
    };

    // Seating Matrix & Occupants
    this.cap = 24; // 24 | 36 | 64 | 100
    this.viewers = []; // Array of ViewerState
    this.slots = new Array(100).fill(null); // Slot map index 0..99
    this.lockedSlots = new Set(); // Set of slot indices locked by admin
    this.selectedSlotIndex = null;

    // Bot Engine State
    this.botState = {
      on: false,
      count: 15,
      pace: 'mid' // 'slow' | 'mid' | 'fast'
    };

    // Server Uptime
    this.startedAt = Date.now();
    this.sessionTimerInterval = null;

    // Audit Logger Buffer (max 300 entries)
    this.logs = [];
    this.logFilter = 'all'; // 'all' | 'gift' | 'chat' | 'ritual' | 'warn' | 'error'
    this.autoScroll = true;

    // Full Config, Live TTS Queue & Session Stats
    this.fullConfig = null;
    this.ttsQueue = { paused: false, muted: false, current: null, pending: [], recent: [] };
    this.sessionStats = { totalDiamonds: 0, totalGifts: 0, recentGifts: [] };

    // Event Listeners (Pub/Sub)
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (err) { console.error(`Error in event listener [${event}]:`, err); }
      });
    }
  }

  setWsStatus(status) {
    this.wsStatus = status;
    this.emit('ws_status_change', status);
  }

  setTikTokStatus(payload) {
    this.tiktok = { ...this.tiktok, ...payload };
    this.emit('tiktok_change', this.tiktok);
  }

  syncFullState(state) {
    if (state.settings) {
      this.settings = { ...this.settings, ...state.settings };
    }
    if (typeof state.cap === 'number') {
      this.cap = state.cap;
    }
    if (state.startedAt) {
      this.startedAt = state.startedAt;
    }
    if (state.tiktok) {
      this.tiktok = { ...this.tiktok, ...state.tiktok };
    }

    // Reconstruct slots array
    this.slots.fill(null);
    if (Array.isArray(state.viewers)) {
      this.viewers = [...state.viewers];
      this.viewers.forEach(v => {
        if (typeof v.slotIndex === 'number' && v.slotIndex >= 0 && v.slotIndex < 100) {
          this.slots[v.slotIndex] = v;
        }
      });
    } else {
      this.viewers = [];
    }

    this.emit('full_state_synced', this);
  }

  addOrUpdateViewer(v, newCap) {
    if (typeof newCap === 'number') {
      this.cap = newCap;
    }
    // Remove old location if already present
    const existingIdx = this.viewers.findIndex(x => x.id === v.id);
    if (existingIdx !== -1) {
      const oldSlot = this.viewers[existingIdx].slotIndex;
      if (typeof oldSlot === 'number' && this.slots[oldSlot]?.id === v.id) {
        this.slots[oldSlot] = null;
      }
      this.viewers.splice(existingIdx, 1);
    }

    this.viewers.push(v);
    if (typeof v.slotIndex === 'number' && v.slotIndex >= 0 && v.slotIndex < 100) {
      this.slots[v.slotIndex] = v;
    }

    this.emit('viewer_updated', { viewer: v, cap: this.cap });
  }

  removeViewer(id, slotIndex, reason) {
    const idx = this.viewers.findIndex(v => v.id === id);
    if (idx !== -1) {
      this.viewers.splice(idx, 1);
    }
    if (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < 100) {
      this.slots[slotIndex] = null;
    } else {
      // Find and clear slot
      for (let i = 0; i < this.slots.length; i++) {
        if (this.slots[i]?.id === id) {
          this.slots[i] = null;
          break;
        }
      }
    }
    this.emit('viewer_removed', { id, slotIndex, reason });
  }

  updateSkin(id, skin) {
    const v = this.viewers.find(x => x.id === id);
    if (v) {
      v.skin = skin;
      if (typeof v.slotIndex === 'number' && this.slots[v.slotIndex]) {
        this.slots[v.slotIndex].skin = skin;
      }
      this.emit('viewer_skin_changed', { id, skin });
    }
  }

  updateSettings(newSettings, newCap) {
    if (newSettings) {
      this.settings = { ...this.settings, ...newSettings };
    }
    if (typeof newCap === 'number') {
      this.cap = newCap;
    }
    this.emit('settings_updated', { settings: this.settings, cap: this.cap });
  }

  appendLogEntry(line) {
    if (!line) return;
    const timestamp = Date.now();
    const entry = {
      id: 'log_' + timestamp + '_' + Math.random().toString(36).substring(2, 7),
      time: this.formatTime(new Date(timestamp)),
      raw: line,
      category: this.classifyLog(line)
    };

    this.logs.push(entry);
    if (this.logs.length > 300) {
      this.logs.shift(); // maintain 300-entry ring buffer
    }

    this.emit('log_added', entry);
  }

  classifyLog(text) {
    const lower = text.toLowerCase();
    if (lower.includes('quà') || lower.includes('🎁') || lower.includes('dâng') || lower.includes('cúng dường') || lower.includes('xu')) return 'gift';
    if (lower.includes('bình luận') || lower.includes('chat') || lower.includes('💬')) return 'chat';
    if (lower.includes('chuông') || lower.includes('mõ') || lower.includes('kinh') || lower.includes('đại hồng chung') || lower.includes('🔔') || lower.includes('🪵')) return 'ritual';
    if (lower.includes('lỗi') || lower.includes('error') || lower.includes('thất bại') || lower.includes('đóng')) return 'error';
    if (lower.includes('cảnh báo') || lower.includes('warn') || lower.includes('đầy') || lower.includes('đào thải') || lower.includes('kick')) return 'warn';
    return 'sys';
  }

  formatTime(d) {
    const pad = n => String(n).padStart(2, '0');
    return `[${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}]`;
  }
}

/**
 * ------------------------------------------------------------------------------
 * 2. WEBSOCKET NETWORK CONTROLLER (Client-to-Server Protocol Engine)
 * ------------------------------------------------------------------------------
 */

class WebSocketNetworkClient {
  constructor(store) {
    this.store = store;
    this.ws = null;
    this.reconnectTimer = null;
    this.manualClosed = false;

    let customWs = null;
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      customWs = urlParams.get('ws');

      if (customWs) {
        this.wsUrl = customWs;
      } else if (window.location.protocol.startsWith('http')) {
        const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsUrl = `${wsProto}//${window.location.host}/ws?role=control`;
      } else {
        // Fallback for file:// browsing
        this.wsUrl = 'ws://127.0.0.1:3000/ws?role=control';
      }
    } else {
      this.wsUrl = 'ws://127.0.0.1:3000/ws?role=control';
    }
  }

  connect() {
    this.manualClosed = false;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.store.setWsStatus('connecting');
    this.store.appendLogEntry(`Đang kết nối tới máy chủ điều khiển: ${this.wsUrl}`);

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (err) {
      console.error('[WebSocket] Initialization error:', err);
      this.store.setWsStatus('error');
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.store.reconnectAttempts = 0;
      this.store.setWsStatus('connected');
      this.store.appendLogEntry('✓ Bắt tay WebSocket thành công (Role: control). Sẵn sàng chỉ huy.');
    };

    this.ws.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };

    this.ws.onerror = (err) => {
      console.warn('[WebSocket] Error occurred:', err);
      this.store.setWsStatus('error');
    };

    this.ws.onclose = (event) => {
      this.store.setWsStatus('disconnected');
      this.store.appendLogEntry(`Kết nối WebSocket đã đóng (Mã: ${event.code}, Lý do: "${event.reason || 'Không rõ'}").`);

      if (!this.manualClosed) {
        this.scheduleReconnect();
      }
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.store.reconnectAttempts++;
    // Exponential backoff: 1s, 2s, 4s, 8s, up to 15s with jitter
    const delay = Math.min(1000 * Math.pow(1.5, this.store.reconnectAttempts - 1) + Math.random() * 500, 15000);
    this.store.appendLogEntry(`Tự động kết nối lại sau ${(delay / 1000).toFixed(1)}s (Lần thử ${this.store.reconnectAttempts})...`);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.manualClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close(1000, 'Admin manually disconnected');
    }
  }

  /**
   * Dispatch client-to-server command adhering strictly to WEBSOCKET_SPEC.md §4:
   * `{ t: "ctl", cmd: string, ...payload }`
   */
  sendCommand(cmd, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.store.appendLogEntry(`[LỖI] Không thể gửi lệnh "${cmd}": WebSocket chưa kết nối.`);
      showToast('Lỗi gửi lệnh', `WebSocket chưa kết nối (${cmd})`, 'error');
      return false;
    }

    const envelope = {
      t: 'ctl',
      cmd: cmd,
      ...payload
    };

    try {
      this.ws.send(JSON.stringify(envelope));
      return true;
    } catch (err) {
      console.error('[WebSocket] Send error:', err);
      this.store.appendLogEntry(`[LỖI] Lỗi khi gửi lệnh "${cmd}": ${err.message}`);
      return false;
    }
  }

  /**
   * Handle server-to-client broadcasts:
   * state, settings, join, leave, skin, chat, gift, like, tts, chant, bell, mo/mo1, tiktok, log, logs, bots
   */
  handleIncomingMessage(data) {
    try {
      const msg = JSON.parse(data);
      if (!msg || !msg.t) return;

      switch (msg.t) {
        case 'state':
          this.store.syncFullState(msg);
          break;

        case 'settings':
          this.store.updateSettings(msg.settings, msg.cap);
          break;

        case 'join':
          if (msg.v) {
            this.store.addOrUpdateViewer(msg.v, msg.cap);
            this.store.appendLogEntry(`[CHÁNH ĐIỆN] Phật tử @${msg.v.name} đã an tọa tại bồ đoàn Slot #${String(msg.v.slotIndex + 1).padStart(2, '0')}.`);
          }
          break;

        case 'leave':
          this.store.removeViewer(msg.id, msg.slotIndex, msg.reason);
          this.store.appendLogEntry(`[CHÁNH ĐIỆN] Bồ đoàn Slot #${String((msg.slotIndex ?? 0) + 1).padStart(2, '0')} đã giải phóng (${msg.reason || 'rời phòng'}).`);
          break;

        case 'skin':
          this.store.updateSkin(msg.id, msg.skin);
          break;

        case 'chat':
          this.store.appendLogEntry(`[CHAT] 💬 @${msg.name}: "${msg.text}"`);
          break;

        case 'gift':
          this.store.appendLogEntry(`[QUÀ TẶNG] 🎁 @${msg.name} dâng ${msg.giftName || 'Hoa Sen'} x${msg.count || 1} (+${msg.coins || 0} xu). ${msg.prayer ? 'Lời nguyện: ' + msg.prayer : ''}`);
          // If viewer is in viewers list, update coins
          if (msg.id) {
            const v = this.store.viewers.find(x => x.id === msg.id);
            if (v) {
              v.coins = (v.coins || 0) + (msg.coins || 0);
              this.store.emit('viewer_updated', { viewer: v, cap: this.store.cap });
            }
          }
          break;

        case 'like':
          this.store.tiktok.likeCount = msg.totalLikes ?? (this.store.tiktok.likeCount + (msg.n || 1));
          this.store.emit('tiktok_change', this.store.tiktok);
          break;

        case 'tts':
          this.store.appendLogEntry(`[TTS] 🎙️ AI đọc thông báo: "${msg.text}"`);
          break;

        case 'chant':
          this.store.appendLogEntry(`[TỤNG KINH] 📜 Khóa lễ tụng kinh: "${msg.text}"`);
          break;

        case 'bell':
          this.store.appendLogEntry(msg.isGreatBell ? '[CHUÔNG] 🔔 Thỉnh Đại Hồng Chung ngân vang 11.2s' : '[CHUÔNG] 🛎️ Thỉnh Chuông Gia Trì');
          break;

        case 'mo':
        case 'mo1':
          // Metronome or manual mo tick
          break;

        case 'tiktok':
          this.store.setTikTokStatus(msg);
          this.store.appendLogEntry(`[TIKTOK] Trạng thái kênh @${msg.uniqueId || ''}: ${msg.status.toUpperCase()} ${msg.error ? '(' + msg.error + ')' : ''}`);
          break;

        case 'log':
          if (typeof msg.line === 'string') {
            this.store.appendLogEntry(msg.line);
          }
          break;

        case 'logs':
          if (Array.isArray(msg.lines)) {
            msg.lines.forEach(l => this.store.appendLogEntry(l));
          }
          break;

        case 'bots':
          this.store.botState = {
            on: !!msg.on,
            count: msg.count ?? this.store.botState.count,
            pace: msg.pace ?? this.store.botState.pace
          };
          this.store.emit('bot_state_changed', this.store.botState);
          this.store.appendLogEntry(`[BOT] Động cơ bot: ${msg.on ? 'BẬT (' + (msg.count || 15) + ' bot, nhịp: ' + (msg.pace || 'mid') + ')' : 'ĐÃ TẮT'}`);
          break;

        case 'config':
          if (msg.config) {
            this.store.fullConfig = msg.config;
            this.store.emit('full_config_updated', msg.config);
          }
          break;

        case 'tts_queue':
          this.store.ttsQueue = { ...this.store.ttsQueue, ...msg };
          this.store.emit('tts_queue_updated', this.store.ttsQueue);
          break;

        case 'session_stats':
          this.store.sessionStats = { ...this.store.sessionStats, ...msg };
          this.store.emit('session_stats_updated', this.store.sessionStats);
          break;

        case 'fx':
        case 'gift_catalog':
          break;

        default:
          console.log('[WebSocket] Unhandled packet:', msg);
          break;
      }
    } catch (e) {
      console.error('[WebSocket] Failed to parse message JSON:', e, data);
    }
  }
}

/**
 * ------------------------------------------------------------------------------
 * 3. MODULE 1: ROOM CONNECTION HUB (Controller)
 * ------------------------------------------------------------------------------
 */

class ConnectionHubModule {
  constructor(store, wsClient) {
    this.store = store;
    this.wsClient = wsClient;

    // DOM Elements
    this.inputUniqueId = document.getElementById('input-unique-id');
    this.inputRoomId = document.getElementById('input-room-id');
    this.btnConnect = document.getElementById('btn-tiktok-connect');
    this.btnDisconnect = document.getElementById('btn-tiktok-disconnect');
    this.btnOpenPreview = document.getElementById('btn-open-preview');

    this.displayChannelTarget = document.getElementById('display-channel-target');
    this.displayChannelState = document.getElementById('display-channel-state');
    this.displayOccupancyCount = document.getElementById('display-occupancy-count');
    this.connActiveBadge = document.getElementById('conn-active-badge');

    // Title & Subtitle
    this.inputTitle = document.getElementById('input-title');
    this.inputSubtitle = document.getElementById('input-subtitle');
    this.btnUpdateTitle = document.getElementById('btn-update-title');
    this.headerHoanhphi = document.getElementById('header-hoanhphi');
    this.contentHoanhphi = document.getElementById('content-hoanhphi');

    // Top Donors
    this.topDonorsContainer = document.getElementById('top-donors-container');
    this.activeOccupantsBadge = document.getElementById('active-occupants-badge');

    // Header Telemetry
    this.wsDot = document.getElementById('ws-dot');
    this.wsStatusText = document.getElementById('ws-status-text');
    this.tiktokDot = document.getElementById('tiktok-dot');
    this.tiktokStatusText = document.getElementById('tiktok-status-text');
    this.telemetryViewers = document.getElementById('telemetry-viewers');
    this.telemetryLikes = document.getElementById('telemetry-likes');
    this.sessionUptime = document.getElementById('session-uptime');

    this.bindEvents();
    this.startUptimeTimer();
  }

  bindEvents() {
    // 1. Connect TikTok Stream
    this.btnConnect?.addEventListener('click', () => {
      let uniqueId = this.inputUniqueId.value.trim();
      if (!uniqueId) {
        showToast('Thiếu thông tin', 'Vui lòng nhập @username TikTok Live.', 'warn');
        this.inputUniqueId.focus();
        return;
      }
      if (uniqueId.startsWith('@')) {
        uniqueId = uniqueId.substring(1);
      }
      const roomId = this.inputRoomId.value.trim() || undefined;

      this.wsClient.sendCommand('connect', { uniqueId, roomId });
      showToast('Gửi yêu cầu kết nối', `Đang kết nối tới TikTok Live @${uniqueId}...`, 'info');
    });

    // 2. Disconnect TikTok Stream
    this.btnDisconnect?.addEventListener('click', () => {
      this.wsClient.sendCommand('disconnect');
      showToast('Ngắt kết nối', 'Đã gửi lệnh ngắt phiên TikTok Live.', 'info');
    });

    // 3. Open OBS 9:16 Preview Popup
    this.btnOpenPreview?.addEventListener('click', () => {
      const popupUrl = window.location.protocol.startsWith('http')
        ? '/overlay.html'
        : 'overlay.html';
      const features = 'width=540,height=960,resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no';
      const previewWindow = window.open(popupUrl, 'ChanDienOverlayPreview', features);
      if (!previewWindow) {
        alert('Trình duyệt đã chặn cửa sổ popup. Vui lòng cho phép popup để mở xem trước màn hình OBS 9:16.');
      } else {
        previewWindow.focus();
      }
    });

    // 4. Update Title Hoành Phi (cmd: "title")
    this.btnUpdateTitle?.addEventListener('click', () => {
      const title = this.inputTitle.value.trim();
      const subtitle = this.inputSubtitle.value.trim();
      if (!title) {
        showToast('Lỗi nhập liệu', 'Tiêu đề Hoành Phi không được để trống.', 'warn');
        return;
      }
      this.wsClient.sendCommand('title', { title, subtitle });
      showToast('Cập nhật Hoành Phi', `Đã cập nhật tiêu đề: "${title}"`, 'success');
    });

    // 5. Accordion Toggle for Hoành Phi
    this.headerHoanhphi?.addEventListener('click', () => {
      if (this.contentHoanhphi) {
        const isHidden = this.contentHoanhphi.style.display === 'none';
        this.contentHoanhphi.style.display = isHidden ? 'block' : 'none';
        const arrow = this.headerHoanhphi.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = isHidden ? '▾' : '▸';
      }
    });

    // 6. Listen to Store Changes
    this.store.on('ws_status_change', (status) => this.renderWsStatus(status));
    this.store.on('tiktok_change', (tiktok) => this.renderTikTokStatus(tiktok));
    this.store.on('full_state_synced', () => this.syncFromStore());
    this.store.on('viewer_updated', () => this.renderTopDonors());
    this.store.on('viewer_removed', () => this.renderTopDonors());
  }

  syncFromStore() {
    if (this.store.settings.title && this.inputTitle) {
      this.inputTitle.value = this.store.settings.title;
    }
    if (this.store.settings.subtitle && this.inputSubtitle) {
      this.inputSubtitle.value = this.store.settings.subtitle;
    }
    this.renderTikTokStatus(this.store.tiktok);
    this.renderTopDonors();
  }

  renderWsStatus(status) {
    if (!this.wsDot || !this.wsStatusText) return;
    this.wsDot.className = 'status-dot';

    switch (status) {
      case 'connected':
        this.wsDot.classList.add('dot-green');
        this.wsStatusText.textContent = 'ĐÃ KẾT NỐI';
        break;
      case 'connecting':
        this.wsDot.classList.add('dot-yellow');
        this.wsStatusText.textContent = 'ĐANG KẾT NỐI...';
        break;
      case 'error':
        this.wsDot.classList.add('dot-red');
        this.wsStatusText.textContent = 'LỖI MẠNG';
        break;
      default:
        this.wsDot.classList.add('dot-gray');
        this.wsStatusText.textContent = 'MẤT KẾT NỐI';
        break;
    }
  }

  renderTikTokStatus(tiktok) {
    if (this.displayChannelTarget && tiktok.uniqueId) {
      this.displayChannelTarget.textContent = `@${tiktok.uniqueId}`;
    }

    if (this.displayChannelState) {
      this.displayChannelState.className = 'badge-status-pill';
      let stateLabel = 'Chưa kết nối';
      if (tiktok.status === 'connected') {
        this.displayChannelState.classList.add('status-connected');
        stateLabel = 'Đang phát sóng';
      } else if (tiktok.status === 'connecting') {
        this.displayChannelState.classList.add('status-connecting');
        stateLabel = 'Đang kết nối...';
      } else if (tiktok.status === 'error') {
        this.displayChannelState.classList.add('status-error');
        stateLabel = `Lỗi: ${tiktok.error || 'Thất bại'}`;
      } else {
        this.displayChannelState.classList.add('status-idle');
        stateLabel = 'Chưa kết nối';
      }
      this.displayChannelState.textContent = stateLabel;
    }

    if (this.connActiveBadge) {
      this.connActiveBadge.textContent = tiktok.status === 'connected' ? 'LIVE ONLINE' : 'SẴN SÀNG';
    }

    // Header Status Pill
    if (this.tiktokDot && this.tiktokStatusText) {
      this.tiktokDot.className = 'status-dot';
      if (tiktok.status === 'connected') {
        this.tiktokDot.classList.add('dot-green');
        this.tiktokStatusText.textContent = 'CONNECTED';
      } else if (tiktok.status === 'connecting') {
        this.tiktokDot.classList.add('dot-yellow');
        this.tiktokStatusText.textContent = 'CONNECTING...';
      } else if (tiktok.status === 'error') {
        this.tiktokDot.classList.add('dot-red');
        this.tiktokStatusText.textContent = 'ERROR';
      } else {
        this.tiktokDot.classList.add('dot-gray');
        this.tiktokStatusText.textContent = 'IDLE';
      }
    }

    if (this.telemetryViewers) {
      this.telemetryViewers.textContent = Number(tiktok.viewerCount || 0).toLocaleString('vi-VN');
    }
    if (this.telemetryLikes) {
      this.telemetryLikes.textContent = Number(tiktok.likeCount || 0).toLocaleString('vi-VN');
    }
  }

  renderTopDonors() {
    const occupants = this.store.viewers.filter(v => typeof v.slotIndex === 'number');
    const seatedCount = occupants.length;
    const maxCap = this.store.cap || 24;

    if (this.displayOccupancyCount) {
      this.displayOccupancyCount.textContent = `${seatedCount} / ${maxCap}`;
    }
    if (this.activeOccupantsBadge) {
      this.activeOccupantsBadge.textContent = `${seatedCount} người`;
    }

    if (!this.topDonorsContainer) return;

    if (occupants.length === 0) {
      this.topDonorsContainer.innerHTML = '<div class="empty-state-small">Chưa có Phật tử nào trong chánh điện</div>';
      return;
    }

    // Sort descending by coins
    const sorted = [...occupants].sort((a, b) => (b.coins || 0) - (a.coins || 0));
    const topList = sorted.slice(0, 10);

    let html = '';
    topList.forEach((v, index) => {
      const rank = index + 1;
      const rankClass = rank <= 3 ? `rank-${rank}` : '';
      const avatarSrc = v.avatar || 'https://p16-va.tiktokcdn.com/img/musically-maliva-obj/1594805258216454~c5_100x100.jpeg';

      html += `
        <div class="donor-row" data-id="${v.id}" data-slot="${v.slotIndex}">
          <div class="donor-rank ${rankClass}">#${rank}</div>
          <div class="donor-info">
            <img src="${avatarSrc}" class="donor-avatar" alt="${v.name}" onerror="this.src='https://api.dicebear.com/7.x/bottts/svg?seed=${v.id}'">
            <div>
              <div class="donor-name">${escapeHtml(v.name)} ${v.isVip ? '👑' : ''}</div>
              <div class="donor-coins mono">${v.coins || 0} ✧ (Slot #${String(v.slotIndex + 1).padStart(2, '0')})</div>
            </div>
          </div>
          <div class="donor-actions">
            <button class="btn btn-xxs btn-outline-gold btn-top-vip" data-slot="${v.slotIndex}" data-id="${v.id}" title="Ghim VIP">VIP</button>
            <button class="btn btn-xxs btn-outline-danger btn-top-kick" data-slot="${v.slotIndex}" data-id="${v.id}" title="Trục xuất">Kick</button>
          </div>
        </div>
      `;
    });

    this.topDonorsContainer.innerHTML = html;

    // Attach Top Donors quick action clicks
    this.topDonorsContainer.querySelectorAll('.btn-top-kick').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const slotIndex = parseInt(btn.getAttribute('data-slot'), 10);
        this.wsClient.sendCommand('kick', { id, slotIndex });
        showToast('Trục xuất', `Đã gửi lệnh trục xuất người dùng ${id}`, 'warn');
      });
    });

    this.topDonorsContainer.querySelectorAll('.btn-top-vip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const slotIndex = parseInt(btn.getAttribute('data-slot'), 10);
        this.wsClient.sendCommand('slot', { slotIndex, action: 'vip', id });
        showToast('Ghim VIP', `Đã gửi lệnh ghim bảo vệ VIP cho slot #${slotIndex + 1}`, 'success');
      });
    });
  }

  startUptimeTimer() {
    if (this.sessionTimerInterval) clearInterval(this.sessionTimerInterval);
    this.sessionTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.store.startedAt) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const mins = Math.floor((elapsed % 3600) / 60);
      const secs = elapsed % 60;
      const pad = n => String(n).padStart(2, '0');
      if (this.sessionUptime) {
        this.sessionUptime.textContent = `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
      }
    }, 1000);
  }
}

/**
 * ------------------------------------------------------------------------------
 * 4. MODULE 2: INTERACTIVE SEATING MATRIX (Floor Grid 24/36/64/100 slots)
 * ------------------------------------------------------------------------------
 */

class SeatingMatrixModule {
  constructor(store, wsClient) {
    this.store = store;
    this.wsClient = wsClient;

    // DOM Elements
    this.wingLeft = document.getElementById('wing-left');
    this.wingRight = document.getElementById('wing-right');
    this.selectSeatMode = document.getElementById('select-seat-mode');
    this.matrixSeatedCount = document.getElementById('matrix-seated-count');

    // Quick Action Buttons
    this.btnClearHall = document.getElementById('btn-clear-hall');
    this.btnFill15 = document.getElementById('btn-fill-15');
    this.btnFill36 = document.getElementById('btn-fill-36');
    this.btnFill64 = document.getElementById('btn-fill-64');
    this.btnFill100 = document.getElementById('btn-fill-100');

    // Context Modal Elements
    this.modalBackdrop = document.getElementById('slot-modal-backdrop');
    this.modalSlotId = document.getElementById('modal-slot-id');
    this.modalSlotTitle = document.getElementById('modal-slot-title');
    this.modalAvatarImg = document.getElementById('modal-avatar-img');
    this.modalSkinName = document.getElementById('modal-skin-name');
    this.modalOccupantName = document.getElementById('modal-occupant-name');
    this.modalOccupantId = document.getElementById('modal-occupant-id');
    this.modalOccupantCoins = document.getElementById('modal-occupant-coins');
    this.modalOccupantSlot = document.getElementById('modal-occupant-slot');
    this.modalVipBadge = document.getElementById('modal-vip-badge');
    this.modalLockedBadge = document.getElementById('modal-locked-badge');

    this.btnActionKick = document.getElementById('btn-action-kick');
    this.btnActionVip = document.getElementById('btn-action-vip');
    this.btnActionVipText = document.getElementById('btn-action-vip-text');
    this.btnActionLock = document.getElementById('btn-action-lock');
    this.btnActionLockIcon = document.getElementById('btn-action-lock-icon');
    this.btnActionLockText = document.getElementById('btn-action-lock-text');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnDismissModal = document.getElementById('btn-dismiss-modal');

    this.bindEvents();
    this.renderFloorMatrix();
  }

  bindEvents() {
    // 1. Capacity Mode Changer (cmd: "settings")
    this.selectSeatMode?.addEventListener('change', (e) => {
      const mode = e.target.value;
      this.wsClient.sendCommand('settings', {
        settings: { seatMode: mode }
      });
      showToast('Cấu hình sức chứa', `Đã chuyển chế độ sức chứa sang: ${mode.toUpperCase()}`, 'info');
    });

    // 2. Clear Hall (cmd: "clear")
    this.btnClearHall?.addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn DỌN SẠCH CHÁNH ĐIỆN? Toàn bộ bồ đoàn sẽ được giải phóng.')) {
        this.wsClient.sendCommand('clear');
        showToast('Dọn sạch chánh điện', 'Đã gửi lệnh giải phóng toàn bộ bồ đoàn.', 'warn');
      }
    });

    // 3. Fill Samples (cmd: "fill")
    this.btnFill15?.addEventListener('click', () => this.fillSampleViewers(15));
    this.btnFill36?.addEventListener('click', () => this.fillSampleViewers(36));
    this.btnFill64?.addEventListener('click', () => this.fillSampleViewers(64));
    this.btnFill100?.addEventListener('click', () => this.fillSampleViewers(100));

    // 4. Modal Close
    this.btnCloseModal?.addEventListener('click', () => this.closeSlotModal());
    this.btnDismissModal?.addEventListener('click', () => this.closeSlotModal());
    this.modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.modalBackdrop) this.closeSlotModal();
    });

    // 5. Context Action: Kick (cmd: "kick")
    this.btnActionKick?.addEventListener('click', () => {
      const slotIdx = this.store.selectedSlotIndex;
      if (slotIdx === null) return;
      const occupant = this.store.slots[slotIdx];
      if (!occupant) {
        showToast('Thông báo', 'Bồ đoàn này hiện đang trống.', 'info');
        return;
      }
      this.wsClient.sendCommand('kick', { id: occupant.id, slotIndex: slotIdx });
      showToast('Đã trục xuất', `Đã trục xuất ${occupant.name} khỏi bồ đoàn #${slotIdx + 1}.`, 'warn');
      this.closeSlotModal();
    });

    // 6. Context Action: VIP Pin (cmd: "slot", action: "vip")
    this.btnActionVip?.addEventListener('click', () => {
      const slotIdx = this.store.selectedSlotIndex;
      if (slotIdx === null) return;
      const occupant = this.store.slots[slotIdx];
      if (!occupant) {
        showToast('Thông báo', 'Bồ đoàn trống không thể ghim VIP.', 'warn');
        return;
      }
      this.wsClient.sendCommand('slot', { slotIndex: slotIdx, action: 'vip', id: occupant.id });
      showToast('Ghim VIP', `Đã ghim bảo vệ VIP cho bồ đoàn #${slotIdx + 1}.`, 'success');
      this.closeSlotModal();
    });

    // 7. Context Action: Lock / Unlock Slot (cmd: "slot", action: "lock" | "unlock")
    this.btnActionLock?.addEventListener('click', () => {
      const slotIdx = this.store.selectedSlotIndex;
      if (slotIdx === null) return;
      const isLocked = this.store.lockedSlots.has(slotIdx);
      const action = isLocked ? 'unlock' : 'lock';

      this.wsClient.sendCommand('slot', { slotIndex: slotIdx, action });
      if (isLocked) {
        this.store.lockedSlots.delete(slotIdx);
        showToast('Mở khóa', `Đã mở khóa bồ đoàn #${slotIdx + 1}.`, 'info');
      } else {
        this.store.lockedSlots.add(slotIdx);
        showToast('Khóa bồ đoàn', `Đã khóa bồ đoàn #${slotIdx + 1} (dành cho BTC).`, 'warn');
      }
      this.closeSlotModal();
      this.renderFloorMatrix();
    });

    // 8. Context Action: Force Skin (cmd: "skin")
    document.querySelectorAll('.btn-skin').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotIdx = this.store.selectedSlotIndex;
        if (slotIdx === null) return;
        const occupant = this.store.slots[slotIdx];
        if (!occupant) {
          showToast('Thông báo', 'Bồ đoàn trống không thể đổi trang phục.', 'warn');
          return;
        }
        const skinType = btn.getAttribute('data-skin');
        this.wsClient.sendCommand('skin', { id: occupant.id, skin: skinType });
        showToast('Đổi trang phục', `Đã ép đổi trang phục ${occupant.name} thành [${skinType}].`, 'success');
        this.closeSlotModal();
      });
    });

    // 9. Store Listeners
    this.store.on('full_state_synced', () => this.syncSeatingState());
    this.store.on('viewer_updated', () => this.renderFloorMatrix());
    this.store.on('viewer_removed', () => this.renderFloorMatrix());
    this.store.on('viewer_skin_changed', () => this.renderFloorMatrix());
    this.store.on('settings_updated', () => this.syncSeatingState());
  }

  fillSampleViewers(count) {
    this.wsClient.sendCommand('fill', { n: count });
    showToast('Đổ dữ liệu mẫu', `Đã gửi lệnh đổ ${count} Phật tử mẫu vào bồ đoàn.`, 'info');
  }

  syncSeatingState() {
    if (this.selectSeatMode && this.store.settings.seatMode) {
      this.selectSeatMode.value = this.store.settings.seatMode;
    }
    this.renderFloorMatrix();
  }

  renderFloorMatrix() {
    const cap = this.store.cap || 24;
    const halfCap = Math.floor(cap / 2);

    // Dynamic grid columns for wings
    let colClass = 'cols-2';
    if (cap === 36) colClass = 'cols-3';
    else if (cap === 64) colClass = 'cols-4';
    else if (cap === 100) colClass = 'cols-5';

    if (this.wingLeft) this.wingLeft.className = `floor-wing wing-left ${colClass}`;
    if (this.wingRight) this.wingRight.className = `floor-wing wing-right ${colClass}`;

    // Update count display
    const seatedCount = this.store.viewers.filter(v => typeof v.slotIndex === 'number').length;
    if (this.matrixSeatedCount) {
      this.matrixSeatedCount.textContent = `${seatedCount} / ${cap}`;
    }

    // Render Left Wing: slots 0 to halfCap - 1
    if (this.wingLeft) {
      this.wingLeft.innerHTML = this.buildSlotsHtml(0, halfCap);
    }

    // Render Right Wing: slots halfCap to cap - 1
    if (this.wingRight) {
      this.wingRight.innerHTML = this.buildSlotsHtml(halfCap, cap);
    }

    // Attach click handlers to all rendered slots
    document.querySelectorAll('.slot-cushion').forEach(slotEl => {
      slotEl.addEventListener('click', () => {
        const index = parseInt(slotEl.getAttribute('data-slot-index'), 10);
        this.openSlotModal(index);
      });
    });
  }

  buildSlotsHtml(startIndex, endIndex) {
    let html = '';
    for (let i = startIndex; i < endIndex; i++) {
      const occupant = this.store.slots[i];
      const isLocked = this.store.lockedSlots.has(i);
      const slotIdFormatted = `S${String(i + 1).padStart(2, '0')}`;

      let cushionClasses = 'slot-cushion';
      if (isLocked) cushionClasses += ' locked';
      else if (occupant) {
        cushionClasses += ' occupied';
        if (occupant.isVip) cushionClasses += ' vip';
      } else {
        cushionClasses += ' empty';
      }

      // Skin & Avatar Display
      let contentHtml = '';
      if (isLocked) {
        contentHtml = `
          <div class="slot-status-icon">🔒</div>
          <div class="slot-cushion-circle">
            <span class="slot-empty-icon">🔒</span>
          </div>
          <div class="slot-user-name">ĐÃ KHÓA</div>
          <div class="slot-coins-tag text-muted">BTC</div>
        `;
      } else if (occupant) {
        const avatarUrl = occupant.avatar || 'https://p16-va.tiktokcdn.com/img/musically-maliva-obj/1594805258216454~c5_100x100.jpeg';
        const skinIcon = this.getSkinIcon(occupant.skin);

        contentHtml = `
          <div class="slot-status-icon">${occupant.isVip ? '👑' : ''}</div>
          <div class="slot-cushion-circle">
            <img src="${avatarUrl}" class="slot-avatar-img" alt="${occupant.name}" onerror="this.outerHTML='<span class=\\'slot-skin-icon\\'>${skinIcon}</span>'">
          </div>
          <div class="slot-user-name" title="${escapeHtml(occupant.name)}">${escapeHtml(occupant.name)}</div>
          <div class="slot-coins-tag mono">
            <span>✧</span> ${occupant.coins || 0}
          </div>
        `;
      } else {
        contentHtml = `
          <div class="slot-cushion-circle">
            <span class="slot-empty-icon">🪷</span>
          </div>
          <div class="slot-user-name">Trống</div>
          <div class="slot-coins-tag text-muted">--</div>
        `;
      }

      html += `
        <div class="${cushionClasses}" data-slot-index="${i}">
          <span class="slot-id-badge mono">${slotIdFormatted}</span>
          ${contentHtml}
        </div>
      `;
    }
    return html;
  }

  getSkinIcon(skin) {
    switch (skin) {
      case 'monk': return '🧑‍🦲';
      case 'nun': return '👩‍🦲';
      case 'master': return '🧘';
      case 'child': return '👦';
      case 'granny': return '👵';
      case 'woman': return '👩';
      default: return '👨';
    }
  }

  getSkinNameVi(skin) {
    switch (skin) {
      case 'monk': return 'Sư Thầy';
      case 'nun': return 'Ni Cô';
      case 'master': return 'Cao Tăng';
      case 'child': return 'Chú Tiểu';
      case 'granny': return 'Bà Lão';
      case 'woman': return 'Cư Sĩ Nữ';
      default: return 'Cư Sĩ Nam';
    }
  }

  openSlotModal(slotIndex) {
    this.store.selectedSlotIndex = slotIndex;
    const occupant = this.store.slots[slotIndex];
    const isLocked = this.store.lockedSlots.has(slotIndex);
    const slotIdStr = `S${String(slotIndex + 1).padStart(2, '0')}`;

    if (this.modalSlotId) this.modalSlotId.textContent = slotIdStr;
    if (this.modalOccupantSlot) this.modalOccupantSlot.textContent = `Bồ đoàn #${slotIndex + 1}`;

    if (isLocked) {
      if (this.modalSlotTitle) this.modalSlotTitle.textContent = `Bồ Đoàn ${slotIdStr} (ĐÃ KHÓA)`;
      if (this.modalOccupantName) this.modalOccupantName.textContent = 'Khóa Chỗ Ban Tổ Chức';
      if (this.modalOccupantId) this.modalOccupantId.textContent = 'SYSTEM_LOCKED';
      if (this.modalOccupantCoins) this.modalOccupantCoins.textContent = '0 xu';
      if (this.modalSkinName) this.modalSkinName.textContent = 'Khóa';
      if (this.modalAvatarImg) this.modalAvatarImg.src = 'https://api.dicebear.com/7.x/identicon/svg?seed=lock';
      if (this.modalVipBadge) this.modalVipBadge.className = 'badge-vip';
      if (this.modalLockedBadge) this.modalLockedBadge.className = 'badge-locked active';

      if (this.btnActionLockIcon) this.btnActionLockIcon.textContent = '🔓';
      if (this.btnActionLockText) this.btnActionLockText.textContent = 'MỞ KHÓA BỒ ĐOÀN';
    } else if (occupant) {
      if (this.modalSlotTitle) this.modalSlotTitle.textContent = `Phật Tử Bồ Đoàn ${slotIdStr}`;
      if (this.modalOccupantName) this.modalOccupantName.textContent = occupant.name;
      if (this.modalOccupantId) this.modalOccupantId.textContent = occupant.id;
      if (this.modalOccupantCoins) this.modalOccupantCoins.textContent = `${occupant.coins || 0} xu công đức`;
      if (this.modalSkinName) this.modalSkinName.textContent = this.getSkinNameVi(occupant.skin);
      if (this.modalAvatarImg) {
        this.modalAvatarImg.src = occupant.avatar || 'https://p16-va.tiktokcdn.com/img/musically-maliva-obj/1594805258216454~c5_100x100.jpeg';
      }
      if (this.modalVipBadge) {
        this.modalVipBadge.className = occupant.isVip ? 'badge-vip active' : 'badge-vip';
      }
      if (this.modalLockedBadge) {
        this.modalLockedBadge.className = 'badge-locked';
      }

      if (this.btnActionLockIcon) this.btnActionLockIcon.textContent = '🔒';
      if (this.btnActionLockText) this.btnActionLockText.textContent = 'KHÓA BỒ ĐOÀN';
    } else {
      if (this.modalSlotTitle) this.modalSlotTitle.textContent = `Bồ Đoàn ${slotIdStr} (TRỐNG)`;
      if (this.modalOccupantName) this.modalOccupantName.textContent = 'Bồ đoàn trống';
      if (this.modalOccupantId) this.modalOccupantId.textContent = 'Chưa có ai ngồi';
      if (this.modalOccupantCoins) this.modalOccupantCoins.textContent = '0 xu';
      if (this.modalSkinName) this.modalSkinName.textContent = 'Bồ đoàn';
      if (this.modalAvatarImg) this.modalAvatarImg.src = 'https://api.dicebear.com/7.x/identicon/svg?seed=empty';
      if (this.modalVipBadge) this.modalVipBadge.className = 'badge-vip';
      if (this.modalLockedBadge) this.modalLockedBadge.className = 'badge-locked';

      if (this.btnActionLockIcon) this.btnActionLockIcon.textContent = '🔒';
      if (this.btnActionLockText) this.btnActionLockText.textContent = 'KHÓA BỒ ĐOÀN';
    }

    if (this.modalBackdrop) this.modalBackdrop.classList.add('open');
  }

  closeSlotModal() {
    this.store.selectedSlotIndex = null;
    if (this.modalBackdrop) this.modalBackdrop.classList.remove('open');
  }
}

/**
 * ------------------------------------------------------------------------------
 * 5. MODULE 3: LIVE AUDIO MIXING CONSOLE (Controller)
 * ------------------------------------------------------------------------------
 */

class AudioMixerModule {
  constructor(store, wsClient) {
    this.store = store;
    this.wsClient = wsClient;

    // DOM Elements - BGM
    this.toggleBgm = document.getElementById('toggle-bgm');
    this.sliderBgmVol = document.getElementById('slider-bgm-vol');
    this.valBgmVol = document.getElementById('val-bgm-vol');

    // DOM Elements - Mõ
    this.toggleMo = document.getElementById('toggle-mo');
    this.sliderMoBpm = document.getElementById('slider-mo-bpm');
    this.valMoBpm = document.getElementById('val-mo-bpm');
    this.audioEngineBadge = document.getElementById('audio-engine-badge');

    // Manual Triggers
    this.btnTriggerGreatBell = document.getElementById('btn-trigger-great-bell');
    this.btnTriggerSmallBell = document.getElementById('btn-trigger-small-bell');
    this.btnTriggerMo = document.getElementById('btn-trigger-mo');
    this.btnTriggerChantNow = document.getElementById('btn-trigger-chant-now');

    // Liturgical Chant Scheduler
    this.toggleAutoChant = document.getElementById('toggle-auto-chant');
    this.sliderChantMin = document.getElementById('slider-chant-min');
    this.valChantMin = document.getElementById('val-chant-min');

    // Edge-TTS Config
    this.headerTtsConfig = document.getElementById('header-tts-config');
    this.contentTtsConfig = document.getElementById('content-tts-config');
    this.selectTtsVoice = document.getElementById('select-tts-voice');
    this.sliderTtsPitch = document.getElementById('slider-tts-pitch');
    this.valTtsPitch = document.getElementById('val-tts-pitch');
    this.sliderTtsRate = document.getElementById('slider-tts-rate');
    this.valTtsRate = document.getElementById('val-tts-rate');
    this.btnSaveTtsSettings = document.getElementById('btn-save-tts-settings');

    // Emergency Say
    this.inputSayText = document.getElementById('input-say-text');
    this.sayCharCount = document.getElementById('say-char-count');
    this.btnBroadcastSay = document.getElementById('btn-broadcast-say');

    this.bindEvents();
  }

  bindEvents() {
    // 1. BGM Music Toggle & Volume (cmd: "settings")
    this.toggleBgm?.addEventListener('change', () => {
      const music = this.toggleBgm.checked;
      this.wsClient.sendCommand('settings', { settings: { music } });
      showToast('Nhạc Thiền (BGM)', music ? 'Đã bật nhạc thiền nền' : 'Đã tắt nhạc thiền nền', 'info');
    });

    this.sliderBgmVol?.addEventListener('input', () => {
      const vol = this.sliderBgmVol.value;
      if (this.valBgmVol) this.valBgmVol.textContent = `${vol}%`;
    });

    this.sliderBgmVol?.addEventListener('change', () => {
      const vol = parseInt(this.sliderBgmVol.value, 10);
      const music = vol > 0;
      this.wsClient.sendCommand('settings', {
        settings: { music, volumes: { bgm: vol / 100 } }
      });
    });

    // 2. Mõ Metronome Cadence Slider & Toggle (cmd: "settings")
    this.toggleMo?.addEventListener('change', () => {
      const mo = this.toggleMo.checked;
      this.wsClient.sendCommand('settings', { settings: { mo } });
      showToast('Nhịp Mõ', mo ? 'Đã kích hoạt tiếng mõ tự động' : 'Đã tạm dừng tiếng mõ tự động', 'info');
    });

    this.sliderMoBpm?.addEventListener('input', () => {
      const bpm = parseInt(this.sliderMoBpm.value, 10);
      if (this.valMoBpm) this.valMoBpm.textContent = `${bpm} BPM`;
    });

    this.sliderMoBpm?.addEventListener('change', () => {
      const moBpm = parseInt(this.sliderMoBpm.value, 10);
      this.wsClient.sendCommand('settings', { settings: { moBpm, mo: true } });
      showToast('Nhịp Mõ Cadence', `Đã điều chỉnh nhịp mõ: ${moBpm} BPM`, 'info');
    });

    // Tempo Preset Buttons (36, 52, 72, 108 BPM)
    const setupPreset = (btnId, bpmVal) => {
      const btn = document.getElementById(btnId);
      btn?.addEventListener('click', () => {
        document.querySelectorAll('.tempo-presets .btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.sliderMoBpm) this.sliderMoBpm.value = bpmVal;
        if (this.valMoBpm) this.valMoBpm.textContent = `${bpmVal} BPM`;
        this.wsClient.sendCommand('settings', { settings: { moBpm: bpmVal, mo: true } });
        showToast('Nhịp Mõ Chuẩn', `Đã chọn nhịp thiền: ${bpmVal} BPM`, 'info');
      });
    };

    setupPreset('bpm-preset-36', 36);
    setupPreset('bpm-preset-52', 52);
    setupPreset('bpm-preset-72', 72);
    setupPreset('bpm-preset-108', 108);

    // 3. Manual Triggers
    // Great Bell Strike (cmd: "bell", isGreatBell: true)
    this.btnTriggerGreatBell?.addEventListener('click', () => {
      // 3-second debounce feedback on UI
      this.btnTriggerGreatBell.disabled = true;
      this.wsClient.sendCommand('bell', { isGreatBell: true, great: true });
      showToast('Đại Hồng Chung', '🔔 Đã thỉnh Đại Hồng Chung (ngân 11.2s, hào quang bừng sáng, ducking -14dB).', 'success');

      setTimeout(() => {
        if (this.btnTriggerGreatBell) this.btnTriggerGreatBell.disabled = false;
      }, 3000);
    });

    // Small Bell Strike (cmd: "bell", isGreatBell: false)
    this.btnTriggerSmallBell?.addEventListener('click', () => {
      this.wsClient.sendCommand('bell', { isGreatBell: false, great: false });
      showToast('Chuông Gia Trì', '🛎️ Đã thỉnh chuông gia trì.', 'info');
    });

    // Manual Mõ Strike (cmd: "mo")
    this.btnTriggerMo?.addEventListener('click', () => {
      this.wsClient.sendCommand('mo');
      showToast('Gõ Mõ', '🪵 Đã gõ một tiếng mõ tức thì và cân chỉnh lại nhịp cadence.', 'info');
    });

    // Auto Chant Scheduler (cmd: "settings")
    this.toggleAutoChant?.addEventListener('change', () => {
      const autoChant = this.toggleAutoChant.checked;
      this.wsClient.sendCommand('settings', { settings: { autoChant } });
      showToast('Tự Động Đọc Kinh', autoChant ? 'Đã bật đọc kinh định kỳ' : 'Đã tắt đọc kinh định kỳ', 'info');
    });

    this.sliderChantMin?.addEventListener('input', () => {
      const mins = this.sliderChantMin.value;
      if (this.valChantMin) this.valChantMin.textContent = `${mins} phút`;
    });

    this.sliderChantMin?.addEventListener('change', () => {
      const chantEveryMin = parseInt(this.sliderChantMin.value, 10);
      this.wsClient.sendCommand('settings', { settings: { chantEveryMin, autoChant: true } });
      showToast('Chu Kỳ Tụng Kinh', `Đã đặt chu kỳ tụng kinh mỗi ${chantEveryMin} phút.`, 'info');
    });

    // Manual Chant Trigger (cmd: "chant")
    this.btnTriggerChantNow?.addEventListener('click', () => {
      this.wsClient.sendCommand('chant', {
        text: 'Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo.'
      });
      showToast('Tụng Kinh Hồi Hướng', '📜 Đã phát lệnh tụng kinh hồi hướng lên màn hình live.', 'success');
    });

    // 4. Edge-TTS AI Voice Customizer (cmd: "settings")
    this.headerTtsConfig?.addEventListener('click', () => {
      if (this.contentTtsConfig) {
        const isHidden = this.contentTtsConfig.style.display === 'none';
        this.contentTtsConfig.style.display = isHidden ? 'block' : 'none';
        const arrow = this.headerTtsConfig.querySelector('.accordion-arrow');
        if (arrow) arrow.textContent = isHidden ? '▾' : '▸';
      }
    });

    this.sliderTtsPitch?.addEventListener('input', () => {
      const p = this.sliderTtsPitch.value;
      if (this.valTtsPitch) this.valTtsPitch.textContent = `${p > 0 ? '+' : ''}${p} Hz`;
    });

    this.sliderTtsRate?.addEventListener('input', () => {
      const r = this.sliderTtsRate.value;
      if (this.valTtsRate) this.valTtsRate.textContent = `${r > 0 ? '+' : ''}${r}%`;
    });

    this.btnSaveTtsSettings?.addEventListener('click', () => {
      const voice = this.selectTtsVoice?.value || 'vi-VN-NamMinhNeural';
      const pitch = parseInt(this.sliderTtsPitch?.value || '-18', 10);
      const rate = parseInt(this.sliderTtsRate?.value || '-20', 10);

      this.wsClient.sendCommand('settings', {
        settings: { voice, pitch, rate }
      });
      showToast('Cấu hình Edge-TTS', `Đã lưu cấu hình giọng đọc (${voice}, ${pitch}Hz, ${rate}%).`, 'success');
    });

    // 5. Emergency Say Broadcast (`say` or `tts`)
    this.inputSayText?.addEventListener('input', () => {
      const len = this.inputSayText.value.length;
      if (this.sayCharCount) this.sayCharCount.textContent = `${len}/200`;
    });

    document.querySelectorAll('.quick-prayer-templates button').forEach(btn => {
      btn.addEventListener('click', () => {
        const text = btn.getAttribute('data-text');
        if (this.inputSayText) {
          this.inputSayText.value = text;
          if (this.sayCharCount) this.sayCharCount.textContent = `${text.length}/200`;
        }
      });
    });

    this.btnBroadcastSay?.addEventListener('click', () => {
      const text = this.inputSayText?.value.trim();
      if (!text) {
        showToast('Nội dung trống', 'Vui lòng nhập nội dung thông báo trước khi phát thanh.', 'warn');
        this.inputSayText?.focus();
        return;
      }

      const voice = this.selectTtsVoice?.value || 'vi-VN-NamMinhNeural';
      const pitch = parseInt(this.sliderTtsPitch?.value || '-18', 10);
      const rate = parseInt(this.sliderTtsRate?.value || '-20', 10);

      this.wsClient.sendCommand('say', { text, voice, pitch, rate });
      showToast('Phát Thanh Khẩn Cấp', '🎙️ Đã phát thông báo khẩn cấp lên sóng live!', 'success');
    });

    // Store Listeners
    this.store.on('full_state_synced', () => this.syncAudioState());
    this.store.on('settings_updated', () => this.syncAudioState());
  }

  syncAudioState() {
    const s = this.store.settings;
    if (this.toggleBgm) this.toggleBgm.checked = !!s.music;
    if (s.volumes && typeof s.volumes.bgm === 'number' && this.sliderBgmVol) {
      const bgmPct = Math.round(s.volumes.bgm * 100);
      this.sliderBgmVol.value = bgmPct;
      if (this.valBgmVol) this.valBgmVol.textContent = `${bgmPct}%`;
    }
    if (this.toggleMo) this.toggleMo.checked = !!s.mo;
    if (this.sliderMoBpm && s.moBpm) {
      this.sliderMoBpm.value = s.moBpm;
      if (this.valMoBpm) this.valMoBpm.textContent = `${s.moBpm} BPM`;
    }
    if (this.toggleAutoChant) this.toggleAutoChant.checked = !!s.autoChant;
    if (this.sliderChantMin && s.chantEveryMin) {
      this.sliderChantMin.value = s.chantEveryMin;
      if (this.valChantMin) this.valChantMin.textContent = `${s.chantEveryMin} phút`;
    }
    if (this.selectTtsVoice && s.voice) this.selectTtsVoice.value = s.voice;
    if (this.sliderTtsPitch && typeof s.pitch === 'number') {
      this.sliderTtsPitch.value = s.pitch;
      if (this.valTtsPitch) this.valTtsPitch.textContent = `${s.pitch > 0 ? '+' : ''}${s.pitch} Hz`;
    }
    if (this.sliderTtsRate && typeof s.rate === 'number') {
      this.sliderTtsRate.value = s.rate;
      if (this.valTtsRate) this.valTtsRate.textContent = `${s.rate > 0 ? '+' : ''}${s.rate}%`;
    }

    if (this.audioEngineBadge) {
      this.audioEngineBadge.textContent = 'HOẠT ĐỘNG';
    }
  }
}

/**
 * ------------------------------------------------------------------------------
 * 6. MODULE 4: SIMULATION STUDIO & AUTONOMOUS BOT CONTROLLER
 * ------------------------------------------------------------------------------
 */

class SimulationStudioModule {
  constructor(store, wsClient) {
    this.store = store;
    this.wsClient = wsClient;

    // Tabs
    this.tabButtons = document.querySelectorAll('.tab-btn');
    this.tabPanes = document.querySelectorAll('.tab-pane');

    // Chat Simulation
    this.simChatName = document.getElementById('sim-chat-name');
    this.simChatText = document.getElementById('sim-chat-text');
    this.btnSendSimChat = document.getElementById('btn-send-sim-chat');

    // Gift Simulation
    this.simGiftDonor = document.getElementById('sim-gift-donor');
    this.simGiftName = document.getElementById('sim-gift-name');
    this.simGiftDiamonds = document.getElementById('sim-gift-diamonds');
    this.simGiftCount = document.getElementById('sim-gift-count');
    this.simGiftPrayer = document.getElementById('sim-gift-prayer');
    this.btnSendSimGift = document.getElementById('btn-send-sim-gift');

    // Bot Engine
    this.toggleBotEngine = document.getElementById('toggle-bot-engine');
    this.botStatusText = document.getElementById('bot-status-text');
    this.sliderBotCount = document.getElementById('slider-bot-count');
    this.valBotCount = document.getElementById('val-bot-count');
    this.botServerStatus = document.getElementById('bot-server-status');
    this.currentPace = 'mid';

    this.bindEvents();
  }

  bindEvents() {
    // 1. Tab Switching
    this.tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        this.tabButtons.forEach(b => b.classList.remove('active'));
        this.tabPanes.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // 2. Chat Injection (cmd: "chat")
    this.btnSendSimChat?.addEventListener('click', () => {
      const name = this.simChatName?.value.trim() || 'Phật Tử Ẩn Danh';
      const text = this.simChatText?.value.trim();
      if (!text) {
        showToast('Bình luận trống', 'Vui lòng nhập nội dung bình luận mô phỏng.', 'warn');
        this.simChatText?.focus();
        return;
      }

      this.wsClient.sendCommand('chat', { name, text });
      showToast('Gửi bình luận thử', `[${name}]: "${text}"`, 'info');
      if (this.simChatText) this.simChatText.value = '';
    });

    this.simChatText?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.btnSendSimChat?.click();
      }
    });

    // Quick Chat Chips
    document.querySelectorAll('.quick-chips .chip-btn').forEach(chip => {
      chip.addEventListener('click', () => {
        if (this.simChatText) {
          this.simChatText.value = chip.getAttribute('data-text');
        }
      });
    });

    // 3. Gift Injection (cmd: "gift")
    this.btnSendSimGift?.addEventListener('click', () => {
      const name = this.simGiftDonor?.value.trim() || 'Phật Tử Ẩn Danh';
      const gift = this.simGiftName?.value.trim() || 'Hoa Sen';
      const diamonds = parseInt(this.simGiftDiamonds?.value || '1', 10);
      const count = parseInt(this.simGiftCount?.value || '1', 10);
      const prayer = this.simGiftPrayer?.value.trim() || '';

      this.wsClient.sendCommand('gift', { name, gift, diamonds, count, prayer });
      showToast('Dâng cúng dường', `🎁 ${name} dâng ${gift} x${count} (${diamonds} xu).`, 'success');
    });

    // Quick Gift Tier Cards
    document.querySelectorAll('.gift-tier-card').forEach(card => {
      card.addEventListener('click', () => {
        const giftName = card.getAttribute('data-gift');
        const diamonds = parseInt(card.getAttribute('data-diamonds'), 10);
        if (this.simGiftName) this.simGiftName.value = giftName;
        if (this.simGiftDiamonds) this.simGiftDiamonds.value = diamonds;

        // Auto trigger gift injection
        const name = this.simGiftDonor?.value.trim() || 'Phật Tử Minh Tâm';
        const prayer = this.simGiftPrayer?.value.trim() || 'Nguyện cầu gia đạo bình an, vạn sự hanh thông';

        this.wsClient.sendCommand('gift', {
          name,
          gift: giftName,
          diamonds,
          count: 1,
          prayer
        });
        showToast('Dâng quà nhanh', `🎁 ${name} đã dâng ${giftName} (${diamonds} xu)!`, 'success');
      });
    });

    // 4. Autonomous Bot Engine Controller (cmd: "bots" or "bot")
    this.toggleBotEngine?.addEventListener('change', () => {
      const on = this.toggleBotEngine.checked;
      const count = parseInt(this.sliderBotCount?.value || '15', 10);
      const pace = this.currentPace;

      this.wsClient.sendCommand('bots', { on, n: count, pace });
      this.updateBotUiState({ on, count, pace });
      showToast('Động cơ Bot', on ? `Đã kích hoạt ${count} Bot (${pace})` : 'Đã dừng động cơ Bot', on ? 'success' : 'warn');
    });

    this.sliderBotCount?.addEventListener('input', () => {
      const c = this.sliderBotCount.value;
      if (this.valBotCount) this.valBotCount.textContent = `${c} Bot`;
    });

    this.sliderBotCount?.addEventListener('change', () => {
      if (this.toggleBotEngine?.checked) {
        const count = parseInt(this.sliderBotCount.value, 10);
        this.wsClient.sendCommand('bots', {
          on: true,
          n: count,
          pace: this.currentPace
        });
      }
    });

    // Pace Selector Buttons
    document.querySelectorAll('.btn-pace').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-pace').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPace = btn.getAttribute('data-pace') || 'mid';

        if (this.toggleBotEngine?.checked) {
          const count = parseInt(this.sliderBotCount?.value || '15', 10);
          this.wsClient.sendCommand('bots', {
            on: true,
            n: count,
            pace: this.currentPace
          });
          showToast('Nhịp Bot', `Đã đổi nhịp độ bot sang: ${this.currentPace.toUpperCase()}`, 'info');
        }
      });
    });

    // Store Listeners
    this.store.on('bot_state_changed', (botState) => this.updateBotUiState(botState));
  }

  updateBotUiState(botState) {
    if (this.toggleBotEngine) this.toggleBotEngine.checked = !!botState.on;
    if (this.botStatusText) {
      this.botStatusText.textContent = botState.on ? 'ĐANG CHẠY' : 'ĐANG TẮT';
      this.botStatusText.className = botState.on ? 'bot-status-text active' : 'bot-status-text';
    }
    if (this.sliderBotCount && typeof botState.count === 'number') {
      this.sliderBotCount.value = botState.count;
      if (this.valBotCount) this.valBotCount.textContent = `${botState.count} Bot`;
    }
    if (botState.pace) {
      this.currentPace = botState.pace;
      document.querySelectorAll('.btn-pace').forEach(b => {
        if (b.getAttribute('data-pace') === botState.pace) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    }

    if (this.botServerStatus) {
      this.botServerStatus.textContent = `on: ${botState.on} | count: ${botState.count || 0} | pace: ${botState.pace || 'mid'}`;
    }
  }
}

/**
 * ------------------------------------------------------------------------------
 * 7. MODULE 5: AUDIT REALTIME LOGGER (300-entry scrolling buffer)
 * ------------------------------------------------------------------------------
 */

class AuditLoggerModule {
  constructor(store) {
    this.store = store;

    // DOM Elements
    this.terminal = document.getElementById('audit-log-terminal');
    this.countBadge = document.getElementById('audit-count-badge');
    this.btnCopyLogs = document.getElementById('btn-copy-logs');
    this.btnClearLogs = document.getElementById('btn-clear-logs');
    this.checkAutoScroll = document.getElementById('check-auto-scroll');
    this.filterTabs = document.querySelectorAll('.filter-tab');

    this.bindEvents();
  }

  bindEvents() {
    // 1. Filter Tabs
    this.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.filterTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.store.logFilter = tab.getAttribute('data-filter') || 'all';
        this.renderLogs();
      });
    });

    // 2. Clear Screen
    this.btnClearLogs?.addEventListener('click', () => {
      this.store.logs = [];
      this.renderLogs();
      showToast('Nhật ký', 'Đã xóa trắng khung nhật ký hiển thị.', 'info');
    });

    // 3. Copy Logs
    this.btnCopyLogs?.addEventListener('click', () => {
      const text = this.store.logs.map(l => `${l.time} ${l.raw}`).join('\n');
      navigator.clipboard.writeText(text).then(() => {
        showToast('Sao chép thành công', `Đã sao chép ${this.store.logs.length} dòng nhật ký vào clipboard.`, 'success');
      }).catch(err => {
        showToast('Lỗi sao chép', err.message, 'error');
      });
    });

    // 4. Auto-Scroll Checkbox & User Scroll Detection
    this.checkAutoScroll?.addEventListener('change', () => {
      this.store.autoScroll = this.checkAutoScroll.checked;
    });

    this.terminal?.addEventListener('scroll', () => {
      const isAtBottom = this.terminal.scrollHeight - this.terminal.scrollTop <= this.terminal.clientHeight + 20;
      if (!isAtBottom && this.store.autoScroll) {
        // User scrolled up, don't jerk
      }
    });

    // 5. Store Listener
    this.store.on('log_added', (entry) => {
      this.appendSingleLogToDom(entry);
      this.updateCountBadge();
    });
  }

  updateCountBadge() {
    if (this.countBadge) {
      this.countBadge.textContent = `${this.store.logs.length} / 300 dòng`;
    }
  }

  renderLogs() {
    if (!this.terminal) return;
    this.terminal.innerHTML = '';
    const filtered = this.filterLogs(this.store.logs);
    filtered.forEach(entry => this.appendSingleLogToDom(entry, false));
    this.scrollToBottom();
    this.updateCountBadge();
  }

  filterLogs(logs) {
    if (this.store.logFilter === 'all') return logs;
    return logs.filter(l => l.category === this.store.logFilter);
  }

  appendSingleLogToDom(entry, doFilterCheck = true) {
    if (!this.terminal) return;

    if (doFilterCheck) {
      if (this.store.logFilter !== 'all' && entry.category !== this.store.logFilter) {
        return;
      }
    }

    const div = document.createElement('div');
    div.className = `log-entry log-${entry.category}`;

    let tagLabel = '[SYS]';
    if (entry.category === 'gift') tagLabel = '[GIFT]';
    else if (entry.category === 'chat') tagLabel = '[CHAT]';
    else if (entry.category === 'ritual') tagLabel = '[RITUAL]';
    else if (entry.category === 'warn') tagLabel = '[WARN]';
    else if (entry.category === 'error') tagLabel = '[ERR]';

    div.innerHTML = `
      <span class="log-time">${entry.time}</span>
      <span class="log-tag tag-${entry.category}">${tagLabel}</span>
      <span class="log-text">${escapeHtml(entry.raw)}</span>
    `;

    this.terminal.appendChild(div);

    if (this.store.autoScroll) {
      this.scrollToBottom();
    }
  }

  scrollToBottom() {
    if (this.terminal) {
      this.terminal.scrollTop = this.terminal.scrollHeight;
    }
  }
}

/**
 * ------------------------------------------------------------------------------
 * 8. MODULE 6: LIVE MANAGER COCKPIT DECK (Scene Presets, TTS Queue, Gift Replay)
 * ------------------------------------------------------------------------------
 */

class LiveManagerDeckModule {
  constructor(store, wsClient) {
    this.store = store;
    this.wsClient = wsClient;

    this.telemetryCoins = document.getElementById('telemetry-coins');
    this.savedChannelPills = document.getElementById('saved-channel-pills');
    this.inputUniqueId = document.getElementById('input-unique-id');
    this.inputRoomId = document.getElementById('input-room-id');

    this.recentGiftsBadge = document.getElementById('recent-gifts-badge');
    this.recentGiftsContainer = document.getElementById('recent-gifts-container');

    this.ttsQueueCountLabel = document.getElementById('tts-queue-count-label');
    this.ttsNowPlayingText = document.getElementById('tts-now-playing-text');
    this.btnTtsPauseToggle = document.getElementById('btn-tts-pause-toggle');
    this.btnTtsSkip = document.getElementById('btn-tts-skip');
    this.btnTtsClear = document.getElementById('btn-tts-clear');
    this.btnTtsPanicMute = document.getElementById('btn-tts-panic-mute');

    this.btnExportDonorsCsv = document.getElementById('btn-export-donors-csv');
    this.btnResetSession = document.getElementById('btn-reset-session');

    this.bindEvents();
  }

  bindEvents() {
    // 1. 1-Click Scene Presets
    document.querySelectorAll('.lm-preset-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset-id');
        this.wsClient.sendCommand('apply_preset', { presetId });
        showToast('Chuyển cảnh nhanh', `Đã kích hoạt kịch bản: ${btn.textContent.trim()}`, 'success');
      });
    });

    // 2. 1-Click Quick Event Flow Tests
    document.querySelectorAll('.lm-quick-flow-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const eventType = btn.getAttribute('data-flow-ev');
        this.wsClient.sendCommand('test_event', { eventType, name: 'Phật Tử Hữu Duyên' });
        showToast('Test sự kiện nhanh', `Đã kích hoạt thử luồng: ${eventType.toUpperCase()}`, 'info');
      });
    });

    // 3. Export Merit Leaderboard CSV & Reset Session
    this.btnExportDonorsCsv?.addEventListener('click', () => {
      window.location.href = '/api/live/donors.csv';
      showToast('Xuất báo cáo', 'Đang tải về file CSV Bảng Vàng Công Đức.', 'success');
    });

    this.btnResetSession?.addEventListener('click', () => {
      if (confirm('Làm mới thống kê và Bảng Vàng Công Đức cho ca live mới? (Các Phật tử đang ngồi vẫn giữ chỗ)')) {
        this.wsClient.sendCommand('reset_session', { clearSeats: false });
        showToast('Ca live mới', 'Đã làm mới thống kê phiên và Bảng Vàng Công Đức.', 'info');
      }
    });

    // 4. Live TTS Queue Deck Controls
    this.btnTtsPauseToggle?.addEventListener('click', () => {
      const nextAction = this.store.ttsQueue.paused ? 'resume' : 'pause';
      this.wsClient.sendCommand('tts_queue', { action: nextAction });
    });

    this.btnTtsSkip?.addEventListener('click', () => {
      this.wsClient.sendCommand('tts_queue', { action: 'skip' });
      showToast('Bỏ qua TTS', 'Đã chuyển sang câu đọc tiếp theo.', 'info');
    });

    this.btnTtsClear?.addEventListener('click', () => {
      this.wsClient.sendCommand('tts_queue', { action: 'clear' });
      showToast('Xóa hàng đợi', 'Đã làm trống hàng đợi đọc TTS.', 'warn');
    });

    this.btnTtsPanicMute?.addEventListener('click', () => {
      const nextAction = this.store.ttsQueue.muted ? 'unmute' : 'mute';
      this.wsClient.sendCommand('tts_queue', { action: nextAction });
      showToast(
        nextAction === 'mute' ? '🔇 ĐÃ TẮT TIẾNG KHẨN CẤP' : '🔊 ĐÃ MỞ LẠI TIẾNG',
        nextAction === 'mute' ? 'Đã ngắt giọng đọc AI ngay lập tức.' : 'Hàng đợi giọng đọc AI hoạt động trở lại.',
        nextAction === 'mute' ? 'error' : 'success'
      );
    });

    // 5. Store Listeners
    this.store.on('full_config_updated', (cfg) => this.renderSavedChannels(cfg));
    this.store.on('tts_queue_updated', (q) => this.renderTtsQueue(q));
    this.store.on('session_stats_updated', (stats) => this.renderSessionStats(stats));
  }

  renderSavedChannels(cfg) {
    if (!this.savedChannelPills) return;
    const channels = cfg?.connection?.savedChannels || [];
    if (!channels.length) {
      this.savedChannelPills.innerHTML = '';
      return;
    }

    this.savedChannelPills.innerHTML = channels
      .filter((ch) => ch.uniqueId)
      .map(
        (ch) => `
        <button type="button" class="lm-channel-chip" data-uid="${escapeHtml(ch.uniqueId)}" data-rid="${escapeHtml(ch.roomId || '')}">
          ⚡ ${escapeHtml(ch.label || '@' + ch.uniqueId)}
        </button>
      `
      )
      .join('');

    this.savedChannelPills.querySelectorAll('.lm-channel-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const uniqueId = chip.getAttribute('data-uid');
        const roomId = chip.getAttribute('data-rid') || undefined;
        if (this.inputUniqueId) this.inputUniqueId.value = uniqueId;
        if (this.inputRoomId) this.inputRoomId.value = roomId || '';
        this.wsClient.sendCommand('connect', { uniqueId, roomId });
        showToast('Đổi kênh nhanh', `Đang kết nối tới @${uniqueId}...`, 'info');
      });
    });
  }

  renderTtsQueue(q) {
    const pendingCount = Array.isArray(q.pending) ? q.pending.length : 0;
    if (this.ttsQueueCountLabel) {
      this.ttsQueueCountLabel.textContent = `Chờ: ${pendingCount}`;
    }

    if (this.ttsNowPlayingText) {
      if (q.muted) {
        this.ttsNowPlayingText.textContent = '🔇 ĐANG TẮT TIẾNG KHẨN CẤP (PANIC MUTE)';
      } else if (q.paused) {
        this.ttsNowPlayingText.textContent = `⏸ Đang tạm dừng (${pendingCount} câu đang chờ)`;
      } else if (q.current && q.current.text) {
        this.ttsNowPlayingText.textContent = `🎙️ Đang đọc: ${q.current.text}`;
      } else {
        this.ttsNowPlayingText.textContent = 'Trạng thái: Sẵn sàng xướng danh';
      }
    }

    if (this.btnTtsPauseToggle) {
      this.btnTtsPauseToggle.textContent = q.paused ? '▶ Tiếp tục' : '⏸ Tạm dừng';
    }
    if (this.btnTtsPanicMute) {
      this.btnTtsPanicMute.textContent = q.muted ? '🔊 Mở lại TTS' : '🔇 Mute Khẩn';
      this.btnTtsPanicMute.classList.toggle('active-danger', Boolean(q.muted));
    }
  }

  renderSessionStats(stats) {
    if (this.telemetryCoins) {
      this.telemetryCoins.textContent = Number(stats.totalDiamonds || 0).toLocaleString('vi-VN');
    }

    const gifts = Array.isArray(stats.recentGifts) ? stats.recentGifts : [];
    if (this.recentGiftsBadge) {
      this.recentGiftsBadge.textContent = `${stats.totalGifts || gifts.length} lễ vật`;
    }
    if (!this.recentGiftsContainer) return;

    if (gifts.length === 0) {
      this.recentGiftsContainer.innerHTML = '<div class="empty-state-small">Chưa có lễ vật cúng dường trong phiên này</div>';
      return;
    }

    this.recentGiftsContainer.innerHTML = gifts
      .slice(0, 8)
      .map(
        (g, idx) => `
        <div class="donor-row">
          <div class="donor-info">
            <div>
              <div class="donor-name">🎁 ${escapeHtml(g.name)} · <span class="text-gold">${escapeHtml(g.giftName)} x${g.count || 1}</span></div>
              <div class="donor-coins mono">+${g.totalCoins || 0} ✧ · "${escapeHtml(g.prayer || '')}"</div>
            </div>
          </div>
          <div class="donor-actions">
            <button class="btn btn-xxs btn-outline-gold btn-replay-gift-tts" data-gift-idx="${idx}" title="Đọc lại lời nguyện của lễ vật này trên sóng">🔁 Đọc lại</button>
          </div>
        </div>
      `
      )
      .join('');

    this.recentGiftsContainer.querySelectorAll('.btn-replay-gift-tts').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = gifts[Number(btn.getAttribute('data-gift-idx'))];
        if (g?.ttsText) {
          this.wsClient.sendCommand('tts_queue', { action: 'replay', text: g.ttsText });
          showToast('Đọc lại lời nguyện', `Đã xếp hàng đọc lại lễ vật của ${g.name}.`, 'success');
        }
      });
    });
  }
}

/**
 * ------------------------------------------------------------------------------
 * 9. UTILITIES (Toast Notifications, HTML Escaping)
 * ------------------------------------------------------------------------------
 */

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(title, msg, type = 'info') {
  if (typeof document === 'undefined') return;
  const stack = document.getElementById('toast-stack');
  if (!stack) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  else if (type === 'warn') icon = '⚠️';
  else if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-content">
      <div class="toast-title">${escapeHtml(title)}</div>
      <div class="toast-msg">${escapeHtml(msg)}</div>
    </div>
  `;

  stack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 250);
  }, 3500);
}

/**
 * ------------------------------------------------------------------------------
 * 9. APPLICATION BOOTSTRAPPER (Pluggable Module Initialization)
 * ------------------------------------------------------------------------------
 */

class ControlApplication {
  constructor() {
    this.store = new AdminStateStore();
    this.wsClient = new WebSocketNetworkClient(this.store);

    // Initialize the core modules when DOM is available
    if (typeof document !== 'undefined') {
      this.modules = {
        connection: new ConnectionHubModule(this.store, this.wsClient),
        seating: new SeatingMatrixModule(this.store, this.wsClient),
        audio: new AudioMixerModule(this.store, this.wsClient),
        simulation: new SimulationStudioModule(this.store, this.wsClient),
        logger: new AuditLoggerModule(this.store),
        liveManager: new LiveManagerDeckModule(this.store, this.wsClient)
      };
    } else {
      this.modules = {};
    }
  }

  start() {
    console.log('%c[Chánh Điện Tịnh Tâm] Admin Dashboard Initialized.', 'color: #f59e0b; font-weight: bold; font-size: 14px;');
    // Establish WebSocket Connection
    this.wsClient.connect();
  }
}

// Auto-run when DOM is fully loaded in browser
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('DOMContentLoaded', () => {
    const app = new ControlApplication();
    app.start();
    window.ControlApp = app; // Expose for testing & debugging
  });
}

export {
  AdminStateStore,
  WebSocketNetworkClient,
  ConnectionHubModule,
  SeatingMatrixModule,
  AudioMixerModule,
  SimulationStudioModule,
  AuditLoggerModule,
  ControlApplication
};
