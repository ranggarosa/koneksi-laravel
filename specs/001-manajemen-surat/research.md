# Architectural Research & Technical Decisions: Sistem Manajemen Surat Menyurat (Koneksi)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Phase**: Phase 0 (Research & Foundation)  
**Date**: 2026-09-27  

Dokumen ini mendokumentasikan keputusan teknis, alasan pemilihan (rationale), dan alternatif yang dipertimbangkan untuk implementasi Fase 0 Sistem Manajemen Surat Menyurat.

---

## 1. Runtime Platform & Bahasa Pemrograman

- **Decision**: Google Apps Script (V8 Runtime, JavaScript ES6+ modern).
- **Rationale**:
  - Fase 0 berfokus pada prototipe cepat yang terintegrasi 100% dengan Google Workspace (Sheets, Drive, Docs, Gmail) tanpa memerlukan infrastruktur server terpisah.
  - V8 runtime mendukung sintaks modern (destructuring, arrow functions, `const`/`let`, template literals, spread operator).
- **Alternatives Considered**:
  - *Node.js / Express di Cloud Run*: Memerlukan setup GCP service account, domain verification, dan biaya komputasi sejak hari pertama. Ditolak untuk Fase 0, dijadwalkan untuk Fase 2–3.
  - *Next.js Serverless*: Terlalu dini untuk kebutuhan prototipe internal HR dengan volume puluhan surat/bulan.

---

## 2. Pola Arsitektur & Manajemen Global Scope

- **Decision**: 4-Tier Layered Architecture (`View` → `Controller` → `Service` → `Repository` → `External Services`) dengan penamaan file flat bersuffix (`*.controller.gs`, `*.service.gs`, `*.repository.gs`) dan enkapsulasi objek namespace (`const letterService = { ... }`).
- **Rationale**:
  - Apps Script tidak mendukung sistem modul ES (`import`/`export`) dan menggabungkan semua file `.gs` ke dalam satu *global scope*. Enkapsulasi objek mencegah tabrakan nama fungsi antar-file.
  - Memisahkan logika bisnis dari UI dan data persistence, memungkinkan *mocking* untuk pengujian otomatis (Principle I & IV).
  - Mempermudah migrasi masa depan ke Firestore/PostgreSQL (hanya layer Repository yang diganti tanpa merombak Service).
- **Alternatives Considered**:
  - *Script Prosedural Flat (Satu File Code.gs)*: Sering dipakai di Apps Script tradisional, namun menyebabkan *spaghetti code*, sulit dirawat, dan mustahil diuji secara terisolasi. Ditolak.
  - *Class-based OOP*: Menambah overhead sintaksis dan serialisasi prototipe di Apps Script; modul objek literals (`const module = { ... }`) lebih ringan dan idiomatik di GAS.

---

## 3. Basis Data & Serialisasi Objek Bersarang

- **Decision**: Google Sheets (`SpreadsheetApp`) dengan sheet `Users`, `Letters`, `Counters`, dan `ApprovalLog`. Kolom array/objek (`approvalFlow`, `contentData`, `recycledNumbers`) disimpan sebagai string JSON (`JSON.stringify` / `JSON.parse`).
- **Rationale**:
  - Menghindari relasi multi-sheet yang rumit untuk array dinamis per surat, mempermudah pembacaan atomik per baris surat.
  - Struktur data JSON konsisten dengan skema target Firestore pada Fase 1 (`schema.md`), sehingga migrasi nantinya hanya berupa pembacaan objek langsung.
- **Alternatives Considered**:
  - *Relasi Multi-Sheet Normalisasi Penuh (Sheet terpisah untuk Tiap Item Approval)*: Memerlukan banyak pemanggilan `SpreadsheetApp` (I/O lambat) dan rawan inkonsistensi saat update. Ditolak.

---

## 4. Penomoran Atomik & Antrean Daur Ulang (Recycled Pool)

- **Decision**: Menggunakan `LockService.getScriptLock()` dengan timeout 30 detik pada sheet `Counters`. Kolom `recycledNumbers` menyimpan array JSON nomor yang dirilis kembali setelah penolakan. Logika alokasi memprioritaskan pengambilan dari `recycledNumbers` sebelum menaikkan `currentSequence`.
- **Rationale**:
  - Mencegah race condition ketika dua Drafter menekan tombol submit pada detik yang sama (Principle III).
  - Memenuhi hasil klarifikasi: surat yang ditolak melepaskan nomornya kembali ke sistem agar tidak terjadi lubang (gap) pada nomor surat dinas resmi instansi.
