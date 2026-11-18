/**
 * Sanitizer: String cleaning and SSML XML escaping for TTS and DOM safety.
 */
export class Sanitizer {
  /**
   * Escape XML/SSML characters: <, >, &, ', "
   * @param {string} str
   * @returns {string}
   */
  static escapeXml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  /**
   * Clean string by removing non-printable/control characters and trimming to maxLength.
   * @param {string} str
   * @param {number} [maxLength=120]
   * @returns {string}
   */
  static cleanString(str, maxLength = 120) {
    if (typeof str !== 'string') return '';
    let sanitized = str.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.slice(0, maxLength).trim();
    }
    return sanitized;
  }
}

export default Sanitizer;
