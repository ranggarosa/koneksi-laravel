/**
 * Unit Tests: Numbering Service & Recycled Numbers Pool (User Story 1 & Rule #5)
 */

function runNumberingTests() {
  console.log('--- Menjalankan NumberingService Unit Tests ---');

  // Test 1: Alokasi Sekuensial Awal (Tanpa Recycled Pool)
  (() => {
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    numberingService.setCounterRepository(mockCounterRepo);

    const num1 = numberingService.allocateNumber('SP1', 9, 2026);
    TestUtils.assertEqual(num1.sequenceNumber, '0001', 'Nomor urut pertama harus 0001');
    TestUtils.assertEqual(num1.formattedNumber, '0001.SP1/IX/2026', 'Format nomor surat pertama');

    const num2 = numberingService.allocateNumber('SP1', 9, 2026);
    TestUtils.assertEqual(num2.sequenceNumber, '0002', 'Nomor urut kedua harus 0002');
    TestUtils.assertEqual(num2.formattedNumber, '0002.SP1/IX/2026', 'Format nomor surat kedua');

    const num3 = numberingService.allocateNumber('SP1', 9, 2026);
    TestUtils.assertEqual(num3.sequenceNumber, '0003', 'Nomor urut ketiga harus 0003');
    TestUtils.assertEqual(num3.formattedNumber, '0003.SP1/IX/2026', 'Format nomor surat ketiga');
  })();

  // Test 2: Alokasi dari Recycled Numbers Pool (FIFO Priority)
  (() => {
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    numberingService.setCounterRepository(mockCounterRepo);

    // Alokasikan 0001, 0002, 0003
    numberingService.allocateNumber('SP1', 9, 2026); // 0001
    numberingService.allocateNumber('SP1', 9, 2026); // 0002
    numberingService.allocateNumber('SP1', 9, 2026); // 0003

    // Surat 0002 ditolak -> rilis ke pool
    numberingService.releaseNumber('SP1', 9, 2026, '0002');

    // Alokasi berikutnya harus mengambil 0002 dari pool terlebih dahulu
    const recycledAlloc = numberingService.allocateNumber('SP1', 9, 2026);
    TestUtils.assertEqual(recycledAlloc.sequenceNumber, '0002', 'Alokasi harus mengambil nomor daur ulang 0002');
    TestUtils.assertEqual(recycledAlloc.formattedNumber, '0002.SP1/IX/2026', 'Format nomor daur ulang');

    // Alokasi setelah pool kosong harus melanjutkan sequence tertinggi berikutnya (0004)
    const nextAlloc = numberingService.allocateNumber('SP1', 9, 2026);
    TestUtils.assertEqual(nextAlloc.sequenceNumber, '0004', 'Alokasi setelah pool kosong harus 0004');
    TestUtils.assertEqual(nextAlloc.formattedNumber, '0004.SP1/IX/2026', 'Format nomor urut 0004');
  })();

  // Test 3: Multi-entry Recycled Pool FIFO Order
  (() => {
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    numberingService.setCounterRepository(mockCounterRepo);

    numberingService.allocateNumber('ST', 10, 2026); // 0001
    numberingService.allocateNumber('ST', 10, 2026); // 0002
    numberingService.allocateNumber('ST', 10, 2026); // 0003

    // Rilis 0001 lalu 0003
    numberingService.releaseNumber('ST', 10, 2026, '0001');
    numberingService.releaseNumber('ST', 10, 2026, '0003');

    // Harus dialokasikan berurutan: 0001, lalu 0003, lalu 0004
    const firstOut = numberingService.allocateNumber('ST', 10, 2026);
    TestUtils.assertEqual(firstOut.sequenceNumber, '0001', 'FIFO: harus 0001');

    const secondOut = numberingService.allocateNumber('ST', 10, 2026);
    TestUtils.assertEqual(secondOut.sequenceNumber, '0003', 'FIFO: harus 0003');

    const thirdOut = numberingService.allocateNumber('ST', 10, 2026);
    TestUtils.assertEqual(thirdOut.sequenceNumber, '0004', 'Melanjutkan sequence urut 0004');
  })();

  // Test 4: Isolasi Counter Antar Template dan Bulan
  (() => {
    const mockCounterRepo = TestUtils.createMockCounterRepository();
    numberingService.setCounterRepository(mockCounterRepo);

    const sp1Sep = numberingService.allocateNumber('SP1', 9, 2026);
    const stSep = numberingService.allocateNumber('ST', 9, 2026);
    const sp1Oct = numberingService.allocateNumber('SP1', 10, 2026);

    TestUtils.assertEqual(sp1Sep.formattedNumber, '0001.SP1/IX/2026', 'Counter SP1 Sep');
    TestUtils.assertEqual(stSep.formattedNumber, '0001.ST/IX/2026', 'Counter ST Sep independen');
    TestUtils.assertEqual(sp1Oct.formattedNumber, '0001.SP1/X/2026', 'Counter SP1 Okt reset ke 0001');
  })();

  console.log('✓ Seluruh pengujian NumberingService berhasil.');
}

// Daftarkan ke suite runner
if (typeof TestUtils !== 'undefined') {
  TestUtils.registerSuite('NumberingService Test Suite', runNumberingTests);
}
