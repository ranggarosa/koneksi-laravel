# Feature Specification: Aplikasi Pengelolaan Naskah Dinas & Penomoran Surat (Koneksi Core)

**Feature Branch**: `003-laravel-correspondence-core`

**Created**: 2026-10-04

**Status**: Draft

**Input**: User description: "Mulai pengembangan Aplikasi, tetap terapkan fitur yang ada diversi sebelumnya, tambahkan 4 sample user (admin, drafter, reviewer, approver), tambahkan beberapa contoh case pembuatan surat"

## Clarifications

### Session 2026-10-04
- Q: Bagaimana standar lingkungan pengembangan lokal yang ingin didokumentasikan untuk menjalankan stack Laravel, PostgreSQL, dan Vite di komputer pengembang? → A: Laravel Sail (Docker) sebagai standar utama (direkomendasikan dengan OrbStack/Colima di macOS x86_64) serta menyediakan panduan alternatif Native (Homebrew PHP 8.3+ & PostgreSQL 16).
- Q: Bagaimana sistem harus mengonfigurasi penyimpanan berkas dokumen (hasil scan fisik dan PDF surat) saat aplikasi dijalankan di lingkungan lokal (development)? → A: Menggunakan driver disk lokal (FILESYSTEM_DISK=public/local) pada lingkungan lokal via .env.example, dan beralih ke driver Cloudflare R2 (s3) pada lingkungan Heroku staging/production.
- Q: Bagaimana mekanisme otentikasi dan perpindahan akun (role switching) untuk 4 akun contoh pengguna saat diuji coba pada lingkungan pengembangan lokal? → A: Menggunakan formulir login email/password standar dengan kata sandi seragam ('password') dari seeder database, disertai tombol pembantu Quick Switch User 1-klik khusus di lingkungan lokal (APP_ENV=local) untuk mempercepat pengujian alur berjenjang.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pembuatan Draf Surat Internal & Penomoran Unik Otomatis (Priority: P1)

Sebagai seorang **Drafter**, saya ingin menyusun draf naskah dinas internal baru berdasarkan template surat yang tersedia, memilih urutan peninjau (Reviewer) dan pengesah akhir (Approver) secara dinamis, dan mendapatkan nomor surat resmi yang berurutan secara otomatis tanpa risiko duplikasi nomor, sehingga proses administrasi persuratan berjalan tertib dan terstruktur.

**Why this priority**: Merupakan inti fungsional sistem (Core MVP). Tanpa kemampuan membuat naskah dan mengalokasikan nomor surat resmi, seluruh alur persetujuan dan pengarsipan tidak dapat berjalan.

**Independent Test**: Drafter login menggunakan akun contoh `drafter@koneksi.local`, memilih template surat (misalnya Surat Keterangan Kerja atau Surat Peringatan), melengkapi data isian wajib, memilih 1 peninjau dan 1 pengesah akhir, lalu mengirimkan draf. Sistem memeriksa antrean nomor daur ulang (recycled pool) atau counter urutan baru, menerbitkan nomor surat resmi dengan format unik `{nomor:04d}.{kodeTemplate}/{bulanRomawi}/{tahun}`, mengunci draf ke status `In Review`, dan mengarahkan giliran pertama ke peninjau.

**Acceptance Scenarios**:

