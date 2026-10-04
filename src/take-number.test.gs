/**
 * Unit Tests: Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor)
 * Feature: specs/002-ambil-nomor-surat/spec.md
 */

function runTakeNumberTests() {
  console.log('--- Menjalankan TakeNumber (Ambil Nomor) Unit Tests ---');
  
  // Baseline Scaffolding Check
  TestUtils.assertTrue(typeof DOCUMENT_TYPE !== 'undefined', 'DOCUMENT_TYPE harus terdefinisi');
  TestUtils.assertEqual(DOCUMENT_TYPE.EXTERNAL, 'EXTERNAL', 'DOCUMENT_TYPE.EXTERNAL bernilai EXTERNAL');
  TestUtils.assertEqual(LETTER_STATUS.PENDING_UPLOAD, 'Pending Upload', 'LETTER_STATUS.PENDING_UPLOAD');
  TestUtils.assertEqual(LETTER_STATUS.EXPIRED, 'Expired', 'LETTER_STATUS.EXPIRED');
  TestUtils.assertEqual(LETTER_STATUS.CANCELLED, 'Cancelled', 'LETTER_STATUS.CANCELLED');

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // =========================================================================
  // USER STORY 1: Pengajuan Permohonan Nomor Surat Eksternal & Pembatalan Mandiri
  // =========================================================================

  // Test 1: Submit Take Number with Valid Metadata (US1)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    const mockNotificationService = {
      sent: [],
      sendTakeNumberRequestNotification(letter, approver) {
        this.sent.push({ letterId: letter.letterId, approver: approver.email });
        return true;
      }
    };

    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);
    letterService.setNotificationService(mockNotificationService);

    const currentUser = { email: 'drafter@koneksi.org', name: 'Drafter Satu', role: ROLES.DRAFTER };
    const payload = {
      templateCode: 'ST',
      templateType: 'Surat Tugas',
      contentData: {
        perihal: 'Koordinasi Monitoring Evaluasi Wilayah I',
        tujuan: 'Kepala Balai Penjaminan Mutu Pendidikan',
        tanggalSurat: todayStr
      },
      approver: {
        email: 'approver@koneksi.org',
        name: 'Approver Utama',
        role: ROLES.APPROVER
      }
    };

    const res = letterService.submitTakeNumberRequest(currentUser, payload);
    TestUtils.assertTrue(res.letterId, 'Harus menghasilkan letterId');
    TestUtils.assertEqual(res.status, LETTER_STATUS.IN_REVIEW, 'Status awal harus In Review');
    TestUtils.assertEqual(res.documentType, DOCUMENT_TYPE.EXTERNAL, 'Tipe dokumen harus EXTERNAL');

    const saved = mockLetterRepo.findById(res.letterId);
    TestUtils.assertEqual(saved.letterNumber, '', 'letterNumber masih kosong saat In Review');
    TestUtils.assertEqual(saved.contentData.perihal, payload.contentData.perihal, 'Perihal tersimpan');
    TestUtils.assertEqual(mockNotificationService.sent.length, 1, 'Email notifikasi harus terkirim');
    TestUtils.assertEqual(mockAuditLogRepo.getAllLogs().length, 1, 'Audit log tercatat');
  })();

  // Test 2: Submit Take Number strictly prevents Backdating and Forward Dating (US1)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    const currentUser = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const payloadBackdate = {
      templateCode: 'ST',
      contentData: {
        perihal: 'Perihal Lama',
        tujuan: 'Tujuan Lama',
        tanggalSurat: '2020-01-01' // Backdate
      },
      approver: { email: 'approver@koneksi.org' }
    };

    TestUtils.assertThrows(
      () => letterService.submitTakeNumberRequest(currentUser, payloadBackdate),
      'tanpa backdating',
      'Pengajuan dengan tanggal lampau harus ditolak'
    );

    const payloadForwardDate = {
      templateCode: 'ST',
      contentData: {
        perihal: 'Perihal Masa Depan',
        tujuan: 'Tujuan',
        tanggalSurat: '2099-12-31' // Forward date
      },
      approver: { email: 'approver@koneksi.org' }
    };

    TestUtils.assertThrows(
      () => letterService.submitTakeNumberRequest(currentUser, payloadForwardDate),
      'tanpa backdating',
      'Pengajuan dengan tanggal masa depan harus ditolak'
    );
  })();

  // Test 3: Submit Take Number enforces Separation of Duties (US1)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    const currentUser = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const payloadSelfApproval = {
      templateCode: 'ST',
      contentData: {
        perihal: 'Perihal Mandiri',
        tujuan: 'Tujuan',
        tanggalSurat: todayStr
      },
      approver: { email: 'drafter@koneksi.org' } // Self
    };

    TestUtils.assertThrows(
      () => letterService.submitTakeNumberRequest(currentUser, payloadSelfApproval),
      'separation of duties',
      'Pemohon dilarang memilih dirinya sendiri sebagai Approver'
    );
  })();

  // Test 4: Drafter can cancel own request while In Review (US1)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const payload = {
      templateCode: 'SP1',
      contentData: { perihal: 'Teguran', tujuan: 'Karyawan A', tanggalSurat: todayStr },
      approver: { email: 'approver@koneksi.org' }
    };

    const created = letterService.submitTakeNumberRequest(drafter, payload);

    // Orang lain mencoba batalkan
    const stranger = { email: 'stranger@koneksi.org', role: ROLES.DRAFTER };
    TestUtils.assertThrows(
      () => letterService.cancelTakeNumberByDrafter(stranger, created.letterId),
      'Hanya pembuat permohonan',
      'Pengguna lain tidak boleh membatalkan permohonan milik drafter'
    );

    // Drafter membatalkan permohonan sendiri
    const cancelRes = letterService.cancelTakeNumberByDrafter(drafter, created.letterId);
    TestUtils.assertEqual(cancelRes.status, LETTER_STATUS.CANCELLED, 'Status harus berubah Cancelled');

    const updated = mockLetterRepo.findById(created.letterId);
    TestUtils.assertEqual(updated.status, LETTER_STATUS.CANCELLED, 'Status tersimpan Cancelled');
    TestUtils.assertEqual(updated.letterNumber, '', 'Nomor surat tetap kosong');
  })();

  // =========================================================================
  // USER STORY 2: Persetujuan & Penerbitan Atomik Nomor Surat
  // =========================================================================

  // Test 5: Approver approves external take-number request (US2)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    const mockNotificationService = {
      approvalsSent: [],
      sendTakeNumberApprovalNotification(letter, drafterEmail) {
        this.approvalsSent.push({ letterId: letter.letterId, drafterEmail });
        return true;
      }
    };

    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);
    letterService.setNotificationService(mockNotificationService);

    numberServiceMock = {
      allocateNumber(templateCode) {
        return {
          sequenceNumber: '0001',
          formattedNumber: `0001.${templateCode}/IX/2026`,
          isRecycled: false,
          templateCode,
          month: 9,
          year: 2026
        };
      }
    };
    letterService.setNumberingService(numberServiceMock);

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const approver = { email: 'approver@koneksi.org', name: 'Pak Approver', role: ROLES.APPROVER };

    const payload = {
      templateCode: 'ST',
      templateType: 'Surat Tugas',
      contentData: { perihal: 'Tugas Luar Kota', tujuan: 'Dinas Kab Bandung', tanggalSurat: todayStr },
      approver
    };

    const created = letterService.submitTakeNumberRequest(drafter, payload);

    // Non-approver tries to approve
    const stranger = { email: 'stranger@koneksi.org', role: ROLES.DRAFTER };
    TestUtils.assertThrows(
      () => letterService.approveTakeNumberRequest(stranger, created.letterId),
      'Hanya pejabat approver',
      'Pengguna bukan approver dilarang menyetujui permohonan'
    );

    // Designated approver approves
    const approveRes = letterService.approveTakeNumberRequest(approver, created.letterId);
    TestUtils.assertEqual(approveRes.status, LETTER_STATUS.PENDING_UPLOAD, 'Status harus Pending Upload');
    TestUtils.assertEqual(approveRes.letterNumber, '0001.ST/IX/2026', 'Nomor surat harus terbit resmi');
    TestUtils.assertTrue(approveRes.reconciliationDeadline, 'Deadline rekonsiliasi harus terisi');
    TestUtils.assertEqual(approveRes.isRecycled, false, 'Bukan daur ulang');

    const updated = mockLetterRepo.findById(created.letterId);
    TestUtils.assertEqual(updated.status, LETTER_STATUS.PENDING_UPLOAD, 'Status tersimpan Pending Upload');
    TestUtils.assertEqual(updated.letterNumber, '0001.ST/IX/2026', 'Nomor surat tersimpan di sheet');
    TestUtils.assertTrue(updated.reconciliationDeadline, 'Deadline tersimpan');
    TestUtils.assertEqual(mockNotificationService.approvalsSent.length, 1, 'Notifikasi approval terkirim');
  })();

  // Test 6: Approver approves with FIFO recycled pool prioritization (US2)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    numberServiceMock = {
      allocateNumber(templateCode) {
        return {
          sequenceNumber: '0005',
          formattedNumber: `0005.${templateCode}/IX/2026`,
          isRecycled: true,
          templateCode,
          month: 9,
          year: 2026
        };
      }
    };
    letterService.setNumberingService(numberServiceMock);

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const approver = { email: 'approver@koneksi.org', role: ROLES.APPROVER };

    const payload = {
      templateCode: 'SK',
      templateType: 'Surat Keputusan',
      contentData: { perihal: 'SK Tim Kerja', tujuan: 'Seluruh Divisi', tanggalSurat: todayStr },
      approver
    };

    const created = letterService.submitTakeNumberRequest(drafter, payload);
    const approveRes = letterService.approveTakeNumberRequest(approver, created.letterId);

    TestUtils.assertEqual(approveRes.letterNumber, '0005.SK/IX/2026', 'Nomor daur ulang digunakan');
    TestUtils.assertEqual(approveRes.isRecycled, true, 'isRecycled bernilai true');
  })();

  // Test 7: Terminal rejection without numbering allocation (US2)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    const mockNotificationService = {
      rejectionsSent: [],
      sendTakeNumberRejectionNotification(letter, drafterEmail, reason) {
        this.rejectionsSent.push({ letterId: letter.letterId, drafterEmail, reason });
        return true;
      }
    };

    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);
    letterService.setNotificationService(mockNotificationService);

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const approver = { email: 'approver@koneksi.org', role: ROLES.APPROVER };

    const payload = {
      templateCode: 'SP1',
      templateType: 'Surat Peringatan 1',
      contentData: { perihal: 'SP1 Indisipliner', tujuan: 'Staf A', tanggalSurat: todayStr },
      approver
    };

    const created = letterService.submitTakeNumberRequest(drafter, payload);

    // Reject without reason or reason < 5 chars
    TestUtils.assertThrows(
      () => letterService.rejectTakeNumberRequest(approver, created.letterId, 'bad'),
      'minimal 5 karakter',
      'Penolakan tanpa alasan minimal 5 karakter harus ditolak'
    );

    // Valid rejection
    const rejectRes = letterService.rejectTakeNumberRequest(approver, created.letterId, 'Format permohonan belum sesuai regulasi dinas');
    TestUtils.assertEqual(rejectRes.status, LETTER_STATUS.REJECTED, 'Status harus Rejected');
    TestUtils.assertEqual(rejectRes.letterNumber, null, 'Nomor surat harus null');

    const updated = mockLetterRepo.findById(created.letterId);
    TestUtils.assertEqual(updated.status, LETTER_STATUS.REJECTED, 'Status tersimpan Rejected');
    TestUtils.assertEqual(updated.letterNumber, '', 'letterNumber di repo tetap string kosong');
    TestUtils.assertEqual(mockNotificationService.rejectionsSent.length, 1, 'Email penolakan terkirim');
  })();

  // =========================================================================
  // USER STORY 3: Rekonsiliasi & Unggah Berkas Scan Dokumen Final
  // =========================================================================

  // Test 8: Upload Scan PDF, Validation & Admin Replacement (US3)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    numberServiceMock = {
      allocateNumber(templateCode) {
        return {
          sequenceNumber: '0001',
          formattedNumber: `0001.${templateCode}/IX/2026`,
          isRecycled: false
        };
      }
    };
    letterService.setNumberingService(numberServiceMock);

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const approver = { email: 'approver@koneksi.org', role: ROLES.APPROVER };
    const admin = { email: 'admin@koneksi.org', role: ROLES.ADMIN };
    const stranger = { email: 'stranger@koneksi.org', role: ROLES.DRAFTER };

    const payload = {
      templateCode: 'ST',
      templateType: 'Surat Tugas',
      contentData: { perihal: 'Tugas Wilayah', tujuan: 'Instansi B', tanggalSurat: todayStr },
      approver
    };

    const created = letterService.submitTakeNumberRequest(drafter, payload);
    const approved = letterService.approveTakeNumberRequest(approver, created.letterId);
    TestUtils.assertEqual(approved.status, LETTER_STATUS.PENDING_UPLOAD, 'Harus berstatus Pending Upload');

    // 1. Non-PDF upload rejection
    TestUtils.assertThrows(
      () => letterService.uploadTakeNumberScan(drafter, created.letterId, {
        fileName: 'scan.png',
        mimeType: 'image/png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }),
      'format PDF',
      'Unggahan selain PDF harus ditolak'
    );

    // 2. Oversized file rejection (>10 MB)
    TestUtils.assertThrows(
      () => letterService.uploadTakeNumberScan(drafter, created.letterId, {
        fileName: 'oversized.pdf',
        mimeType: 'application/pdf',
        base64: 'A'.repeat(15 * 1024 * 1024) // >10MB
      }),
      '10 MB',
      'Unggahan berkas > 10MB harus ditolak'
    );

    // 3. Unauthorized user upload rejection
    TestUtils.assertThrows(
      () => letterService.uploadTakeNumberScan(stranger, created.letterId, {
        fileName: 'scan.pdf',
        mimeType: 'application/pdf',
        base64: 'JVBERi0xLjQKJ...'
      }),
      'tidak berwenang',
      'Pengguna asing dilarang mengunggah scan surat pihak lain'
    );

    // 4. Valid scan PDF upload by Drafter
    const uploadRes = letterService.uploadTakeNumberScan(drafter, created.letterId, {
      fileName: 'Scan_ST_0001.pdf',
      mimeType: 'application/pdf',
      base64: 'JVBERi0xLjQKJ...'
    });
    TestUtils.assertEqual(uploadRes.status, LETTER_STATUS.APPROVED, 'Status harus berubah Approved');
    TestUtils.assertTrue(uploadRes.finalPdfUrl, 'finalPdfUrl harus terisi');

    const savedAfterUpload = mockLetterRepo.findById(created.letterId);
    TestUtils.assertEqual(savedAfterUpload.status, LETTER_STATUS.APPROVED, 'Status tersimpan Approved');
    TestUtils.assertEqual(savedAfterUpload.finalFileName, 'Scan_ST_0001.pdf', 'Nama file tersimpan');

    // 5. Admin replacement with reason
    // Non-admin attempts replacement
    TestUtils.assertThrows(
      () => letterService.replaceTakeNumberScanAsAdmin(drafter, created.letterId, {
        fileName: 'revisi.pdf',
        mimeType: 'application/pdf',
        base64: 'JVBERi0xLjQKJ...'
      }, 'Alasan revisi'),
      'Hanya Administrator',
      'Non-admin dilarang mengganti berkas scan'
    );

    // Admin attempts replacement without reason
    TestUtils.assertThrows(
      () => letterService.replaceTakeNumberScanAsAdmin(admin, created.letterId, {
        fileName: 'revisi.pdf',
        mimeType: 'application/pdf',
        base64: 'JVBERi0xLjQKJ...'
      }, ''),
      'Alasan penggantian',
      'Penggantian berkas scan oleh admin wajib mengisi alasan'
    );

    // Admin replaces scan with valid reason
    const replaceRes = letterService.replaceTakeNumberScanAsAdmin(admin, created.letterId, {
      fileName: 'Scan_ST_0001_Revisi.pdf',
      mimeType: 'application/pdf',
      base64: 'JVBERi0xLjQKJ...'
    }, 'Koreksi halaman lampiran yang tertinggal');
    TestUtils.assertEqual(replaceRes.status, LETTER_STATUS.APPROVED, 'Status tetap Approved');
    TestUtils.assertTrue(replaceRes.finalPdfUrl, 'URL berkas baru terisi');

    const savedAfterReplace = mockLetterRepo.findById(created.letterId);
    TestUtils.assertEqual(savedAfterReplace.finalFileName, 'Scan_ST_0001_Revisi.pdf', 'Nama file revisi tersimpan');
  })();

  // =========================================================================
  // USER STORY 5: Peringatan Eskalasi H-2 & Pelepasan Nomor Kedaluwarsa Otomatis
  // =========================================================================

  // Test 9: Manual cancellation by Approver or Admin on Pending Upload letters (US5)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();

    letterService.setLetterRepository(mockLetterRepo);
    letterService.setCounterRepository(mockCounterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const approver = { email: 'approver@koneksi.org', role: ROLES.APPROVER };
    const stranger = { email: 'stranger@koneksi.org', role: ROLES.APPROVER };
    const admin = { email: 'admin@koneksi.org', role: ROLES.ADMIN };

    // Initial state: letter Pending Upload with allocated number
    const letter = {
      letterId: 'ext-pending-001',
      letterNumber: '0005.ST/IX/2026',
      documentType: DOCUMENT_TYPE.EXTERNAL,
      templateCode: 'ST',
      status: LETTER_STATUS.PENDING_UPLOAD,
      drafterEmail: drafter.email,
      approvalFlow: [{ email: approver.email, role: ROLES.APPROVER }],
      createdAt: now.toISOString(),
      reconciliationDeadline: Utils.addCalendarDaysIso(now, 7)
    };
    mockLetterRepo.save(letter);

    // 1. Stranger attempts cancellation -> Unauthorized
    TestUtils.assertThrows(
      () => letterService.cancelTakeNumberManual(stranger, letter.letterId, 'Batal saja deh'),
      'Hanya Approver terkait atau Administrator',
      'Pengguna asing dilarang membatalkan nomor surat'
    );

    // 2. Reason validation (< 5 chars)
    TestUtils.assertThrows(
      () => letterService.cancelTakeNumberManual(approver, letter.letterId, 'No'),
      'minimal 5 karakter',
      'Alasan pembatalan harus minimal 5 karakter'
    );

    // 3. Approver cancels with valid reason
    const cancelRes = letterService.cancelTakeNumberManual(approver, letter.letterId, 'Kegiatan fisik dibatalkan oleh dinas terkait');
    TestUtils.assertEqual(cancelRes.status, LETTER_STATUS.CANCELLED, 'Status harus berubah Cancelled');
    TestUtils.assertTrue(cancelRes.recycled, 'Nomor harus didaur ulang');

    const saved = mockLetterRepo.findById(letter.letterId);
    TestUtils.assertEqual(saved.status, LETTER_STATUS.CANCELLED, 'Status tersimpan Cancelled');
    TestUtils.assertEqual(saved.cancellationReason, 'Kegiatan fisik dibatalkan oleh dinas terkait', 'Alasan pembatalan tersimpan');

    // Verify counter recycledNumbers pool has the sequence '0005'
    const counter = mockCounterRepo.getCounter('ST', 9, 2026);
    TestUtils.assertTrue(counter && counter.recycledNumbers.includes('0005'), 'Sequence 0005 harus masuk recycled pool September 2026');

    // Verify audit log
    const logs = mockAuditLogRepo.getLogsForLetter(letter.letterId);
    const cancelLog = logs.find(l => l.action === AUDIT_ACTION.CANCEL_TAKE_NUMBER_MANUAL);
    TestUtils.assertTrue(cancelLog, 'Audit log CANCEL_TAKE_NUMBER_MANUAL tercatat');

    // 4. Admin can also cancel manual on a Pending Upload letter
    const letterAdmin = {
      letterId: 'ext-pending-002',
      letterNumber: '0006.ST/IX/2026',
      documentType: DOCUMENT_TYPE.EXTERNAL,
      templateCode: 'ST',
      status: LETTER_STATUS.PENDING_UPLOAD,
      drafterEmail: drafter.email,
      approvalFlow: [{ email: approver.email, role: ROLES.APPROVER }],
      createdAt: now.toISOString(),
      reconciliationDeadline: Utils.addCalendarDaysIso(now, 7)
    };
    mockLetterRepo.save(letterAdmin);

    const adminCancelRes = letterService.cancelTakeNumberManual(admin, letterAdmin.letterId, 'Dibatalkan oleh Administrator karena duplikasi');
    TestUtils.assertEqual(adminCancelRes.status, LETTER_STATUS.CANCELLED, 'Admin berhasil membatalkan nomor');
    const counterAfterAdmin = mockCounterRepo.getCounter('ST', 9, 2026);
    TestUtils.assertTrue(counterAfterAdmin.recycledNumbers.includes('0006'), 'Sequence 0006 masuk recycled pool');
  })();

  // Test 10: Scheduled Daily Audit Day-5 Escalation Reminder (US5)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    const mockNotificationService = {
      escalatedLetters: [],
      expiredLetters: [],
      sendReconciliationEscalationReminder(letter) {
        this.escalatedLetters.push(letter);
        return true;
      },
      sendTakeNumberExpiredNotification(letter) {
        this.expiredLetters.push(letter);
        return true;
      }
    };

    scheduleService.setLetterRepository(mockLetterRepo);
    scheduleService.setCounterRepository(mockCounterRepo);
    scheduleService.setAuditLogRepository(mockAuditLogRepo);
    scheduleService.setNotificationService(mockNotificationService);

    // Create a letter created exactly 5 days ago (diff >= 5 days)
    const simulatedNow = new Date('2026-09-15T10:00:00.000Z');
    const created5DaysAgo = new Date('2026-09-10T10:00:00.000Z');
    const deadlineDay7 = new Date('2026-09-17T10:00:00.000Z');

    const letterDay5 = {
      letterId: 'ext-day5-001',
      letterNumber: '0007.ST/IX/2026',
      documentType: DOCUMENT_TYPE.EXTERNAL,
      templateCode: 'ST',
      status: LETTER_STATUS.PENDING_UPLOAD,
      drafterEmail: 'drafter@koneksi.org',
      approvalFlow: [{ email: 'approver@koneksi.org', role: ROLES.APPROVER }],
      createdAt: created5DaysAgo.toISOString(),
      reconciliationDeadline: deadlineDay7.toISOString(),
      escalationSentAt: null
    };
    mockLetterRepo.save(letterDay5);

    // Run audit at simulatedNow (Day 5)
    const stats = scheduleService.auditPendingReconciliations(simulatedNow);
    TestUtils.assertEqual(stats.checked, 1, '1 surat diperiksa');
    TestUtils.assertEqual(stats.escalated, 1, '1 surat dieskalasi H-2');
    TestUtils.assertEqual(stats.expired, 0, '0 surat kedaluwarsa');
    TestUtils.assertEqual(mockNotificationService.escalatedLetters.length, 1, 'Email eskalasi terkirim');

    const updated = mockLetterRepo.findById(letterDay5.letterId);
    TestUtils.assertTrue(updated.escalationSentAt, 'escalationSentAt harus terisi');

    // Run audit again at simulatedNow -> Duplicate prevention check
    const statsRepeat = scheduleService.auditPendingReconciliations(simulatedNow);
    TestUtils.assertEqual(statsRepeat.escalated, 0, 'Tidak boleh ada eskalasi ganda (duplikat dicegah)');
    TestUtils.assertEqual(statsRepeat.retained, 1, 'Surat dipertahankan');
    TestUtils.assertEqual(mockNotificationService.escalatedLetters.length, 1, 'Jumlah notifikasi tetap 1');
  })();

  // Test 11: Scheduled Daily Audit Day-7 Auto-Expiration & Atomic Recycled Release (US5)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    const mockNotificationService = {
      expiredLetters: [],
      sendTakeNumberExpiredNotification(letter) {
        this.expiredLetters.push(letter);
        return true;
      }
    };

    scheduleService.setLetterRepository(mockLetterRepo);
    scheduleService.setCounterRepository(mockCounterRepo);
    scheduleService.setAuditLogRepository(mockAuditLogRepo);
    scheduleService.setNotificationService(mockNotificationService);

    // Initial counter for September 2026
    mockCounterRepo.saveCounter({
      counterId: 'ST_09_2026',
      templateCode: 'ST',
      month: 9,
      year: 2026,
      currentSequence: 10,
      recycledNumbers: []
    });

    const simulatedNow = new Date('2026-09-17T10:00:01.000Z');
    const pastDeadline = new Date('2026-09-17T10:00:00.000Z'); // Expired by 1 second

    const letterExpired = {
      letterId: 'ext-exp-001',
      letterNumber: '0008.ST/IX/2026',
      documentType: DOCUMENT_TYPE.EXTERNAL,
      templateCode: 'ST',
      status: LETTER_STATUS.PENDING_UPLOAD,
      drafterEmail: 'drafter@koneksi.org',
      approvalFlow: [{ email: 'approver@koneksi.org', role: ROLES.APPROVER }],
      createdAt: new Date('2026-09-10T10:00:00.000Z').toISOString(),
      reconciliationDeadline: pastDeadline.toISOString(),
      escalationSentAt: '2026-09-15T10:00:00.000Z'
    };
    mockLetterRepo.save(letterExpired);

    // Run audit at simulatedNow (H+7 expired)
    const stats = scheduleService.auditPendingReconciliations(simulatedNow);
    TestUtils.assertEqual(stats.checked, 1, '1 surat diperiksa');
    TestUtils.assertEqual(stats.expired, 1, '1 surat kedaluwarsa');

    const updated = mockLetterRepo.findById(letterExpired.letterId);
    TestUtils.assertEqual(updated.status, LETTER_STATUS.EXPIRED, 'Status surat harus Expired');
    TestUtils.assertTrue(updated.cancellationReason.includes('Otomatis kedaluwarsa'), 'Alasan kedaluwarsa otomatis tersimpan');

    // Number 0008 must be returned to recycled pool
    const counter = mockCounterRepo.getCounter('ST', 9, 2026);
    TestUtils.assertTrue(counter.recycledNumbers.includes('0008'), 'Nomor 0008 harus berada dalam recycledNumbers pool September 2026');

    // Notification dispatched
    TestUtils.assertEqual(mockNotificationService.expiredLetters.length, 1, 'Email kedaluwarsa terkirim');

    // Audit log AUTO_EXPIRE_TAKE_NUMBER logged
    const logs = mockAuditLogRepo.getLogsForLetter(letterExpired.letterId);
    const expLog = logs.find(l => l.action === AUDIT_ACTION.AUTO_EXPIRE_TAKE_NUMBER);
    TestUtils.assertTrue(expLog, 'Audit log AUTO_EXPIRE_TAKE_NUMBER tercatat');
  })();

  // Test 12: Partial upload failure rollback cleanup (Task T034)
  (() => {
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    let cleanedUpFileId = null;

    letterService.setLetterRepository(mockLetterRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);

    // Spy on cleanupOrphanedDriveFile
    const originalCleanup = letterService.cleanupOrphanedDriveFile;
    letterService.cleanupOrphanedDriveFile = (fileId) => {
      cleanedUpFileId = fileId;
    };

    const drafter = { email: 'drafter@koneksi.org', role: ROLES.DRAFTER };
    const letter = {
      letterId: 'ext-fail-upload-001',
      letterNumber: '0009.ST/IX/2026',
      documentType: DOCUMENT_TYPE.EXTERNAL,
      templateCode: 'ST',
      status: LETTER_STATUS.PENDING_UPLOAD,
      drafterEmail: drafter.email,
      approvalFlow: [{ email: 'approver@koneksi.org', role: ROLES.APPROVER }],
      createdAt: now.toISOString(),
      reconciliationDeadline: Utils.addCalendarDaysIso(now, 7)
    };
    mockLetterRepo.save(letter);

    // Simulate database failure during save
    mockLetterRepo.save = () => {
      throw new Error('Database locked / quota exceeded');
    };

    TestUtils.assertThrows(
      () => letterService.uploadTakeNumberScan(drafter, letter.letterId, {
        fileName: 'Scan_ST_0009.pdf',
        mimeType: 'application/pdf',
        base64: 'JVBERi0xLjQKJ...'
      }),
      'Database locked',
      'Upload harus gagal dan melempar database error'
    );

    TestUtils.assertTrue(cleanedUpFileId !== null, 'cleanupOrphanedDriveFile harus dipanggil saat database save gagal');

    // Restore original cleanup method
    letterService.cleanupOrphanedDriveFile = originalCleanup;
  })();

  console.log('✓ Seluruh pengujian User Story 1, 2, 3, 5 & Polish TakeNumber PASSED.');
}

// Daftarkan ke suite runner
if (typeof TestUtils !== 'undefined') {
  TestUtils.registerSuite('TakeNumber Test Suite', runTakeNumberTests);
}
