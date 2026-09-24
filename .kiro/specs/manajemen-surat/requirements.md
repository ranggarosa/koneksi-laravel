# Requirements Document
# Koneksi (Kelola Naskah Elektronik dan Komunikasi Internal) - Fase 0 (Google Workspace + Apps Script)

## Introduction

**Koneksi** (Kelola Naskah Elektronik dan Komunikasi Internal) mengotomatisasi siklus hidup surat resmi HR — mulai dari pembuatan draf, persetujuan berjenjang, hingga finalisasi dokumen bertanda tangan — menggunakan ekosistem Google Workspace (Apps Script, Sheets, Drive, Docs, MailApp) sebagai rapid prototype sebelum migrasi ke Firebase MVP (Fase 1). Fitur dan aturan bisnis mengacu pada `prd.md`, `schema.md`, `wireframe.md`, dan `roadmap.md`.

---

## Glossary

- **Sistem**: Aplikasi web yang dibangun di atas Google Apps Script HTML Service.
- **Drafter**: Pengguna dengan role `drafter` — satu-satunya role yang berwenang membuat draf surat baru.
- **Reviewer**: Pengguna dengan role `reviewer` — memberikan persetujuan pada tahap non-final dalam `approvalFlow`.
- **Approver**: Pengguna dengan role `approver` — memberikan persetujuan akhir dan berwenang memilih metode penyelesaian dokumen.
- **Admin**: Pengguna dengan role `admin` — mengelola daftar pengguna terdaftar (whitelist) dan role-nya.
- **ApprovalFlow**: Array JSON berurutan yang menyimpan daftar Reviewer/Approver beserta status (`pending`, `approved`, `rejected`) dan catatan opsional untuk satu surat.
- **Whitelist**: Sheet `Users` pada `AppDatabase` yang berisi daftar email pengguna yang diizinkan mengakses aplikasi beserta role dan status aktifnya.
- **LockService**: Mekanisme pengunci atomik bawaan Apps Script yang mencegah race condition saat penomoran surat.
- **ContentData**: Field JSON di sheet `Letters` yang menyimpan variabel isi surat (nama, NIK, tanggal, dll.).
- **LetterNumber**: Nomor surat unik berformat `NNNN.KODE/BULANROMAWI/TAHUN`, contoh `0051.SP1/VII/2026`.
- **UnsignedDraft**: Berkas Google Docs salinan template yang sudah disuntik `ContentData` tetapi belum disuntik tanda tangan, dipakai pada jalur tanda tangan basah.
- **FinalPdf**: Berkas PDF final yang dapat diunduh, tersimpan di Google Drive; dapat berupa hasil injeksi tanda tangan digital atau hasil scan tanda tangan basah.
- **unsignedDraftBaseRevisionId**: ID revisi baseline berkas `unsigned-draft` saat pertama kali dibuat, disimpan di sheet `Letters` sebagai titik referensi untuk memverifikasi apakah versi baru sudah diunggah.
- **finalFileName**: Nama berkas PDF final yang sudah disanitasi (tanpa path), disimpan di sheet `Letters` bersamaan dengan `finalPdfUrl` untuk kemudahan tampilan di UI.
- **AppDatabase**: Satu Google Spreadsheet yang berisi sheet `Users`, `Letters`, `Counters`, dan `ApprovalLog`.
- **ApprovalLog**: Sheet audit trail yang mencatat setiap tindakan approve/reject beserta aktor dan waktu.

---

## Requirements

### Requirement 1: Autentikasi Berbasis Whitelist Email

**User Story:** Sebagai pengguna, saya ingin login menggunakan akun Google pribadi dan langsung mendapatkan akses sesuai role saya, sehingga saya tidak perlu membuat akun atau password baru dan hak akses tetap terkontrol.

#### Acceptance Criteria

