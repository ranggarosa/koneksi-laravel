# Quickstart Validation Guide: Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor)

**Feature**: `specs/002-ambil-nomor-surat/spec.md`  
**Phase**: Phase 1 (Validation Guide)  
**Date**: 2026-09-28  

Dokumen ini memandu langkah-langkah verifikasi dan pengujian fungsional *end-to-end* (E2E) untuk memastikan fitur Ambil Nomor Surat bekerja sesuai spesifikasi teknis dan Konstitusi Proyek.

---

## 1. Prasyarat Pengujian (Prerequisites)

1. Akun Google aktif terdaftar pada sheet `Users` dengan peran:
   - Drafter: `drafter@koneksi.org`
   - Approver: `approver@koneksi.org`
   - Admin: `admin@koneksi.org`
2. Sheet `Letters` telah diperbarui dengan kolom pendukung naskah eksternal (`documentType`, `reconciliationDeadline`, `escalationSentAt`, `cancellationReason`).
3. Pemicu berbasis waktu harian (*daily time-driven trigger*) telah terpasang melalui menu admin atau fungsi `setupTriggers()`.

---

## 2. Pengujian Unit Otomatis (Automated Unit Tests)

Pengujian in-memory dijalankan menggunakan mock repository terisolasi tanpa efek samping ke data produksi:

### Menjalankan Test Suite
1. Buka Apps Script Project di peramban web.
2. Pilih fungsi `runTakeNumberTests` (atau `runAllTests`) pada toolbar atas.
3. Klik **Run** dan amati hasil eksekusi di panel log:

```text
[PASS] test_submit_take_number_valid_metadata
[PASS] test_submit_take_number_prevents_backdating
[PASS] test_submit_take_number_enforces_separation_of_duties
[PASS] test_approve_take_number_allocates_atomic_number
[PASS] test_cancel_in_review_by_drafter
[PASS] test_cancel_pending_upload_releases_number_to_recycled_pool
[PASS] test_upload_scan_transitions_to_approved
[PASS] test_daily_trigger_sends_escalation_on_day_5
[PASS] test_daily_trigger_auto_expires_and_recycles_on_day_7
[PASS] test_admin_can_replace_scan_post_approved
All 10 take-number unit tests PASSED.
```

---

## 3. Skenario Validasi Manual End-to-End (UAT Scenarios)

### Skenario 1: Pengajuan Permohonan Ambil Nomor & Verifikasi No-Backdating
1. Login sebagai `drafter@koneksi.org`.
2. Buka menu **Buat Surat Baru**, pilih tab/opsi **Ambil Nomor Surat (Eksternal / Fisik)**.
3. Periksa kolom Tanggal Surat: pastikan nilai terkunci pada tanggal hari ini dan tidak dapat diubah ke tanggal lampau (*backdating disabled*).
4. Pilih Template: `Surat Tugas (ST)`.
5. Isi Perihal: `Koordinasi Monitoring Evaluasi Wilayah I`.
6. Isi Tujuan: `Kepala Balai Penjaminan Mutu Pendidikan`.
7. Pilih Approver: `approver@koneksi.org`.
8. Klik **Kirim Permohonan**.
9. **Hasil yang Diharapkan**:
   - Permohonan tersimpan dengan status `In Review`, tipe `EXTERNAL`, nomor surat masih `null`.
   - Email notifikasi permohonan masuk ke kotak surat Approver.

---

### Skenario 2: Persetujuan Approver & Alokasi Nomor Atomik
1. Login sebagai `approver@koneksi.org`.
2. Buka dashboard tab **Perlu Tindakan**, buka permohonan yang diajukan pada Skenario 1.
3. Klik **Approve Permohonan Nomor**.
4. **Hasil yang Diharapkan**:
   - Sistem mengalokasikan nomor resmi berformat unik (misal: `0005.ST/IX/2026`).
   - Status surat bertransisi menjadi `Pending Upload`.
   - Batas waktu rekonsiliasi ditetapkan tepat 7 hari kalender ke depan.
   - Drafter menerima email konfirmasi alokasi nomor surat resmi.
   - Di daftar Arsip Publik, surat muncul dengan lencana "Pending Upload".

---

