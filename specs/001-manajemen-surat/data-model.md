# Data Model Specification: Sistem Manajemen Surat Menyurat (Koneksi)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Phase**: Phase 1 (Design & Contracts)  
**Date**: 2026-09-27  

Dokumen ini mendefinisikan skema penyimpanan Google Sheets (`AppDatabase`), struktur folder Google Drive, diagram status transisi, dan aturan validasi data untuk implementasi Fase 0.

---

## 1. Skema Google Sheets (`AppDatabase`)

### A. Sheet `Users`
Menyimpan daftar akun terdaftar (whitelist) yang diizinkan mengakses aplikasi.

| Kolom | Tipe | Contoh / Nilai Valid | Keterangan |
|---|---|---|---|
| `email` | String (PK) | `budi.hr@gmail.com` | Email akun Google pengguna (huruf kecil, unik) |
| `name` | String | `Budi Santoso` | Nama lengkap resmi pengguna |
| `role` | String | `drafter` \| `reviewer` \| `approver` \| `admin` | Peran pengguna dalam alur persetujuan |
| `signatureFileId` | String (Opsional) | `1AbCdEfGhIjKlMnOpQrStUvWxYz` | ID berkas gambar tanda tangan di Google Drive (khusus Approver) |
| `isActive` | Boolean | `TRUE` \| `FALSE` | Status keaktifan akun (penonaktifan tanpa menghapus data) |
| `createdAt` | DateTime (ISO) | `2026-09-24T08:00:00.000Z` | Waktu pendaftaran pertama kali |

---

### B. Sheet `Letters`
Menyimpan seluruh naskah surat resmi dinas.

| Kolom | Tipe | Contoh / Nilai Valid | Keterangan |
|---|---|---|---|
| `letterId` | String (PK) | `uuid-v4-string` | ID unik surat (dihasilkan via `Utilities.getUuid()`) |
| `letterNumber` | String | `0001.SP1/IX/2026` | Nomor resmi surat (kosong saat awal draf sebelum penomoran) |
| `templateType` | String | `Surat Peringatan 1` | Nama lengkap jenis template surat |
| `templateCode` | String | `SP1`, `ST`, `SK` | Kode singkat template untuk penomoran surat |
| `googleDocTemplateId` | String | `1MasterDocTemplateId...` | ID master berkas Google Docs template sumber |
| `contentData` | String (JSON) | `{"nama": "Andi", "nik": "12345"}` | Data isian formulir dinas (disanitasi formula injection) |
| `status` | String | `Draft` \| `In Review` \| `Approved` \| `Rejected` | Status siklus hidup surat saat ini |
| `drafterEmail` | String (FK) | `drafter@gmail.com` | Email pembuat draf surat |
| `approvalFlow` | String (JSON Array) | *Lihat format array di bawah* | Rangkaian berurutan Reviewer dan Approver |
| `signatureMethod` | String (Opsional) | `digital` \| `wet` | Metode pengesahan yang dipilih Approver akhir |
| `awaitingWetSignature` | Boolean | `TRUE` \| `FALSE` | Penanda draf sedang menunggu unggahan scan tanda tangan basah |
| `unsignedDriveFileId` | String (Opsional) | `1UnsignedDocFileId...` | ID berkas Google Docs draf tanpa tanda tangan di Drive |
| `unsignedDraftBaseRevisionId` | String (Opsional) | `1` | ID revisi baseline draf unsigned untuk mendeteksi revisi scan baru |
| `finalPdfUrl` | String (Opsional) | `https://drive.google.com/...` | URL berkas PDF final yang telah disahkan |
| `finalFileName` | String (Opsional) | `0001.SP1-IX-2026 - SP1.pdf` | Nama berkas PDF final yang sudah disanitasi dari karakter path |
| `createdAt` | DateTime (ISO) | `2026-09-24T09:15:00.000Z` | Waktu pembuatan draf surat |
| `updatedAt` | DateTime (ISO) | `2026-09-24T10:30:00.000Z` | Waktu pembaruan status surat terakhir |

#### Struktur JSON `approvalFlow`
Array objek terserialisasi yang merepresentasikan urutan peninjau:
```json
[
  {
    "order": 1,
    "email": "reviewer1@gmail.com",
    "name": "Siti Reviewer",
    "role": "reviewer",
    "status": "approved",
    "decisionAt": "2026-09-24T09:30:00.000Z",
    "notes": "Data pegawai sudah sesuai berkas HR."
  },
  {
    "order": 2,
    "email": "approver.hr@gmail.com",
    "name": "Bambang Head of HR",
    "role": "approver",
    "status": "pending",
    "decisionAt": null,
    "notes": ""
  }
]
```

---

### C. Sheet `Counters`
Mengelola urutan penomoran atomik dan antrean nomor yang dirilis kembali (recycled pool).