1. WHEN pengguna mengakses Web App, THE Sistem SHALL memanggil `Session.getActiveUser().getEmail()` untuk mendapatkan identitas pengguna aktif.
2. IF `Session.getActiveUser().getEmail()` mengembalikan string kosong atau null, THEN THE Sistem SHALL menolak akses dan menampilkan pesan yang mengindikasikan sesi Google tidak terdeteksi.
3. IF email pengguna tidak ditemukan di sheet `Users`, THEN THE Sistem SHALL menolak akses dan menampilkan pesan yang mengindikasikan email tidak terdaftar dan menginstruksikan pengguna menghubungi Admin.
4. IF email pengguna ditemukan di sheet `Users` tetapi nilai `isActive` adalah `FALSE`, THEN THE Sistem SHALL menolak akses dan menampilkan pesan yang mengindikasikan akun telah dinonaktifkan dan menginstruksikan pengguna menghubungi Admin.
5. WHEN email pengguna ditemukan di sheet `Users` dengan nilai `isActive` sama dengan `TRUE`, THE Sistem SHALL mengizinkan akses dan meneruskan pengguna ke halaman Dashboard dengan data `{ email, name, role }` tersedia di template halaman yang dirender.
6. WHEN halaman berhasil dirender untuk pengguna yang terautentikasi, THE Sistem SHALL berusaha menyertakan data `{ email, name, role }` pada template halaman; IF data template gagal dipopulasi, THE Sistem SHALL tetap merender halaman dengan data yang tersedia tanpa memblokir akses pengguna.
7. WHEN fungsi Controller mana pun dipanggil melalui `google.script.run`, THE Sistem SHALL menjalankan `authService.getCurrentUser()` sebagai guard; IF guard gagal (email tidak ditemukan atau `isActive = FALSE`), THEN THE Sistem SHALL menghentikan seluruh eksekusi Controller dan mengembalikan error "Akses tidak diizinkan" tanpa menjalankan logika apapun setelahnya.

---

### Requirement 2: Manajemen Pengguna oleh Admin

**User Story:** Sebagai Admin, saya ingin mendaftarkan, mengubah role, dan menonaktifkan pengguna melalui antarmuka Pengaturan, sehingga saya dapat mengelola hak akses tanpa perlu mengakses Spreadsheet secara langsung.

#### Acceptance Criteria

1. THE Sistem SHALL membatasi akses panel manajemen pengguna hanya kepada pengguna dengan role `admin`.
2. WHEN Admin menambahkan entri pengguna baru, THE Sistem SHALL memvalidasi bahwa email memenuhi format yang valid (mengandung tepat satu karakter `@`, domain mengandung setidaknya satu titik, panjang keseluruhan tidak melebihi 254 karakter) dan belum terdaftar di sheet `Users` sebelum menyimpan baris baru dengan nilai `isActive` sama dengan `TRUE` dan `createdAt` berisi timestamp saat ini.
3. IF Admin mencoba mendaftarkan email yang sudah ada di sheet `Users`, THEN THE Sistem SHALL menolak operasi dan mengembalikan pesan error "Email sudah terdaftar".
4. WHEN Admin mengubah role pengguna yang sudah terdaftar, THE Sistem SHALL memperbarui kolom `role` pada baris yang sesuai di sheet `Users` dengan salah satu dari nilai yang valid: `drafter`, `reviewer`, `approver`, atau `admin`.
5. IF Admin mencoba menonaktifkan akun Admin sendiri (email pengguna aktif sama dengan email target), THEN THE Sistem SHALL menolak operasi dan mengembalikan pesan error yang menginformasikan bahwa Admin tidak dapat menonaktifkan akun sendiri.
6. WHEN Admin menonaktifkan pengguna lain, THE Sistem SHALL mengubah nilai `isActive` menjadi `FALSE` pada baris yang sesuai tanpa menghapus baris tersebut.
7. THE Sistem SHALL menampilkan daftar seluruh pengguna terdaftar beserta email, nama, role, dan status `isActive` kepada Admin pada halaman Pengaturan.
8. IF nilai yang dimasukkan untuk kolom nama atau catatan mengandung karakter yang memulai formula Sheets (`=`, `+`, `-`, `@`), THEN THE Sistem SHALL menambahkan prefix `'` pada nilai tersebut sebelum menulis ke sel.
9. IF operasi tulis ke sheet `Users` (tambah, ubah role, atau nonaktifkan) gagal karena error layanan Google Sheets, THEN THE Sistem SHALL mengembalikan pesan error yang menginformasikan kegagalan operasi tanpa mengubah data yang sudah ada.

---

### Requirement 3: Unggah Tanda Tangan Referensi oleh Approver

**User Story:** Sebagai Approver, saya ingin mengunggah gambar tanda tangan referensi saya melalui halaman Pengaturan, sehingga tanda tangan saya dapat disuntikkan secara otomatis ke dokumen final jika saya memilih metode tanda tangan digital.

#### Acceptance Criteria