### Skenario 3: Unggah Berkas Scan PDF & Finalisasi Status `Approved`
1. Buka halaman detail nomor surat yang berstatus `Pending Upload` (sebagai Drafter atau Approver).
2. Pada bagian **Unggah Berkas Scan Dokumen Final**, pilih berkas `Surat_Tugas_0005_Signed.pdf` (format PDF, ukuran < 10 MB).
3. Klik **Unggah Berkas Scan**.
4. **Hasil yang Diharapkan**:
   - Berkas tersimpan di folder Google Drive per surat.
   - Status surat diperbarui menjadi `Approved`.
   - Lencana "Pending Upload" hilang dari arsip publik, digantikan status "Approved" dengan tautan pratinjau/unduh berkas scan PDF.
   - Log audit mencatat aksi `UPLOAD_FINAL_SCAN`.

---

### Skenario 4: Pembatalan Mandiri oleh Drafter saat `In Review`
1. Drafter mengajukan permohonan nomor baru untuk template `SP1`.
2. Sebelum Approver memproses, Drafter membuka detail permohonan tersebut dan menekan **Batalkan Permohonan**.
3. **Hasil yang Diharapkan**:
   - Status permohonan langsung berubah menjadi `Cancelled`.
   - Permohonan hilang dari daftar tugas Approver.
   - Tidak ada nomor surat yang dialokasikan atau dikembalikan ke antrean daur ulang.

---

### Skenario 5: Pembatalan Manual Approver/Admin & Verifikasi Daur Ulang Nomor
1. Buat dan setujui permohonan Ambil Nomor hingga berstatus `Pending Upload` dan memegang nomor `0006.ST/IX/2026`.
2. Approver membuka detail surat tersebut, menekan tombol **Batalkan Nomor**, dan mengisi alasan: `Acara resmi dibatalkan panitia luar`.
3. **Hasil yang Diharapkan**:
   - Status surat berubah menjadi `Cancelled`.
   - Nomor `0006` secara atomik dikembalikan ke antrean daur ulang (`recycledNumbers`) pada sheet `Counters`.
   - Di arsip publik, surat tetap muncul dengan lencana abu-abu `Cancelled` dan tombol unduh dinonaktifkan.
4. Ajukan dan setujui permohonan nomor `ST` baru berikutnya.
5. **Hasil yang Diharapkan**:
   - Nomor yang terbit adalah `0006.ST/IX/2026` (menggunakan kembali nomor yang didaur ulang).

---

### Skenario 6: Pemicu Terjadwal Harian (Eskalasi H-2 & Auto-Expire H+7)
1. Siapkan 2 baris surat pengujian pada sheet `Letters`:
   - Surat A: Berstatus `Pending Upload`, tanggal persetujuan 5 hari yang lalu (`escalationSentAt = null`).
   - Surat B: Berstatus `Pending Upload`, tanggal persetujuan 8 hari yang lalu (`reconciliationDeadline` telah terlewati).
2. Eksekusi fungsi `runDailyReconciliationAudit()` secara manual di Script Editor.
3. **Hasil yang Diharapkan**:
   - Surat A: Menerima email peringatan eskalasi, kolom `escalationSentAt` terisi tanggal saat ini, status tetap `Pending Upload`.
   - Surat B: Status berubah menjadi `Expired`, nomor surat otomatis dilepaskan ke antrean daur ulang, email notifikasi kedaluwarsa terkirim, dan lencana di arsip publik berubah menjadi abu-abu `Expired`.

---

### Skenario 7: Koreksi Berkas Scan Pasca-Approved oleh Admin
1. Login sebagai `admin@koneksi.org`.
2. Buka surat yang telah berstatus `Approved` dari Skenario 3.
3. Pada panel koreksi admin, unggah berkas scan perbaikan `Surat_Tugas_0005_Signed_Revisi.pdf` dan isi alasan: `Scan halaman 2 sebelumnya terpotong`.
4. Klik **Simpan Koreksi Scan**.
5. **Hasil yang Diharapkan**:
   - Berkas di Google Drive diperbarui.
   - Status surat tetap `Approved`.
   - Log audit mencatat aksi `REPLACE_FINAL_SCAN_ADMIN` beserta alasan koreksi admin.
