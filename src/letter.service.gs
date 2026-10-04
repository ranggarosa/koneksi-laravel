/**
 * Letter Service
 * Core business logic for letter drafting, approval workflows, document finalization, and privacy filtering.
 */

const letterService = {
  _injectedLetterRepo: null,
  _injectedNumberingService: null,
  _injectedUserRepo: null,
  _injectedAuditLogRepo: null,
  _injectedNotificationService: null,
  _injectedDocumentService: null,
  _injectedCounterRepo: null,

  get _letterRepo() {
    return this._injectedLetterRepo || (typeof letterRepository !== 'undefined' ? letterRepository : null);
  },
  set _letterRepo(repo) { this._injectedLetterRepo = repo; },

  get _counterRepo() {
    return this._injectedCounterRepo || (typeof counterRepository !== 'undefined' ? counterRepository : null);
  },
  set _counterRepo(repo) { this._injectedCounterRepo = repo; },

  get _numberingService() {
    return this._injectedNumberingService || (typeof numberingService !== 'undefined' ? numberingService : null);
  },
  set _numberingService(svc) { this._injectedNumberingService = svc; },

  get _userRepo() {
    return this._injectedUserRepo || (typeof userRepository !== 'undefined' ? userRepository : null);
  },
  set _userRepo(repo) { this._injectedUserRepo = repo; },

  get _auditLogRepo() {
    return this._injectedAuditLogRepo || (typeof auditLogRepository !== 'undefined' ? auditLogRepository : null);
  },
  set _auditLogRepo(repo) { this._injectedAuditLogRepo = repo; },

  setLetterRepository(repo) { this._injectedLetterRepo = repo; },
  setCounterRepository(repo) { this._injectedCounterRepo = repo; },
  setNumberingService(svc) { this._injectedNumberingService = svc; },
  setUserRepository(repo) { this._injectedUserRepo = repo; },
  setAuditLogRepository(repo) { this._injectedAuditLogRepo = repo; },
  setNotificationService(svc) { this._injectedNotificationService = svc; },
  setDocumentService(svc) { this._injectedDocumentService = svc; },

  _getNotificationService() {
    return this._injectedNotificationService || (typeof notificationService !== 'undefined' ? notificationService : null);
  },

  _getDocumentService() {
    return this._injectedDocumentService || (typeof documentService !== 'undefined' ? documentService : null);
  },

  /**
   * Submits a new letter draft and assigns official atomic letter number.
   * Enforces self-approval prevention (U1): Drafter cannot be reviewer or approver.
   * @param {Object} currentUser
   * @param {Object} formData
   * @return {Object}
   */
  submitDraft(currentUser, formData) {
    if (!currentUser || !currentUser.email) {
      throw new Error('Pengguna tidak terautentikasi.');
    }
    if (currentUser.role !== ROLES.DRAFTER && currentUser.role !== ROLES.ADMIN) {
      const err = new Error('Hanya Drafter atau Admin yang memiliki hak membuat draf surat.');
      err.code = 'UNAUTHORIZED_ROLE';
      throw err;
    }

    if (!formData || !formData.templateCode || !formData.templateType) {
      throw new Error('Data draf surat tidak lengkap: templateCode dan templateType wajib diisi.');
    }

    if (!formData.approver || !formData.approver.email) {
      throw new Error('Approver akhir wajib ditentukan.');
    }

    const drafterEmail = currentUser.email.toLowerCase().trim();
    const approverEmail = formData.approver.email.toLowerCase().trim();

    // U1 Remediation: Drafter dilarang menunjuk diri sendiri sebagai Approver
    if (approverEmail === drafterEmail) {
      const err = new Error('Pembuat surat (Drafter) dilarang menunjuk dirinya sendiri sebagai Approver pada drafnya sendiri.');
      err.code = 'SELF_APPROVAL_PROHIBITED';
      throw err;
    }

    // Validasi Approver di whitelist
    const approverUser = this._userRepo.findByEmail(approverEmail);
    if (!approverUser || !approverUser.isActive) {
      throw new Error(`Approver '${approverEmail}' tidak terdaftar atau tidak aktif di sistem.`);
    }

    // Susun alur review
    const reviewers = Array.isArray(formData.reviewers) ? formData.reviewers : [];
    const approvalFlow = [];
    let orderIndex = 1;

    for (const rev of reviewers) {
      if (!rev || !rev.email) continue;
      const revEmail = rev.email.toLowerCase().trim();

      // U1 Remediation: Drafter dilarang menunjuk diri sendiri sebagai Reviewer
      if (revEmail === drafterEmail) {
        const err = new Error('Pembuat surat (Drafter) dilarang menunjuk dirinya sendiri sebagai Reviewer pada drafnya sendiri.');
        err.code = 'SELF_APPROVAL_PROHIBITED';
        throw err;
      }

      // Validasi Reviewer di whitelist
      const revUser = this._userRepo.findByEmail(revEmail);
      if (!revUser || !revUser.isActive) {
        throw new Error(`Reviewer '${revEmail}' tidak terdaftar atau tidak aktif di sistem.`);
      }

      approvalFlow.push({
        order: orderIndex++,
        email: revEmail,
        name: revUser.name || rev.name || revEmail,
        role: ROLES.REVIEWER,
        status: FLOW_STATUS.PENDING,
        decisionAt: null,
        notes: ''
      });
    }

    // Tambahkan Approver sebagai tahap akhir
    approvalFlow.push({
      order: orderIndex,
      email: approverEmail,
      name: approverUser.name || formData.approver.name || approverEmail,
      role: ROLES.APPROVER,
      status: FLOW_STATUS.PENDING,
      decisionAt: null,
      notes: ''
    });

    // Sanitasi isian formulir
    const sanitizedContent = Utils.sanitizeForSheets(formData.contentData || {});

    // Alokasikan nomor surat atomik
    const now = new Date();
    const allocated = this._numberingService.allocateNumber(
      formData.templateCode,
      now.getMonth() + 1,
      now.getFullYear()
    );

    const letterId = Utils.generateUuid();
    const letter = {
      letterId,
      letterNumber: allocated.formattedNumber,
      templateType: formData.templateType,
      templateCode: formData.templateCode,
      googleDocTemplateId: formData.googleDocTemplateId || '',
      contentData: sanitizedContent,
      status: LETTER_STATUS.IN_REVIEW,
      drafterEmail,
      approvalFlow,
      signatureMethod: null,
      awaitingWetSignature: false,
      unsignedDriveFileId: null,
      unsignedDraftBaseRevisionId: null,
      finalPdfUrl: null,
      finalFileName: null,
      createdAt: Utils.formatIsoDate(now),
      updatedAt: Utils.formatIsoDate(now)
    };

    const saved = this._letterRepo.save(letter);

    // Audit log
    this._auditLogRepo.logAction(
      letterId,
      drafterEmail,
      AUDIT_ACTION.SUBMIT_DRAFT,
      `Draf surat diajukan dengan nomor ${allocated.formattedNumber}`
    );

    // Kirim notifikasi email ke peninjau pertama
    const firstReviewer = approvalFlow[0];
    const notifSvc = this._getNotificationService();
    if (notifSvc && notifSvc.sendReviewerTurnNotification) {
      try {
        notifSvc.sendReviewerTurnNotification(saved, firstReviewer);
      } catch (e) {
        console.warn('Gagal mengirim notifikasi email peninjau:', e);
      }
    }

    return {
      letterId: saved.letterId,
      letterNumber: saved.letterNumber,
      status: saved.status,
      currentReviewer: firstReviewer.email
    };
  },

  /**
   * Retrieves active turn reviewer item in approvalFlow.
   * @param {Array<Object>} approvalFlow
   * @return {Object|null}
   */
  getActiveTurn(approvalFlow) {
    if (!Array.isArray(approvalFlow)) return null;
    return approvalFlow.find(item => item.status === FLOW_STATUS.PENDING) || null;
  },

  /**
   * Verifies read permission for letter per privacy requirements:
   * In-review drafts are only accessible by participants (drafter, reviewers, approver) & Admin.
   * Approved letters are open archive to any whitelisted user.
   * @param {Object} currentUser
   * @param {Object} letter
   * @return {boolean}
   */
  canUserViewLetter(currentUser, letter) {
    if (!currentUser || !letter) return false;
    if (currentUser.role === ROLES.ADMIN) return true;
    if (letter.status === LETTER_STATUS.APPROVED) return true;

    const userEmail = currentUser.email.toLowerCase().trim();
    if (letter.drafterEmail.toLowerCase().trim() === userEmail) return true;

    if (Array.isArray(letter.approvalFlow)) {
      return letter.approvalFlow.some(item => item.email.toLowerCase().trim() === userEmail);
    }
    return false;
  },

  /**
   * Retrieves letter detail along with approval status and audit logs.
   * @param {Object} currentUser
   * @param {string} letterId
   * @return {Object}
   */
  getLetterDetail(currentUser, letterId) {
    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error(`Surat dengan ID '${letterId}' tidak ditemukan.`);
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!this.canUserViewLetter(currentUser, letter)) {
      const err = new Error('Akses ditolak: Anda tidak memiliki wewenang melihat draf surat internal ini.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    const activeTurn = this.getActiveTurn(letter.approvalFlow);
    const userEmail = currentUser.email.toLowerCase().trim();
    const canAct = Boolean(
      activeTurn &&
      activeTurn.email.toLowerCase().trim() === userEmail &&
      letter.status === LETTER_STATUS.IN_REVIEW
    );
    const isFinalApprover = Boolean(activeTurn && activeTurn.role === ROLES.APPROVER);

    const logs = this._auditLogRepo.getLogsForLetter(letterId);

    return {
      letterId: letter.letterId,
      letterNumber: letter.letterNumber,
      documentType: letter.documentType || DOCUMENT_TYPE.INTERNAL,
      templateType: letter.templateType,
      templateCode: letter.templateCode,
      contentData: letter.contentData,
      status: letter.status,
      drafterEmail: letter.drafterEmail,
      approvalFlow: letter.approvalFlow,
      canAct,
      isFinalApprover,
      awaitingWetSignature: letter.awaitingWetSignature,
      unsignedDriveFileId: letter.unsignedDriveFileId,
      reconciliationDeadline: letter.reconciliationDeadline || null,
      escalationSentAt: letter.escalationSentAt || null,
      cancellationReason: letter.cancellationReason || null,
      finalPdfUrl: letter.finalPdfUrl,
      finalFileName: letter.finalFileName,
      createdAt: letter.createdAt,
      updatedAt: letter.updatedAt,
      auditLogs: logs
    };
  },

  /**
   * Processes approval decision (Approve or Reject) by the current active reviewer/approver.
   * @param {Object} currentUser
   * @param {string} letterId
   * @param {'approve'|'reject'} decision
   * @param {string} notes
   * @param {'digital'|'wet'} [signatureMethod] required for final approver
   * @return {Object}
   */
  decide(currentUser, letterId, decision, notes = '', signatureMethod = null) {
    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      throw new Error(`Surat dengan ID '${letterId}' tidak ditemukan.`);
    }

    if (letter.status === LETTER_STATUS.REJECTED) {
      throw new Error('Draf surat ini telah ditolak dan diarsipkan permanen. Tidak dapat diproses lebih lanjut.');
    }
    if (letter.status === LETTER_STATUS.APPROVED) {
      throw new Error('Surat ini telah disetujui secara final.');
    }

    const activeTurn = this.getActiveTurn(letter.approvalFlow);
    if (!activeTurn) {
      throw new Error('Tidak ada giliran peninjauan aktif pada surat ini.');
    }

    const userEmail = currentUser.email.toLowerCase().trim();
    if (activeTurn.email.toLowerCase().trim() !== userEmail) {
      const err = new Error(`Akses ditolak: Saat ini adalah giliran '${activeTurn.email}', bukan '${userEmail}'.`);
      err.code = 'NOT_YOUR_TURN';
      throw err;
    }

    const sanitizedNotes = Utils.sanitizeForSheets(notes || '');

    // KASUS PENOLAKAN (REJECT)
    if (decision === 'reject') {
      activeTurn.status = FLOW_STATUS.REJECTED;
      activeTurn.decisionAt = Utils.formatIsoDate(new Date());
      activeTurn.notes = sanitizedNotes;

      letter.status = LETTER_STATUS.REJECTED;
      this._letterRepo.save(letter);

      // Audit Log
      this._auditLogRepo.logAction(letterId, userEmail, AUDIT_ACTION.REJECT, sanitizedNotes);

      // Rule #5: Rilis nomor surat kembali ke recycled pool
      const parsed = Utils.parseLetterNumber(letter.letterNumber);
      if (parsed) {
        this._numberingService.releaseNumber(
          letter.templateCode,
          new Date(letter.createdAt).getMonth() + 1,
          new Date(letter.createdAt).getFullYear(),
          parsed.sequence
        );
      }

      // Notifikasi ke Drafter
      const notifSvc = this._getNotificationService();
      if (notifSvc && notifSvc.sendRejectionNotification) {
        try {
          notifSvc.sendRejectionNotification(letter, letter.drafterEmail, sanitizedNotes);
        } catch (e) {
          console.warn('Gagal mengirim email penolakan:', e);
        }
      }

      return {
        letterId: letter.letterId,
        status: LETTER_STATUS.REJECTED,
        releasedNumber: letter.letterNumber,
        message: 'Draf ditolak dan diarsipkan permanen. Nomor surat telah dirilis kembali ke sistem.'
      };
    }

    // KASUS PERSETUJUAN (APPROVE)
    if (decision === 'approve') {
      activeTurn.status = FLOW_STATUS.APPROVED;
      activeTurn.decisionAt = Utils.formatIsoDate(new Date());
      activeTurn.notes = sanitizedNotes;

      this._auditLogRepo.logAction(letterId, userEmail, AUDIT_ACTION.APPROVE, sanitizedNotes);

      const nextTurn = this.getActiveTurn(letter.approvalFlow);

      // Masih ada peninjau berikutnya dalam rangkaian
      if (nextTurn) {
        this._letterRepo.save(letter);

        const notifSvc = this._getNotificationService();
        if (notifSvc && notifSvc.sendReviewerTurnNotification) {
          try {
            notifSvc.sendReviewerTurnNotification(letter, nextTurn);
          } catch (e) {
            console.warn('Gagal notifikasi peninjau berikutnya:', e);
          }
        }

        return {
          letterId: letter.letterId,
          status: LETTER_STATUS.IN_REVIEW,
          nextReviewer: nextTurn.email
        };
      }

      // Ini adalah APPROVER AKHIR -> Finalisasi Naskah
      if (!signatureMethod) {
        throw new Error('Metode pengesahan (digital atau wet) wajib dipilih oleh Approver akhir.');
      }

      letter.signatureMethod = signatureMethod;
      const docSvc = this._getDocumentService();

      if (signatureMethod === SIGNATURE_METHOD.DIGITAL) {
        let pdfResult = { pdfUrl: 'https://drive.google.com/mock-pdf', fileName: `${letter.letterNumber}.pdf` };
        if (docSvc && docSvc.generateFinalPdfWithDigitalSignature) {
          pdfResult = docSvc.generateFinalPdfWithDigitalSignature(letter, currentUser);
        }

        letter.status = LETTER_STATUS.APPROVED;
        letter.finalPdfUrl = pdfResult.pdfUrl;
        letter.finalFileName = pdfResult.fileName;
        this._letterRepo.save(letter);

        this._auditLogRepo.logAction(
          letterId,
          userEmail,
          AUDIT_ACTION.CHOOSE_SIGNATURE_METHOD,
          `Pengesahan Digital: ${pdfResult.fileName}`
        );

        const notifSvc = this._getNotificationService();
        if (notifSvc && notifSvc.sendApprovalFinalNotification) {
          try {
            notifSvc.sendApprovalFinalNotification(letter, letter.drafterEmail);
          } catch (e) {
            console.warn('Gagal notifikasi surat disetujui:', e);
          }
        }

        return {
          letterId: letter.letterId,
          status: LETTER_STATUS.APPROVED,
          finalPdfUrl: pdfResult.pdfUrl,
          finalFileName: pdfResult.fileName
        };
      } else if (signatureMethod === SIGNATURE_METHOD.WET) {
        let draftResult = { fileId: 'mock-doc-id', baseRevisionId: '1' };
        if (docSvc && docSvc.createUnsignedDraftDoc) {
          draftResult = docSvc.createUnsignedDraftDoc(letter);
        }

        letter.unsignedDriveFileId = draftResult.fileId;
        letter.unsignedDraftBaseRevisionId = draftResult.baseRevisionId;
        letter.awaitingWetSignature = true;
        letter.status = LETTER_STATUS.IN_REVIEW; // Menunggu unggah scan tanda tangan basah
        this._letterRepo.save(letter);

        this._auditLogRepo.logAction(
          letterId,
          userEmail,
          AUDIT_ACTION.CHOOSE_SIGNATURE_METHOD,
          'Pengesahan Basah: draf Google Doc unsigned diterbitkan, menunggu unggahan scan'
        );

        return {
          letterId: letter.letterId,
          status: LETTER_STATUS.IN_REVIEW,
          awaitingWetSignature: true,
          unsignedDriveFileId: draftResult.fileId
        };
      } else {
        throw new Error(`Metode pengesahan '${signatureMethod}' tidak valid. Pilih 'digital' atau 'wet'.`);
      }
    }

    throw new Error(`Keputusan '${decision}' tidak dikenal. Pilih 'approve' atau 'reject'.`);
  },

  /**
   * Uploads and verifies wet signature scan file.
   * @param {Object} currentUser
   * @param {string} letterId
   * @param {string} fileBase64
   * @param {string} mimeType
   * @param {string} fileName
   * @return {Object}
   */
  uploadWetSignatureScan(currentUser, letterId, fileBase64, mimeType, fileName) {
    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      throw new Error(`Surat dengan ID '${letterId}' tidak ditemukan.`);
    }

    if (!letter.awaitingWetSignature) {
      throw new Error('Surat ini tidak sedang menunggu unggahan tanda tangan basah.');
    }

    if (!UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(`Tipe berkas '${mimeType}' tidak diizinkan. Hanya format PDF, PNG, atau JPEG yang diterima.`);
    }

    const docSvc = this._getDocumentService();
    let updateResult = {
      fileId: letter.unsignedDriveFileId,
      revisionId: '2',
      pdfUrl: `https://drive.google.com/scan-pdf/${letter.letterId}`
    };

    if (docSvc && docSvc.updateWetSignatureScan) {
      updateResult = docSvc.updateWetSignatureScan(
        letter.unsignedDriveFileId,
        fileBase64,
        mimeType,
        letter.unsignedDraftBaseRevisionId
      );
    }

    letter.status = LETTER_STATUS.APPROVED;
    letter.awaitingWetSignature = false;
    letter.finalPdfUrl = updateResult.pdfUrl;
    letter.finalFileName = Utils.sanitizeFileName(fileName || `${letter.letterNumber}.pdf`);
    this._letterRepo.save(letter);

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.UPLOAD_WET_SIGNATURE,
      `Berkas scan tanda tangan basah berhasil diunggah (Revisi ${updateResult.revisionId})`
    );

    const notifSvc = this._getNotificationService();
    if (notifSvc && notifSvc.sendApprovalFinalNotification) {
      try {
        notifSvc.sendApprovalFinalNotification(letter, letter.drafterEmail);
      } catch (e) {
        console.warn('Gagal notifikasi surat disetujui:', e);
      }
    }

    return {
      letterId: letter.letterId,
      status: LETTER_STATUS.APPROVED,
      finalPdfUrl: updateResult.pdfUrl,
      verifiedRevisionId: updateResult.revisionId
    };
  },

  /**
   * Retrieves filtered letter list for user dashboard.
   * @param {Object} currentUser
   * @param {'my_turn'|'my_drafts'|'all_approved'|'all'} filterType
   * @return {Array<Object>}
   */
  getLettersForUser(currentUser, filterType = 'my_turn') {
    if (!currentUser || !currentUser.email) {
      throw new Error('Pengguna tidak terautentikasi.');
    }

    const all = this._letterRepo.listAll();
    const userEmail = currentUser.email.toLowerCase().trim();

    let filtered = [];

    switch (filterType) {
      case 'my_turn':
        filtered = all.filter(l => {
          if (l.status !== LETTER_STATUS.IN_REVIEW) return false;
          const active = this.getActiveTurn(l.approvalFlow);
          return active && active.email.toLowerCase().trim() === userEmail;
        });
        break;

      case 'my_drafts':
        filtered = all.filter(l => l.drafterEmail.toLowerCase().trim() === userEmail);
        break;

      case 'all_approved':
        filtered = all.filter(l => (
          l.status === LETTER_STATUS.APPROVED ||
          l.status === LETTER_STATUS.PENDING_UPLOAD ||
          l.status === LETTER_STATUS.EXPIRED ||
          (l.status === LETTER_STATUS.CANCELLED && Boolean(l.letterNumber))
        ));
        break;

      case 'all':
        if (currentUser.role !== ROLES.ADMIN) {
          const err = new Error('Hanya Administrator yang dapat melihat seluruh tab surat.');
          err.code = 'UNAUTHORIZED_ROLE';
          throw err;
        }
        filtered = all;
        break;

      default:
        filtered = all.filter(l => this.canUserViewLetter(currentUser, l));
        break;
    }

    return filtered.map(l => {
      const active = this.getActiveTurn(l.approvalFlow);
      return {
        letterId: l.letterId,
        letterNumber: l.letterNumber,
        documentType: l.documentType || DOCUMENT_TYPE.INTERNAL,
        templateType: l.templateType,
        templateCode: l.templateCode,
        perihal: (l.contentData && l.contentData.perihal) || '',
        drafterEmail: l.drafterEmail,
        status: l.status,
        currentTurnEmail: active ? active.email : null,
        awaitingWetSignature: l.awaitingWetSignature,
        reconciliationDeadline: l.reconciliationDeadline || null,
        cancellationReason: l.cancellationReason || null,
        finalPdfUrl: l.status === LETTER_STATUS.APPROVED ? l.finalPdfUrl : null,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      };
    });
  },

  /**
   * Submits a standalone take-number request for external/physical letters (Ambil Nomor).
   * Validates metadata, strictly enforces no-backdating, and enforces separation of duties.
   * @param {Object} currentUser
   * @param {Object} payload
   * @return {Object}
   */
  submitTakeNumberRequest(currentUser, payload) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }
    if (currentUser.role !== ROLES.DRAFTER && currentUser.role !== ROLES.ADMIN) {
      const err = new Error('Hanya pengguna dengan peran Drafter atau Admin yang dapat mengajukan nomor surat.');
      err.code = 'UNAUTHORIZED_ROLE';
      throw err;
    }
    if (!payload || typeof payload !== 'object') {
      const err = new Error('Data permohonan nomor tidak valid.');
      err.code = 'INVALID_PAYLOAD';
      throw err;
    }

    const templateCode = (payload.templateCode || '').trim().toUpperCase();
    const templateType = (payload.templateType || '').trim() || templateCode;
    const contentData = payload.contentData || {};
    const perihal = (contentData.perihal || '').trim();
    const tujuan = (contentData.tujuan || '').trim();
    const tanggalSurat = (contentData.tanggalSurat || '').trim();
    const approver = payload.approver || {};
    const approverEmail = (approver.email || '').toLowerCase().trim();

    if (!templateCode) {
      const err = new Error('Jenis surat wajib diisi.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!perihal || !tujuan) {
      const err = new Error('Perihal dan Tujuan surat wajib diisi.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!tanggalSurat) {
      const err = new Error('Tanggal surat wajib diisi.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!Utils.isTodayDate(tanggalSurat)) {
      const err = new Error('Tanggal surat harus merupakan tanggal hari ini (tanpa backdating/forward dating).');
      err.code = 'INVALID_DATE';
      throw err;
    }
    if (!approverEmail) {
      const err = new Error('Approver wajib dipilih.');
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (approverEmail === currentUser.email.toLowerCase().trim()) {
      const err = new Error('Pemohon dilarang memilih dirinya sendiri sebagai Approver (separation of duties).');
      err.code = 'SELF_APPROVAL_FORBIDDEN';
      throw err;
    }

    const letterId = Utils.generateUuid();
    const sanitizedContent = {
      perihal: Utils.sanitizeForSheets(perihal),
      tujuan: Utils.sanitizeForSheets(tujuan),
      tanggalSurat: Utils.sanitizeForSheets(tanggalSurat)
    };

    const approvalFlow = [
      {
        order: 1,
        email: approverEmail,
        name: (approver.name || approverEmail).trim(),
        role: ROLES.APPROVER,
        status: FLOW_STATUS.PENDING,
        decisionAt: null,
        notes: ''
      }
    ];

    const letterRecord = {
      letterId,
      letterNumber: '',
      documentType: DOCUMENT_TYPE.EXTERNAL,
      templateType,
      templateCode,
      googleDocTemplateId: '',
      contentData: sanitizedContent,
      status: LETTER_STATUS.IN_REVIEW,
      drafterEmail: currentUser.email.toLowerCase().trim(),
      approvalFlow,
      signatureMethod: null,
      awaitingWetSignature: false,
      unsignedDriveFileId: null,
      unsignedDraftBaseRevisionId: null,
      reconciliationDeadline: null,
      escalationSentAt: null,
      cancellationReason: null,
      finalPdfUrl: null,
      finalFileName: null
    };

    const saved = this._letterRepo.save(letterRecord);

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.SUBMIT_TAKE_NUMBER,
      `Pengajuan permohonan nomor surat eksternal: ${perihal}`
    );

    const notifSvc = this._getNotificationService();
    if (notifSvc && typeof notifSvc.sendTakeNumberRequestNotification === 'function') {
      try {
        notifSvc.sendTakeNumberRequestNotification(saved, approvalFlow[0]);
      } catch (e) {
        console.warn('Gagal mengirim notifikasi permohonan nomor:', e.message);
      }
    }

    return {
      letterId: saved.letterId,
      status: saved.status,
      documentType: saved.documentType,
      approverEmail,
      message: 'Permohonan nomor surat berhasil diajukan dan menunggu persetujuan atasan.'
    };
  },

  /**
   * Allows Drafter to cancel their own external take-number request while in 'In Review' status.
   * @param {Object} currentUser
   * @param {string} letterId
   * @return {Object}
   */
  cancelTakeNumberByDrafter(currentUser, letterId) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }
    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error('Surat tidak ditemukan.');
      err.code = 'LETTER_NOT_FOUND';
      throw err;
    }

    const isOwner = letter.drafterEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim();
    const isAdmin = currentUser.role === ROLES.ADMIN;
    if (!isOwner && !isAdmin) {
      const err = new Error('Hanya pembuat permohonan yang berhak membatalkan permohonan ini.');
      err.code = 'UNAUTHORIZED_ACCESS';
      throw err;
    }

    if (letter.status !== LETTER_STATUS.IN_REVIEW) {
      const err = new Error('Hanya permohonan berstatus In Review yang dapat dibatalkan oleh pemohon.');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    letter.status = LETTER_STATUS.CANCELLED;
    letter.cancellationReason = 'Permohonan dibatalkan mandiri oleh pemohon.';
    const updated = this._letterRepo.save(letter);

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.CANCEL_TAKE_NUMBER_DRAFTER,
      'Permohonan dibatalkan mandiri oleh pemohon sebelum diproses.'
    );

    return {
      letterId: updated.letterId,
      status: updated.status,
      message: 'Permohonan berhasil dibatalkan oleh pemohon.'
    };
  },

  /**
   * Approves an external take-number request, allocates an official number atomically,
   * sets status to 'Pending Upload', and initiates the 7-day reconciliation window.
   * @param {Object} currentUser
   * @param {string} letterId
   * @return {Object}
   */
  approveTakeNumberRequest(currentUser, letterId) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error('Surat tidak ditemukan.');
      err.code = 'LETTER_NOT_FOUND';
      throw err;
    }

    if (letter.documentType !== DOCUMENT_TYPE.EXTERNAL) {
      const err = new Error('Aksi ini khusus untuk permohonan nomor surat eksternal.');
      err.code = 'INVALID_DOCUMENT_TYPE';
      throw err;
    }

    if (letter.status !== LETTER_STATUS.IN_REVIEW) {
      const err = new Error('Hanya permohonan berstatus In Review yang dapat disetujui.');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const userEmail = currentUser.email.toLowerCase().trim();
    const designatedApproverEmail = (Array.isArray(letter.approvalFlow) && letter.approvalFlow[0])
      ? letter.approvalFlow[0].email.toLowerCase().trim()
      : '';
    const isApprover = designatedApproverEmail === userEmail;
    const isAdmin = currentUser.role === ROLES.ADMIN;

    if (!isApprover && !isAdmin) {
      const err = new Error('Hanya pejabat approver yang ditunjuk yang berhak menyetujui permohonan ini.');
      err.code = 'UNAUTHORIZED_ACCESS';
      throw err;
    }

    // Allocate official number atomically
    const numberingResult = this._numberingService.allocateNumber(letter.templateCode);
    const nowIso = new Date().toISOString();
    const reconciliationDeadline = Utils.addCalendarDaysIso(nowIso, 7);

    letter.letterNumber = numberingResult.formattedNumber;
    letter.status = LETTER_STATUS.PENDING_UPLOAD;
    letter.reconciliationDeadline = reconciliationDeadline;

    if (Array.isArray(letter.approvalFlow) && letter.approvalFlow[0]) {
      letter.approvalFlow[0].status = FLOW_STATUS.APPROVED;
      letter.approvalFlow[0].decisionAt = nowIso;
    }

    const saved = this._letterRepo.save(letter);

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.APPROVE_TAKE_NUMBER,
      `Persetujuan permohonan nomor surat eksternal. Nomor diterbitkan: ${saved.letterNumber} (Deadline: 7 hari).`
    );

    const notifSvc = this._getNotificationService();
    if (notifSvc && typeof notifSvc.sendTakeNumberApprovalNotification === 'function') {
      try {
        notifSvc.sendTakeNumberApprovalNotification(saved, saved.drafterEmail);
      } catch (e) {
        console.warn('Gagal mengirim notifikasi persetujuan nomor:', e.message);
      }
    }

    return {
      letterId: saved.letterId,
      letterNumber: saved.letterNumber,
      status: saved.status,
      reconciliationDeadline: saved.reconciliationDeadline,
      isRecycled: Boolean(numberingResult.isRecycled)
    };
  },

  /**
   * Rejects an external take-number request with a mandatory reason.
   * @param {Object} currentUser
   * @param {string} letterId
   * @param {string} reason
   * @return {Object}
   */
  rejectTakeNumberRequest(currentUser, letterId, reason) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      const err = new Error('Alasan penolakan permohonan wajib diisi minimal 5 karakter.');
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error('Surat tidak ditemukan.');
      err.code = 'LETTER_NOT_FOUND';
      throw err;
    }

    if (letter.documentType !== DOCUMENT_TYPE.EXTERNAL) {
      const err = new Error('Aksi ini khusus untuk permohonan nomor surat eksternal.');
      err.code = 'INVALID_DOCUMENT_TYPE';
      throw err;
    }

    if (letter.status !== LETTER_STATUS.IN_REVIEW) {
      const err = new Error('Hanya permohonan berstatus In Review yang dapat ditolak.');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const userEmail = currentUser.email.toLowerCase().trim();
    const designatedApproverEmail = (Array.isArray(letter.approvalFlow) && letter.approvalFlow[0])
      ? letter.approvalFlow[0].email.toLowerCase().trim()
      : '';
    const isApprover = designatedApproverEmail === userEmail;
    const isAdmin = currentUser.role === ROLES.ADMIN;

    if (!isApprover && !isAdmin) {
      const err = new Error('Hanya pejabat approver yang ditunjuk yang berhak menolak permohonan ini.');
      err.code = 'UNAUTHORIZED_ACCESS';
      throw err;
    }

    const nowIso = new Date().toISOString();
    const cleanReason = reason.trim();

    letter.status = LETTER_STATUS.REJECTED;
    letter.letterNumber = '';
    letter.cancellationReason = cleanReason;

    if (Array.isArray(letter.approvalFlow) && letter.approvalFlow[0]) {
      letter.approvalFlow[0].status = FLOW_STATUS.REJECTED;
      letter.approvalFlow[0].decisionAt = nowIso;
      letter.approvalFlow[0].notes = cleanReason;
    }

    const saved = this._letterRepo.save(letter);

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.REJECT_TAKE_NUMBER,
      `Penolakan permohonan nomor surat eksternal. Alasan: ${cleanReason}`
    );

    const notifSvc = this._getNotificationService();
    if (notifSvc && typeof notifSvc.sendTakeNumberRejectionNotification === 'function') {
      try {
        notifSvc.sendTakeNumberRejectionNotification(saved, saved.drafterEmail, cleanReason);
      } catch (e) {
        console.warn('Gagal mengirim notifikasi penolakan nomor:', e.message);
      }
    }

    return {
      letterId: saved.letterId,
      status: saved.status,
      notes: cleanReason,
      letterNumber: null
    };
  },

  /**
   * Helper to clean up orphaned Drive files during rollback (Task T034).
   * @param {string} fileId
   */
  cleanupOrphanedDriveFile(fileId) {
    if (!fileId) return;
    try {
      if (typeof DriveApp !== 'undefined') {
        const file = DriveApp.getFileById(fileId);
        if (file) file.setTrashed(true);
      }
    } catch (e) {
      console.warn(`Gagal membersihkan berkas Drive ${fileId}:`, e.message);
    }
  },

  /**
   * Uploads final signed scan PDF for an external letter in 'Pending Upload' status.
   * Transitions status to 'Approved'.
   * @param {Object} currentUser
   * @param {string} letterId
   * @param {{fileName: string, mimeType: string, base64: string}} fileData
   * @return {Object}
   */
  uploadTakeNumberScan(currentUser, letterId, fileData) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    if (!fileData || !fileData.base64) {
      const err = new Error('Berkas scan PDF wajib disertakan.');
      err.code = 'FILE_REQUIRED';
      throw err;
    }

    const mime = (fileData.mimeType || '').toLowerCase();
    const name = (fileData.fileName || '').toLowerCase();
    if (mime !== 'application/pdf' && !name.endsWith('.pdf')) {
      const err = new Error('Berkas scan harus berformat PDF (.pdf).');
      err.code = 'INVALID_MIME_TYPE';
      throw err;
    }

    // Base64 size check (10 MB ~ 13.3 MB base64 string)
    const base64Len = fileData.base64.length;
    const approximateBytes = Math.floor(base64Len * 0.75);
    if (approximateBytes > 10 * 1024 * 1024) {
      const err = new Error('Ukuran berkas scan melebihi batas maksimum 10 MB.');
      err.code = 'FILE_TOO_LARGE';
      throw err;
    }

    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error('Surat tidak ditemukan.');
      err.code = 'LETTER_NOT_FOUND';
      throw err;
    }

    if (letter.documentType !== DOCUMENT_TYPE.EXTERNAL) {
      const err = new Error('Aksi ini khusus untuk permohonan nomor surat eksternal.');
      err.code = 'INVALID_DOCUMENT_TYPE';
      throw err;
    }

    if (letter.status !== LETTER_STATUS.PENDING_UPLOAD) {
      const err = new Error('Hanya surat berstatus Pending Upload yang dapat diunggah berkas scannya.');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const userEmail = currentUser.email.toLowerCase().trim();
    const isDrafter = letter.drafterEmail.toLowerCase().trim() === userEmail;
    const isApprover = Array.isArray(letter.approvalFlow) && letter.approvalFlow.some(f => f.email.toLowerCase().trim() === userEmail);
    const isAdmin = currentUser.role === ROLES.ADMIN;

    if (!isDrafter && !isApprover && !isAdmin) {
      const err = new Error('Anda tidak berwenang mengunggah berkas scan pada surat ini.');
      err.code = 'UNAUTHORIZED_ACCESS';
      throw err;
    }

    const cleanFileName = Utils.sanitizeFileName(fileData.fileName || `Scan_${letter.letterNumber.replace(/[\\/:*?"<>|]/g, '-')}.pdf`);
    let createdDriveFileId = null;
    let finalPdfUrl = '';

    if (typeof DriveApp !== 'undefined' && typeof DriveApp.getRootFolder === 'function') {
      try {
        const docSvc = this._getDocumentService();
        const folder = (docSvc && typeof docSvc.getLetterFolder === 'function') ? docSvc.getLetterFolder(letterId) : DriveApp.getRootFolder();
        const decodedBytes = Utilities.base64Decode(fileData.base64);
        const blob = Utilities.newBlob(decodedBytes, 'application/pdf', cleanFileName);
        const file = folder.createFile(blob);
        createdDriveFileId = file.getId();
        finalPdfUrl = file.getUrl();
      } catch (driveErr) {
        throw new Error('Gagal menyimpan berkas scan ke Google Drive: ' + driveErr.message);
      }
    } else {
      createdDriveFileId = `mock-scan-${letterId}`;
      finalPdfUrl = `https://drive.google.com/file/d/${createdDriveFileId}/view`;
    }

    letter.finalPdfUrl = finalPdfUrl;
    letter.finalFileName = cleanFileName;
    letter.status = LETTER_STATUS.APPROVED;

    let saved;
    try {
      saved = this._letterRepo.save(letter);
    } catch (saveErr) {
      if (createdDriveFileId) {
        this.cleanupOrphanedDriveFile(createdDriveFileId);
      }
      throw saveErr;
    }

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.UPLOAD_FINAL_SCAN,
      `Unggah berkas scan PDF final: ${cleanFileName}. Surat sah dan berstatus Approved.`
    );

    return {
      letterId: saved.letterId,
      letterNumber: saved.letterNumber,
      status: saved.status,
      finalPdfUrl: saved.finalPdfUrl,
      message: 'Berkas scan berhasil diunggah. Dokumen resmi telah sah dan terarsipkan.'
    };
  },

  /**
   * Allows Admin to replace the final scan PDF on an Approved external letter.
   * Mandatory audit reason logged with REPLACE_FINAL_SCAN_ADMIN.
   * @param {Object} currentUser
   * @param {string} letterId
   * @param {{fileName: string, mimeType: string, base64: string}} fileData
   * @param {string} reason
   * @return {Object}
   */
  replaceTakeNumberScanAsAdmin(currentUser, letterId, fileData, reason) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    if (currentUser.role !== ROLES.ADMIN) {
      const err = new Error('Hanya Administrator yang berhak mengganti berkas scan pada surat yang telah disetujui.');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      const err = new Error('Alasan penggantian berkas scan wajib diisi secara jelas.');
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    if (!fileData || !fileData.base64) {
      const err = new Error('Berkas scan PDF pengganti wajib disertakan.');
      err.code = 'FILE_REQUIRED';
      throw err;
    }

    const mime = (fileData.mimeType || '').toLowerCase();
    const name = (fileData.fileName || '').toLowerCase();
    if (mime !== 'application/pdf' && !name.endsWith('.pdf')) {
      const err = new Error('Berkas scan harus berformat PDF (.pdf).');
      err.code = 'INVALID_MIME_TYPE';
      throw err;
    }

    const base64Len = fileData.base64.length;
    const approximateBytes = Math.floor(base64Len * 0.75);
    if (approximateBytes > 10 * 1024 * 1024) {
      const err = new Error('Ukuran berkas scan melebihi batas maksimum 10 MB.');
      err.code = 'FILE_TOO_LARGE';
      throw err;
    }

    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error('Surat tidak ditemukan.');
      err.code = 'LETTER_NOT_FOUND';
      throw err;
    }

    if (letter.documentType !== DOCUMENT_TYPE.EXTERNAL) {
      const err = new Error('Aksi ini khusus untuk permohonan nomor surat eksternal.');
      err.code = 'INVALID_DOCUMENT_TYPE';
      throw err;
    }

    if (letter.status !== LETTER_STATUS.APPROVED) {
      const err = new Error('Penggantian berkas scan khusus untuk surat berstatus Approved.');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const cleanFileName = Utils.sanitizeFileName(fileData.fileName || `Revisi_${letter.letterNumber.replace(/[\\/:*?"<>|]/g, '-')}.pdf`);
    let createdDriveFileId = null;
    let finalPdfUrl = '';

    if (typeof DriveApp !== 'undefined' && typeof DriveApp.getRootFolder === 'function') {
      try {
        const docSvc = this._getDocumentService();
        const folder = (docSvc && typeof docSvc.getLetterFolder === 'function') ? docSvc.getLetterFolder(letterId) : DriveApp.getRootFolder();
        const decodedBytes = Utilities.base64Decode(fileData.base64);
        const blob = Utilities.newBlob(decodedBytes, 'application/pdf', cleanFileName);
        const file = folder.createFile(blob);
        createdDriveFileId = file.getId();
        finalPdfUrl = file.getUrl();
      } catch (driveErr) {
        throw new Error('Gagal menyimpan berkas scan pengganti ke Google Drive: ' + driveErr.message);
      }
    } else {
      createdDriveFileId = `mock-scan-rev-${letterId}`;
      finalPdfUrl = `https://drive.google.com/file/d/${createdDriveFileId}/view`;
    }

    letter.finalPdfUrl = finalPdfUrl;
    letter.finalFileName = cleanFileName;

    let saved;
    try {
      saved = this._letterRepo.save(letter);
    } catch (saveErr) {
      if (createdDriveFileId) {
        this.cleanupOrphanedDriveFile(createdDriveFileId);
      }
      throw saveErr;
    }

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.REPLACE_FINAL_SCAN_ADMIN,
      `Penggantian berkas scan oleh Admin: ${cleanFileName}. Alasan: ${reason.trim()}`
    );

    return {
      letterId: saved.letterId,
      status: saved.status,
      finalPdfUrl: saved.finalPdfUrl,
      message: 'Berkas scan revisi berhasil diperbarui oleh Admin.'
    };
  },

  /**
   * Manually cancels an external take-number request in 'Pending Upload' status.
   * Authorized for designated Approver or Admin only.
   * Releases sequence number back to the recycled numbers pool.
   * @param {Object} currentUser
   * @param {string} letterId
   * @param {string} reason
   * @return {Object}
   */
  cancelTakeNumberManual(currentUser, letterId, reason) {
    if (!currentUser || !currentUser.email) {
      const err = new Error('Pengguna tidak terautentikasi.');
      err.code = 'UNAUTHENTICATED';
      throw err;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      const err = new Error('Alasan pembatalan manual wajib diisi (minimal 5 karakter).');
      err.code = 'REASON_REQUIRED';
      throw err;
    }

    const letter = this._letterRepo.findById(letterId);
    if (!letter) {
      const err = new Error('Surat tidak ditemukan.');
      err.code = 'LETTER_NOT_FOUND';
      throw err;
    }

    if (letter.documentType !== DOCUMENT_TYPE.EXTERNAL) {
      const err = new Error('Aksi ini khusus untuk permohonan nomor surat eksternal.');
      err.code = 'INVALID_DOCUMENT_TYPE';
      throw err;
    }

    if (letter.status !== LETTER_STATUS.PENDING_UPLOAD) {
      const err = new Error('Hanya surat berstatus Pending Upload yang dapat dibatalkan manual.');
      err.code = 'INVALID_STATUS_TRANSITION';
      throw err;
    }

    const userEmail = currentUser.email.toLowerCase().trim();
    const designatedApproverEmail = (Array.isArray(letter.approvalFlow) && letter.approvalFlow[0])
      ? letter.approvalFlow[0].email.toLowerCase().trim()
      : '';
    const isApprover = designatedApproverEmail === userEmail;
    const isAdmin = currentUser.role === ROLES.ADMIN;

    if (!isApprover && !isAdmin) {
      const err = new Error('Hanya Approver terkait atau Administrator yang berhak membatalkan nomor surat ini.');
      err.code = 'UNAUTHORIZED_ACCESS';
      throw err;
    }

    const cleanReason = reason.trim();
    letter.status = LETTER_STATUS.CANCELLED;
    letter.cancellationReason = cleanReason;

    // Release sequence number back to the original month's recycled pool
    let recycled = false;
    if (letter.letterNumber) {
      const parsed = Utils.parseLetterNumberParts(letter.letterNumber);
      if (parsed && this._counterRepo && typeof this._counterRepo.releaseNumberToRecycledPool === 'function') {
        this._counterRepo.releaseNumberToRecycledPool(
          parsed.templateCode,
          parsed.sequence,
          parsed.month,
          parsed.year
        );
        recycled = true;
      }
    }

    const saved = this._letterRepo.save(letter);

    this._auditLogRepo.logAction(
      letterId,
      currentUser.email,
      AUDIT_ACTION.CANCEL_TAKE_NUMBER_MANUAL,
      `Pembatalan manual nomor ${letter.letterNumber || ''} oleh ${currentUser.email}. Alasan: ${cleanReason}`
    );

    return {
      letterId: saved.letterId,
      letterNumber: saved.letterNumber,
      status: saved.status,
      recycled: recycled,
      message: 'Nomor surat dibatalkan dan telah dilepas kembali ke antrean daur ulang.'
    };
  }
};