1. IF pengguna tidak memiliki role `approver`, THEN THE Sistem SHALL menolak akses ke fitur unggah tanda tangan dan menampilkan pesan kesalahan yang menginformasikan bahwa fitur ini hanya tersedia untuk Approver.
2. WHEN Approver mengunggah gambar tanda tangan, THE Sistem SHALL menyimpan berkas tersebut ke folder `Signatures/` di Google Drive dengan nama berkas yang menggunakan email Approver sebagai nama berkas.
3. WHEN unggah berhasil, THE Sistem SHALL memperbarui kolom `signatureFileId` pada baris Approver di sheet `Users` dengan ID berkas yang baru diunggah.
4. IF Approver sudah memiliki tanda tangan sebelumnya (`signatureFileId` tidak kosong), THEN THE Sistem SHALL mengganti konten berkas lama menggunakan Drive `Files.update` sehingga ID berkas tetap sama dan `signatureFileId` di sheet `Users` tidak berubah.
5. THE Sistem SHALL menerima format gambar JPEG dan PNG untuk berkas tanda tangan dengan ukuran berkas maksimum 2 MB.
6. IF berkas yang diunggah bukan format JPEG atau PNG, atau ukurannya melebihi 2 MB, THEN THE Sistem SHALL menolak unggahan dan menampilkan pesan kesalahan yang menginformasikan batasan format dan ukuran yang berlaku tanpa menyimpan berkas apapun ke Drive.

---

### Requirement 4: Pembuatan Draf Surat oleh Drafter

**User Story:** Sebagai Drafter, saya ingin mengisi form dinamis sesuai template surat yang dipilih dan menentukan urutan Reviewer/Approver, sehingga saya dapat membuat draf surat resmi tanpa mengetik dokumen secara manual.

#### Acceptance Criteria

1. IF pengguna aktif tidak memiliki role `drafter`, THEN THE Sistem SHALL menolak akses ke halaman pembuatan surat dan mengarahkan pengguna ke halaman Dashboard.
2. WHEN Drafter memilih jenis template surat dari dropdown, THE Sistem SHALL menampilkan form input dinamis yang sesuai dengan variabel `contentData` template tersebut.
3. THE Sistem SHALL menyediakan dropdown pilihan Reviewer dan Approver yang hanya menampilkan pengguna dengan role `reviewer` atau `approver` yang nilai `isActive`-nya `TRUE`.
4. WHEN Drafter mengisi form dan menekan tombol "Submit Draft", THE Sistem SHALL memvalidasi bahwa seluruh field wajib (jenis template, `contentData` sesuai template, dan minimal satu Approver) telah diisi sebelum memproses pengiriman.
5. IF validasi gagal, THEN THE Sistem SHALL menampilkan pesan error yang merinci field mana yang belum lengkap tanpa menghapus data yang sudah diisi.
6. WHEN validasi berhasil, THE Sistem SHALL meminta penerbitan `LetterNumber` yang unik secara atomik untuk template yang dipilih.
7. WHEN `LetterNumber` berhasil diterbitkan, THE Sistem SHALL menyimpan baris baru ke sheet `Letters` dengan status `In Review`, `approvalFlow` berisi seluruh Reviewer/Approver pilihan Drafter dengan status `pending`, dan `createdAt` berisi timestamp saat ini.
8. WHEN penyimpanan berhasil, THE Sistem SHALL memicu pengiriman email notifikasi kepada pengguna pertama dalam `approvalFlow`.
9. IF penerbitan `LetterNumber` gagal (misalnya karena kunci tidak berhasil diperoleh), THEN THE Sistem SHALL menampilkan pesan error yang menginformasikan kegagalan pembuatan nomor surat tanpa menyimpan data ke sheet `Letters`.

---

### Requirement 5: Penomoran Surat Atomik

**User Story:** Sebagai sistem, saya ingin menerbitkan nomor surat yang unik dan berurutan meskipun beberapa surat dibuat bersamaan, sehingga tidak terjadi duplikasi nomor surat.

#### Acceptance Criteria

