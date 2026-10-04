# Comprehensive Requirements Quality Checklist: Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor)

**Purpose**: Menilai kelengkapan, kejelasan, konsistensi, cakupan skenario batas, dan keterukuran persyaratan fungsional fitur "Ambil Nomor Surat" (Reservasi Nomor Surat Eksternal) pada spesifikasi dan rencana implementasi sebelum eksekusi tugas pengembangan.  
**Created**: 2026-09-28  
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md)  

**Note**: Checklist ini dihasilkan oleh perintah `/speckit-checklist` berdasarkan domain spesifikasi fitur, konstitusi proyek, dan keputusan klarifikasi.  
**Review Ownership**: Checklist ini adalah artefak tinjauan kualitas persyaratan milik peninjau (*reviewer-owned requirements-quality review artifact*). Tandai item dengan `[x]` hanya ketika peninjau memastikan kriteria kualitas penulisan persyaratan telah terpenuhi dalam spesifikasi.  
**Marker Semantics**: `[x]` menandakan bahwa kriteria kualitas penulisan persyaratan telah ditinjau dan dinyatakan memuaskan. `[x]` **BUKAN** penanda bahwa pekerjaan kode/implementasi telah selesai.  

---

## 1. Alokasi Penomoran & Konkurensi Atomik (Atomic Numbering & Concurrency)

- [x] CHK001 - Apakah persyaratan alokasi nomor surat secara atomik menggunakan antrean daur ulang (`recycledNumbers`) sebelum menaikkan nomor urut counter baru didefinisikan secara lengkap tanpa ambiguitas? [Completeness, Spec §FR-004, Constitution §Principle III]
- [x] CHK002 - Apakah format nomor surat resmi `{urutan:04d}.{kode_template}/{bulan_romawi}/{tahun}` dan mekanisme penguncian atomik (`LockService`) dispesifikasikan dengan jelas untuk mencegah kondisi balapan (*race condition*) saat persetujuan simultan? [Clarity, Spec §FR-005, Plan §Architecture]
- [x] CHK003 - Apakah penanganan nomor kedaluwarsa pada masa transisi pergantian bulan (misal disetujui akhir September dan kedaluwarsa awal Oktober) dispesifikasikan secara tegas agar nomor dikembalikan ke counter bulan asalnya dan bukan bulan saat trigger berjalan? [Edge Case, Spec §Edge Cases, Clarification 2026-09-28]
- [x] CHK004 - Apakah aturan bahwa permohonan yang dibatalkan oleh Drafter atau ditolak oleh Approver sama sekali TIDAK mengalokasikan nomor surat maupun mengubah status counter didefinisikan secara konsisten di seluruh skenario? [Consistency, Spec §FR-003, Spec §FR-015]

---

## 2. Otorisasi, Batasan Peran & Tata Kelola (Authorization, Separation of Duties & Governance)

- [x] CHK005 - Apakah persyaratan pemisahan wewenang (*separation of duties*) didefinisikan secara lengkap, termasuk larangan Drafter memilih alamat email dirinya sendiri sebagai Approver pada form Ambil Nomor? [Completeness, Spec §FR-001, Spec §FR-002]
- [x] CHK006 - Apakah penguncian kolom Tanggal Surat pada tanggal berjalan formulir (tanpa izin tanggal mundur / *backdating* maupun tanggal masa depan) dispesifikasikan secara tegas dan tidak ambigu pada sisi klien dan server? [Clarity, Spec §FR-001, Clarification 2026-09-28]
- [x] CHK007 - Apakah hak dan batasan pembatalan manual sebelum 7 hari dispesifikasikan secara tegas untuk masing-masing peran (Approver dan Admin) disertai kewajiban menyertakan alasan pembatalan? [Coverage, Spec §FR-013, Clarification 2026-09-28]
- [x] CHK008 - Apakah hak akses koreksi berkas scan fisik pasca-`Approved` didefinisikan secara konsisten hanya untuk peran Admin dengan kewajiban mencatat alasan koreksi pada log audit? [Consistency, Spec §FR-007, Spec §FR-014, Clarification 2026-09-28]

---

## 3. Siklus Hidup, Batas Waktu & Pemicu Terjadwal (Lifecycle, SLA & Scheduled Triggers)