- **Alternatives Considered**:
  - *Penomoran acak (Random UUID/Alphanumeric)*: Ditolak karena aturan kepatuhan administrasi surat resmi mewajibkan nomor urut berurutan `{urutan:04d}.{kode}/{bulan}/{tahun}`.
  - *Membiarkan nomor yang ditolak hangus (tanpa daur ulang)*: Ditolak oleh pemangku kepentingan karena instansi menghendaki nomor yang ditolak dapat digunakan kembali oleh draf berikutnya.

---

## 5. Pembuatan Dokumen & Injeksi Tanda Tangan Digital

- **Decision**: Menggunakan template Google Docs, menduplikasi berkas template ke folder target surat (`Surat Menyurat (Root)/Letters/{letterId}/`), mengganti variabel placeholder `{{variable}}` via `DocumentApp.replaceText()`, menyematkan gambar tanda tangan digital melalui `Body.appendImage()`, lalu mengekspor berkas PDF secara sinkron via `docFile.getAs('application/pdf')`.
- **Rationale**:
  - Sesuai batasan Fase 0: proses generate dokumen berjalan sinkron dalam satu proses Apps Script (< 30 detik) tanpa antrean Cloud Tasks.
  - Menghasilkan dokumen resmi berkualitas tinggi yang dapat langsung diunduh dan diarsipkan di Google Drive.
- **Alternatives Considered**:
  - *HTML to PDF via pihak ketiga*: Memerlukan biaya langganan API eksternal dan risiko kebocoran data personal pegawai. Ditolak.
  - *Google Docs Advanced API (REST)*: Lebih kompleks dibanding DocumentApp native; DocumentApp sudah mencukupi untuk manipulasi template dan injeksi gambar.

---

## 6. Alur Tanda Tangan Basah & Pembaruan Versi Berkas

- **Decision**:
  - Web App menyediakan formulir unggah berkas PDF/gambar scan langsung di halaman `LetterDetail.html`.
  - Berkas scan dikirim via `google.script.run` sebagai data base64 blob ke `letterController.uploadWetSignatureScan()`.
  - Service memperbarui berkas draf unsigned di Google Drive menggunakan Drive Advanced Service API `Drive.Files.update` sebagai revisi baru (media update), bukan membuat file baru.
  - Status diverifikasi dengan memeriksa `revisionId` berkas Drive > `unsignedDraftBaseRevisionId`.
- **Rationale**:
  - Menjaga satu file ID Drive tunggal untuk dokumen surat tersebut (tidak membingungkan tautan arsip).
  - Menjamin kemudahan bagi pengguna (UX terpadu di Web App tanpa perlu membuka Google Drive untuk mengelola versi berkas manual).
- **Alternatives Considered**:
  - *Membuat file baru di Drive setiap kali unggah scan*: Menyebabkan duplikasi file dan memutus tautan draf awal yang telah dibagikan. Ditolak.
  - *Pengguna mengunggah manual di Google Drive via "Manage Versions"*: Terlalu teknis bagi pengguna non-IT dan rawan kesalahan operasional. Ditolak.

---

## 7. Keamanan, Autentikasi Whitelist, & Formula Injection

- **Decision**:
  - **Autentikasi**: `Session.getActiveUser().getEmail()` dicocokkan terhadap sheet `Users` dengan syarat `isActive === true`. Guard `authService.getCurrentUser()` dipanggil pada setiap fungsi Controller di sisi server.
  - **Formula Injection Mitigation**: Seluruh input teks dari pengguna yang diawali karakter `=`, `+`, `-`, atau `@` di-escape dengan menambahkan prefix tanda petik tunggal (`'`) sebelum ditulis ke sel Google Sheets (`sheetRepository.sanitizeForSheets()`).
  - **Drive Permissions**: Dokumen draf basah hanya dibagikan secara spesifik (role Editor) ke `drafterEmail` dan email dalam `approvalFlow`. Folder root tidak pernah berstatus publik.
- **Rationale**:
  - Server adalah satu-satunya *source of truth* (Principle II & V).
  - Melindungi lembar kerja dari eksekusi formula berbahaya dan kebocoran data sensitif karyawan (NIK, nama, catatan sanksi).

---

## 8. Strategi Pengujian Otomatis

- **Decision**: Modul pengujian mandiri di `TestUtils.gs` dan `*.test.gs` dengan fungsi runner `runAllTests()`. Menerapkan *Dependency Injection* pada layer Service agar pengujian dapat menggunakan mock repository in-memory tanpa memodifikasi data riil Google Sheets / Drive.
- **Rationale**:
  - Memenuhi Principle IV: cakupan 100% pada 5 skenario bisnis kritis (penomoran atomik bebas duplikat, persetujuan sekuensial, percabangan tanda tangan digital/basah, penolakan akses non-whitelist, dan verifikasi revisi berkas).
  - Dapat dieksekusi langsung di Apps Script Editor maupun via CLI melalui `clasp run runAllTests`.
