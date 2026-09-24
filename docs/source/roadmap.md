# Roadmap Pengembangan: MVP Menuju Enterprise Level

Dokumen ini memandu transisi dari arsitektur *serverless* 100% (MVP) menuju infrastruktur *enterprise-grade* dengan GCP dan Firebase.

## Fase 1: Migrasi Fondasi Data & API (Stabilitas & Integritas)
**Tujuan:** Beralih dari NoSQL ke RDBMS untuk integritas relasional dan penguncian transaksi tingkat lanjut.
- **Database:** Migrasi data dari Firestore ke **GCP Cloud SQL (PostgreSQL)**.
- **ORM:** Terapkan **Prisma ORM** atau **Drizzle ORM** untuk manajemen skema relasional (Tabel Pengguna, Surat, Log Persetujuan, dan Master Urutan).
- **Backend API:** Bangun *backend logic* terpisah menggunakan **Next.js Server Actions** atau **NestJS** (di-deploy ke Cloud Run).

## Fase 2: Modernisasi Frontend & Pengamanan Ekstra (Performa & Keamanan)
**Tujuan:** Meningkatkan performa aplikasi dan memperkuat lapis otorisasi.
- **Migrasi Frontend:** Beralih dari React/Vite (SPA) ke framework **Next.js 14/15 (App Router)** untuk *Server-Side Rendering* (SSR) dan manajemen state yang lebih baik.
- **Custom Claims:** Ganti pengecekan role manual di database dengan **Firebase Custom Claims** untuk keamanan otorisasi tingkat token (RBAC).
- **Deployment:** Alihkan *hosting* ke **Firebase App Hosting** yang lebih optimal untuk Next.js.

## Fase 3: Skalabilitas Antrean (Queuing) & Multi-Channel
- **Task Queuing:** Karena integrasi Google Docs API memakan waktu komputasi, terapkan **GCP Cloud Tasks** untuk antrean proses *background* agar *timeout* terhindari jika ratusan surat disetujui bersamaan.
- **Notifikasi Multi-Channel:** Integrasikan *webhook/API* **WhatsApp Gateway** ke dalam Cloud Tasks sebagai pelengkap notifikasi email.