- [x] CHK009 - Apakah batas waktu rekonsiliasi 7 hari kalender (168 jam) dikuantifikasi secara presisi sejak stempel waktu persetujuan, bukan berdasarkan hitungan tanggal kalender lokal semata? [Clarity, Spec §FR-004, Spec §FR-009]
- [x] CHK010 - Apakah alur eskalasi H-2 (hari ke-5) dispesifikasikan secara lengkap mengenai kriteria pemicu, target penerima email (Drafter dan Approver), serta pencegahan pengiriman email berulang (*duplicate escalation dispatch*)? [Completeness, Spec §FR-009, Spec §User Story 5]
- [x] CHK011 - Apakah kondisi balapan batas waktu (*last-minute upload race condition*) antara pengguna yang sedang mengunggah berkas scan dan eksekusi trigger kedaluwarsa otomatis dispesifikasikan penanganannya secara tegas? [Edge Case, Spec §Edge Cases, Spec §FR-010]
- [x] CHK012 - Apakah perilaku sistem saat terjadi kegagalan eksekusi pemicu harian (*trigger failure*) atau terlampauinya kuota harian email Apps Script (`MailApp`) telah diidentifikasi batasannya dalam asumsi atau persyaratan? [Coverage, Gap, Spec §Assumptions, Plan §Tech Stack]

---

## 4. Pengelolaan Berkas Scan & Transparansi Arsip (Scan Asset Management & Archive Visibility)

- [x] CHK013 - Apakah batasan teknis berkas scan fisik (hanya format PDF, ukuran maksimum 10 MB) dan validasi MIME-type di sisi server dispesifikasikan secara eksplisit? [Completeness, Spec §FR-007, Spec §Assumptions]
- [x] CHK014 - Apakah aturan integritas simpan berkas di Google Drive dispesifikasikan dengan jelas, sehingga kegagalan simpan berkas tidak akan mengubah status surat menjadi `Approved`? [Clarity, Spec §FR-008, Spec §Edge Cases]
- [x] CHK015 - Apakah spesifikasi konsisten dalam mengatur tampilan arsip publik bahwa nomor `Pending Upload`, `Expired`, dan `Cancelled` tetap terlihat transparan bagi seluruh akun whitelist dengan tombol unduh dinonaktifkan untuk status non-aktif? [Consistency, Spec §FR-006, Clarification 2026-09-28]
- [x] CHK016 - Apakah visualisasi indikator sisa hari rekonsiliasi pada daftar arsip dan halaman detail surat dispesifikasikan kriterianya secara objektif? [Measurability, Acceptance Criteria, Spec §FR-006, Spec §User Story 4]

---

## 5. Jejak Audit, Sanitasi Defensif & Penanganan Anomali (Audit Trail, Input Sanitization & Resilience)

- [x] CHK017 - Apakah seluruh jenis aksi siklus hidup permohonan eksternal (`SUBMIT_EXTERNAL_REQUEST`, `APPROVE_REQUEST`, `REJECT_REQUEST`, `CANCEL_IN_REVIEW`, `UPLOAD_SCAN_FILE`, `ESCALATION_REMINDER_SENT`, `AUTO_EXPIRE_RELEASE`, `MANUAL_CANCEL_RELEASE`, `ADMIN_REPLACE_SCAN`) dicakup secara lengkap dalam spesifikasi pencatatan log audit? [Completeness, Spec §FR-011, Data Model §ApprovalLog]
- [x] CHK018 - Apakah persyaratan sanitasi defensif terhadap karakter formula injeksi spreadsheet (`=`, `+`, `-`, `@`) dispesifikasikan secara eksplisit untuk kolom Perihal dan Tujuan sebelum disimpan ke lembar data? [Clarity, Spec §FR-012, Constitution §Principle V]
- [x] CHK019 - Apakah seluruh kriteria keberhasilan (SC-001 hingga SC-007) diformulasikan dengan indikator kuantitatif yang dapat diuji secara objektif oleh penguji (QA) dan peninjau (Reviewer)? [Measurability, Spec §SC-001, Spec §SC-007]

---

## Notes

- Mark items `[x]` only after review confirms the requirement-quality criterion is satisfied.
- Leave items unchecked (`[ ]`) when they still require clarification, correction, or reviewer evaluation.
- `/speckit-implement` reads checklist checkbox state as a quality gate and must not modify markers.
- `checklists/requirements.md` has a separate built-in lifecycle maintained by `/speckit-specify` and `/speckit-clarify`.
- Add inline comments, findings, or references under each item when conducting the review.
- Items are numbered sequentially (`CHK001` - `CHK019`) for clear cross-referencing in pull request discussions.
