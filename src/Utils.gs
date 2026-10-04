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
  },

  /**
   * Converts Roman numeral month to integer (1-12).
   * @param {string} roman
   * @return {number}
   */
  getMonthFromRoman(roman) {
    const map = {
      'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6,
      'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10, 'XI': 11, 'XII': 12
    };
    const m = map[(roman || '').toUpperCase().trim()];
    if (!m) {
      throw new Error(`Angka romawi bulan tidak valid: ${roman}`);
    }
    return m;
  },

  /**
   * Calculates calendar day difference between two dates (toDate - fromDate).
   * @param {Date|string} fromDate
   * @param {Date|string} toDate
   * @return {number}
   */
  calculateCalendarDaysDiff(fromDate, toDate) {
    const f = fromDate instanceof Date ? fromDate : new Date(fromDate);
    const t = toDate instanceof Date ? toDate : new Date(toDate);
    const utc1 = Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());
    const utc2 = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  },

  /**
   * Adds calendar days to an ISO date and returns new ISO 8601 string.
   * @param {string|Date} isoDate
   * @param {number} days
   * @return {string}
   */
  addCalendarDaysIso(isoDate, days) {
    const d = isoDate instanceof Date ? new Date(isoDate.getTime()) : new Date(isoDate || new Date());
    d.setDate(d.getDate() + days);
    return d.toISOString();
  },

  /**
   * Strict current date validator. Ensures dateString matches today's date formatted as YYYY-MM-DD.
   * Prevents backdating and forward dating.
   * @param {string} dateString
   * @param {Date} [referenceDate] Optional reference date for testing
   * @return {boolean}
   */
  isTodayDate(dateString, referenceDate) {
    if (!dateString || typeof dateString !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString.trim())) return false;
    const now = referenceDate instanceof Date ? referenceDate : new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    return dateString.trim() === todayStr;
  },

  /**
   * Parses official letter number and extracts sequence integer, templateCode, romanMonth, month integer, and year integer.
   * Example: '0005.ST/IX/2026' -> { sequence: 5, sequenceStr: '0005', templateCode: 'ST', romanMonth: 'IX', month: 9, year: 2026 }
   * @param {string} letterNumber
   * @return {{sequence: number, sequenceStr: string, templateCode: string, romanMonth: string, month: number, year: number}|null}
   */
  parseLetterNumberParts(letterNumber) {
    const parsed = this.parseLetterNumber(letterNumber);
    if (!parsed) return null;
    return {
      sequence: parseInt(parsed.sequence, 10),
      sequenceStr: parsed.sequence,
      templateCode: parsed.templateCode,
      romanMonth: parsed.romanMonth,
      month: this.getMonthFromRoman(parsed.romanMonth),
      year: parseInt(parsed.year, 10)
    };
  }
};
