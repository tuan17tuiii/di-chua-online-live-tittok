/**
 * MessageSchemas: Protocol definitions, WebSocket error codes, and schema validators
 * as defined in WEBSOCKET_SPEC.md plus Admin Config & Live Manager extensions.
 */

export const WS_ERROR_CODES = {
  NORMAL_CLOSURE: 1000,
  ABNORMAL_CLOSURE: 1006,
  BAD_HANDSHAKE: 4400,
  UNAUTHORIZED_HOST: 4401,
  FORBIDDEN_ACTION: 4403,
  RATE_LIMITED: 4429
};

export const ALLOWED_ROLES = ['overlay', 'control'];

export const VALID_SKINS = ['man', 'woman', 'granny', 'child', 'monk', 'nun', 'master'];

export const VALID_COMMANDS = [
  'connect',
  'disconnect',
  'chat',
  'gift',
  'like',
  'fill',
  'clear',
  'bot',
  'bots',
  'skin',
  'kick',
  'slot',
  'bell',
  'mo',
  'chant',
  'tts',
  'say',
  'settings',
  'title',
  // Extended Admin Config & Live Manager commands
  'test_event',
  'update_config',
  'apply_preset',
  'tts_queue',
  'reset_session',
  'adjust_coins'
];

/**
 * Validates a client control command envelope.
 * @param {any} message Parsed JSON object
 * @returns {{ valid: boolean, error?: string, cmd?: string }}
 */
export function validateClientCommand(message) {
  if (!message || typeof message !== 'object') {
    return { valid: false, error: 'Message must be a valid JSON object' };
  }

  if (message.t !== 'ctl') {
    return { valid: false, error: 'Envelope field "t" must equal "ctl"' };
  }

  if (!message.cmd || typeof message.cmd !== 'string') {
    return { valid: false, error: 'Command field "cmd" is required' };
  }

  const cmd = message.cmd.toLowerCase();
  if (!VALID_COMMANDS.includes(cmd)) {
    return { valid: false, error: `Unknown command "${message.cmd}"` };
  }

  return { valid: true, cmd };
}

/**
 * Format a server-to-client message envelope
 * @param {string} type
 * @param {Object} payload
 * @returns {string} JSON string
 */
export function formatServerMessage(type, payload = {}) {
  return JSON.stringify({
    t: type,
    ...payload
  });
}
