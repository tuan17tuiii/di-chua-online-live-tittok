import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createDefaultAppConfig,
  deepMergeConfig,
  toLegacyRoomSettings
} from './defaultConfigSchema.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultDataDir = path.resolve(__dirname, '..', '..', 'data');

/**
 * ConfigStore: Persistent configuration & profile manager with atomic writes,
 * section resets, scene presets, import/export, and hot-reload pub/sub.
 */
export class ConfigStore {
  /**
   * @param {Object} [options]
   * @param {string} [options.filePath] Path to main config JSON
   * @param {string} [options.profilesPath] Path to named profiles JSON
   * @param {boolean} [options.persist=true] Whether to read/write disk
   * @param {Object} [options.initialPatch] Initial override patch
   */
  constructor(options = {}) {
    this.persist = options.persist !== undefined ? Boolean(options.persist) : true;
    this.filePath = options.filePath || path.join(defaultDataDir, 'app-config.json');
    this.profilesPath = options.profilesPath || path.join(defaultDataDir, 'config-profiles.json');

    this.listeners = new Set();
    this.config = createDefaultAppConfig();
    this.profiles = {};

    if (this.persist) {
      this._loadFromDisk();
      this._loadProfilesFromDisk();
    }

    if (options.initialPatch) {
      this.config = deepMergeConfig(this.config, options.initialPatch);
    }
  }

