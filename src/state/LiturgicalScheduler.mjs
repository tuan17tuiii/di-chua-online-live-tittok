/**
 * LiturgicalScheduler: Coordinates the temple mõ metronome (20-120 BPM) with cadence reset
 * and automatic liturgical chanting intervals.
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
   * @param {Function} [options.onMoTick]
   * @param {Function} [options.onChantTick]
   */
  constructor(options = {}) {
    this.moBpm = this._clampBpm(options.moBpm || 52);
    this.chantEveryMin = this._clampChantMin(options.chantEveryMin || 3);
    this.moEnabled = options.moEnabled !== undefined ? options.moEnabled : true;
    this.autoChantEnabled = options.autoChantEnabled !== undefined ? options.autoChantEnabled : true;

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
    return Math.max(1, Math.min(10, Number(min) || 3));
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

  /**
   * Internal helper to start mo metronome timer
   * @private
   */
  _startMoTimer() {
    if (this.moIntervalId) clearInterval(this.moIntervalId);
    const intervalMs = Math.round((60 / this.moBpm) * 1000);
    this.moIntervalId = setInterval(() => {
      this.roundRobinIndex = (this.roundRobinIndex % 3) + 1;
      this.onMoTick(this.roundRobinIndex);
    }, intervalMs);
    if (this.moIntervalId.unref) this.moIntervalId.unref();
  }

  /**
   * Internal helper to start chant timer
   * @private
   */
  _startChantTimer() {
    if (this.chantIntervalId) clearInterval(this.chantIntervalId);
    const intervalMs = this.chantEveryMin * 60 * 1000;
    this.chantIntervalId = setInterval(() => {
      const chantText = LiturgicalScheduler.DEFAULT_CHANTS[this.chantIndex % LiturgicalScheduler.DEFAULT_CHANTS.length];
      this.chantIndex++;
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

    // Cadence Reset: restart interval timer so the next strike occurs after a full period
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
    const text = customText || LiturgicalScheduler.DEFAULT_CHANTS[this.chantIndex % LiturgicalScheduler.DEFAULT_CHANTS.length];
    this.chantIndex++;
    this.onChantTick(text);

    if (this.isRunning && this.autoChantEnabled) {
      this._startChantTimer();
    }
    return text;
  }

  /**
   * Update mõ metronome BPM
   * @param {number} bpm 20-120 BPM
   */
  setMoBpm(bpm) {
    this.moBpm = this._clampBpm(bpm);
    if (this.isRunning && this.moEnabled) {
      this._startMoTimer();
    }
  }

  /**
   * Enable/disable mõ metronome
   * @param {boolean} enabled
   */
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

  /**
   * Update chanting period
   * @param {number} minutes 1-10 mins
   */
  setChantInterval(minutes) {
    this.chantEveryMin = this._clampChantMin(minutes);
    if (this.isRunning && this.autoChantEnabled) {
      this._startChantTimer();
    }
  }

  /**
   * Enable/disable auto chanting
   * @param {boolean} enabled
   */
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