1. **Given** Drafter aktif membuka formulir pembuatan naskah dinas, **When** Drafter memilih jenis template surat, melengkapi data variabel wajib, menentukan urutan peninjau dinamis (0 atau lebih Reviewer) serta 1 Approver akhir, lalu menekan tombol kirim draf, **Then** Sistem menghasilkan nomor surat unik (dari daftar nomor daur ulang jika ada, atau menaikkan nomor urut baru secara atomik), mencatat draf ke status `In Review`, dan mengalihkan giliran aksi kepada peninjau urutan ke-1.
2. **Given** Dua Drafter mengajukan draf surat secara bersamaan pada detik yang sama untuk jenis template yang sama, **When** Sistem memproses kedua pengajuan, **Then** Masing-masing draf mendapatkan nomor surat berurutan yang berbeda tanpa adanya benturan atau nomor ganda (*zero duplicate numbers*).
3. **Given** Drafter mengisi formulir dengan data wajib yang kosong, **When** Drafter menekan tombol kirim draf, **Then** Sistem menolak pengiriman dan menampilkan indikator kesalahan yang jelas pada setiap kolom yang belum lengkap.
4. **Given** Drafter memilih akun dirinya sendiri sebagai Reviewer atau Approver pada draf yang diajukannya, **When** Drafter menekan tombol kirim, **Then** Sistem menolak pengajuan dengan pesan kesalahan bahwa pembuat draf dilarang menyetujui surat buatannya sendiri (*separation of duties*).

---

### User Story 2 - Alur Peninjauan Bertingkat & Penolakan Naskah (Priority: P1)

Sebagai seorang **Reviewer** atau **Approver**, saya ingin memeriksa draf surat dinas yang ditugaskan sesuai giliran saya, membaca rincian naskah, dan memberikan keputusan persetujuan (*Approve*) atau penolakan (*Reject*) dengan catatan perbaikan, sehingga naskah dinas yang beredar terjamin akurasi dan otorisasi isinya.

**Why this priority**: Alur persetujuan bertingkat adalah pilar integritas tata kelola organisasi agar surat dinas tidak diterbitkan tanpa verifikasi atasan berwenang.

**Independent Test**: Pengguna login sebagai `reviewer@koneksi.local`, membuka menu persetujuan, melihat draf pada urutan giliran aktifnya, dan melakukan "Approve" (draf berpindah ke Approver) atau "Reject" disertai alasan penolakan (alur langsung berhenti, status berubah menjadi `Rejected`, nomor surat dikembalikan ke antrean nomor bebas/daur ulang, dan Drafter menerima notifikasi revisi).

**Acceptance Scenarios**:

1. **Given** Draf surat berada pada giliran peninjau ke-$n$, **When** Peninjau ke-$n$ menyetujui draf, **Then** Catatan persetujuan tersimpan di riwayat audit, dan draf secara otomatis dialihkan ke giliran peninjau urutan ke-($n+1$).
2. **Given** Draf surat berada pada urutan ke-$n$, **When** Pengguna urutan ke-($n+1$) mencoba menyetujui sebelum giliran tiba, **Then** Sistem menolak tindakan tersebut dan memastikan hanya peninjau aktif yang dapat melakukan aksi.
3. **Given** Peninjau menemukan kesalahan substansi naskah dinas, **When** Peninjau menekan tombol "Reject" disertai catatan perbaikan wajib, **Then** Seluruh alur persetujuan berhenti seketika, status draf berubah permanen menjadi `Rejected` (terkunci dari perubahan lanjutan), nomor surat yang telah dipesan dilepaskan ke antrean nomor daur ulang (*recycled pool*), dan pembuat draf dapat menduplikasi data draf lama untuk membuat perbaikan baru.

---

### User Story 3 - Finalisasi Pengesahan Dokumen: Tanda Tangan Digital vs Basah (Priority: P1)

Sebagai seorang **Approver Akhir**, saya ingin memilih metode pengesahan antara **Tanda Tangan Digital** (langsung mengesahkan dan menerbitkan dokumen PDF final) atau **Tanda Tangan Basah** (dokumen dicetak manual, ditandatangani basah, dan hasil scan diunggah kembali), sehingga pengesahan surat dapat fleksibel mengakomodasi kebutuhan administratif organisasi.

**Why this priority**: Menyelesaikan siklus hidup naskah dinas hingga menjadi arsip resmi yang berkekuatan hukum dan siap didistribusikan.

