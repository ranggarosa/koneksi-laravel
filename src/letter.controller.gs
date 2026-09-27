/**
 * Letter Controller
 * Server-side controller exposing letter workflow endpoints to client-side google.script.run
 * Enforces server-side authentication guards and contracts per contracts/letter-contract.md
 */

const letterController = {
  /**
   * Submits a new letter draft and issues atomic letter number.
   * @param {Object} formData
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  submitDraft(formData) {
    try {
      const currentUser = authService.requireUser([ROLES.DRAFTER, ROLES.ADMIN]);
      const result = letterService.submitDraft(currentUser, formData);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'SUBMIT_DRAFT_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Retrieves filtered list of letters for dashboard.
   * @param {'my_turn'|'my_drafts'|'all_approved'|'all'} filterType
   * @return {{success: boolean, data?: Array, error?: string, message?: string}}
   */
  getLettersForUser(filterType = 'my_turn') {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.getLettersForUser(currentUser, filterType);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'GET_LETTERS_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Retrieves letter detail along with approval flow and audit logs.
   * @param {string} letterId
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  getLetterDetail(letterId) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.getLetterDetail(currentUser, letterId);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'GET_DETAIL_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Processes approval decision (approve or reject) by the current active reviewer/approver.
   * @param {string} letterId
   * @param {'approve'|'reject'} decision
   * @param {string} notes
   * @param {'digital'|'wet'} [signatureMethod]
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  decide(letterId, decision, notes = '', signatureMethod = null) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.decide(currentUser, letterId, decision, notes, signatureMethod);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'DECIDE_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Uploads wet signature scan and finalizes the letter.
   * @param {string} letterId
   * @param {string} fileBase64
   * @param {string} mimeType
   * @param {string} fileName
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  uploadWetSignatureScan(letterId, fileBase64, mimeType, fileName) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.uploadWetSignatureScan(currentUser, letterId, fileBase64, mimeType, fileName);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'UPLOAD_SCAN_ERROR',
        message: err.message
      };
    }
  }
};

/**
 * Top-level global functions exposed to google.script.run
 */
function submitDraft(formData) {
  return letterController.submitDraft(formData);
}

function getLettersForUser(filterType) {
  return letterController.getLettersForUser(filterType);
}

function getLetterDetail(letterId) {
  return letterController.getLetterDetail(letterId);
}

function decide(letterId, decision, notes, signatureMethod) {
  return letterController.decide(letterId, decision, notes, signatureMethod);
}

function uploadWetSignatureScan(letterId, fileBase64, mimeType, fileName) {
  return letterController.uploadWetSignatureScan(letterId, fileBase64, mimeType, fileName);
}
