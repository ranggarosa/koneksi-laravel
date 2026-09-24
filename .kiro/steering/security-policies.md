---
inclusion: always
---

# Security Policies

> Dokumentasi resmi Kiro secara eksplisit mencontohkan *security policies* sebagai kandidat `inclusion: always` — berlaku universal ke seluruh kode yang dihasilkan, bukan hanya file tertentu.

## 1. Prinsip Umum
**Server-side adalah source of truth.** Tombol/menu yang disembunyikan di client (View) hanyalah UX, bukan kontrol akses — setiap Controller wajib memvalidasi ulang role & kondisi di server sebelum menjalankan aksi apa pun (lihat `design.md` §8).

## 2. Autentikasi & Whitelist
- Email pribadi (Gmail) diizinkan, **wajib terdaftar & `isActive = TRUE`** di sheet `Users` (lihat `product.md`).
- `authService.getCurrentUser()` dipanggil sebagai *guard* di **setiap** fungsi Controller — bukan hanya saat render halaman awal — supaya sesi yang di-nonaktifkan Admin di tengah jalan langsung kehilangan akses.

## 3. Otorisasi Berjenjang
- Validasi server bahwa role sesuai aksi: hanya `drafter` yang boleh `submitDraft()`, hanya `approver` yang boleh `uploadSignature()`.
- Validasi urutan `approvalFlow`: elemen ke-*n* hanya boleh diproses jika **seluruh** elemen sebelumnya sudah `approved`, dicek ulang di `letterService`, jangan percaya index yang dikirim dari client.

## 4. Validasi & Sanitasi Input
- Semua field `contentData` divalidasi tipe/panjang sebelum disimpan atau disuntik ke placeholder Google Docs.
- **Mitigasi Formula Injection Google Sheets** (celah yang sering terlewat): string yang diawali `=`, `+`, `-`, atau `@` bisa dieksekusi sebagai formula oleh Sheets. Setiap nilai dari input pengguna (nama, NIK, catatan revisi, dsb.) wajib di-*escape* (prefix `'` atau ditolak) sebelum ditulis ke sel.
- Nilai yang dipakai untuk membentuk nama folder/berkas Drive (mis. nomor surat) disanitasi dari karakter yang bisa mengganggu path (`/`, `\`, dst).

## 5. Least-Privilege Akses Drive
- Dokumen `unsigned-draft` (jalur tanda tangan basah) dibagikan dengan akses **Editor** hanya ke `drafterEmail` + email pada `approvalFlow` — bukan "Anyone with the link".
- Folder root aplikasi (`Templates/`, `Signatures/`, `Letters/`) tidak pernah dibagikan publik.

## 6. Perlindungan Data Pribadi
Kolom seperti nama & NIK pada `contentData` adalah data pribadi. Spreadsheet `AppDatabase` hanya boleh diakses developer/Admin secara langsung; pengguna akhir berinteraksi lewat Web App, **tidak pernah** diberi akses langsung ke Spreadsheet.

## 7. Manajemen Rahasia/Kredensial
- ID folder, ID template, dan konfigurasi environment disimpan di `PropertiesService` (Script Properties), tidak di-hardcode.
- Kredensial pihak ketiga (mis. WhatsApp Gateway di Fase 4 per `roadmap.md`) wajib lewat Script Properties.
- **Tidak pernah** menaruh API key/password/token di berkas steering atau kode sumber — steering file adalah bagian dari codebase yang bisa dibaca siapa saja dengan akses repo (prinsip resmi Kiro: "Security First").

## 8. Audit Trail
Setiap `approve`/`reject`/pemilihan `signatureMethod`/unggah scan tanda tangan basah wajib tercatat di sheet `ApprovalLog` (aktor + waktu), untuk investigasi bila terjadi sengketa dokumen.

## 9. Ruang Lingkup OAuth
`appsscript.json` hanya meminta scope yang benar-benar dipakai (Sheets, Drive, Docs, Gmail/Mail) — hindari scope luas yang tidak diperlukan fitur saat ini.

## 10. Rencana Fase 1+
Digantikan bertahap oleh **Firebase Auth** + **Firestore Security Rules**, lalu **Firebase Custom Claims** (RBAC di level token, Fase 3 `roadmap.md`) — mengurangi ketergantungan pada pengecekan whitelist manual di kode aplikasi.
