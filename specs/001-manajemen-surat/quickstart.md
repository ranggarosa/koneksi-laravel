# Quickstart Validation Guide: Sistem Manajemen Surat Menyurat (Koneksi)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Phase**: Phase 1 (Validation Guide)  
**Date**: 2026-09-27  

Dokumen ini memandu langkah-langkah verifikasi dan pengujian fungsional *end-to-end* (E2E) untuk memastikan fitur bekerja sesuai spesifikasi dan konstitusi proyek.

---

## 1. Prasyarat Lingkungan (Prerequisites)

1. Akun Google dengan akses Google Drive dan Google Apps Script.
2. File konfigurasi dan ID Spreadsheet diset pada **Script Properties** Apps Script:
   - `SPREADSHEET_ID`: ID spreadsheet `AppDatabase`.
   - `ROOT_FOLDER_ID`: ID folder root `Surat Menyurat`.
   - `TEMPLATES_FOLDER_ID`: ID folder template dokumen.
   - `SIGNATURES_FOLDER_ID`: ID folder tanda tangan referensi.
   - `LETTERS_FOLDER_ID`: ID folder arsip surat.
3. Spreadsheet `AppDatabase` memiliki 4 sheet utama dengan header sesuai [Data Model](data-model.md):
   - `Users`, `Letters`, `Counters`, `ApprovalLog`.
4. Clasp CLI terpasang secara lokal untuk sinkronisasi kode:
   ```bash
   npm install -g @google/clasp
   clasp login
   ```

---

## 2. Menjalankan Automated Unit Tests

Seluruh pengujian unit kritis dijalankan tanpa menyentuh Google Sheets / Drive nyata (menggunakan mock repository in-memory via *Dependency Injection*):

### Opsi A: Melalui Apps Script Web Editor
1. Buka Apps Script Project di peramban.
2. Pada dropdown fungsi di toolbar atas, pilih fungsi `runAllTests`.
3. Klik **Run**.
4. Periksa panel Execution Log:
   ```text
   [PASS] test_numbering_atomic_no_duplicates
   [PASS] test_numbering_recycled_pool_priority
   [PASS] test_sequential_approval_enforcement
   [PASS] test_rejection_terminates_and_locks_archive
   [PASS] test_signature_branching_digital_vs_wet
   [PASS] test_auth_whitelist_and_inactive_lockout
   [PASS] test_wet_signature_revision_verification
   All 7 critical tests PASSED.
   ```

### Opsi B: Melalui Terminal (`clasp`)
```bash
clasp run runAllTests
```

---

## 3. Skenario Validasi Manual End-to-End (UAT Checklist)

### Skenario 1: Pembuatan Draf & Penomoran Atomik (Drafter)
1. Buka Web App URL (`/exec`).
2. Login menggunakan email ber-role `drafter` (misal: `drafter@gmail.com`).
3. Buka menu **Buat Surat Baru**.
4. Pilih template `Surat Peringatan 1 (SP1)`, isi data karyawan dan alasan surat.
5. Tentukan urutan peninjau: 1 Reviewer (`reviewer@gmail.com`) dan 1 Approver (`approver@gmail.com`).
6. Klik **Kirim Draf**.
7. **Hasil yang Diharapkan**:
   - Status surat berubah menjadi `In Review`.
   - Nomor resmi terbit dengan format `0001.SP1/IX/2026`.
   - Baris baru tercatat di sheet `Letters` dan sheet `ApprovalLog` (`submit_draft`).

---

### Skenario 2: Persetujuan Berjenjang & Finalisasi Digital (Approver)
1. Login sebagai `reviewer@gmail.com`.
2. Pada Dashboard tab **Perlu Tindakan**, buka surat yang dibuat pada Skenario 1.
3. Klik **Approve** dengan catatan "Disetujui".
4. Login sebagai `approver@gmail.com`.
5. Buka surat tersebut, pilih metode **Tanda Tangan Digital**, lalu klik **Approve Final**.
6. **Hasil yang Diharapkan**:
   - Status surat berubah langsung menjadi `Approved`.
   - PDF final terbit di Google Drive dengan tanda tangan digital terpasang.
   - Tautan PDF dapat diunduh dan surat berpindah ke arsip terbuka.

---

### Skenario 3: Penolakan Draf & Daur Ulang Nomor Surat
1. Drafter membuat draf surat baru, memperoleh nomor `0002.SP1/IX/2026`.
2. Reviewer membuka draf tersebut dan memilih **Reject** dengan alasan "Data NIK tidak cocok".
3. **Hasil yang Diharapkan**:
   - Status surat berubah permanen menjadi `Rejected`.
   - Draf terkunci (tidak bisa diedit lagi).
   - Nomor surat `0002` masuk ke kolom `recycledNumbers` pada sheet `Counters`.
4. Drafter membuat draf surat baru lagi untuk template `SP1`.
5. **Hasil yang Diharapkan**:
   - Draf baru secara otomatis menggunakan nomor `0002.SP1/IX/2026` dari antrean daur ulang (bukan `0003`).

---

### Skenario 4: Finalisasi Tanda Tangan Basah & Unggah Scan via Web App
1. Buat surat baru dan proses approval hingga Approver akhir.
2. Approver akhir memilih metode **Tanda Tangan Basah** dan klik **Approve Final**.
3. **Hasil yang Diharapkan**:
   - Status surat tetap `In Review` dengan `awaitingWetSignature = TRUE`.
   - Berkas draf unsigned tersedia di Google Drive.
4. Buka detail surat di Web App, pilih file PDF scan bertanda tangan fisik pada form unggah, lalu klik **Unggah & Selesaikan Dokumen**.
5. **Hasil yang Diharapkan**:
   - Sistem memperbarui berkas Drive melalui `Drive.Files.update`.
   - Status surat berubah menjadi `Approved` setelah revisi baru terverifikasi.