**Independent Test**: Login sebagai `approver@koneksi.local`. Jika memilih metode digital: surat langsung berstatus `Approved` dan PDF final siap diunduh. Jika memilih metode basah: status menjadi `Awaiting Wet Signature`; Drafter mengunggah berkas scan fisik yang ditandatangani, sistem memverifikasi berkas, dan status bertransisi menjadi `Approved`.

**Acceptance Scenarios**:

1. **Given** Approver akhir menyetujui naskah dengan opsi "Tanda Tangan Digital", **When** Persetujuan dikonfirmasi, **Then** Sistem menyematkan tanda tangan digital yang terotorisasi ke dalam dokumen, menerbitkan berkas PDF resmi, mengubah status surat menjadi `Approved`, dan menyediakan tombol unduh dokumen final.
2. **Given** Approver akhir menyetujui naskah dengan opsi "Tanda Tangan Basah", **When** Persetujuan dikonfirmasi, **Then** Sistem menghasilkan draf cetak tanpa tanda tangan, menetapkan status draf menjadi `Awaiting Wet Signature`, dan menampilkan antarmuka unggah berkas scan bagi pemohon.
3. **Given** Surat berstatus `Awaiting Wet Signature` telah ditandatangani fisik, **When** Drafter mengunggah berkas scan dokumen resmi dalam format PDF, **Then** Sistem menyimpan berkas ke repositori penyimpanan berkas yang aman, mengubah status surat menjadi `Approved`, dan mencatat penyelesaian dokumen pada log audit.

---

### User Story 4 - Reservasi Nomor Surat Eksternal / Ambil Nomor (Priority: P2)

Sebagai seorang **Drafter**, saya ingin mengajukan permohonan nomor surat dinas resmi untuk dokumen fisik atau eksternal yang disusun di luar aplikasi (misalnya surat perjanjian pihak ketiga atau surat izin khusus) dengan hanya mengisi metadata pokok (Perihal, Tujuan, Kode Template) dan memilih 1 Approver, sehingga saya dapat mengurus administrasi penomoran dengan cepat tanpa harus mengetik naskah di sistem.

**Why this priority**: Mengakomodasi kebutuhan mendesak persuratan fisik atau eksternal mitra yang tata letaknya tidak mengikuti editor template internal, dengan tetap menjamin ketertiban buku agenda nomor surat.

**Independent Test**: Drafter mengajukan "Ambil Nomor Surat", Approver menyetujui, sistem menerbitkan nomor surat resmi dengan tenggat rekonsiliasi 7 hari kalender (status `Pending Upload`). Drafter mengunggah scan surat fisik bertandatangan sebelum 7 hari, dan status final berubah menjadi `Approved`.

**Acceptance Scenarios**:

1. **Given** Drafter membuka formulir "Ambil Nomor Surat", **When** Drafter memasukkan Perihal, Pihak Tujuan, memilih kode template, memilih 1 Approver aktif, dan mengirimkan permohonan, **Then** Permohonan tercatat dalam status `In Review` untuk ditindaklanjuti oleh Approver yang ditugaskan.
2. **Given** Terdapat permohonan nomor eksternal berstatus `In Review`, **When** Approver menekan tombol "Approve", **Then** Sistem secara atomik mengalokasikan nomor surat resmi unik, menetapkan masa rekonsiliasi unggah berkas selama 7 hari kalender, dan mengubah status surat menjadi `Pending Upload`.
3. **Given** Surat eksternal berada dalam status `Pending Upload`, **When** Drafter mengunggah berkas scan dokumen fisik yang sudah dibubuhi tanda tangan dan stempel resmi, **Then** Status surat bertransisi menjadi `Approved` dan terarsip resmi dalam agenda surat organisasi.
4. **Given** Surat eksternal berstatus `Pending Upload` melampaui batas waktu 7 hari kalender tanpa unggahan berkas scan, **When** Masa berlaku habis, **Then** Sistem secara otomatis menandai status surat sebagai `Expired`, mencatat pembatalan pada log audit, dan melepaskan nomor surat ke antrean nomor daur ulang.

