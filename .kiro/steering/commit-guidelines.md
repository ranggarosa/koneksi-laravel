---
inclusion: manual
---

# Commit Message Guidelines
> Muat manual dengan mengetik `#commit-guidelines` di chat Kiro saat akan menulis pesan commit, atau pilih lewat menu `/`.

Format: **Conventional Commits v1.0.0** + tag versi (Semantic Versioning)
```
<tipe>(<scope opsional>): <deskripsi singkat>

[body opsional: alasan perubahan]

Version: vX.Y.Z
```

## Tipe yang Diizinkan
- `feat:` — fitur baru
- `fix:` — perbaikan bug
- `refactor:` — penulisan ulang tanpa mengubah fitur/bug
- `style:` — formatting/CSS, tidak mempengaruhi logika
- `docs:` — perubahan dokumentasi
- `chore:` — pemeliharaan, dependency, konfigurasi

## Aturan Penulisan
- Tipe & scope huruf kecil.
- Deskripsi pakai kalimat perintah (imperative): `add login page`, bukan `added`/`adds`.
- Tidak diakhiri titik.
- **Setiap commit wajib menyertakan footer `Version: vX.Y.Z`** — nomor versi project **setelah** commit ini diterapkan (lihat aturan kenaikan di bawah).

## Versioning (Semantic Versioning)
Format wajib: `vMAJOR.MINOR.PATCH` — proyek dimulai dari **v0.1.0**.

- **Angka pertama (MAJOR)** — perubahan besar yang tidak kompatibel ke belakang (*breaking change*).
- **Angka kedua (MINOR)** — penambahan fitur baru yang tetap kompatibel ke belakang.
- **Angka ketiga (PATCH)** — perbaikan bug (*bugfix*), tanpa menambah/mengubah fitur.

| Segmen | Dipicu oleh tipe commit | Catatan |
|---|---|---|
| **MAJOR** (X) | `feat!:` / `fix!:` atau footer `BREAKING CHANGE:` | Hanya mulai berlaku **setelah v1.0.0** dirilis |
| **MINOR** (Y) | `feat:` — juga dipakai untuk *breaking change* **selama masih < v1.0.0** | Sesuai spesifikasi resmi SemVer §4: versi `0.y.z` adalah tahap pengembangan awal, API belum dianggap stabil, jadi breaking change cukup naikkan MINOR dulu |
| **PATCH** (Z) | `fix:` | |
| *(versi tidak naik)* | `docs:`, `style:`, `refactor:`, `chore:` | Footer `Version:` tetap memakai angka yang sama dengan commit terakhir yang menaikkan versi |

**Aturan reset**: menaikkan MAJOR mengembalikan MINOR & PATCH ke `0`; menaikkan MINOR mengembalikan PATCH ke `0` (standar SemVer).

**Sumber kebenaran versi saat ini**: simpan di satu berkas `VERSION` di root project — jangan menebak dari histori commit. Commit yang menaikkan versi wajib meng-update berkas ini di commit yang sama.

**(Opsional) Git tag di commit rilis** — untuk commit yang menandai rilis/akhir sebuah fitur besar, tambahkan tag beranotasi agar `git describe`/riwayat rilis mudah ditelusuri:
```
git tag -a v0.2.0 -m "feat(letter): add wet signature upload flow"
git push origin v0.2.0
```

## Contoh
```
feat(letter): add dynamic numbering to create letter form

Version: v0.2.0
```
```
fix(auth): prevent app crash when user token expires

Version: v0.2.1
```
```
style(dashboard): change status badge color to tailwind standard

Version: v0.2.1
```
```
refactor(service): move pdf generation logic to separate service

Version: v0.2.1
```
```
chore: update vite and react packages to latest versions

Version: v0.2.1
```
> Perhatikan: `style`, `refactor`, `chore` tidak menaikkan versi — footernya tetap `v0.2.1` mengikuti commit `fix` terakhir sebelumnya.

> Catatan: ini adalah steering file kustom (di luar 3 foundation file Kiro — product.md/tech.md/structure.md), sengaja diset `inclusion: manual` agar tidak membebani konteks setiap interaksi, karena aturan commit hanya relevan saat menulis pesan commit.
