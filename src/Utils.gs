/**
 * Utility functions for Sistem Manajemen Surat Menyurat (Koneksi)
 */

const Utils = {
  /**
   * Generates a UUID v4 string.
   * Compatible with Google Apps Script Utilities and in-memory test environments.
   * @return {string}
   */
  generateUuid() {
    if (typeof Utilities !== 'undefined' && Utilities.getUuid) {
      return Utilities.getUuid();
    }
    // Fallback RFC4122 v4 for standalone environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Formats a date to ISO 8601 string (e.g. 2026-09-24T08:00:00.000Z).
   * @param {Date|string|number} date
   * @return {string}
   */
  formatIsoDate(date) {
    if (!date) {
      return new Date().toISOString();
    }
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  },

  /**
   * Converts 1-based month number (1-12) to Roman numeral.
   * @param {number} month
   * @return {string}
   */
  getRomanMonth(month) {
    const romanNumerals = [
      '', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
    ];
    const m = parseInt(month, 10);
    if (m >= 1 && m <= 12) {
      return romanNumerals[m];
    }
    throw new Error(`Bulan tidak valid untuk konversi romawi: ${month}. Harus antara 1 dan 12.`);
  },

  /**
   * Sanitizes file names to remove illegal characters and prevent path traversal.
   * Replaces /, \, :, *, ?, ", <, >, | with dash or underscore.
   * @param {string} fileName
   * @return {string}
   */
  sanitizeFileName(fileName) {
    if (!fileName || typeof fileName !== 'string') {
      return 'surat-naskah';
    }
    return fileName
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  },

  /**
   * Escapes strings starting with formula characters (=, +, -, @) to prevent Spreadsheet Formula Injection.
   * @param {*} value
   * @return {*}
   */
  sanitizeForSheets(value) {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0 && ['=', '+', '-', '@'].includes(trimmed.charAt(0))) {
        return "'" + trimmed;
      }
      return trimmed;
    }
    if (Array.isArray(value)) {
      return value.map(item => this.sanitizeForSheets(item));
    }
    if (typeof value === 'object') {
      const sanitized = {};
      for (const key of Object.keys(value)) {
        sanitized[key] = this.sanitizeForSheets(value[key]);
      }
      return sanitized;
    }
    return value;
  },

  /**
   * Formats official letter number: {sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}
   * Example: 0001.SP1/IX/2026
   * @param {number|string} sequence
   * @param {string} templateCode
   * @param {number} month (1-12)
   * @param {number} year
   * @return {string}
   */
  formatLetterNumber(sequence, templateCode, month, year) {
    const seqStr = String(sequence).padStart(4, '0');
    const roman = this.getRomanMonth(month);
    return `${seqStr}.${templateCode}/${roman}/${year}`;
  },

  /**
   * Parses official letter number back to components.
   * Format expected: 0001.SP1/IX/2026
   * @param {string} letterNumber
   * @return {{sequence: string, templateCode: string, romanMonth: string, year: string}|null}
   */
  parseLetterNumber(letterNumber) {
    if (!letterNumber || typeof letterNumber !== 'string') return null;
    const match = letterNumber.match(/^(\d{4})\.([A-Z0-9_-]+)\/([IVXLCDM]+)\/(\d{4})$/);
    if (!match) return null;
    return {
      sequence: match[1],
      templateCode: match[2],
      romanMonth: match[3],
      year: match[4]
    };
  }
};
