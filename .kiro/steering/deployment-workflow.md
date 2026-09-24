---
inclusion: fileMatch
fileMatchPattern: ["appsscript.json", ".clasp.json"]
---

# Deployment Workflow

## 1. Target Deploy Fase 0
**Apps Script Web App** (`doGet` exec URL), dikelola lewat Apps Script Editor atau `clasp` (disarankan agar versinya terlacak di Git, selaras `commit-guidelines.md`).

## 2. Konfigurasi Deployment (Wajib, Terkait Desain Whitelist)
- **Execute the app as:** *User accessing the web app* — **bukan** "Me". Ini wajib supaya `Session.getActiveUser()` mengembalikan identitas pengguna sesungguhnya, sejalan dengan model whitelist email pribadi di `security-policies.md` §2. Jika salah setting ke "Me", validasi whitelist per-pengguna tidak akan berfungsi benar.
- **Who has access:** *Anyone with Google account* — karena pengguna boleh memakai email pribadi (bukan domain organisasi, lihat `product.md`). Pembatasan sesungguhnya tetap terjadi di level aplikasi lewat whitelist sheet `Users`, bukan di setting share Apps Script ini.

## 3. Alur Deploy dengan `clasp`
```bash
clasp push                                   # kirim source lokal ke Apps Script project
clasp deploy --description "vX — <ringkas dari commit terakhir>"
```
- **Test deployment** (head deployment) → dipakai untuk staging/uji internal, hanya bisa diakses editor project.
- **Versioned deployment** baru → dibuat khusus saat rilis ke pengguna whitelist (URL stabil, tidak berubah walau ada `clasp push` berikutnya).

## 4. Pemisahan Lingkungan (Staging vs Production)
Apps Script tidak punya konsep environment bawaan, jadi:
- Gunakan Spreadsheet `AppDatabase` **dan** folder Drive root yang **terpisah** untuk staging vs produksi (mencegah data uji coba mencemari nomor surat/riwayat produksi).
- ID masing-masing disimpan di `PropertiesService` per deployment (`STAGING`/`PROD`), bukan hardcode di `Constants.gs` (lihat `code-conventions.md` §4).

## 5. Checklist Sebelum Deploy Produksi
- [ ] Seluruh skenario kritis di `testing-standards.md` lulus.
- [ ] `.clasp.json`/`scriptId` menunjuk ke project yang benar (staging vs prod) — salah target berisiko menimpa deployment yang salah.
- [ ] `appsscript.json` direview — scope OAuth minimal sesuai `security-policies.md` §9.
- [ ] Deskripsi versi deploy merujuk ringkasan commit terakhir (`commit-guidelines.md`).

## 6. Verifikasi Pasca-Deploy (Smoke Test)
1. Login dengan akun whitelist uji coba.
2. Buat draf surat baru → pastikan nomor surat terbit dan tidak duplikat dengan surat lain.
3. Jalankan alur approval sampai selesai — **jalur digital** dan **jalur basah** (masing-masing minimal sekali).
4. Pastikan notifikasi email terkirim di tiap pemicu (§5.5 `design.md`).

## 7. Rollback
Apps Script menyimpan riwayat versi deployment. Jika rilis baru bermasalah:
- Buka **Manage deployments** (atau `clasp deployments` via CLI) → arahkan **versioned deployment** kembali ke Version ID sebelumnya.
- Tidak perlu revert kode dulu — cukup ganti pointer versi; URL Web App tetap sama sehingga pengguna tidak terdampak.

## 8. Rencana Fase 1+ (mengikuti `roadmap.md`)
- Migrasi ke CI/CD berbasis Git (mis. GitHub Actions) yang deploy otomatis ke **Firebase Hosting/Cloud Functions**, dengan project Firebase terpisah per environment (dev/staging/prod).
- Fase 3: pindah ke **Firebase App Hosting** seiring migrasi Next.js.
- Fase 4: tambahkan **GCP Cloud Tasks** untuk proses deploy/antrean background saat volume surat meningkat.
