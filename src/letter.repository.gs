/**
 * Letter Repository (Sheet: Letters)
 * Handles persistence, queries, and serialization for letter entities.
 */

const letterRepository = {
  headers: [
    'letterId',
    'letterNumber',
    'documentType',
    'templateType',
    'templateCode',
    'googleDocTemplateId',
    'contentData',
    'status',
    'drafterEmail',
    'approvalFlow',
    'signatureMethod',
    'awaitingWetSignature',
    'unsignedDriveFileId',
    'unsignedDraftBaseRevisionId',
    'reconciliationDeadline',
    'escalationSentAt',
    'cancellationReason',
    'finalPdfUrl',
    'finalFileName',
    'createdAt',
    'updatedAt'
  ],

  /**
   * Normalizes raw row from sheet into a typed Letter entity.
   * @param {Object} raw
   * @return {Object|null}
   */
  _normalize(raw) {
    if (!raw || !raw.letterId) return null;

    let contentData = {};
    if (typeof raw.contentData === 'string' && raw.contentData.trim()) {
      try {
        contentData = JSON.parse(raw.contentData);
      } catch (e) {
        contentData = {};
      }
    } else if (typeof raw.contentData === 'object' && raw.contentData !== null) {
      contentData = raw.contentData;
    }

    let approvalFlow = [];
    if (typeof raw.approvalFlow === 'string' && raw.approvalFlow.trim()) {
      try {
        approvalFlow = JSON.parse(raw.approvalFlow);
      } catch (e) {
        approvalFlow = [];
      }
    } else if (Array.isArray(raw.approvalFlow)) {
      approvalFlow = raw.approvalFlow;
    }

    return {
      letterId: String(raw.letterId).trim(),
      letterNumber: raw.letterNumber ? String(raw.letterNumber).trim() : '',
      documentType: raw.documentType ? String(raw.documentType).trim() : (typeof DOCUMENT_TYPE !== 'undefined' ? DOCUMENT_TYPE.INTERNAL : 'INTERNAL'),
      templateType: String(raw.templateType || '').trim(),
      templateCode: String(raw.templateCode || '').trim(),
      googleDocTemplateId: raw.googleDocTemplateId ? String(raw.googleDocTemplateId).trim() : '',
      contentData,
      status: String(raw.status || LETTER_STATUS.DRAFT).trim(),
      drafterEmail: String(raw.drafterEmail || '').toLowerCase().trim(),
      approvalFlow,
      signatureMethod: raw.signatureMethod ? String(raw.signatureMethod).trim() : null,
      awaitingWetSignature: raw.awaitingWetSignature === true || String(raw.awaitingWetSignature).toUpperCase() === 'TRUE',
      unsignedDriveFileId: raw.unsignedDriveFileId ? String(raw.unsignedDriveFileId).trim() : null,
      unsignedDraftBaseRevisionId: raw.unsignedDraftBaseRevisionId ? String(raw.unsignedDraftBaseRevisionId).trim() : null,
      reconciliationDeadline: raw.reconciliationDeadline ? Utils.formatIsoDate(raw.reconciliationDeadline) : null,
      escalationSentAt: raw.escalationSentAt ? Utils.formatIsoDate(raw.escalationSentAt) : null,
      cancellationReason: raw.cancellationReason ? String(raw.cancellationReason).trim() : null,
      finalPdfUrl: raw.finalPdfUrl ? String(raw.finalPdfUrl).trim() : null,
      finalFileName: raw.finalFileName ? String(raw.finalFileName).trim() : null,
      createdAt: raw.createdAt ? Utils.formatIsoDate(raw.createdAt) : Utils.formatIsoDate(new Date()),
      updatedAt: raw.updatedAt ? Utils.formatIsoDate(raw.updatedAt) : Utils.formatIsoDate(new Date())
    };
  },

  /**
   * Finds letter by letterId (UUID).
   * @param {string} letterId
   * @return {Object|null}
   */
  findById(letterId) {
    if (!letterId) return null;
    const raw = sheetRepository.findByPk(SHEET_NAMES.LETTERS, 'letterId', letterId);
    return this._normalize(raw);
  },

  /**
   * Finds letter by official letterNumber.
   * @param {string} letterNumber
   * @return {Object|null}
   */
  findByLetterNumber(letterNumber) {
    if (!letterNumber) return null;
    const all = this.listAll();
    return all.find(l => l.letterNumber === letterNumber) || null;
  },

  /**
   * Retrieves all letters.
   * @return {Array<Object>}
   */
  listAll() {
    const rawList = sheetRepository.readAll(SHEET_NAMES.LETTERS);
    return rawList.map(r => this._normalize(r)).filter(Boolean);
  },

  /**
   * Saves or updates a letter entity.
   * Serializes nested objects and updates timestamp.
   * @param {Object} letterData
   * @return {Object}
   */
  save(letterData) {
    if (!letterData || !letterData.letterId) {
      throw new Error('Data surat tidak valid: letterId wajib diisi.');
    }

    const now = Utils.formatIsoDate(new Date());
    const toSave = {
      letterId: String(letterData.letterId).trim(),
      letterNumber: letterData.letterNumber || '',
      documentType: letterData.documentType || (typeof DOCUMENT_TYPE !== 'undefined' ? DOCUMENT_TYPE.INTERNAL : 'INTERNAL'),
      templateType: letterData.templateType || '',
      templateCode: letterData.templateCode || '',
      googleDocTemplateId: letterData.googleDocTemplateId || '',
      contentData: typeof letterData.contentData === 'object'
        ? JSON.stringify(letterData.contentData)
        : letterData.contentData || '{}',
      status: letterData.status || LETTER_STATUS.DRAFT,
      drafterEmail: String(letterData.drafterEmail || '').toLowerCase().trim(),
      approvalFlow: Array.isArray(letterData.approvalFlow)
        ? JSON.stringify(letterData.approvalFlow)
        : letterData.approvalFlow || '[]',
      signatureMethod: letterData.signatureMethod || '',
      awaitingWetSignature: Boolean(letterData.awaitingWetSignature),
      unsignedDriveFileId: letterData.unsignedDriveFileId || '',
      unsignedDraftBaseRevisionId: letterData.unsignedDraftBaseRevisionId || '',
      reconciliationDeadline: letterData.reconciliationDeadline ? Utils.formatIsoDate(letterData.reconciliationDeadline) : '',
      escalationSentAt: letterData.escalationSentAt ? Utils.formatIsoDate(letterData.escalationSentAt) : '',
      cancellationReason: letterData.cancellationReason || '',
      finalPdfUrl: letterData.finalPdfUrl || '',
      finalFileName: letterData.finalFileName || '',
      createdAt: letterData.createdAt ? Utils.formatIsoDate(letterData.createdAt) : now,
      updatedAt: now
    };

    const existing = sheetRepository.findByPk(SHEET_NAMES.LETTERS, 'letterId', toSave.letterId);
    if (existing) {
      sheetRepository.updateRow(
        SHEET_NAMES.LETTERS,
        'letterId',
        toSave.letterId,
        toSave,
        this.headers
      );
    } else {
      sheetRepository.appendRow(SHEET_NAMES.LETTERS, toSave, this.headers);
    }

    return this._normalize(toSave);
  }
};
