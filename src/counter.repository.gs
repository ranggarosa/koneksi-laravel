/**
 * Counter Repository (Sheet: Counters)
 * Manages atomic numbering sequences and recycled numbers pool.
 */

const counterRepository = {
  headers: ['counterId', 'templateCode', 'month', 'year', 'currentSequence', 'recycledNumbers'],

  /**
   * Generates standard counter ID: {templateCode}_{month:02d}_{year}
   * @param {string} templateCode
   * @param {number|string} month
   * @param {number|string} year
   * @return {string}
   */
  buildCounterId(templateCode, month, year) {
    const m = String(month).padStart(2, '0');
    return `${templateCode}_${m}_${year}`;
  },

  /**
   * Normalizes counter raw row from spreadsheet.
   * @param {Object} raw
   * @return {Object|null}
   */
  _normalize(raw) {
    if (!raw || !raw.counterId) return null;

    let recycled = [];
    if (Array.isArray(raw.recycledNumbers)) {
      recycled = raw.recycledNumbers;
    } else if (typeof raw.recycledNumbers === 'string' && raw.recycledNumbers.trim()) {
      try {
        recycled = JSON.parse(raw.recycledNumbers);
      } catch (e) {
        recycled = [];
      }
    }

    return {
      counterId: String(raw.counterId).trim(),
      templateCode: String(raw.templateCode || '').trim(),
      month: parseInt(raw.month, 10),
      year: parseInt(raw.year, 10),
      currentSequence: parseInt(raw.currentSequence, 10) || 0,
      recycledNumbers: Array.isArray(recycled) ? recycled : []
    };
  },

  /**
   * Retrieves counter by templateCode, month, and year.
   * @param {string} templateCode
   * @param {number} month (1-12)
   * @param {number} year
   * @return {Object|null}
   */
  getCounter(templateCode, month, year) {
    const counterId = this.buildCounterId(templateCode, month, year);
    const raw = sheetRepository.findByPk(SHEET_NAMES.COUNTERS, 'counterId', counterId);
    return this._normalize(raw);
  },

  /**
   * Saves or updates a counter record.
   * @param {Object} counterData
   * @return {Object}
   */
  saveCounter(counterData) {
    const counterId = counterData.counterId || this.buildCounterId(counterData.templateCode, counterData.month, counterData.year);
    const toSave = {
      counterId,
      templateCode: counterData.templateCode,
      month: parseInt(counterData.month, 10),
      year: parseInt(counterData.year, 10),
      currentSequence: parseInt(counterData.currentSequence, 10) || 0,
      recycledNumbers: Array.isArray(counterData.recycledNumbers)
        ? JSON.stringify(counterData.recycledNumbers)
        : counterData.recycledNumbers || '[]'
    };

    const existing = sheetRepository.findByPk(SHEET_NAMES.COUNTERS, 'counterId', counterId);
    if (existing) {
      sheetRepository.updateRow(
        SHEET_NAMES.COUNTERS,
        'counterId',
        counterId,
        toSave,
        this.headers
      );
    } else {
      sheetRepository.appendRow(SHEET_NAMES.COUNTERS, toSave, this.headers);
    }

    return this._normalize(toSave);
  },

  /**
   * Adds a rejected letter's sequence number to the recycled pool (recycledNumbers array).
   * @param {string} templateCode
   * @param {number} month
   * @param {number} year
   * @param {string} sequenceNumberStr (e.g. "0001")
   * @return {Object} updated counter
   */
  addRecycledNumber(templateCode, month, year, sequenceNumberStr) {
    let counter = this.getCounter(templateCode, month, year);
    if (!counter) {
      counter = {
        counterId: this.buildCounterId(templateCode, month, year),
        templateCode,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        currentSequence: 0,
        recycledNumbers: []
      };
    }

    const seqPadded = String(sequenceNumberStr).padStart(4, '0');
    if (!counter.recycledNumbers.includes(seqPadded)) {
      counter.recycledNumbers.push(seqPadded);
    }

    return this.saveCounter(counter);
  }
};
