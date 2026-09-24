# PRD: Konfigurasi Awal MVP - Sistem Manajemen Surat Menyurat (Revisi Google Workspace API)

## 1. Tujuan
Membangun Minimum Viable Product (MVP) sistem otomatisasi surat resmi. Berfokus pada kecepatan rilis dengan memanfaatkan ekosistem Firebase dan integrasi Google Workspace untuk pembuatan dokumen.

## 2. Tech Stack (MVP Serverless & API)
- **Frontend:** React.js (Vite) + Tailwind CSS
- **Database:** Firebase Cloud Firestore (NoSQL)
- **Authentication:** Firebase Auth (Google Sign-In)
- **Storage:** Cloud Storage for Firebase (Arsip PDF & Gambar Tanda Tangan)
- **Hosting:** Firebase Hosting
- **PDF Engine (Backend):** Firebase Cloud Functions (Node.js) + Google Docs API & Google Drive API
- **Notifikasi:** Firebase Trigger Email Extension / EmailJS

## 3. Fitur Utama
1. **Autentikasi & Role:** Login menggunakan akun Google. Role pengguna (Drafter, Reviewer, Approver) diatur secara sederhana melalui collection `users` di Firestore.
2. **Pembuatan Surat:** Antarmuka form dinamis bagi Drafter untuk membuat draft surat berdasarkan variabel/template.
3. **Penomoran Dinamis (Pencegahan Race Condition):** Menggunakan fitur *Firestore Transactions* yang menargetkan dokumen khusus `counters` untuk melakukan *auto-increment* penomoran surat yang aman.
4. **Workflow Persetujuan:** Status dokumen diperbarui secara berjenjang (`Draft` -> `In Review` -> `Approved` / `Rejected`).
5. **Injeksi Tanda Tangan & PDF via Google Workspace:** Setelah *Approve* terakhir, Cloud Functions menyalin template Google Docs, menyuntikkan data & gambar tanda tangan via API, lalu mengekspornya menjadi PDF ke Cloud Storage.

## 4. Struktur Database Skala MVP (Firestore Collections)
- `users`: Menyimpan profil, email, dan level peran (role) pengguna.
- `letters`: Menyimpan isi surat, array urutan persetujuan (reviewer/approver IDs), metadata, ID Template Google Docs, status saat ini, dan tautan PDF akhir.
- `counters`: Menyimpan angka urut penomoran.
