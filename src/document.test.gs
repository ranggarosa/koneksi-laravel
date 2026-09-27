/**
 * Unit Tests: Document Service & Dual-Path Signature Verification (User Story 3)
 */

function runDocumentTests() {
  console.log('--- Menjalankan DocumentService Unit Tests ---');

  const drafter = { email: 'drafter@gmail.com', name: 'Drafter HR', role: ROLES.DRAFTER, isActive: true };
  const approver = {
    email: 'head.hr@gmail.com',
    name: 'Head of HR',
    role: ROLES.APPROVER,
    isActive: true,
    signatureFileId: 'sig-file-123'
  };

  const setupEnv = () => {
    const mockUserRepo = TestUtils.createMockUserRepository([drafter, approver]);
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

    return { mockDocSvc, mockLetterRepo };
  };

  // Test 1: Jalur Tanda Tangan Digital Menghasilkan PDF Final & Status Approved
  (() => {
    const { mockDocSvc } = setupEnv();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'SP1',
      templateType: 'Surat Peringatan 1',
      contentData: { namaKaryawan: 'Dodi', nik: '123' },
      reviewers: [],
      approver: { email: approver.email, name: approver.name }
    });

    const res = letterService.decide(approver, created.letterId, 'approve', 'Disetujui', 'digital');
    TestUtils.assertEqual(res.status, LETTER_STATUS.APPROVED, 'Status surat harus Approved');
    TestUtils.assertTrue(res.finalPdfUrl, 'URL PDF final harus terbit');
    TestUtils.assertEqual(mockDocSvc.createdPdfs.length, 1, 'PDF harus diekspor 1 kali');
  })();

  // Test 2: Jalur Tanda Tangan Basah Mengalihkan ke Status Menunggu Scan
  (() => {
    const { mockDocSvc } = setupEnv();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'ST',
      templateType: 'Surat Tugas',
      contentData: { namaKaryawan: 'Eka', nik: '456' },
      reviewers: [],
      approver: { email: approver.email, name: approver.name }
    });

    const res = letterService.decide(approver, created.letterId, 'approve', 'Disetujui via basah', 'wet');
    TestUtils.assertEqual(res.status, LETTER_STATUS.IN_REVIEW, 'Status tetap In Review menunggu tanda tangan basah');
    TestUtils.assertTrue(res.awaitingWetSignature, 'awaitingWetSignature harus true');
    TestUtils.assertTrue(res.unsignedDriveFileId, 'Draf unsigned harus diterbitkan di Drive');
    TestUtils.assertEqual(mockDocSvc.createdDrafts.length, 1, 'Draf unsigned dibuat 1 kali');
  })();

  // Test 3: Pengunggahan Scan Tanda Tangan Basah Berhasil Memperbarui Revisi & Mengesahkan Dokumen
  (() => {
    setupEnv();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'SK',
      templateType: 'Surat Keputusan',
      contentData: { namaKaryawan: 'Fajar', nik: '789' },
      reviewers: [],
      approver: { email: approver.email, name: approver.name }
    });

    letterService.decide(approver, created.letterId, 'approve', 'OK', 'wet');

    // Unggah scan PDF
    const uploadRes = letterService.uploadWetSignatureScan(
      drafter,
      created.letterId,
      'JVBERi0xLjQK...',
      'application/pdf',
      'scan_sk_fajar.pdf'
    );

    TestUtils.assertEqual(uploadRes.status, LETTER_STATUS.APPROVED, 'Status berubah menjadi Approved setelah scan diunggah');
    TestUtils.assertEqual(uploadRes.verifiedRevisionId, '2', 'Revisi baru (revisi 2) harus terverifikasi');

    const detail = letterService.getLetterDetail(drafter, created.letterId);
    TestUtils.assertFalse(detail.awaitingWetSignature, 'awaitingWetSignature harus false setelah pengesahan');
    TestUtils.assertEqual(detail.status, LETTER_STATUS.APPROVED);
  })();

  // Test 4: Penolakan Format Berkas Tidak Valid Saat Unggah Scan
  (() => {
    setupEnv();

    const created = letterService.submitDraft(drafter, {
      templateCode: 'SP1',
      templateType: 'Surat Peringatan 1',
      contentData: { namaKaryawan: 'Gita' },
      reviewers: [],
      approver: { email: approver.email, name: approver.name }
    });

    letterService.decide(approver, created.letterId, 'approve', 'OK', 'wet');

    // Coba unggah file teks / zip yang tidak diizinkan
    TestUtils.assertThrows(() => {
      letterService.uploadWetSignatureScan(
        drafter,
        created.letterId,
        'AAAA...',
        'application/zip',
        'arsip.zip'
      );
    }, 'tidak diizinkan', 'Berkas selain PDF/PNG/JPG harus ditolak');
  })();

  console.log('✓ Seluruh pengujian DocumentService berhasil.');
}

if (typeof TestUtils !== 'undefined') {
  TestUtils.registerSuite('DocumentService Test Suite', runDocumentTests);
}
