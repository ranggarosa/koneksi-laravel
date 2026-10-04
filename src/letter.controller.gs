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
  },

  /**
   * Submits a new take-number request for external letters.
   * @param {Object} payload
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  submitTakeNumberRequest(payload) {
    try {
      const currentUser = authService.requireUser([ROLES.DRAFTER, ROLES.ADMIN]);
      const result = letterService.submitTakeNumberRequest(currentUser, payload);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'SUBMIT_TAKE_NUMBER_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Cancels a pending take-number request by Drafter.
   * @param {string} letterId
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  cancelTakeNumberByDrafter(letterId) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.cancelTakeNumberByDrafter(currentUser, letterId);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'CANCEL_DRAFTER_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Approves an external take-number request.
   * @param {string} letterId
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  approveTakeNumberRequest(letterId) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.approveTakeNumberRequest(currentUser, letterId);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'APPROVE_TAKE_NUMBER_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Rejects an external take-number request with mandatory reason.
   * @param {string} letterId
   * @param {string} reason
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  rejectTakeNumberRequest(letterId, reason) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.rejectTakeNumberRequest(currentUser, letterId, reason);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'REJECT_TAKE_NUMBER_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Uploads final signed scan PDF for an external take-number letter.
   * @param {string} letterId
   * @param {{fileName: string, mimeType: string, base64: string}} fileData
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  uploadTakeNumberScan(letterId, fileData) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.uploadTakeNumberScan(currentUser, letterId, fileData);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'UPLOAD_TAKE_NUMBER_SCAN_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Allows Admin to replace the final scan PDF on an Approved external letter.
   * @param {string} letterId
   * @param {{fileName: string, mimeType: string, base64: string}} fileData
   * @param {string} reason
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  replaceTakeNumberScanAsAdmin(letterId, fileData, reason) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.replaceTakeNumberScanAsAdmin(currentUser, letterId, fileData, reason);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'REPLACE_SCAN_ADMIN_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Manually cancels an external take-number request in 'Pending Upload' status.
   * @param {string} letterId
   * @param {string} reason
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  cancelTakeNumberManual(letterId, reason) {
    try {
      const currentUser = authService.getCurrentUser();
      const result = letterService.cancelTakeNumberManual(currentUser, letterId, reason);
      return {
        success: true,
        data: result
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'CANCEL_TAKE_NUMBER_MANUAL_ERROR',
        message: err.message
      };
    }
  },

  /**
   * System trigger handler for daily reconciliation audit.
   * @return {{success: boolean, stats?: Object, error?: string, message?: string}}
   */
  runDailyReconciliationAudit() {
    try {
      const stats = scheduleService.auditPendingReconciliations();
      return {
        success: true,
        stats: stats
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'RECONCILIATION_AUDIT_ERROR',
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

function submitTakeNumberRequest(payload) {
  return letterController.submitTakeNumberRequest(payload);
}

function cancelTakeNumberByDrafter(letterId) {
  return letterController.cancelTakeNumberByDrafter(letterId);
}

function approveTakeNumberRequest(letterId) {
  return letterController.approveTakeNumberRequest(letterId);
}

function rejectTakeNumberRequest(letterId, reason) {
  return letterController.rejectTakeNumberRequest(letterId, reason);
}

function uploadTakeNumberScan(letterId, fileData) {
  return letterController.uploadTakeNumberScan(letterId, fileData);
}

function replaceTakeNumberScanAsAdmin(letterId, fileData, reason) {
  return letterController.replaceTakeNumberScanAsAdmin(letterId, fileData, reason);
}

function cancelTakeNumberManual(letterId, reason) {
  return letterController.cancelTakeNumberManual(letterId, reason);
}

function runDailyReconciliationAudit() {
  return letterController.runDailyReconciliationAudit();
}
