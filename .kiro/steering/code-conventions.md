---
inclusion: always
---

# Code Conventions

> Sesuai dokumentasi resmi Kiro (kiro.dev/docs/steering), steering yang berisi *coding conventions* dan *fundamental architectural principles* wajib bermode `inclusion: always`, karena harus memengaruhi setiap generate kode — bukan hanya file tertentu.

## 1. Pemilihan Arsitektur (Architecture Decision)
**Layered Architecture**, dependensi satu arah:
`View (.html)` → `Controller` → `Service` → `Repository` → `Sheets/Drive/Docs/Mail`

**Kenapa dipilih (bukan sekadar preferensi):**
- Business logic (penomoran, alur approval, percabangan tanda tangan) terisolasi dari UI → bisa diuji tanpa `HtmlService` (lihat `testing-standards.md`).
- Pola ini sama dengan `architecture_rules.md` (dokumen sumber proyek) dan dengan struktur feature-driven yang akan dipakai saat migrasi Next.js di Fase 2–3 — migrasi jadi tinggal memindahkan isi Service/Repository, bukan menulis ulang logika.
- Satu-satunya layer yang boleh memanggil `SpreadsheetApp`/`DriveApp`/`DocumentApp` adalah Repository, sehingga saat Fase 1 pindah ke Firestore, hanya Repository yang perlu diganti.

Peta folder & sheet lengkap: `#[[file:.kiro/steering/structure.md]]`

## 2. Konvensi Penamaan (dengan contoh)

| Elemen | Aturan | Benar | Salah |
|---|---|---|---|
| File/modul `.gs` | kebab-case + suffix layer | `letter.service.gs` | `LetterService.gs` |
| Model/struktur data | PascalCase | `Letter`, `User` | `letter`, `userData` |
| Variabel & fungsi | camelCase | `letterService`, `submitDraft()` | `Submit_Draft()` |
| Konstanta/enum | UPPER_SNAKE_CASE | `STATUS_APPROVED` | `statusApproved` |

```javascript
// ✅ Benar — letter.service.gs
function createDraft(formData) {
  validateRequiredFields_(formData);
  const letterNumber = numberingService.generateNumber(formData.templateCode);
  return letterRepository.insert({ ...formData, letterNumber, status: STATUS_IN_REVIEW });
}

// ❌ Salah — logika penomoran & penulisan Sheet dicampur di Controller
function letter_controller_submit(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Letters'); // Repository, bukan Controller
  sheet.appendRow([...]); // lewati validasi & Service sepenuhnya
}
```

## 3. Urutan Pemuatan File (Apps Script Quirk)
Semua `.gs` berbagi satu *global scope* — tidak ada `import`/`export`. Yang perlu diperhatikan:
- Jangan taruh kode level-atas yang punya efek samping (mis. memanggil `SpreadsheetApp` langsung di luar fungsi) — urutan eksekusi antar file **tidak terjamin**.
- `Constants.gs` hanya boleh berisi deklarasi `const`/enum, tanpa pemanggilan layanan Google apa pun di level atas.
- Fungsi dengan nama sama di file berbeda akan bentrok (global) — selalu prefix dengan nama modul/layer, contoh `letterService.createDraft`, bukan `createDraft` polos, dengan membungkus tiap layer sebagai objek (`const letterService = { createDraft() {...} }`).

## 4. Pola Anti (Anti-patterns) — Hindari
- ❌ View (`.html`) memanggil `google.script.run` langsung ke fungsi Repository — harus lewat Controller.
- ❌ Service mengembalikan `HtmlOutput`/menyentuh `HtmlService` — itu tugas Controller/View.
- ❌ Menulis/membaca Sheet dari Controller atau Service — hanya Repository yang boleh.
- ❌ ID Spreadsheet/folder/template di-hardcode berulang di banyak file — taruh satu kali di `Constants.gs` (atau `PropertiesService` untuk yang berbeda per environment, lihat `deployment-workflow.md`).
- ❌ Menyimpan array/objek bersarang langsung sebagai sel Sheets tanpa `JSON.stringify` — lihat skema `approvalFlow`/`contentData` di `.kiro/specs/manajemen-surat/design.md` §3.

## 5. Dokumentasi Kode
Karena semua fungsi top-level di Apps Script efektif "publik" (tidak ada modifier private), setiap fungsi yang dipanggil lintas file wajib diberi komentar JSDoc singkat: tujuan, `@param`, `@return`.

```javascript
/**
 * Membuat draf surat baru dan menerbitkan nomor surat.
 * @param {Object} formData - Data dari CreateLetter.html
 * @return {Letter} Objek surat yang baru dibuat
 */
function createDraft(formData) { ... }
```

## 6. Cakupan Berkas Terkait
- Cara menguji kode yang mengikuti konvensi ini → `#[[file:.kiro/steering/testing-standards.md]]`
- Aturan input/keamanan yang wajib dipatuhi Service & Repository → `#[[file:.kiro/steering/security-policies.md]]`
