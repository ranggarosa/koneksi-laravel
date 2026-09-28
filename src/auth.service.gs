/**
 * Auth Service
 * Enforces server-side whitelist authentication, role checks, and user management.
 */

const authService = {
  _injectedUserRepo: null,

  get _userRepo() {
    return this._injectedUserRepo || (typeof userRepository !== 'undefined' ? userRepository : null);
  },
  set _userRepo(repo) {
    this._injectedUserRepo = repo;
  },

  _overrideEmail: null,

  /**
   * Allows injecting mock repository for testing (Dependency Injection).
   */
  setUserRepository(repo) {
    this._injectedUserRepo = repo;
  },

  /**
   * Sets test override email for session testing.
   */
  setOverrideEmail(email) {
    this._overrideEmail = email;
  },

  /**
   * Gets active session email from Google Apps Script Session.
   * @return {string}
   */
  getSessionEmail() {
    if (this._overrideEmail) {
      return this._overrideEmail;
    }
    try {
      if (typeof Session !== 'undefined' && Session.getActiveUser) {
        return (Session.getActiveUser().getEmail() || '').toLowerCase().trim();
      }
    } catch (e) {
      // In webapp if not logged in or permission issue
    }
    return '';
  },

  /**
   * Retrieves and verifies the currently authenticated user against whitelist.
   * @param {string} [explicitEmail] optional email for testing
   * @return {{email: string, name: string, role: string, hasSignature: boolean, isActive: boolean, signatureFileId: string|null}}
   */
  getCurrentUser(explicitEmail) {
    const email = explicitEmail !== undefined ? (explicitEmail || '').toLowerCase().trim() : this.getSessionEmail();

    if (!email) {
      const err = new Error('Sesi akun Google aktif tidak terdeteksi. Silakan login ke akun Google Anda.');
      err.code = 'SESSION_NOT_DETECTED';
      throw err;
    }

    const user = this._userRepo.findByEmail(email);
    if (!user) {
      const err = new Error(`Akun '${email}' belum terdaftar di whitelist sistem. Hubungi Administrator.`);
      err.code = 'NOT_WHITELISTED';
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Akun Anda telah dinonaktifkan oleh Administrator.');
      err.code = 'ACCOUNT_DEACTIVATED';
      throw err;
    }

    return {
      email: user.email,
      name: user.name,
      role: user.role,
      hasSignature: Boolean(user.signatureFileId),
      signatureFileId: user.signatureFileId || null,
      isActive: user.isActive
    };
  },

  /**
   * Server-side guard requiring an active user with specific role(s).
   * @param {string[]} allowedRoles
   * @param {string} [explicitEmail]
   * @return {Object} authenticated user
   */
  requireUser(allowedRoles = [], explicitEmail) {
    const user = this.getCurrentUser(explicitEmail);
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(user.role)) {
        const err = new Error(`Akses ditolak: wewenang peran '${user.role}' tidak mencukupi untuk tindakan ini.`);
        err.code = 'UNAUTHORIZED_ROLE';
        throw err;
      }
    }
    return user;
  },

  /**
   * Lists all users (Admin only or for reviewer selection by Drafter).
   * @param {Object} requestingUser
   * @return {Array<Object>}
   */
  listUsers(requestingUser) {
    if (!requestingUser || !requestingUser.email) {
      throw new Error('Pengguna tidak terautentikasi.');
    }
    return this._userRepo.listAll();
  },

  /**
   * Saves or updates a user (Admin only).
   * @param {Object} requestingUser
   * @param {Object} userData
   * @return {Object}
   */
  upsertUser(requestingUser, userData) {
    if (requestingUser.role !== ROLES.ADMIN) {
      const err = new Error('Hanya Administrator yang memiliki wewenang mengelola pengguna.');
      err.code = 'UNAUTHORIZED_ROLE';
      throw err;
    }
    return this._userRepo.save(userData);
  },

  /**
   * Saves signature image to Signatures folder in Google Drive and updates user's signatureFileId.
   * @param {Object} requestingUser
   * @param {string} fileBase64
   * @param {string} mimeType
   * @return {{signatureFileId: string}}
   */
  saveSignature(requestingUser, fileBase64, mimeType = 'image/png') {
    if (requestingUser.role !== ROLES.APPROVER && requestingUser.role !== ROLES.ADMIN) {
      const err = new Error('Hanya Approver atau Admin yang dapat mengunggah tanda tangan referensi.');
      err.code = 'UNAUTHORIZED_ROLE';
      throw err;
    }

    let folderId = null;
    try {
      if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
        folderId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SIGNATURES_FOLDER_ID);
      }
    } catch (e) {
      // Mock / test environment
    }

    let fileId = `mock-sig-${Date.now()}`;

    if (typeof Utilities !== 'undefined' && Utilities.base64Decode && typeof DriveApp !== 'undefined') {
      const decodedBytes = Utilities.base64Decode(fileBase64);
      const fileName = `${requestingUser.email}_signature.png`;
      const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);

      let folder;
      if (folderId) {
        folder = DriveApp.getFolderById(folderId);
      } else {
        folder = DriveApp.getRootFolder();
      }
      const file = folder.createFile(blob);
      fileId = file.getId();
    }

    this._userRepo.updateSignature(requestingUser.email, fileId);
    return { signatureFileId: fileId };
  }
};
