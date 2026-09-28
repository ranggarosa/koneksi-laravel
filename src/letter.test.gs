/**
 * Unit Tests: Letter Service & Sequential Approval Flow (User Story 2 & U1 Remediation)
 */

function runLetterTests() {
  console.log('--- Menjalankan LetterService Unit Tests ---');

  const drafter = { email: 'drafter@gmail.com', name: 'Drafter HR', role: ROLES.DRAFTER, isActive: true };
  const reviewer1 = { email: 'rev1@gmail.com', name: 'Reviewer Satu', role: ROLES.REVIEWER, isActive: true };
  const reviewer2 = { email: 'rev2@gmail.com', name: 'Reviewer Dua', role: ROLES.REVIEWER, isActive: true };
  const approver = { email: 'head.hr@gmail.com', name: 'Head of HR', role: ROLES.APPROVER, isActive: true, signatureFileId: 'sig-123' };
  const outsider = { email: 'outsider@gmail.com', name: 'Staf Lain', role: ROLES.DRAFTER, isActive: true };

  const setupServices = () => {
    const mockUserRepo = TestUtils.createMockUserRepository([drafter, reviewer1, reviewer2, approver, outsider]);
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    const mockLetterRepo = TestUtils.createMockLetterRepository();
    const mockAuditLogRepo = TestUtils.createMockAuditLogRepository();
    const mockDocSvc = TestUtils.createMockDocumentService();
    const mockNotifSvc = TestUtils.createMockNotificationService();

    numberingService.setCounterRepository(mockCounterRepo);
    letterService.setLetterRepository(mockLetterRepo);
    letterService.setNumberingService(numberingService);
    letterService.setUserRepository(mockUserRepo);
    letterService.setAuditLogRepository(mockAuditLogRepo);
    letterService.setDocumentService(mockDocSvc);
    letterService.setNotificationService(mockNotifSvc);

    return { mockLetterRepo, mockCounterRepo, mockAuditLogRepo };
  };

  // Test 1: Self-Approval Prevention (U1)
  (() => {
    setupServices();

    // Drafter menunjuk diri sendiri sebagai Approver -> Harus ditolak
    TestUtils.assertThrows(() => {
      letterService.submitDraft(drafter, {
        templateCode: 'SP1',
        templateType: 'Surat Peringatan 1',
        contentData: { namaKaryawan: 'A' },
        reviewers: [],
        approver: { email: drafter.email, name: drafter.name }
      });
    }, 'SELF_APPROVAL_PROHIBITED', 'Drafter tidak boleh menjadi Approver drafnya sendiri');

    // Drafter menunjuk diri sendiri sebagai Reviewer -> Harus ditolak
    TestUtils.assertThrows(() => {
      letterService.submitDraft(drafter, {
        templateCode: 'SP1',
        templateType: 'Surat Peringatan 1',
        contentData: { namaKaryawan: 'A' },
        reviewers: [{ email: drafter.email, name: drafter.name }],
        approver: { email: approver.email, name: approver.name }
      });
    }, 'SELF_APPROVAL_PROHIBITED', 'Drafter tidak boleh menjadi Reviewer drafnya sendiri');
  })();

  // Test 2: Alur Persetujuan Sekuensial Berjenjang & Penolakan Prematur
  (() => {
    setupServices();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'SP1',
      templateType: 'Surat Peringatan 1',
      contentData: { namaKaryawan: 'Budi' },
      reviewers: [
        { email: reviewer1.email, name: reviewer1.name },
        { email: reviewer2.email, name: reviewer2.name }
      ],
      approver: { email: approver.email, name: approver.name }
    });

    const letterId = created.letterId;

    // Reviewer 2 atau Approver mencoba approve sebelum giliran -> Harus ditolak (NOT_YOUR_TURN)
    TestUtils.assertThrows(() => {
      letterService.decide(reviewer2, letterId, 'approve', 'Lompat urutan');
    }, 'NOT_YOUR_TURN', 'Peninjau tahap 2 tidak boleh bertindak mendahului tahap 1');

    TestUtils.assertThrows(() => {
      letterService.decide(approver, letterId, 'approve', 'Lompat urutan', 'digital');
    }, 'NOT_YOUR_TURN', 'Approver akhir tidak boleh bertindak mendahului tahap 1 & 2');

    // Reviewer 1 menyetujui sesuai giliran
    const res1 = letterService.decide(reviewer1, letterId, 'approve', 'Reviewer 1 OK');
    TestUtils.assertEqual(res1.status, LETTER_STATUS.IN_REVIEW);
    TestUtils.assertEqual(res1.nextReviewer, reviewer2.email);

    // Sekarang Reviewer 2 yang berhak bertindak
    const res2 = letterService.decide(reviewer2, letterId, 'approve', 'Reviewer 2 OK');
    TestUtils.assertEqual(res2.status, LETTER_STATUS.IN_REVIEW);
    TestUtils.assertEqual(res2.nextReviewer, approver.email);

    // Sekarang Approver akhir mengesahkan dengan Tanda Tangan Digital
    const res3 = letterService.decide(approver, letterId, 'approve', 'Final OK', 'digital');
    TestUtils.assertEqual(res3.status, LETTER_STATUS.APPROVED);
    TestUtils.assertTrue(res3.finalPdfUrl, 'PDF final harus terbit');
  })();

  // Test 3: Penolakan Langsung Mengunci Status Permanen & Rilis Nomor ke Recycled Pool
  (() => {
    const { mockCounterRepo } = setupServices();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'SP1',
      templateType: 'Surat Peringatan 1',
      contentData: { namaKaryawan: 'Citra' },
      reviewers: [{ email: reviewer1.email, name: reviewer1.name }],
      approver: { email: approver.email, name: approver.name }
    });

    const letterId = created.letterId;
    const letterNumber = created.letterNumber;

    // Reviewer 1 menolak draf
    const rejectRes = letterService.decide(reviewer1, letterId, 'reject', 'Pelanggaran kurang bukti');
    TestUtils.assertEqual(rejectRes.status, LETTER_STATUS.REJECTED);

    // Draf harus terkunci secara permanen; aksi lanjutan ditolak
    TestUtils.assertThrows(() => {
      letterService.decide(approver, letterId, 'approve', 'Mencoba approve surat yang sudah ditolak', 'digital');
    }, 'telah ditolak', 'Draf rejected harus dikunci dari aksi approval lanjutan');

    // Nomor surat harus sudah masuk ke recycled pool pada counter
    const now = new Date();
    const counter = mockCounterRepo.getCounter('SP1', now.getMonth() + 1, now.getFullYear());
    TestUtils.assertTrue(counter.recycledNumbers.length > 0, 'Nomor surat harus masuk antrean daur ulang');
    const parsed = Utils.parseLetterNumber(letterNumber);
    TestUtils.assertEqual(counter.recycledNumbers[0], parsed.sequence, 'Nomor surat yang ditolak harus cocok');
  })();

  // Test 4: Hak Akses Privasi (In-Review Private vs Approved Open Archive)
  (() => {
    setupServices();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'SP1',
      templateType: 'Surat Peringatan 1',
      contentData: { namaKaryawan: 'Private Person' },
      reviewers: [{ email: reviewer1.email, name: reviewer1.name }],
      approver: { email: approver.email, name: approver.name }
    });

    // Partisipan dapat mengakses detail
    const detailDrafter = letterService.getLetterDetail(drafter, created.letterId);
    TestUtils.assertEqual(detailDrafter.letterId, created.letterId);

    // Pengguna luar yang tidak berpartisipasi DITOLAK saat draf berstatus In Review
    TestUtils.assertThrows(() => {
      letterService.getLetterDetail(outsider, created.letterId);
    }, 'FORBIDDEN', 'Pengguna luar dilarang mengakses draf in-review');

    // Selesaikan persetujuan hingga Approved
    letterService.decide(reviewer1, created.letterId, 'approve', 'OK');
    letterService.decide(approver, created.letterId, 'approve', 'Approved', 'digital');

    // Setelah status Approved, dokumen menjadi Arsip Terbuka dan dapat diakses oleh outsider
    const detailOutsider = letterService.getLetterDetail(outsider, created.letterId);
    TestUtils.assertEqual(detailOutsider.status, LETTER_STATUS.APPROVED, 'Arsip disetujui terbuka untuk semua pegawai');
  })();

  console.log('✓ Seluruh pengujian LetterService berhasil.');
}

if (typeof TestUtils !== 'undefined') {
  TestUtils.registerSuite('LetterService Test Suite', runLetterTests);
}
