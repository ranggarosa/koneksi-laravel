/**
 * User Repository (Sheet: Users)
 * Handles persistence and queries for whitelisted application users.
 */

const userRepository = {
  headers: ['email', 'name', 'role', 'signatureFileId', 'isActive', 'createdAt'],

  /**
   * Normalizes a raw row object from sheet into a typed User entity.
   * @param {Object} raw
   * @return {Object|null}
   */
  _normalize(raw) {
    if (!raw || !raw.email) return null;
    return {
      email: String(raw.email).toLowerCase().trim(),
      name: String(raw.name || '').trim(),
      role: String(raw.role || ROLES.DRAFTER).toLowerCase().trim(),
      signatureFileId: raw.signatureFileId ? String(raw.signatureFileId).trim() : null,
      isActive: raw.isActive === true || String(raw.isActive).toUpperCase() === 'TRUE',
      createdAt: raw.createdAt ? Utils.formatIsoDate(raw.createdAt) : Utils.formatIsoDate(new Date())
    };
  },

  /**
   * Finds a user by email address (case-insensitive).
   * @param {string} email
   * @return {Object|null}
   */
  findByEmail(email) {
    if (!email) return null;
    const norm = String(email).toLowerCase().trim();
    const all = this.listAll();
    return all.find(u => u.email === norm) || null;
  },

  /**
   * Lists all users in the system.
   * @return {Array<Object>}
   */
  listAll() {
    const rawList = sheetRepository.readAll(SHEET_NAMES.USERS);
    return rawList.map(r => this._normalize(r)).filter(Boolean);
  },

  /**
   * Saves or updates a user.
   * @param {Object} userData
   * @return {Object}
   */
  save(userData) {
    if (!userData || !userData.email) {
      throw new Error('Data pengguna tidak valid: email wajib diisi.');
    }
    const normalized = {
      email: String(userData.email).toLowerCase().trim(),
      name: String(userData.name || '').trim(),
      role: String(userData.role || ROLES.DRAFTER).toLowerCase().trim(),
      signatureFileId: userData.signatureFileId ? String(userData.signatureFileId).trim() : '',
      isActive: userData.isActive !== undefined ? Boolean(userData.isActive) : true,
      createdAt: userData.createdAt ? Utils.formatIsoDate(userData.createdAt) : Utils.formatIsoDate(new Date())
    };

    const existing = this.findByEmail(normalized.email);
    if (existing) {
      sheetRepository.updateRow(
        SHEET_NAMES.USERS,
        'email',
        normalized.email,
        normalized,
        this.headers
      );
    } else {
      sheetRepository.appendRow(SHEET_NAMES.USERS, normalized, this.headers);
    }
    return normalized;
  },

  /**
   * Updates an approver's digital signature file ID.
   * @param {string} email
   * @param {string} signatureFileId
   * @return {boolean}
   */
  updateSignature(email, signatureFileId) {
    if (!email) return false;
    const norm = String(email).toLowerCase().trim();
    return sheetRepository.updateRow(
      SHEET_NAMES.USERS,
      'email',
      norm,
      { signatureFileId: signatureFileId || '' },
      this.headers
    );
  }
};
