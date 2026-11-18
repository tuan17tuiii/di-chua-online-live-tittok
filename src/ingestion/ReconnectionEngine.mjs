/**
 * ReconnectionEngine: Exponential Backoff with Jitter (2s to 30s) and 15s Watchdog.
 */
export class ReconnectionEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.baseDelay=2000] Base delay in ms (2s)
   * @param {number} [options.maxDelay=30000] Max delay in ms (30s)
   * @param {number} [options.watchdogInterval=15000] Watchdog check interval (15s)
   * @param {number} [options.inactivityTimeout=60000] Inactivity timeout before watchdog reset (60s)
   * @param {Function} [options.onReconnect] Callback when reconnect attempt is triggered
   * @param {Function} [options.onWatchdogTimeout] Callback when watchdog expires
   */
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 2000;
    this.maxDelay = options.maxDelay || 30000;
    this.watchdogInterval = options.watchdogInterval || 15000;
    this.inactivityTimeout = options.inactivityTimeout || 60000;

    this.onReconnect = options.onReconnect || (() => {});
    this.onWatchdogTimeout = options.onWatchdogTimeout || (() => {});

    this.attempt = 0;
    this.reconnectTimeout = null;
    this.watchdogTimer = null;
    this.lastEventTimestamp = Date.now();
    this.isWatching = false;
  }

  /**
   * Calculate next delay using exponential backoff with +/-20% jitter.
   * Guaranteed <= maxDelay.
   * @returns {number} Delay in milliseconds
   */
  getNextDelay() {
    const rawDelay = this.baseDelay * Math.pow(1.5, this.attempt) * (1 + (Math.random() * 0.4 - 0.2));
    return Math.round(Math.min(this.maxDelay, rawDelay));
  }

  /**
   * Schedule next reconnection attempt.
   * @returns {number} scheduled delay ms
   */
  scheduleReconnect() {
    this.cancelReconnect();
    const delay = this.getNextDelay();
    this.attempt++;

    this.reconnectTimeout = setTimeout(() => {
      this.onReconnect(this.attempt);
    }, delay);
    if (this.reconnectTimeout.unref) this.reconnectTimeout.unref();

    return delay;
  }

  /**
   * Cancel pending reconnection timer
   */
  cancelReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Reset reconnection attempt counter
   */
  reset() {
    this.attempt = 0;
    this.cancelReconnect();
    this.lastEventTimestamp = Date.now();
  }

  /**
   * Record receipt of an event or ping (heartbeat)
   */
  recordHeartbeat() {
    this.lastEventTimestamp = Date.now();
  }

  /**
   * Start 15-second watchdog timer
   */
  startWatchdog() {
    this.stopWatchdog();
    this.isWatching = true;
    this.lastEventTimestamp = Date.now();

    this.watchdogTimer = setInterval(() => {
      if (!this.isWatching) return;
      const elapsed = Date.now() - this.lastEventTimestamp;
      if (elapsed > this.inactivityTimeout) {
        console.warn(`[ReconnectionEngine] Watchdog triggered after ${elapsed}ms inactivity.`);
        this.onWatchdogTimeout();
      }
    }, this.watchdogInterval);
    if (this.watchdogTimer.unref) this.watchdogTimer.unref();
  }

  /**
   * Stop watchdog timer
   */
  stopWatchdog() {
    this.isWatching = false;
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }
}

export default ReconnectionEngine;
