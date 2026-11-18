/**
 * WebAudioEngine.js
 * 48kHz Web Audio API Engine, Autoplay Watchdog, Additive Bell/Mõ Synthesis & -14dB Look-Ahead Ducking
 * Complies with ARCHITECTURE.md §6 and WEBSOCKET_SPEC.md §3.9, §3.11
 */

export class WebAudioEngine {
  constructor() {
    this.ctx = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.bellGain = null;
    this.ttsGain = null;
    this.masterGain = null;

    this.normalBgmVolume = 0.55;
    this.duckedBgmVolume = 0.12; // -14dB attenuation

    this.audioBuffers = new Map();
    this.moRoundRobinIndex = 0;
    this.bgmSource = null;
    this.isBgmPlaying = false;

    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass({ sampleRate: 48000 });

      // Master Gain Node -> Destination
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      // BGM Channel Gain
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.normalBgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // SFX Channel Gain (Mõ strikes, chimes)
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // Bell Channel Gain (Temple bell, Bowl bell)
      this.bellGain = this.ctx.createGain();
      this.bellGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
      this.bellGain.connect(this.masterGain);

      // TTS Channel Gain (AI Voice announcements)
      this.ttsGain = this.ctx.createGain();
      this.ttsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.ttsGain.connect(this.masterGain);

      // Autoplay Watchdog (OBS CEF headless policy)
      if (this.ctx.state === 'suspended') {
        setTimeout(() => {
          this.ctx.resume().catch(() => {});
        }, 500);
      }

      // Secondary unlock on any browser interaction
      const unlock = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
        window.removeEventListener('click', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('click', unlock, { once: true });
      window.addEventListener('keydown', unlock, { once: true });
      window.addEventListener('touchstart', unlock, { once: true });
    } catch (e) {
      console.warn('[WebAudioEngine] Initialization warning:', e);
    }
  }

  ensureContextRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async loadAudioBuffer(id, url) {
    if (!this.ctx) return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(id, decoded);
    } catch (e) {
      // Audio buffer failed to load; mark as null so engine falls back to synthesis
      this.audioBuffers.set(id, null);
    }
  }

  async preloadManifestAudio() {
    const audioList = [
      { id: 'mo_1', url: '/assets/audio/sfx/mo_strike_01.wav' },
      { id: 'mo_2', url: '/assets/audio/sfx/mo_strike_02.wav' },
      { id: 'mo_3', url: '/assets/audio/sfx/mo_strike_03.wav' },
      { id: 'bell_temple', url: '/assets/audio/sfx/bell_temple.wav' },
      { id: 'bell_bowl', url: '/assets/audio/sfx/bell_bowl.wav' },
      { id: 'bgm', url: '/assets/audio/bgm/music1.mp3' }
    ];

    await Promise.all(audioList.map((a) => this.loadAudioBuffer(a.id, a.url)));
  }

  startBgm() {
    this.ensureContextRunning();
    if (this.isBgmPlaying) return;

    const buffer = this.audioBuffers.get('bgm');
    if (!buffer || !this.ctx || !this.bgmGain) return;

    try {
      this.bgmSource = this.ctx.createBufferSource();
      this.bgmSource.buffer = buffer;
      this.bgmSource.loop = true;
      this.bgmSource.connect(this.bgmGain);
      this.bgmSource.start(0);
      this.isBgmPlaying = true;
    } catch (e) {
      console.warn('[WebAudioEngine] BGM start error:', e);
    }
  }

  stopBgm() {
    if (this.bgmSource && this.isBgmPlaying) {
      try {
        this.bgmSource.stop(0);
        this.bgmSource.disconnect();
      } catch (e) {}
      this.bgmSource = null;
      this.isBgmPlaying = false;
    }
  }

  duckAudio(durationSec = 4.0) {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const safeDuration = Math.max(0.5, Number(durationSec) || 4.0);

    // Cancel previously scheduled ramps
    this.bgmGain.gain.cancelScheduledValues(now);

    // Parametric look-ahead ducking: 400ms linear ramp to -14dB (0.12)
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(this.duckedBgmVolume, now + 0.400);

    // Restore ramp back to normal after duration
    this.bgmGain.gain.setValueAtTime(this.duckedBgmVolume, now + safeDuration);
    this.bgmGain.gain.linearRampToValueAtTime(this.normalBgmVolume, now + safeDuration + 0.600);
  }

  playMo() {
    this.ensureContextRunning();
    if (!this.ctx) return;

    const moKeys = ['mo_1', 'mo_2', 'mo_3'];
    const chosenKey = moKeys[this.moRoundRobinIndex % 3];
    this.moRoundRobinIndex++;

    const buffer = this.audioBuffers.get(chosenKey);
    if (buffer) {
      try {
        // Acoustic playback with humanization
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        // Micro pitch shift: +/- 25 cents
        source.playbackRate.value = 1.0 + (Math.random() - 0.5) * 0.03;

        const gainNode = this.ctx.createGain();
        // Gain variance: +/- 5%
        gainNode.gain.value = 1.0 + (Math.random() - 0.5) * 0.10;

        source.connect(gainNode);
        gainNode.connect(this.sfxGain);
        source.start(0);
      } catch (e) {
        this.synthesizeMo();
      }
    } else {
      // Synthetic Oscillator Fallback: Triangle wave swept 620Hz -> 380Hz + Bandpass
      this.synthesizeMo();
    }
  }

  synthesizeMo() {
    if (!this.ctx || !this.sfxGain) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(700, now);
      filter.Q.setValueAtTime(3.0, now);

      gain.gain.setValueAtTime(0.85, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn('[WebAudioEngine] Mõ synthesis error:', e);
    }
  }

  playBell(isGreatBell = true) {
    this.ensureContextRunning();
    if (!this.ctx) return;

    const buffer = this.audioBuffers.get(isGreatBell ? 'bell_temple' : 'bell_bowl');

    if (isGreatBell) {
      this.duckAudio(8.0);
    }

    if (buffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.bellGain);
        source.start(0);
      } catch (e) {
        this.synthesizeBell(isGreatBell ? 11.2 : 4.5);
      }
    } else {
      // Additive Harmonic Bell Synthesis Fallback
      this.synthesizeBell(isGreatBell ? 11.2 : 4.5);
    }
  }

  synthesizeBell(duration = 11.2) {
    if (!this.ctx || !this.bellGain) return;
    try {
      const now = this.ctx.currentTime;
      // 4 Additive harmonic partials: 216Hz, 432Hz, 1296Hz, 2160Hz
      const partials = [
        { freq: 216, gain: 0.50, decay: duration },
        { freq: 432, gain: 0.35, decay: duration * 0.7 },
        { freq: 1296, gain: 0.20, decay: duration * 0.5 },
        { freq: 2160, gain: 0.15, decay: duration * 0.25 }
      ];

      const masterBellGain = this.ctx.createGain();
      masterBellGain.gain.setValueAtTime(0.9, now);
      masterBellGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      masterBellGain.connect(this.bellGain);

      for (const p of partials) {
        const osc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(p.freq, now);

        pGain.gain.setValueAtTime(p.gain, now);
        pGain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

        osc.connect(pGain);
        pGain.connect(masterBellGain);

        osc.start(now);
        osc.stop(now + p.decay);
      }
    } catch (e) {
      console.warn('[WebAudioEngine] Bell synthesis error:', e);
    }
  }

  async playTtsDataUri(dataUri, onEnded) {
    this.ensureContextRunning();
    if (!this.ctx || !dataUri) {
      if (onEnded) onEnded();
      return;
    }

    try {
      // In-memory Base64 Data URI decoding with zero disk I/O
      const parts = dataUri.split(',');
      const base64Data = parts.length > 1 ? parts[1] : parts[0];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decodedBuffer = await this.ctx.decodeAudioData(bytes.buffer);
      const duration = decodedBuffer.duration;

      // Parametric look-ahead ducking for the speech duration
      this.duckAudio(duration);

      const source = this.ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(this.ttsGain);

      source.onended = () => {
        if (onEnded) onEnded();
      };

      source.start(0);
    } catch (e) {
      console.warn('[WebAudioEngine] TTS Data URI decode error:', e);
      if (onEnded) onEnded();
    }
  }
}
