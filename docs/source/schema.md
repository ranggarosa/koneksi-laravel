# Firestore Schema (High-Level) - MVP Manajemen Surat

Dokumen ini berisi referensi struktur koleksi (collections) dan dokumen (documents) pada Firebase Cloud Firestore untuk MVP. Skema ini dirancang agar mudah dibaca dan diimplementasikan oleh tim pengembang.

## 1. Collection: `users`
Menyimpan profil, email, dan level peran (role) pengguna.
- `uid` (String): ID Unik dari Firebase Auth (digunakan sebagai Document ID).
- `email` (String): Alamat email pengguna.
- `name` (String): Nama lengkap pengguna.
- `role` (String): Peran pengguna dalam sistem (contoh: "drafter", "reviewer", "approver").
- `signatureUrl` (String, opsional): Tautan URL gambar tanda tangan di Cloud Storage (khusus untuk Approver).

## 2. Collection: `letters`
Menyimpan isi surat, array urutan persetujuan (reviewer/approver IDs), metadata, status saat ini, dan tautan PDF akhir.
- `letterId` (String): Document ID (Auto-generated oleh Firestore).
- `letterNumber` (String): Nomor registrasi surat (contoh: "0051.SP1/VII/2026").
- `templateType` (String): Kategori surat (contoh: "Surat Tugas", "SP 1").
- `googleDocTemplateId` (String): **[BARU]** ID dokumen Google Docs yang menjadi master template untuk jenis surat ini.
- `contentData` (Map/Object): Objek yang berisi variabel data spesifik surat (nama, NIK, tanggal, dll).
- `status` (String): Status dokumen ("Draft", "In Review", "Approved", "Rejected", "Canceled", "Booked", **"Processing PDF"** (Status saat Cloud Functions bekerja).).
- `drafterId` (String): Referensi UID pembuat draf.
- `approvalFlow` (Array of Objects): Matriks urutan persetujuan.
  - `userId` (String): Referensi UID Reviewer/Approver.
  - `role` (String): Jabatan dalam urutan ini (contoh: "reviewer_1", "approver_final").
  - `status` (String): Status persetujuan pengguna ini ("pending", "approved", "rejected").
  - `notes` (String, opsional): Catatan revisi jika ditolak.
- `finalPdfUrl` (String, opsional): Tautan file PDF di Cloud Storage setelah otorisasi selesai.
- `createdAt` (Timestamp): Tanggal dan waktu pembuatan.
- `updatedAt` (Timestamp): Tanggal dan waktu modifikasi terakhir.

## 3. Collection: `counters`
Menyimpan angka urut terakhir per jenis atau kode surat/bulan/tahun untuk digunakan dalam fitur *Firestore Transactions* guna mencegah duplikasi.
- `counterId` (String): Document ID dengan format spesifik (contoh: "07_2026").
- `month` (Number): Bulan berjalan (contoh: 7).
- `year` (Number): Tahun berjalan (contoh: 2026).
- `currentSequence` (Number): Angka urut terakhir yang diterbitkan (contoh: 51).
