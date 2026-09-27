/**
 * Auth Controller
 * Server-side controller exposing auth endpoints to client-side google.script.run
 * Enforces contract per specs/001-manajemen-surat/contracts/auth-contract.md
 */

const authController = {
  /**
   * Retrieves active authenticated user session.
   * @return {{success: boolean, data?: Object, error?: string, message?: string}}
   */
  getCurrentUser() {
    try {
      const user = authService.getCurrentUser();
      return {
        success: true,
        data: {
          email: user.email,
          name: user.name,
          role: user.role,
          hasSignature: user.hasSignature,
          isActive: user.isActive
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err.code || 'AUTH_ERROR',
        message: err.message
      };
    }
  }
};

/**
 * Top-level function exposed to google.script.run
 */
function getCurrentUser() {
  return authController.getCurrentUser();
}
