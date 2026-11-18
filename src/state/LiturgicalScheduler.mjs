/**
 * LiturgicalScheduler: Coordinates the temple mõ metronome (20-120 BPM) with cadence reset
 * and automatic liturgical chanting intervals with customizable chant list.
 */
export class LiturgicalScheduler {
  static DEFAULT_CHANTS = [
    'Nguyện đem công đức này, hướng về khắp tất cả, đệ tử và chúng sanh, đều trọn thành Phật đạo.',
    'Nam mô A Di Đà Phật, nguyện cầu an lạc thái hòa, gia đạo hưng long.',
    'Nam mô Bổn Sư Thích Ca Mâu Ni Phật, từ bi tiếp độ chúng sanh.',
    'Nam mô Đại Bi Quán Thế Âm Bồ Tát, cứu khổ cứu nạn muôn loài.'
  ];

  /**
   * @param {Object} options
   * @param {number} [options.moBpm=52]
   * @param {number} [options.chantEveryMin=3]
   * @param {boolean} [options.moEnabled=true]
   * @param {boolean} [options.autoChantEnabled=true]
   * @param {string[]} [options.chants]
   * @param {Function} [options.onMoTick]
   * @param {Function} [options.onChantTick]
   */
  constructor(options = {}) {
    this.moBpm = this._clampBpm(options.moBpm || 52);
    this.chantEveryMin = this._clampChantMin(options.chantEveryMin || 3);
    this.moEnabled = options.moEnabled !== undefined ? options.moEnabled : true;
    this.autoChantEnabled = options.autoChantEnabled !== undefined ? options.autoChantEnabled : true;
    this.chants = Array.isArray(options.chants) && options.chants.length > 0
      ? [...options.chants]
      : [...LiturgicalScheduler.DEFAULT_CHANTS];

    this.onMoTick = options.onMoTick || (() => {});
    this.onChantTick = options.onChantTick || (() => {});

    this.roundRobinIndex = 1;
    this.chantIndex = 0;

    this.moIntervalId = null;
    this.chantIntervalId = null;
    this.isRunning = false;
  }

  _clampBpm(bpm) {
    return Math.max(20, Math.min(120, Number(bpm) || 52));
  }

  _clampChantMin(min) {
    return Math.max(1, Math.min(60, Number(min) || 3));
  }

  /**
   * Hot-update custom chant phrases list
   * @param {string[]} items
   */
  setChantItems(items) {
    if (Array.isArray(items)) {
      const cleaned = items.map((s) => String(s || '').trim()).filter(Boolean);
      this.chants = cleaned.length > 0 ? cleaned : [...LiturgicalScheduler.DEFAULT_CHANTS];
    }
  }

  _pickNextChant() {
    const list = this.chants.length > 0 ? this.chants : LiturgicalScheduler.DEFAULT_CHANTS;
    const text = list[this.chantIndex % list.length];
    this.chantIndex++;
    return text;
  }

  /**
   * Start metronome and chant scheduler
   */
  start() {
    this.stop();
    this.isRunning = true;

    if (this.moEnabled) {
      this._startMoTimer();
    }

    if (this.autoChantEnabled) {
      this._startChantTimer();
    }
  }

  /**
   * Stop all timers
   */
  stop() {
    this.isRunning = false;
    if (this.moIntervalId) {
      clearInterval(this.moIntervalId);
      this.moIntervalId = null;
    }
    if (this.chantIntervalId) {
      clearInterval(this.chantIntervalId);
      this.chantIntervalId = null;
    }
  }

  _startMoTimer() {
    if (this.moIntervalId) clearInterval(this.moIntervalId);
    const intervalMs = Math.round((60 / this.moBpm) * 1000);
    this.moIntervalId = setInterval(() => {
      this.roundRobinIndex = (this.roundRobinIndex % 3) + 1;
      this.onMoTick(this.roundRobinIndex);
    }, intervalMs);
    if (this.moIntervalId.unref) this.moIntervalId.unref();
  }

  _startChantTimer() {
    if (this.chantIntervalId) clearInterval(this.chantIntervalId);
    const intervalMs = this.chantEveryMin * 60 * 1000;
    this.chantIntervalId = setInterval(() => {
      const chantText = this._pickNextChant();
      this.onChantTick(chantText);
    }, intervalMs);
    if (this.chantIntervalId.unref) this.chantIntervalId.unref();
  }

  /**
   * Trigger a manual mo strike with Cadence Reset to avoid clashing with the next auto strike.
   * @returns {number} roundRobinIndex
   */
  triggerMoManual() {
    this.roundRobinIndex = (this.roundRobinIndex % 3) + 1;
    this.onMoTick(this.roundRobinIndex);

    if (this.isRunning && this.moEnabled) {
      this._startMoTimer();
    }

    return this.roundRobinIndex;
  }

  /**
   * Trigger a manual chant and reset chant schedule
   * @param {string} [customText]
   * @returns {string} chantText
   */
  triggerChantManual(customText) {
    const text = customText || this._pickNextChant();
    this.onChantTick(text);

    if (this.isRunning && this.autoChantEnabled) {
      this._startChantTimer();
    }
    return text;
  }

  setMoBpm(bpm) {
    this.moBpm = this._clampBpm(bpm);
    if (this.isRunning && this.moEnabled) {
      this._startMoTimer();
    }
  }

  setMoEnabled(enabled) {
    this.moEnabled = Boolean(enabled);
    if (this.isRunning) {
      if (this.moEnabled) {
        this._startMoTimer();
      } else if (this.moIntervalId) {
        clearInterval(this.moIntervalId);
        this.moIntervalId = null;
      }
    }
  }

  setChantInterval(minutes) {
    this.chantEveryMin = this._clampChantMin(minutes);
    if (this.isRunning && this.autoChantEnabled) {
      this._startChantTimer();
    }
  }

  setAutoChantEnabled(enabled) {
    this.autoChantEnabled = Boolean(enabled);
    if (this.isRunning) {
      if (this.autoChantEnabled) {
        this._startChantTimer();
      } else if (this.chantIntervalId) {
        clearInterval(this.chantIntervalId);
        this.chantIntervalId = null;
      }
    }
  }
}

export default LiturgicalScheduler;