1. THE Sistem SHALL memformat `LetterNumber` mengikuti pola `NNNN.KODE/BULANROMAWI/TAHUN`, di mana `NNNN` adalah angka urut empat digit dengan leading zero dalam rentang `0001` hingga `9999`, `KODE` adalah `templateCode`, `BULANROMAWI` adalah representasi romawi bulan berjalan dalam rentang `I` hingga `XII`, dan `TAHUN` adalah tahun empat digit berjalan.
2. THE Sistem SHALL menyimpan angka urut per kombinasi bulan-tahun sebagai entri terpisah di sheet `Counters` dengan `counterId` berformat `MM_YYYY`.
3. WHEN `numberingService.generateNumber()` dipanggil, THE Sistem SHALL mengakuisisi `LockService.getScriptLock()` dengan timeout 30 detik sebelum membaca atau menulis sheet `Counters`.
4. WHILE kunci aktif dipegang, THE Sistem SHALL membaca nilai `currentSequence` dari sheet `Counters` untuk kombinasi bulan-tahun saat ini; IF tidak ada baris yang ditemukan untuk kombinasi tersebut, THE Sistem SHALL memperlakukan `currentSequence` sebagai 0; THE Sistem SHALL menambahkan nilainya sebesar 1 dan menulis kembali ke sheet sebelum melepas kunci.
5. IF kunci tidak berhasil diperoleh dalam 30 detik, THEN THE Sistem SHALL memberikan indikasi kegagalan kepada Controller sehingga pembuatan surat dibatalkan tanpa menulis ke sheet `Counters`.
6. THE Sistem SHALL memastikan kunci `LockService` selalu dilepas melalui mekanisme `try/finally` setelah setiap operasi penomoran — termasuk saat terjadi exception yang tidak terduga selama baca atau tulis sheet `Counters` — sehingga kunci tidak pernah tertinggal dalam keadaan terkunci.
7. IF angka urut mencapai 9999 dan sistem diminta menerbitkan nomor baru untuk kombinasi bulan-tahun yang sama, THEN THE Sistem SHALL memberikan indikasi kegagalan kepada Controller tanpa menulis ke sheet `Counters`.
8. THE Sistem SHALL memastikan hanya komponen penomoran (`numberingService`) yang diizinkan memodifikasi sheet `Counters` — komponen lain tidak boleh membaca atau menulis sheet tersebut secara langsung.

---

### Requirement 6: Alur Persetujuan Berjenjang

**User Story:** Sebagai Reviewer/Approver, saya ingin menerima notifikasi saat giliran saya tiba, melihat pratinjau surat secara lengkap, lalu menyetujui atau menolak beserta catatan revisi opsional, sehingga alur persetujuan berjalan teratur tanpa melompati giliran.

#### Acceptance Criteria

1. WHEN pengguna membuka halaman detail surat (`/letter/[id]`), THE Sistem SHALL menampilkan tombol "Approve" dan "Reject" hanya jika email pengguna aktif cocok dengan `email` pada elemen `approvalFlow` yang statusnya `pending`, nilai `isActive` pengguna di sheet `Users` adalah `TRUE`, dan seluruh elemen sebelum elemen tersebut dalam array sudah berstatus `approved`.
2. WHEN pengguna menekan tombol "Approve" atau "Reject", THE Sistem SHALL memvalidasi ulang di server: (a) email pengguna aktif cocok dengan elemen `approvalFlow` yang saat ini `pending`, (b) seluruh elemen sebelumnya berstatus `approved`, dan (c) status surat adalah `In Review` — tanpa bergantung pada data yang dikirim dari client.
3. IF validasi server pada Criterion 2 gagal, THEN THE Sistem SHALL menolak operasi, mengembalikan pesan error yang menginformasikan bahwa kondisi persetujuan tidak terpenuhi, dan tidak mengubah data apapun di sheet `Letters` atau `ApprovalLog`.
4. WHEN persetujuan diproses dan elemen `approvalFlow` yang di-approve bukan elemen terakhir, THE Sistem SHALL mengubah status elemen tersebut menjadi `approved`, mencatat tindakan ke sheet `ApprovalLog`, dan memicu pengiriman notifikasi email kepada pemegang giliran berikutnya.
5. WHEN persetujuan diproses dan elemen yang di-approve adalah elemen terakhir dalam `approvalFlow`, THE Sistem SHALL memproses finalisasi dokumen sesuai `signatureMethod` yang dipilih Approver terakhir (lihat Requirement 7 dan 8).
6. WHEN Reviewer/Approver menolak surat (Reject), THE Sistem SHALL mengubah status elemen `approvalFlow` yang bersangkutan menjadi `rejected`, mengubah status surat di sheet `Letters` menjadi `Rejected`, mencatat tindakan ke sheet `ApprovalLog`, dan memicu pengiriman notifikasi email kepada Drafter beserta isi field `notes` (maksimum 500 karakter) — notifikasi dikirim selalu, baik `notes` diisi maupun kosong.
7. IF surat berstatus `Rejected`, THEN THE Sistem SHALL menolak seluruh operasi `decide` berikutnya untuk surat tersebut dan tidak mengubah data apapun.
8. THE Sistem SHALL mencatat setiap tindakan approve dan reject ke sheet `ApprovalLog` dengan kolom `letterId`, `actorEmail`, `action`, `notes` (kosong jika tidak diisi), dan `timestamp` dalam format ISO 8601.

