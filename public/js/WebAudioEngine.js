/**
 * WebAudioEngine.js
 * 48kHz Web Audio API Engine, 5-Channel Real-Time Gain Control, Dynamic BGM Track Switching,
 * Additive Bell/Mõ/Chime Synthesis, Instant TTS Stop/Skip & Look-Ahead Ducking.
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
    this.duckedBgmVolume = 0.12;
    this.currentBgmUrl = '/assets/audio/bgm/music1.mp3';

    this.audioBuffers = new Map();
    this.moRoundRobinIndex = 0;
    this.bgmSource = null;
    this.currentTtsSource = null;
    this.isBgmPlaying = false;
    this.localMuted = false;

    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('muted') === '1') {
        this.localMuted = true;
      }
    }

    this.initAudioContext();
  }

  initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass({ sampleRate: 48000 });

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.localMuted ? 0 : 1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.normalBgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.bellGain = this.ctx.createGain();
      this.bellGain.gain.setValueAtTime(0.95, this.ctx.currentTime);
      this.bellGain.connect(this.masterGain);

      this.ttsGain = this.ctx.createGain();
      this.ttsGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.ttsGain.connect(this.masterGain);

      if (this.ctx.state === 'suspended') {
        setTimeout(() => {
          this.ctx.resume().catch(() => {});
        }, 500);
      }

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

  setLocalMuted(muted) {
    this.localMuted = Boolean(muted);
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.localMuted ? 0 : (this._targetMasterVol ?? 1.0), this.ctx.currentTime);
    }
  }

  /**
   * Apply 5-channel volume mixer settings from Admin Config in real time
   * @param {Object} vols { master, bgm, sfx, bell, tts, duckedBgm }
   */
  setVolumes(vols = {}) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const clamp = (v, def) => Math.max(0, Math.min(1.5, Number(v ?? def)));

    if (vols.master !== undefined && this.masterGain) {
      this._targetMasterVol = clamp(vols.master, 1.0);
      if (!this.localMuted) {
        this.masterGain.gain.setTargetAtTime(this._targetMasterVol, now, 0.05);
      }
    }
    if (vols.bgm !== undefined && this.bgmGain) {
      this.normalBgmVolume = clamp(vols.bgm, 0.55);
      this.bgmGain.gain.setTargetAtTime(this.normalBgmVolume, now, 0.08);
    }
    if (vols.sfx !== undefined && this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(clamp(vols.sfx, 0.85), now, 0.05);
    }
    if (vols.bell !== undefined && this.bellGain) {
      this.bellGain.gain.setTargetAtTime(clamp(vols.bell, 0.95), now, 0.05);
    }
    if (vols.tts !== undefined && this.ttsGain) {
      this.ttsGain.gain.setTargetAtTime(clamp(vols.tts, 1.0), now, 0.05);
    }
    if (vols.duckedBgm !== undefined) {
      this.duckedBgmVolume = clamp(vols.duckedBgm, 0.12);
    }
  }

  ensureContextRunning() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  async loadAudioBuffer(id, url) {
    if (!this.ctx || !url) return null;
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const arrayBuffer = await resp.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioBuffers.set(id, decoded);
      return decoded;
    } catch {
      this.audioBuffers.set(id, null);
      return null;
    }
  }

  async preloadManifestAudio() {
    const audioList = [
      { id: 'mo_1', url: '/assets/audio/sfx/mo_strike_01.wav' },
      { id: 'mo_2', url: '/assets/audio/sfx/mo_strike_02.wav' },
      { id: 'mo_3', url: '/assets/audio/sfx/mo_strike_03.wav' },
      { id: 'bell_temple', url: '/assets/audio/sfx/bell_temple.wav' },
      { id: 'bell_bowl', url: '/assets/audio/sfx/bell_bowl.wav' },
      { id: 'tier1_chime', url: '/assets/audio/sfx/gift_tier1.wav' },
      { id: 'tier2_chime', url: '/assets/audio/sfx/gift_tier2.wav' },
      { id: 'bgm', url: this.currentBgmUrl }
    ];

    await Promise.all(audioList.map((a) => this.loadAudioBuffer(a.id, a.url)));
  }

  /**
   * Dynamically switch background music track URL
   * @param {string} url
   * @param {boolean} [shouldPlay=true]
   */
  async setBgmTrack(url, shouldPlay = true) {
    if (!url || url === this.currentBgmUrl) {
      if (shouldPlay) this.startBgm();
      else this.stopBgm();
      return;
    }
    this.currentBgmUrl = url;
    const wasPlaying = this.isBgmPlaying;
    this.stopBgm();
    await this.loadAudioBuffer('bgm', url);
    if (shouldPlay || wasPlaying) {
      this.startBgm();
    }
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
      } catch {}
      this.bgmSource = null;
      this.isBgmPlaying = false;
    }
  }

  duckAudio(durationSec = 4.0) {
    if (!this.ctx || !this.bgmGain) return;
    const now = this.ctx.currentTime;
    const safeDuration = Math.max(0.5, Number(durationSec) || 4.0);
    const targetDucked = Math.min(this.normalBgmVolume, this.duckedBgmVolume);

    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, now);
    this.bgmGain.gain.linearRampToValueAtTime(targetDucked, now + 0.35);
    this.bgmGain.gain.setValueAtTime(targetDucked, now + safeDuration);
    this.bgmGain.gain.linearRampToValueAtTime(this.normalBgmVolume, now + safeDuration + 0.55);
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
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.playbackRate.value = 1.0 + (Math.random() - 0.5) * 0.03;

        const gainNode = this.ctx.createGain();
        gainNode.gain.value = 1.0 + (Math.random() - 0.5) * 0.10;

        source.connect(gainNode);
        gainNode.connect(this.sfxGain);
        source.start(0);
      } catch {
        this.synthesizeMo();
      }
    } else {
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

  playChime(chimeKey = 'tier2_chime') {
    this.ensureContextRunning();
    if (!this.ctx || !this.sfxGain) return;

    const buffer = this.audioBuffers.get(chimeKey);
    if (buffer) {
      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(this.sfxGain);
        source.start(0);
        return;
      } catch {}
    }

    // Gentle Buddhist wind-chime synthesis fallback
    try {
      const now = this.ctx.currentTime;
      const notes = chimeKey === 'tier1_chime' ? [528, 792] : [528, 660, 792, 1056];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        g.gain.setValueAtTime(0.28, now + i * 0.08);
        g.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.08 + 1.8);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 1.85);
      });
    } catch {}
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
      } catch {
        this.synthesizeBell(isGreatBell ? 11.2 : 4.5);
      }
    } else {
      this.synthesizeBell(isGreatBell ? 11.2 : 4.5);
    }
  }

  synthesizeBell(duration = 11.2) {
    if (!this.ctx || !this.bellGain) return;
    try {
      const now = this.ctx.currentTime;
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

  /**
   * Immediately stop active TTS speech (used by Skip & Panic Mute in Live Manager)
   */
  stopTts() {
    if (this.currentTtsSource) {
      try {
        this.currentTtsSource.stop(0);
        this.currentTtsSource.disconnect();
      } catch {}
      this.currentTtsSource = null;
    }
    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(this.normalBgmVolume, now, 0.2);
    }
  }

  async playTtsDataUri(dataUri, onEnded) {
    this.ensureContextRunning();
    if (!this.ctx || !dataUri) {
      if (onEnded) onEnded();
      return;
    }

    try {
      this.stopTts();

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

      this.duckAudio(duration);

      const source = this.ctx.createBufferSource();
      source.buffer = decodedBuffer;
      source.connect(this.ttsGain);
      this.currentTtsSource = source;

      source.onended = () => {
        if (this.currentTtsSource === source) {
          this.currentTtsSource = null;
        }
        if (onEnded) onEnded();
      };

      source.start(0);
    } catch (e) {
      console.warn('[WebAudioEngine] TTS Data URI decode error:', e);
      if (onEnded) onEnded();
    }
  }
}