---

### User Story 5 - Manajemen Pengguna Contoh & Akses Peran Terpadu (Priority: P2)

Sebagai seorang **Penguji Sistem / Administrator**, saya ingin sistem menyediakan 4 akun pengguna contoh awal yang mewakili masing-masing peran fungsional (`admin`, `drafter`, `reviewer`, `approver`), sehingga evaluasi alur bisnis, demonstrasi, dan pengujian persuratan dapat langsung dilakukan tanpa konfigurasi manual yang rumit.

**Why this priority**: Memastikan kemudahan pengujian end-to-end, verifikasi pemisahan wewenang, dan kesiapan demonstrasi fungsional aplikasi sejak hari pertama instalasi.

**Independent Test**: Sistem menyediakan akun terkonfigurasi untuk masing-masing peran:
- `admin@koneksi.local` (Peran Admin)
- `drafter@koneksi.local` (Peran Drafter)
- `reviewer@koneksi.local` (Peran Reviewer)
- `approver@koneksi.local` (Peran Approver)
Setiap akun berhasil masuk ke sistem dan hanya memiliki wewenang aksi sesuai perannya masing-masing.

**Acceptance Scenarios**:

1. **Given** Sistem selesai diinisialisasi, **When** Pengguna masuk menggunakan salah satu dari 4 akun contoh, **Then** Antarmuka menampilkan navigasi, menu, dan izin aksi yang sesuai dengan peran akun tersebut.
2. **Given** Pengguna login sebagai `drafter@koneksi.local`, **When** Mencoba membuka halaman pengelolaan pengguna atau konfigurasi sistem, **Then** Sistem menolak akses dengan pemberitahuan larangan hak akses.
3. **Given** Pengguna login sebagai `reviewer@koneksi.local`, **When** Membuka daftar tugas persetujuan, **Then** Hanya menampilkan draf surat yang menugaskan dirinya sebagai peninjau aktif.
4. **Given** Pengguna login sebagai `admin@koneksi.local`, **When** Membuka buku agenda penomoran, **Then** Admin dapat melihat rekapitulasi seluruh surat, status terkini, dan riwayat audit secara menyeluruh.
5. **Given** Aplikasi berjalan di lingkungan lokal (`APP_ENV=local`), **When** Pengguna mengklik tombol peran pada bilah pembantu Quick Switch User, **Then** Sistem langsung mengalihkan sesi aktif ke akun peran tersebut seketika tanpa meminta pengisian formulir login kembali.

---

### User Story 6 - Penanganan Kasus Riil Pembuatan Surat (Priority: P3)

Sebagai pengguna instansi, saya ingin sistem memfasilitasi berbagai skenario nyata administrasi surat dinas melalui template dan alur yang telah terkonfigurasi:
1. **Case 1: Surat Keterangan Kerja (SKK)** (Alur 1 tingkat, pengesahan digital otomatis).
2. **Case 2: Surat Peringatan Pertama (SP1)** (Alur 2 tingkat berjenjang: Drafter → Reviewer Kepala Bagian → Approver Direktur).
3. **Case 3: Surat Keputusan (SK)** (Alur pengesahan fisik: Tanda Tangan Basah bermaterai & unggah scan berkas).
4. **Case 4: Surat Perjanjian Kerjasama Eksternal (PKS)** (Alur Ambil Nomor untuk naskah fisik dari mitra kerja).

**Why this priority**: Memberikan validasi kontekstual bahwa sistem fleksibel melayani spektrum administrasi surat dinas di dunia nyata, dari yang sederhana hingga naskah hukum berkekuatan tinggi.

**Independent Test**: Menjalankan pengujian pembuatan naskah dinas untuk keempat skenario kasus tersebut dari pembuatan hingga penyelesaian status `Approved`.