---

### Requirement 7: Finalisasi Dokumen — Tanda Tangan Digital

**User Story:** Sebagai Approver terakhir, saya ingin memilih metode tanda tangan digital saat memberikan persetujuan akhir, sehingga sistem secara otomatis menghasilkan PDF final yang sudah disuntik tanda tangan tanpa proses manual.

#### Acceptance Criteria

1. WHEN Approver terakhir menyetujui surat dan memilih `signatureMethod = "digital"`, THE Sistem SHALL memvalidasi bahwa kolom `signatureFileId` pada baris Approver terakhir di sheet `Users` tidak kosong sebelum memulai `generateDigitalFinal`.
2. IF `signatureFileId` Approver terakhir kosong, THEN THE Sistem SHALL menolak operasi finalisasi digital dan mengembalikan pesan error yang menginformasikan bahwa gambar tanda tangan referensi belum diunggah.
3. WHEN validasi `signatureFileId` berhasil, THE Sistem SHALL menyalin master template Google Docs (`googleDocTemplateId`) ke folder `Letters/{letterId}/` di Google Drive dalam satu eksekusi sinkron.
4. WHEN salinan template tersedia, THE Sistem SHALL menyuntikkan seluruh variabel `ContentData` ke placeholder dokumen; placeholder diidentifikasi menggunakan nama field yang dibungkus kurung kurawal ganda, contoh `{{nama}}`.
5. WHEN injeksi `ContentData` selesai, THE Sistem SHALL mengambil gambar tanda tangan dari Drive menggunakan `signatureFileId` Approver terakhir dan menyuntikkannya ke placeholder tanda tangan yang telah ditentukan pada dokumen.
6. WHEN injeksi tanda tangan selesai, THE Sistem SHALL mengekspor dokumen sebagai PDF dan menyimpannya sebagai berkas `final` di folder `Letters/{letterId}/` di Google Drive.
7. WHEN berkas PDF berhasil disimpan, THE Sistem SHALL memperbarui kolom `finalPdfUrl` di sheet `Letters` dengan URL berkas tersebut, mengubah status surat menjadi `Approved`, dan mencatat tindakan `approve` beserta `signatureMethod = "digital"` ke sheet `ApprovalLog`.
8. IF proses `generateDigitalFinal` gagal pada langkah mana pun setelah penyalinan template, THEN THE Sistem SHALL menghapus berkas salinan yang sudah dibuat di Drive, mencatat error, dan mengembalikan pesan kegagalan kepada Controller tanpa mengubah status surat menjadi `Approved`.

---

### Requirement 8: Finalisasi Dokumen — Tanda Tangan Basah

**User Story:** Sebagai Approver terakhir, saya ingin memilih metode tanda tangan basah agar draf dokumen tanpa tanda tangan dibagikan melalui Drive kepada Drafter untuk dicetak, ditandatangani secara fisik, dipindai, dan diunggah kembali, sehingga dokumen final tetap tertaut di sistem dengan riwayat versi yang lengkap.

#### Acceptance Criteria