| Kolom | Tipe | Contoh / Nilai Valid | Keterangan |
|---|---|---|---|
| `counterId` | String (PK) | `SP1_09_2026` | Kunci gabungan `{templateCode}_{bulan:02d}_{tahun}` |
| `templateCode` | String | `SP1` | Kode template |
| `month` | Number | `9` (1–12) | Bulan berjalan penomoran |
| `year` | Number | `2026` | Tahun berjalan penomoran |
| `currentSequence` | Number | `15` | Angka urut tertinggi yang pernah dialokasikan |
| `recycledNumbers` | String (JSON Array) | `["0002", "0007"]` | Antrean nomor yang dirilis kembali setelah penolakan |

#### Logika Alokasi Penomoran Atomik (`NumberingService`):
1. Mengunci transaksi via `LockService.getScriptLock().waitLock(30000)`.
2. Mengambil atau membuat baris counter untuk `{templateCode}_{bulan:02d}_{tahun}`.
3. Memeriksa `recycledNumbers`:
   - Jika array memiliki elemen: ambil nomor pertama (FIFO, `shift()`), simpan pembaruan array, dan gunakan nomor tersebut.
   - Jika array kosong: naikkan `currentSequence` sebesar +1, format menjadi `{currentSequence:04d}`, dan gunakan nomor tersebut.
4. Jika surat berstatus `Rejected`: nomor surat yang digunakan di-push ke dalam array `recycledNumbers` pada counter yang bersangkutan.
5. Melepaskan lock via `lock.releaseLock()`.

---

### D. Sheet `ApprovalLog`
Menyimpan jejak audit permanen yang tidak dapat diubah (append-only audit trail).

| Kolom | Tipe | Contoh / Nilai Valid | Keterangan |
|---|---|---|---|
| `logId` | String (PK) | `uuid-v4-string` | ID log unik |
| `letterId` | String (FK) | `uuid-v4-letter` | Referensi ke surat terkait |
| `actorEmail` | String | `approver.hr@gmail.com` | Email pengguna yang melakukan aksi |
| `action` | String | `submit_draft` \| `approve` \| `reject` \| `choose_signature_method` \| `upload_wet_signature` | Jenis tindakan |
| `notes` | String | `Revisi pasal 2 masa berlaku` | Catatan pendukung keputusan |
| `timestamp` | DateTime (ISO) | `2026-09-24T10:15:30.000Z` | Waktu pencatatan jejak audit |

---

## 2. Struktur Penyimpanan Google Drive

```text
📁 Surat Menyurat (Root App Folder) [ID: rootFolderId]
├── 📁 Templates/ [ID: templatesFolderId]
│    ├── 📄 Master Template Surat Peringatan 1
│    ├── 📄 Master Template Surat Tugas
│    └── 📄 Master Template Surat Keputusan
├── 📁 Signatures/ [ID: signaturesFolderId]
│    ├── 🖼️ approver1@gmail.com_signature.png
│    └── 🖼️ approver2@gmail.com_signature.png
└── 📁 Letters/ [ID: lettersFolderId]
     └── 📁 {letterId}/
          ├── 📄 unsigned-draft (Google Docs, khusus jalur tanda tangan basah)
          └── 📄 {finalFileName}.pdf (PDF final bertanda tangan digital / hasil scan)
```

---

## 3. Diagram Status & Siklus Hidup Surat

```
               [ Formulir Baru ]
                       │
                       │ Drafter: submitDraft()
                       ▼
                 ┌───────────┐
                 │ In Review │◀────────────────────────┐
                 └─────┬─────┘                         │
                       │                               │
       ┌───────────────┴───────────────┐               │
       │                               │               │
Reviewer/Approver:              Approver Akhir:         │
    reject()                        approve()          │
       │                               │               │
       ▼                               ▼               │
┌──────────────┐             ┌───────────────────┐     │
│   Rejected   │             │   Pilih Metode:   │     │
│ (Terminated, │             └─────────┬─────────┘     │
│  Arsip Kunci,│                       │               │
│  Nomor Masuk │         ┌─────────────┴─────────────┐ │
│  Recycled)   │         ▼                           ▼ │
└──────────────┘   [ Digital ]                   [ Wet ]
                         │                           │
                         │ Injeksi Tanda Tangan      │ Generate draf unsigned
                         │ Generate PDF Final        │ awaitingWetSignature = TRUE
                         ▼                           ▼
                  ┌──────────────┐             ┌───────────┐
                  │   Approved   │             │ In Review │
                  │ (Final Sah,  │             └─────┬─────┘
                  │  Arsip Buka) │                   │
                  └──────────────┘                   │ Unggah scan via Web App
                                                     │ Drive.Files.update
                                                     │ Verifikasi revisi baru
                                                     ▼
                                              ┌──────────────┐
                                              │   Approved   │
                                              │ (Final Sah,  │
                                              │  Arsip Buka) │
                                              └──────────────┘
```

---

## 4. Aturan Sanitasi Data (Formula Injection Prevention)

Seluruh input pengguna pada kolom `contentData`, `notes`, dan nama pengguna wajib disaring menggunakan aturan:
```javascript
function sanitizeForSheets(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (['=', '+', '-', '@'].includes(trimmed.charAt(0))) {
    return "'" + trimmed;
  }
  return trimmed;
}
```
Aturan ini mencegah eksekusi formula spreadsheet yang tidak disengaja atau eksploitasi kode remote di Google Sheets.
