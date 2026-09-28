/**
 * Admin Controller
 * Server-side controller exposing user management and signature upload endpoints.
 * Enforces contracts per contracts/admin-contract.md
 */

const adminController = {
  /**
   * Lists all users in the system.
   * Accessible by authenticated users (for reviewer selection) and Admins.
   * @return {{success: boolean, data?: Array, error?: string, message?: string}}
   */
  listUsers() {
    try {
      const currentUser = authService.getCurrentUser();
      const users = authService.listUsers(currentUser);
      return {
        success: true,
        data: users.map(u => ({
          email: u.email,
          name: u.name,
          role: u.role,
          isActive: u.isActive,
          hasSignature: Boolean(u.signatureFileId),
          createdAt: u.createdAt
        }))
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'LIST_USERS_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Adds or updates a user (Admin only).
   * @param {Object} userData
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  upsertUser(userData) {
    try {
      const currentUser = authService.requireUser([ROLES.ADMIN]);
      const saved = authService.upsertUser(currentUser, userData);
      return {
        success: true,
        data: {
          email: saved.email,
          updated: true
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'UPSERT_USER_ERROR',
        message: err.message
      };
    }
  },

  /**
   * Uploads signature image for current user (Approver or Admin).
   * @param {string} fileBase64
   * @param {string} mimeType
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  uploadSignature(fileBase64, mimeType = 'image/png') {
    try {
      const currentUser = authService.requireUser([ROLES.APPROVER, ROLES.ADMIN]);
      const result = authService.saveSignature(currentUser, fileBase64, mimeType);
      return {
        success: true,
        data: {
          signatureFileId: result.signatureFileId,
          message: 'Tanda tangan referensi berhasil disimpan.'
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'UPLOAD_SIGNATURE_ERROR',
        message: err.message
      };
    }
  }
};

/**
 * Top-level global functions exposed to google.script.run
 */
function listUsers() {
  return adminController.listUsers();
}

function upsertUser(userData) {
  return adminController.upsertUser(userData);
}

function uploadSignature(fileBase64, mimeType) {
  return adminController.uploadSignature(fileBase64, mimeType);
}
