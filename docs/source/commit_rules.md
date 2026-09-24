# Panduan Commit Message (Conventional Commits)

Dokumen ini mengatur standar penulisan pesan _commit_ menggunakan format **Conventional Commits v1.0.0** agar riwayat perubahan proyek mudah dibaca, dilacak, dan dapat diintegrasikan dengan sistem rilis otomatis.

## 1. Struktur Dasar Commit
Setiap _commit message_ harus mengikuti format berikut:
```text
<tipe>(<opsional scope>): <deskripsi singkat>

[opsional body: penjelasan lebih detail mengapa perubahan ini dilakukan]

Version: vX.Y.Z
```

## 2. Tipe Commit yang Diizinkan (Type)
Gunakan salah satu _prefix_ berikut di awal setiap _commit_:
- **`feat:`** Untuk menambahkan fitur baru (contoh: form pembuatan surat, notifikasi).
- **`fix:`** Untuk memperbaiki *bug* atau _error_.
- **`refactor:`** Untuk penulisan ulang kode tanpa mengubah fitur atau memperbaiki *bug* (contoh: merapikan struktur folder).
- **`style:`** Untuk perubahan formatting, spasi, atau perbaikan UI/CSS yang tidak mempengaruhi logika.
- **`docs:`** Untuk perubahan pada dokumentasi (contoh: mengubah README atau panduan arsitektur).
- **`chore:`** Untuk tugas pemeliharaan, *update dependencies*, atau konfigurasi yang tidak terkait langsung dengan *source code* (contoh: mengubah file `.gitignore`).

## 3. Aturan Penulisan
- **Huruf Kecil:** Tipe (`feat`, `fix`, dll) dan scope harus ditulis dengan huruf kecil.
- **Gunakan Kata Kerja Perintah (Imperative):** Pada bagian deskripsi, gunakan kalimat perintah (contoh: `add login page`, bukan `added login page` atau `adds login page`).
- **Tidak Ada Titik:** Deskripsi singkat tidak boleh diakhiri dengan tanda titik (`.`).
- **Wajib Ada Tag Versi:** setiap _commit_ menyertakan footer `Version: vX.Y.Z`, yaitu nomor versi project **setelah** commit ini diterapkan (lihat aturan kenaikan di bagian 4).

## 4. Versioning (Semantic Versioning)
Format wajib: `vMAJOR.MINOR.PATCH` — proyek dimulai dari **v0.1.0**.

- **Angka pertama (MAJOR):** perubahan besar yang tidak kompatibel ke belakang (*breaking change*).
- **Angka kedua (MINOR):** penambahan fitur baru yang tetap kompatibel ke belakang.
- **Angka ketiga (PATCH):** perbaikan bug (*bugfix*), tanpa menambah/mengubah fitur.

| Segmen | Dipicu oleh tipe commit | Catatan |
|---|---|---|
| **MAJOR** (X) | `feat!:` / `fix!:` atau footer `BREAKING CHANGE:` | Hanya mulai berlaku **setelah v1.0.0** dirilis |
| **MINOR** (Y) | `feat:` — juga dipakai untuk *breaking change* **selama masih < v1.0.0** | Sesuai spesifikasi resmi SemVer §4: versi `0.y.z` adalah tahap pengembangan awal, API belum dianggap stabil |
| **PATCH** (Z) | `fix:` | |
| *(versi tidak naik)* | `docs:`, `style:`, `refactor:`, `chore:` | Footer `Version:` tetap memakai angka yang sama dengan commit terakhir yang menaikkan versi |

**Aturan reset:** menaikkan MAJOR mengembalikan MINOR & PATCH ke `0`; menaikkan MINOR mengembalikan PATCH ke `0` (standar SemVer).

**Sumber kebenaran versi saat ini:** simpan di satu berkas `VERSION` di root project — jangan menebak dari histori commit. Commit yang menaikkan versi wajib meng-update berkas ini di commit yang sama.

**(Opsional) Git tag di commit rilis** — untuk commit yang menandai rilis/akhir sebuah fitur besar, tambahkan tag beranotasi:
```
git tag -a v0.2.0 -m "feat(letter): add wet signature upload flow"
git push origin v0.2.0
```

## 5. Contoh Commit Message
* **Fitur baru:**
  `feat(letter): add dynamic numbering to create letter form`
  `Version: v0.2.0`
* **Perbaikan bug:**
  `fix(auth): prevent app crash when user token expires`
  `Version: v0.2.1`
* **Perubahan desain (UI):**
  `style(dashboard): change status badge color to tailwind standard`
  `Version: v0.2.1`
* **Merombak struktur kode:**
  `refactor(service): move pdf generation logic to separate service`
  `Version: v0.2.1`
* **Tugas konfigurasi:**
  `chore: update vite and react packages to latest versions`
  `Version: v0.2.1`

> Perhatikan: `style`, `refactor`, `chore` tidak menaikkan versi — footernya tetap `v0.2.1` mengikuti commit `fix` terakhir sebelumnya.