1. WHEN Approver terakhir menyetujui surat dan memilih `signatureMethod = "wet"`, THE Sistem SHALL memanggil `generateUnsignedDraft`; frasa 'satu eksekusi sinkron' bersifat deskriptif implementasi dan bukan kondisi yang diberlakukan secara terpisah.
2. WHEN `generateUnsignedDraft` dijalankan, THE Sistem SHALL menyalin master template Google Docs ke folder `Letters/{letterId}/`, menyuntikkan `ContentData` tanpa menyuntikkan gambar tanda tangan, menyimpan hasilnya sebagai berkas `unsigned-draft`, dan menyimpan `revisionId` berkas tersebut pada saat pembuatan ke kolom `unsignedDraftBaseRevisionId` di sheet `Letters`.
3. WHEN berkas `unsigned-draft` tersimpan, THE Sistem SHALL memberikan izin akses **Editor** pada berkas tersebut kepada `drafterEmail` dan seluruh email yang terdaftar di `approvalFlow` — tidak kepada publik atau domain-wide.
4. WHEN berbagi akses selesai, THE Sistem SHALL menyimpan ID berkas `unsigned-draft` ke kolom `unsignedDriveFileId` di sheet `Letters`, mengubah `awaitingWetSignature` menjadi `TRUE`, dan mempertahankan status surat tetap `In Review`.
5. IF `generateUnsignedDraft` gagal karena template tidak ditemukan atau Drive tidak dapat diakses, THEN THE Sistem SHALL mengembalikan pesan error yang menjelaskan penyebab kegagalan kepada Approver, mempertahankan status surat tetap pada status sebelum aksi dijalankan, dan tidak mengubah nilai `awaitingWetSignature`.
6. WHEN `awaitingWetSignature = TRUE` DAN Drafter atau Approver menekan tombol konfirmasi unggah dokumen bertanda tangan, THE Sistem SHALL langsung memeriksa apakah `revisionId` terkini berkas `unsignedDriveFileId` berbeda dari `unsignedDraftBaseRevisionId` yang tersimpan di sheet `Letters` — kedua kondisi bersama-sama selalu mengharuskan pemeriksaan revisi dilakukan secara langsung tanpa kondisi tambahan.
7. WHEN verifikasi revisi berhasil (revisionId terkini berbeda dari baseline), THE Sistem SHALL mengisi `finalPdfUrl` dengan URL berkas `unsignedDriveFileId` yang sama, mengubah `awaitingWetSignature` menjadi `FALSE`, dan mengubah status surat menjadi `Approved`.
8. IF verifikasi revisi gagal (revisionId terkini sama dengan baseline), THEN THE Sistem SHALL mengembalikan pesan error yang menginformasikan bahwa belum ada versi baru ditemukan tanpa mengubah status surat, nilai `awaitingWetSignature`, atau `finalPdfUrl`.
9. WHEN verifikasi revisi berhasil, THE Sistem SHALL mencatat tindakan `upload_wet_signature` beserta email aktor dan waktu ke sheet `ApprovalLog`.
10. IF nama berkas atau ID yang digunakan untuk membentuk path folder Drive mengandung karakter `/ \ : * ? " < > |`, THEN THE Sistem SHALL membersihkan karakter tersebut sebelum membuat folder atau berkas.

---

### Requirement 9: Dashboard dan Riwayat Surat

**User Story:** Sebagai pengguna, saya ingin melihat ringkasan status surat saya dan menelusuri riwayat surat di satu halaman, sehingga saya mendapat gambaran cepat kondisi pekerjaan tanpa perlu mengakses Spreadsheet.

#### Acceptance Criteria

1. WHEN pengguna membuka halaman Dashboard, THE Sistem SHALL menampilkan tiga kartu statistik yang menunjukkan jumlah surat berstatus `Draft`, `In Review`, dan `Approved` sesuai dengan aturan visibilitas pada Criterion 5.
2. WHEN pengguna membuka halaman Dashboard, THE Sistem SHALL menampilkan tabel riwayat surat yang berisi kolom: Nomor Surat, Jenis, Tanggal Dibuat, Status (dengan badge warna), dan tombol "Lihat Detail".
3. WHILE pengguna memiliki role `drafter`, THE Sistem SHALL menampilkan tombol "+ Buat Surat Baru" di halaman Dashboard.
4. WHEN pengguna menekan tombol "Lihat Detail", THE Sistem SHALL menavigasi pengguna ke halaman detail surat yang sesuai dengan `letterId` yang dipilih.
5. IF pengguna memiliki role `drafter`, THEN THE Sistem SHALL menampilkan hanya surat-surat di mana `drafterEmail` cocok dengan email pengguna aktif. IF pengguna memiliki role `reviewer` atau `approver`, THEN THE Sistem SHALL menampilkan hanya surat-surat di mana email pengguna aktif terdaftar sebagai salah satu elemen di `approvalFlow`.
6. IF pengambilan data surat dari sheet `Letters` gagal, THEN THE Sistem SHALL menampilkan pesan error yang menginformasikan kegagalan memuat data tanpa menampilkan tabel kosong yang tidak berpenjelasan.
7. IF tidak ada surat yang relevan ditemukan untuk pengguna aktif, THE Sistem SHALL menampilkan pesan kosong yang mengindikasikan belum ada surat dan kartu statistik menampilkan nilai 0 untuk semua status.

---

### Requirement 10: Detail Surat dan Pratinjau Dokumen

**User Story:** Sebagai pengguna, saya ingin melihat detail lengkap surat termasuk pratinjau isi, timeline persetujuan, dan (jika sudah final) tautan PDF, sehingga saya mendapat konteks penuh sebelum mengambil keputusan atau mengarsipkan dokumen.