**Acceptance Scenarios**:

1. **Given** Drafter membuat kasus SKK, **When** Formulir diisi dan disetujui Approver secara digital, **Then** PDF resmi langsung terbit seketika tanpa perlu tahap peninjau perantara.
2. **Given** Drafter membuat kasus SP1, **When** Draf diajukan, **Then** Draf wajib diverifikasi oleh Reviewer terlebih dahulu sebelum dapat diakses oleh Approver.
3. **Given** Drafter membuat kasus SK dengan tanda tangan basah, **When** Approver menyetujui, **Then** Sistem mewajibkan pengunggahan scan dokumen fisik sebelum status surat dapat menjadi `Approved`.
4. **Given** Drafter mengajukan kasus PKS melalui Ambil Nomor, **When** Approver menyetujui, **Then** Nomor surat terbit seketika untuk dicetak pada berkas naskah kerjasama mitra.

---

### Edge Cases

- **Race Condition Penomoran**: Dua pengajuan surat bersamaan pada detik yang sama dijamin mendapatkan nomor berurutan tanpa jeda atau duplikasi.
- **Pelepasan Nomor Daur Ulang**: Ketika sebuah surat ditolak (*Rejected*) atau dibatalkan (*Cancelled*), nomor surat dilepaskan ke antrean nomor daur ulang (*recycled pool*). Pengajuan surat berikutnya untuk template dan bulan yang sama akan mengambil nomor tersebut terlebih dahulu sebelum menaikkan urutan counter baru.
- **Larangan Hard Delete**: Surat yang telah diterbitkan nomornya tidak dapat dihapus dari database. Pembatalan hanya dapat dilakukan melalui status resmi `Voided` / `Cancelled` dengan alasan tertulis.
- **Separation of Duties**: Sistem secara ketat menolak pengajuan jika Drafter memilih dirinya sendiri sebagai Reviewer atau Approver.
- **Tenggat Waktu Kedaluwarsa**: Surat reservasi Ambil Nomor yang tidak melengkapi berkas scan dalam 7 hari otomatis berganti status menjadi `Expired` dan nomornya dikembalikan ke antrean nomor daur ulang.
- **Integritas UI**: Seluruh label antarmuka, status badge, tombol, dan notifikasi dilarang menggunakan karakter emoji atau emotikon dekoratif (Prinsip VI).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem WAJIB menyediakan mekanisme autentikasi dan otorisasi berbasis peran untuk 4 peran standar: `Admin`, `Drafter`, `Reviewer`, dan `Approver`.
- **FR-002**: Sistem WAJIB menginisialisasi 4 akun contoh bawaan (`admin@koneksi.local`, `drafter@koneksi.local`, `reviewer@koneksi.local`, `approver@koneksi.local`) untuk pengujian dan demonstrasi alur.
- **FR-003**: Sistem WAJIB mengizinkan Drafter menyusun draf surat internal menggunakan template surat yang tersedia dengan kolom isian dinamis.
- **FR-004**: Sistem WAJIB mengizinkan Drafter memilih secara dinamis urutan peninjau (0 atau lebih Reviewer) dan 1 Approver akhir dari daftar pengguna yang aktif.
- **FR-005**: Sistem WAJIB melarang pembuat draf memilih dirinya sendiri sebagai peninjau atau penyetuju pada surat buatannya (*Separation of Duties*).
- **FR-006**: Sistem WAJIB menghasilkan nomor surat resmi dengan format kanonikal: `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`.
- **FR-007**: Sistem WAJIB menjamin penomoran surat unik secara atomik dan kebal terhadap kondisi persaingan data (*race condition immunity*).
- **FR-008**: Sistem WAJIB mengutamakan penggunaan nomor surat dari antrean nomor daur ulang (*recycled pool*) jika tersedia sebelum menaikkan nomor counter baru pada bulan berjalan.
- **FR-009**: Sistem WAJIB menerapkan alur persetujuan sekuensial yang ketat, di mana peninjau urutan ke-$n$ hanya dapat bertindak jika peninjau $1 \dots n-1$ telah menyetujui.
- **FR-010**: Sistem WAJIB menghentikan alur seketika saat terjadi penolakan (*Reject*), menetapkan status draf menjadi `Rejected` secara permanen, melepaskan nomor surat ke *recycled pool*, dan mewajibkan pengisian catatan revisi.
- **FR-011**: Sistem WAJIB mendukung dua jalur penyelesaian pengesahan naskah dinas:
  1. **Tanda Tangan Digital**: Menyematkan tanda tangan digital dan menerbitkan berkas dokumen PDF final berstatus `Approved`.
  2. **Tanda Tangan Basah**: Menerbitkan draf cetak fisik berstatus `Awaiting Wet Signature`, dan mewajibkan unggah berkas scan dokumen fisik sebelum status bertransisi menjadi `Approved`.