  _ensureDir(targetFile) {
    const dir = path.dirname(targetFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.config = deepMergeConfig(createDefaultAppConfig(), parsed);
        }
      } else {
        this._saveToDisk();
      }
    } catch (err) {
      console.warn(`[ConfigStore] Failed to load config from disk, using defaults: ${err.message}`);
    }
  }

  _saveToDisk() {
    if (!this.persist) return;
    try {
      this._ensureDir(this.filePath);
      this.config.updatedAt = Date.now();
      const tmpPath = `${this.filePath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.config, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.filePath);
    } catch (err) {
      console.warn(`[ConfigStore] Failed to save config to disk: ${err.message}`);
    }
  }

  _loadProfilesFromDisk() {
    try {
      if (fs.existsSync(this.profilesPath)) {
        const raw = fs.readFileSync(this.profilesPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.profiles = parsed;
        }
      }
    } catch (err) {
      console.warn(`[ConfigStore] Failed to load profiles: ${err.message}`);
    }
  }

  _saveProfilesToDisk() {
    if (!this.persist) return;
    try {
      this._ensureDir(this.profilesPath);
      const tmpPath = `${this.profilesPath}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.profiles, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.profilesPath);
    } catch (err) {
      console.warn(`[ConfigStore] Failed to save profiles: ${err.message}`);
    }
  }

  /**
   * Subscribe to configuration changes
   * @param {(newConfig: Object) => void} fn
   * @returns {() => void} Unsubscribe callback
   */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _notify() {
    for (const fn of this.listeners) {
      try {
        fn(this.config);
      } catch (err) {
        console.warn(`[ConfigStore] Listener error: ${err.message}`);
      }
    }
  }

  /**
   * Get full configuration object
   */
  get() {
    return this.config;
  }

  /**
   * Get backwards-compatible room settings object
   */
  getLegacySettings() {
    return toLegacyRoomSettings(this.config);
  }

  /**
   * Apply a deep partial update to the configuration
   * @param {Object} patch
   */
  update(patch) {
    if (!patch || typeof patch !== 'object') return this.config;
    this.config = deepMergeConfig(this.config, patch);
    this.config.updatedAt = Date.now();
    this._saveToDisk();
    this._notify();
    return this.config;
  }

  /**
   * Reset a single top-level section back to factory defaults
   * @param {string} sectionKey
   */
  resetSection(sectionKey) {
    const defaults = createDefaultAppConfig();
    if (sectionKey && Object.prototype.hasOwnProperty.call(defaults, sectionKey)) {
      this.config[sectionKey] = defaults[sectionKey];
      this.config.updatedAt = Date.now();
      this._saveToDisk();
      this._notify();
    }
    return this.config;
  }

  /**
   * Reset entire configuration back to factory defaults
   */
  resetAll() {
    this.config = createDefaultAppConfig();
    this._saveToDisk();
    this._notify();
    return this.config;
  }

  /**
   * Apply a 1-click Scene Preset by ID
   * @param {string} presetId
   * @returns {Object | null} Applied preset or null if not found
   */
  applyScenePreset(presetId) {
    const presets = this.config.scenePresets || [];
    const found = presets.find((p) => p.id === presetId);
    if (!found || !found.patch) return null;

    this.update(found.patch);
    return found;
  }

  /**
   * Save current config as a named profile
   * @param {string} name
   * @param {string} [description='']
   */
  saveProfile(name, description = '') {
    const cleanName = String(name || '').trim();
    if (!cleanName) throw new Error('Tên hồ sơ cấu hình không được để trống');
    const id = 'prof_' + cleanName.toLowerCase().replace(/[^a-z0-9]+/gi, '_') + '_' + Date.now().toString(36);
    const snapshot = JSON.parse(JSON.stringify(this.config));
    // Exclude secrets in profile snapshot if desired, or keep full local profile
    this.profiles[id] = {
      id,
      name: cleanName,
      description: String(description || ''),
      savedAt: Date.now(),
      config: snapshot
    };
    this._saveProfilesToDisk();
    return { id, name: cleanName, description, savedAt: this.profiles[id].savedAt };
  }

  /**
   * List saved named profiles (metadata only)
   */
  listProfiles() {
    return Object.values(this.profiles)
      .map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        savedAt: p.savedAt
      }))
      .sort((a, b) => b.savedAt - a.savedAt);
  }

  /**
   * Load and activate a saved profile by ID
   * @param {string} profileId
   */
  loadProfile(profileId) {
    const prof = this.profiles[profileId];
    if (!prof || !prof.config) {
      throw new Error('Không tìm thấy hồ sơ cấu hình');
    }
    this.config = deepMergeConfig(createDefaultAppConfig(), prof.config);
    this.config.updatedAt = Date.now();
    this._saveToDisk();
    this._notify();
    return prof;
  }

  /**
   * Delete a saved profile by ID
   * @param {string} profileId
   */
  deleteProfile(profileId) {
    if (this.profiles[profileId]) {
      delete this.profiles[profileId];
      this._saveProfilesToDisk();
      return true;
    }
    return false;
  }

  /**
   * Export config as JSON object (optionally masking API keys/cookies)
   * @param {boolean} [includeSecrets=false]
   */
  exportJson(includeSecrets = false) {
    const copy = JSON.parse(JSON.stringify(this.config));
    if (!includeSecrets && copy.connection) {
      copy.connection.signApiKey = '';
      copy.connection.sessionId = '';
      copy.connection.proxyUrl = '';
    }
    return copy;
  }

  /**
   * Import JSON object and merge over defaults (preserving local secrets if blank in import)
   * @param {Object} importedObj
   */
  importJson(importedObj) {
    if (!importedObj || typeof importedObj !== 'object') {
      throw new Error('Dữ liệu cấu hình nhập vào không hợp lệ');
    }
    const prevConn = { ...(this.config.connection || {}) };
    const merged = deepMergeConfig(createDefaultAppConfig(), importedObj);

    // Keep existing secrets if imported file had them stripped
    if (!importedObj.connection?.signApiKey && prevConn.signApiKey) {
      merged.connection.signApiKey = prevConn.signApiKey;
    }
    if (!importedObj.connection?.sessionId && prevConn.sessionId) {
      merged.connection.sessionId = prevConn.sessionId;
    }
    if (!importedObj.connection?.proxyUrl && prevConn.proxyUrl) {
      merged.connection.proxyUrl = prevConn.proxyUrl;
    }

    this.config = merged;
    this.config.updatedAt = Date.now();
    this._saveToDisk();
    this._notify();
    return this.config;
  }
}

export default ConfigStore;