#### Acceptance Criteria

1. WHEN pengguna membuka halaman detail surat, IF `finalPdfUrl` sudah terisi, THE Sistem SHALL menampilkan embed atau tautan PDF final; IF `finalPdfUrl` kosong, THE Sistem SHALL menampilkan pratinjau isi surat berdasarkan data `contentData` yang tersimpan.
2. WHEN pengguna membuka halaman detail surat, THE Sistem SHALL menampilkan timeline persetujuan yang bersumber dari sheet `ApprovalLog` berisi urutan aktor, tindakan, catatan, dan timestamp.
3. WHILE status surat adalah `In Review` dan email pengguna aktif cocok dengan giliran `approvalFlow` yang `pending`, THE Sistem SHALL menampilkan panel aksi berisi textarea catatan revisi (opsional, maksimum 500 karakter), tombol "Approve", dan tombol "Reject".
4. WHILE status surat adalah `In Review` dan `awaitingWetSignature` bernilai `TRUE`, THE Sistem SHALL menampilkan tautan `unsignedDriveFileId` serta tombol "Saya sudah unggah dokumen bertanda tangan" kepada pengguna dengan `drafterEmail` atau email yang terdaftar di `approvalFlow`.
5. WHILE status surat adalah `Approved`, THE Sistem SHALL menampilkan tautan unduhan `FinalPdf` kepada pengguna dengan `drafterEmail` atau email yang terdaftar di `approvalFlow`.
6. IF data surat tidak dapat dimuat (letterId tidak ditemukan di sheet `Letters` atau terjadi error layanan), THEN THE Sistem SHALL menampilkan pesan error yang menginformasikan kegagalan memuat detail surat tanpa menampilkan halaman kosong atau rusak.

---

### Requirement 11: Notifikasi Email Otomatis

**User Story:** Sebagai sistem, saya ingin mengirimkan notifikasi email pada setiap titik penting alur surat, sehingga pengguna selalu mendapat informasi tepat waktu tanpa perlu memantau dashboard secara aktif.

#### Acceptance Criteria

1. WHEN Drafter berhasil menyimpan surat baru, THE Sistem SHALL mengirim email notifikasi kepada email pemegang giliran pertama dalam `approvalFlow` berisi informasi nomor surat, jenis surat, dan tautan halaman detail surat (URL Web App dengan parameter `letterId`).
2. WHEN Reviewer/Approver menyetujui surat dan masih ada giliran berikutnya, THE Sistem SHALL mengirim email notifikasi kepada pemegang giliran berikutnya dalam `approvalFlow` berisi informasi nomor surat, jenis surat, dan tautan halaman detail surat (URL Web App dengan parameter `letterId`).
3. WHEN surat ditolak (Reject) oleh Reviewer/Approver mana pun, THE Sistem SHALL mengirim email notifikasi kepada `drafterEmail` berisi nomor surat, nama penolak, dan isi field `notes` jika `notes` tidak kosong.
4. WHEN status surat berubah menjadi `Approved` dan `finalPdfUrl` telah tersedia, THE Sistem SHALL mengirim email notifikasi kepada `drafterEmail` berisi nomor surat dan `finalPdfUrl` — berlaku baik untuk jalur tanda tangan digital maupun jalur tanda tangan basah setelah verifikasi.
5. IF pengiriman email gagal karena sebab apa pun (termasuk kuota `MailApp` terlampaui maupun exception lainnya), THEN THE Sistem SHALL mencatat kegagalan beserta alasannya di log Apps Script tanpa membatalkan operasi utama (simpan/update status surat); IF pencatatan kegagalan itu sendiri gagal, THEN THE Sistem SHALL menampilkan atau meneruskan error pencatatan secara eksplisit tanpa menelannya secara diam-diam.

---

### Requirement 12: Keamanan dan Kontrol Akses Server-Side

**User Story:** Sebagai sistem, saya ingin memastikan setiap operasi yang mengubah data divalidasi di server berdasarkan role dan kondisi aktual, sehingga manipulasi dari sisi client tidak dapat membypass kontrol akses.

#### Acceptance Criteria

