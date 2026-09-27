/**
 * Numbering Service
 * Enforces atomic sequence generation with LockService and FIFO recycled pool allocation.
 */

const numberingService = {
  _counterRepo: counterRepository,

  /**
   * Inject mock repository for unit testing (Dependency Injection).
   * @param {Object} repo
   */
  setCounterRepository(repo) {
    this._counterRepo = repo;
  },

  /**
   * Helper to acquire script lock with 30-second timeout.
   * Gracefully handles non-GAS environments.
   * @return {Object|null}
   */
  _acquireLock() {
    if (typeof LockService !== 'undefined' && LockService.getScriptLock) {
      const lock = LockService.getScriptLock();
      const hasLock = lock.waitLock(30000);
      if (!hasLock) {
        throw new Error('Sistem sedang sibuk memproses penomoran surat lain. Silakan coba kembali dalam beberapa saat.');
      }
      return lock;
    }
    return null;
  },

  /**
   * Allocates an official letter number atomically.
   * Checks the recycled pool first (FIFO); if empty, increments currentSequence.
   * @param {string} templateCode e.g. "SP1"
   * @param {number} [month] 1-12 (defaults to current month)
   * @param {number} [year] e.g. 2026 (defaults to current year)
   * @return {{sequenceNumber: string, formattedNumber: string, isRecycled: boolean, templateCode: string, month: number, year: number}}
   */
  allocateNumber(templateCode, month, year) {
    if (!templateCode) {
      throw new Error('Kode template wajib diisi untuk penomoran surat.');
    }

    const now = new Date();
    const targetMonth = month ? parseInt(month, 10) : now.getMonth() + 1;
    const targetYear = year ? parseInt(year, 10) : now.getFullYear();

    const lock = this._acquireLock();
    try {
      let counter = this._counterRepo.getCounter(templateCode, targetMonth, targetYear);
      if (!counter) {
        counter = {
          counterId: `${templateCode}_${String(targetMonth).padStart(2, '0')}_${targetYear}`,
          templateCode,
          month: targetMonth,
          year: targetYear,
          currentSequence: 0,
          recycledNumbers: []
        };
      }

      let sequenceNumber = '';
      let isRecycled = false;

      // Rule #5: Prioritas antrean nomor daur ulang (FIFO)
      if (Array.isArray(counter.recycledNumbers) && counter.recycledNumbers.length > 0) {
        sequenceNumber = String(counter.recycledNumbers.shift()).padStart(4, '0');
        isRecycled = true;
      } else {
        counter.currentSequence = (counter.currentSequence || 0) + 1;
        sequenceNumber = String(counter.currentSequence).padStart(4, '0');
        isRecycled = false;
      }

      // Simpan pembaruan counter
      this._counterRepo.saveCounter(counter);

      const formattedNumber = Utils.formatLetterNumber(sequenceNumber, templateCode, targetMonth, targetYear);

      return {
        sequenceNumber,
        formattedNumber,
        isRecycled,
        templateCode,
        month: targetMonth,
        year: targetYear
      };
    } finally {
      if (lock && lock.releaseLock) {
        lock.releaseLock();
      }
    }
  },

  /**
   * Releases a rejected letter number back to the recycled pool.
   * @param {string} templateCode
   * @param {number} month
   * @param {number} year
   * @param {string} sequenceNumber (e.g. "0001" or full "0001.SP1/IX/2026")
   * @return {Object} updated counter
   */
  releaseNumber(templateCode, month, year, sequenceNumber) {
    if (!templateCode || !sequenceNumber) {
      throw new Error('Parameter templateCode dan sequenceNumber wajib diisi untuk merilis nomor.');
    }

    let seqStr = sequenceNumber;
    // Jika format lengkap diberikan, ekstrak sequence
    if (seqStr.includes('.') || seqStr.includes('/')) {
      const parsed = Utils.parseLetterNumber(seqStr);
      if (parsed) {
        seqStr = parsed.sequence;
      }
    }
    const cleanSeq = String(seqStr).padStart(4, '0');

    const lock = this._acquireLock();
    try {
      return this._counterRepo.addRecycledNumber(templateCode, month, year, cleanSeq);
    } finally {
      if (lock && lock.releaseLock) {
        lock.releaseLock();
      }
    }
  }
};
