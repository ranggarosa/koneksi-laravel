# Wireframe Outline (High-Level) - MVP Manajemen Surat

Dokumen ini berisi panduan tata letak (layout) dan komponen antarmuka (UI) untuk aplikasi MVP. Dirancang agar mudah diimplementasikan menggunakan komponen siap pakai (UI Kit) seperti Tailwind CSS, Bootstrap, atau shadcn/ui.

## 1. Komponen Global (Muncul di semua halaman setelah login)
- **Sidebar / Top Navigation:**
  - Logo Aplikasi.
  - Menu Navigasi: Dashboard, Buat Surat (khusus Drafter), Pengaturan.
  - Profil Pengguna: Foto profil, Nama, Role, dan tombol "Logout".

## 2. Halaman Login (`/login`)
- **Tata Letak:** Tengah layar (Centered Card).
- **Komponen:**
  - Judul: "Sistem Otomatisasi Surat HR".
  - Tombol Utama: "Login dengan Google" (Integrasi Firebase Auth).

## 3. Halaman Dashboard Utama (`/dashboard`)
- **Area Statistik (Cards):** Menampilkan metrik jumlah dokumen (Draft, In Review, Approved).
- **Aksi Cepat:** Tombol "+ Buat Surat Baru" (Hanya muncul jika user adalah Drafter).
- **Tabel Riwayat Surat:** 
  - Kolom: Nomor Surat, Jenis, Tanggal, Status (menggunakan Badge warna), dan Tombol "Lihat Detail".

## 4. Halaman Form Pembuatan (`/create` - Khusus Drafter)
- **Input Kategori:** Dropdown untuk memilih template surat (Surat Tugas, SP, dll).
- **Form Dinamis:** Input field (Teks/Tanggal) yang menyesuaikan dengan kebutuhan template yang dipilih.
- **Pengaturan Approval:** Dropdown berjenjang untuk memilih user sebagai Reviewer dan Approver.
- **Aksi:** Tombol "Submit Draft" dan "Batal".

## 5. Halaman Pratinjau & Persetujuan (`/letter/[id]`)
- **Panel Pratinjau:** Kotak (container) yang menampilkan draf teks dokumen atau embed PDF final.
- **Panel Informasi:**
  - Timeline Status (Jejak persetujuan dari Drafter hingga Approver akhir).
  - **[BARU] State Loading Asinkron:** Jika dokumen berstatus `Processing PDF` (sedang di-*generate* oleh server Google), hilangkan tombol aksi dan tampilkan animasi *loading spinner* atau pesan "Dokumen sedang diproses oleh server...".
- **Panel Aksi (Khusus pengguna yang mendapat giliran):**
  - Textarea: Kolom input catatan revisi (opsional).
  - Tombol: "Approve" (Hijau) dan "Reject" (Merah).

## 6. Halaman Pengaturan (`/settings`)
- **Profil Pribadi:** Info akun dan fitur unggah gambar referensi E-Signature (Khusus Approver).
- **Manajemen Pengguna (Khusus Admin):** Tabel sederhana berisi daftar user terdaftar beserta dropdown untuk mengubah Role akses mereka.