1. THE Sistem SHALL memvalidasi role pengguna aktif di setiap fungsi Controller sebelum menjalankan logika apapun — termasuk `submitDraft`, `decide`, `confirmWetSignatureUploaded`, `upsertUser`, dan `uploadSignature`.
2. THE Sistem SHALL memvalidasi urutan `approvalFlow` di server (Service layer) — elemen ke-N hanya boleh diproses jika seluruh elemen sebelum indeks N sudah berstatus `approved`, bukan berdasarkan data yang dikirim client.
3. THE Sistem SHALL menolak operasi `decide` jika email pengguna aktif tidak cocok dengan elemen `approvalFlow` yang sedang menunggu (`pending`).
4. THE Sistem SHALL menolak operasi `submitDraft` jika pengguna aktif tidak memiliki role `drafter`.
5. THE Sistem SHALL menolak operasi `upsertUser` jika pengguna aktif tidak memiliki role `admin`.
6. THE Sistem SHALL menolak operasi `uploadSignature` jika pengguna aktif tidak memiliki role `approver`.
7. IF nilai pada field `contentData` memiliki panjang melebihi batas yang ditentukan atau tipe data tidak sesuai, THEN THE Sistem SHALL menolak penyimpanan dan mengembalikan pesan error yang merinci field yang tidak valid.

---

### Requirement 13: Konvensi Penamaan Berkas PDF dan Dokumen Drive

**User Story:** Sebagai sistem, saya ingin setiap berkas yang disimpan ke Google Drive diberi nama yang konsisten, deskriptif, dan aman untuk digunakan sebagai nama berkas, sehingga pengguna dapat mengidentifikasi dokumen dengan mudah tanpa bergantung pada metadata internal sistem.

#### Acceptance Criteria

1. THE Sistem SHALL membentuk nama berkas PDF final (jalur tanda tangan digital) menggunakan pola `{letterNumber-sanitized} - {templateType}.pdf`, di mana `{letterNumber-sanitized}` adalah `letterNumber` yang sudah mengganti karakter `/` dengan `-` dan menghapus karakter `\ : * ? " < > |`, dan `{templateType}` adalah nilai kolom `templateType` dari sheet `Letters`.
2. THE Sistem SHALL membentuk nama berkas `unsigned-draft` (jalur tanda tangan basah) menggunakan pola `{letterNumber-sanitized} - Draft`, tanpa ekstensi file karena berkas disimpan sebagai Google Docs (bukan file lokal).
3. THE Sistem SHALL membentuk nama folder per surat menggunakan `{letterId}` (UUID) sebagai nama folder di dalam `Letters/` di Google Drive, bukan menggunakan `letterNumber` secara langsung, untuk menghindari karakter bermasalah pada nama folder.
4. IF `letterNumber` belum tersedia saat berkas pertama kali dibuat (status masih `Draft`), THE Sistem SHALL menggunakan `{letterId}` sebagai fallback untuk komponen nama berkas hingga `letterNumber` diterbitkan.
5. WHEN nama berkas atau nama folder akhir terbentuk, THE Sistem SHALL memastikan panjang total nama tidak melebihi 255 karakter; IF melebihi, THE Sistem SHALL memotong komponen `{templateType}` dari belakang hingga total panjang memenuhi batas, dengan tetap mempertahankan sufiks `.pdf` atau ` - Draft`.
6. THE Sistem SHALL menyimpan nama berkas final yang sudah disanitasi (bukan URL) ke kolom `finalFileName` di sheet `Letters` bersamaan dengan penyimpanan `finalPdfUrl`, sehingga nama berkas dapat ditampilkan di UI tanpa perlu melakukan parsing URL.

---

## Catatan Teknis dan Keterbatasan Fase 0

- **Tidak ada status `Processing PDF`**: Seluruh proses generate dokumen (Requirement 7 dan 8) berjalan sinkron dalam satu eksekusi Apps Script. Status ini akan diaktifkan kembali di Fase 1 ketika `documentService` berjalan secara asinkron di Firebase Cloud Functions.
- **Batas eksekusi 6 menit**: Proses yang melibatkan pembuatan dokumen (`documentService`) harus selesai dalam batas ini.
- **Skala**: Google Sheets cocok untuk puluhan hingga ratusan surat per bulan. Jika volume meningkat signifikan, migrasi ke Fase 1 (Firestore) direkomendasikan.
- **Migrasi**: Skema kolom sheet `Users`, `Letters`, `Counters` dirancang selaras dengan collection Firestore pada `schema.md` untuk memudahkan migrasi Fase 1.
- **Kolom tambahan sheet `Letters`**: Kolom `unsignedDraftBaseRevisionId` dan `finalFileName` ditambahkan — yang pertama untuk verifikasi tanda tangan basah (Requirement 8), yang kedua untuk menyimpan nama berkas PDF final yang sudah disanitasi (Requirement 13).