- **FR-012**: Sistem WAJIB menyediakan fitur reservasi nomor surat eksternal (*Ambil Nomor*) dengan pengisian metadata ringkas (Perihal, Tujuan, Kode Template) dan persetujuan 1 tahap oleh Approver.
- **FR-013**: Sistem WAJIB menerapkan masa rekonsiliasi unggah berkas scan selama 7 hari kalender untuk fitur Ambil Nomor, dan secara otomatis menandai status surat menjadi `Expired` serta melepaskan nomor ke *recycled pool* jika batas waktu terlewati.
- **FR-014**: Sistem WAJIB menyediakan minimal 4 kasus contoh surat bawaan: Surat Keterangan Kerja (SKK), Surat Peringatan (SP1), Surat Keputusan (SK), dan Surat Kerjasama Eksternal (PKS/Ambil Nomor).
- **FR-015**: Sistem WAJIB mencatat setiap perubahan status, pengajuan, persetujuan, penolakan, dan pelepasan nomor ke dalam buku agenda audit (*audit log*) yang bersifat permanen dan tidak dapat diubah (*tamper-evident & immutable*).
- **FR-016**: Sistem WAJIB melarang penghapusan permanen (*hard delete*) pada data surat dan nomor surat yang telah diterbitkan. Pembatalan hanya diperbolehkan melalui transisi status resmi `Voided` atau `Cancelled`.
- **FR-017**: Seluruh antarmuka pengguna WAJIB mematuhi larangan penggunaan emoji/emotikon visual dekoratif dan hanya menggunakan tipografi formal atau ikon geometris profesional.
- **FR-018**: Sistem WAJIB menyediakan panduan dan konfigurasi lingkungan pengembangan lokal berbasis Docker (Laravel Sail dengan service PHP 8.3+, PostgreSQL 16, dan Vite) serta panduan alternatif berbasis toolchain Native (Homebrew PHP & PostgreSQL).
- **FR-019**: Sistem WAJIB mendukung driver penyimpanan ganda yang dapat diatur via variabel lingkungan: menggunakan driver disk lokal untuk kemudahan setup lingkungan development, serta Cloudflare R2 (driver S3) untuk persistensi berkas di lingkungan produksi.
- **FR-020**: Sistem WAJIB menyediakan seeder database dengan kata sandi seragam ('password') untuk 4 akun contoh serta bilah Quick Switch User yang hanya aktif saat `APP_ENV=local` untuk mempercepat pengujian alur surat berjenjang.

---

### Key Entities

