# Security & Access Control Checklist: Sistem Manajemen Surat Menyurat (Koneksi)

**Purpose**: Menilai kelengkapan, kejelasan, konsistensi, dan ketegasan persyaratan keamanan, otorisasi, privasi data, dan mitigasi ancaman pada spesifikasi fitur sebelum fase implementasi.  
**Created**: 2026-09-27  
**Feature**: [spec.md](../spec.md)  

**Note**: Checklist ini dihasilkan oleh perintah `/speckit-checklist` berdasarkan konteks spesifikasi fitur dan konstitusi proyek.  
**Review Ownership**: Checklist ini adalah artefak tinjauan kualitas persyaratan milik peninjau (reviewer-owned). Tandai item dengan `[x]` hanya ketika peninjau telah memastikan bahwa kriteria kualitas persyaratan telah terpenuhi dalam spesifikasi.  
**Marker Semantics**: `[x]` menandakan bahwa kriteria kualitas penulisan persyaratan telah ditinjau dan dinyatakan memuaskan. `[x]` BUKAN penanda bahwa pekerjaan kode/implementasi telah selesai.  

---

## 1. Autentikasi & Whitelist (Authentication & Identity)

- [x] CHK001 - Apakah persyaratan verifikasi autentikasi sesi terdaftar dinyatakan secara eksplisit pada setiap fungsi Controller di sisi server? [Coverage, Spec §FR-001, Constitution §Principle II]
- [x] CHK002 - Apakah spesifikasi mendefinisikan respons kesalahan dan perilaku sistem secara spesifik ketika sesi akun Google aktif tidak terdeteksi? [Clarity, Spec §FR-001, Contract §Auth-1]
- [x] CHK003 - Apakah persyaratan penolakan seketika didefinisikan untuk pengguna yang dinonaktifkan (`isActive = FALSE`) di tengah alur kerja aktif? [Edge Case, Spec §FR-001, Spec §Edge Cases]
- [x] CHK004 - Apakah aturan penerimaan akun email pribadi Google (non-organisasi) yang wajib terdaftar di whitelist dinyatakan tanpa ambiguitas? [Clarity, Spec §Assumptions, Constitution §Tech Stack]

---

## 2. Otorisasi Berbasis Peran & Alur Berjenjang (Role-Based Authorization & Sequential Integrity)

- [x] CHK005 - Apakah batasan izin berbasis peran (Drafter, Reviewer, Approver, Admin) didefinisikan secara lengkap untuk setiap entitas pengguna? [Completeness, Spec §FR-002, Spec §Key Entities]
- [x] CHK006 - Apakah spesifikasi secara tegas mewajibkan validasi server-side dan penolakan aksi apabila pengguna memanggil fungsi di luar wewenang perannya? [Coverage, Spec §FR-002, Constitution §Principle II]
- [x] CHK007 - Apakah aturan sekuensial persetujuan berjenjang diformulasikan dengan jelas sehingga peninjau ke-$n$ terbukti tidak dapat bertindak sebelum tahap $1 \dots n-1$ disetujui? [Consistency, Spec §FR-006, Spec §User Story 2]
- [x] CHK008 - Apakah spesifikasi mengatur batasan pemisahan peran (separation of duties), seperti apakah pembuat surat (Drafter) dilarang menjadi Reviewer atau Approver pada drafnya sendiri? [Gap, Role Boundary]
- [x] CHK009 - Apakah persyaratan penguncian status permanen pada draf yang ditolak didefinisikan secara tegas untuk mencegah aksi lanjutan oleh peninjau lain? [Completeness, Spec §FR-007, Clarification 2026-09-24]

---

## 3. Privasi Dokumen & Hak Akses Baca (Data Privacy & Read Permissions)

- [x] CHK010 - Apakah batasan hak akses baca dispesifikasikan secara terpisah antara draf dalam peninjauan (partisipan & Admin saja) dan surat disetujui (arsip terbuka)? [Clarity, Spec §FR-012, Clarification 2026-09-24]
- [x] CHK011 - Apakah sistem mendefinisikan pencegahan akses tidak sah terhadap draf internal melalui manipulasi URL langsung atau injeksi ID surat? [Coverage, Edge Case, Spec §User Story 5]
- [x] CHK012 - Apakah persyaratan izin Google Drive untuk draf unsigned dibatasi secara ketat hanya kepada email pembuat dan peninjau terkait? [Completeness, Constitution §Principle V, Data Model §Drive]
- [x] CHK013 - Apakah terdapat larangan tegas terhadap pembagian tautan publik ("Anyone with the link") untuk folder root aplikasi, template, dan berkas tanda tangan? [Consistency, Constitution §Principle V]

---

## 4. Mitigasi Injeksi & Integritas Input (Input Sanitization & Injection Defense)

- [x] CHK014 - Apakah persyaratan sanitasi karakter injeksi formula spreadsheet (`=`, `+`, `-`, `@`) didefinisikan secara konkret untuk seluruh input teks pengguna sebelum disimpan? [Clarity, Spec §FR-014, Data Model §4]
- [x] CHK015 - Apakah persyaratan sanitasi nama berkas dispesifikasikan untuk mencegah karakter perusak path atau traversal saat pembuatan dokumen Google Drive? [Coverage, Spec §FR-014, Spec §Key Entities]
- [x] CHK016 - Apakah batasan ukuran berkas dan validasi tipe MIME (PDF/Gambar) didefinisikan secara eksplisit untuk form pengunggahan scan tanda tangan basah? [Completeness, Contract §Letter-5, Gap]

---

## 5. Jejak Audit & Manajemen Kredensial (Auditability & Secret Management)

- [x] CHK017 - Apakah persyaratan pencatatan log audit permanen (append-only) diwajibkan untuk setiap tindakan yang mengubah status dokumen? [Completeness, Spec §FR-011, Spec §Key Entities]
- [x] CHK018 - Apakah rincian metadata jejak audit (waktu, email pelaku, jenis tindakan, catatan revisi) dispesifikasikan secara terukur? [Clarity, Spec §FR-011, Data Model §1.D]
- [x] CHK019 - Apakah terdapat aturan tegas yang melarang penempatan token, kata sandi, atau ID folder pada kode sumber maupun dokumen steering publik? [Completeness, Constitution §Principle V, Plan §Technical Context]

---

## Notes

- Tandai item dengan `[x]` hanya setelah peninjauan memastikan kriteria kualitas penulisan persyaratan telah terpenuhi di dalam `spec.md` dan `plan.md`.
- Biarkan item tidak tercentang (`[ ]`) jika masih terdapat celah, ambiguitas, atau butuh penyempurnaan dokumen persyaratan lebih lanjut.
- `/speckit-implement` membaca status checkbox checklist ini sebagai gerbang kepatuhan (gate) dan dilarang mengubah centang secara sepihak.
- Tambahkan temuan atau catatan langsung di bawah masing-masing item bila diperlukan.