- **User**: Menyimpan identitas pengguna, alamat email resmi, nama lengkap, peran (`admin`, `drafter`, `reviewer`, `approver`), status keaktifan (`is_active`), dan tanda tangan digital.
- **LetterTemplate**: Menyimpan master jenis/kategori surat dinas, kode template (misal: `SKK`, `SP1`, `SK`), judul template, dan skema variabel data isian.
- **Letter**: Entitas naskah dinas yang menyimpan nomor surat, tanggal surat, tipe surat (internal/eksternal), perihal, tujuan, isi variabel data, metode pengesahan (digital/basah), status surat (`Draft`, `In Review`, `Awaiting Wet Signature`, `Pending Upload`, `Approved`, `Rejected`, `Cancelled`, `Expired`), penanda berkas dokumen, dan batas waktu rekonsiliasi.
- **ApprovalWorkflow**: Menyimpan tahapan alur persetujuan surat secara berurutan, mencakup urutan langkah, peninjau yang ditugaskan, status langkah perorangan (`Pending`, `Approved`, `Rejected`), tanggal tindakan, dan catatan revisi.
- **LetterCounter**: Mengelola nilai nomor urut berjalan per kode template, bulan, dan tahun untuk alokasi nomor berurutan secara atomik.
- **RecycledNumberPool**: Menyimpan nomor-nomor surat yang dibatalkan atau ditolak agar dapat dialokasikan kembali secara berurutan (*FIFO*) tanpa menimbulkan nomor bolong.
- **AuditLog**: Catatan riwayat aksi permanen mencakup stempel waktu, identitas pelaku (user email/ID), ID surat target, jenis peristiwa, dan ringkasan perubahan status.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Pengguna dapat menyelesaikan pembuatan draf surat baru dan mengirimkannya untuk ditinjau dalam waktu kurang dari **3 menit**.
- **SC-002**: Alokasi nomor surat otomatis berlangsung dalam waktu kurang dari **1 detik** tanpa terjadinya nomor ganda (*zero duplicates*) pada pengujian beban transaksi konkuren.
- **SC-003**: 100% dari 4 akun contoh pengguna bawaan dapat langsung digunakan untuk menguji alur kerja lengkap tanpa konfigurasi manual tambahan.
- **SC-004**: 100% dari 4 skenario kasus surat (SKK, SP1, SK, dan Ambil Nomor) berhasil diuji dari pembuatan hingga status final `Approved`.
- **SC-005**: 100% upaya penghapusan data surat (*hard delete*) ditolak oleh sistem, menjamin integritas buku agenda surat dan jejak audit tetap utuh.
- **SC-006**: Antarmuka aplikasi 100% bersih dari penggunaan karakter emoji/emotikon dekoratif pada seluruh halaman, tombol, dan komponen navigasi.
- **SC-007**: Surat yang ditolak atau kedaluwarsa berhasil mengembalikan nomor suratnya ke *recycled pool* dan dialokasikan kembali pada transaksi berikutnya dengan tingkat keberhasilan **100%**.

---

## Assumptions

- **A-001**: Pengguna mengakses aplikasi melalui peramban web modern pada perangkat desktop atau tablet yang terhubung ke jaringan organisasi.
- **A-002**: Pengiriman notifikasi email dan kompilasi berkas PDF berjalan di latar belakang tanpa menghalangi kelancaran antarmuka pengguna.
- **A-003**: Berkas scan tanda tangan basah dan PDF resmi diunggah dan disimpan pada repositori berkas berbasis cloud yang privat dan aman.
- **A-004**: Autentikasi awal pada lingkungan pengujian/pengembangan lokal menggunakan kredensial email akun contoh yang disediakan di sistem.
- **A-005**: Pengembang lokal dapat memilih menjalankan sistem menggunakan Laravel Sail (`./vendor/bin/sail up`) untuk kompatibilitas container penuh dengan Heroku, atau menggunakan layanan lokal Native via Homebrew.
- **A-006**: Pada lingkungan lokal, tautan berkas dokumen diakses via URL penyimpanan publik lokal (`php artisan storage:link`), sedangkan pada produksi menggunakan presigned URL sementara dari Cloudflare R2.
