# Feature Specification: Sistem Manajemen Surat Menyurat (Koneksi)

**Feature Branch**: `001-manajemen-surat`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "Sistem Manajemen Surat Menyurat (Koneksi) — Spesifikasi lengkap siklus surat Fase 0 (pembuatan draf, penomoran atomik, alur persetujuan berjenjang, dan finalisasi tanda tangan digital/basah)"

## Clarifications

### Session 2026-09-24
- Q: Bagaimana mekanisme pengguna mengunggah berkas scan fisik pada jalur Tanda Tangan Basah? (FR-010) → A: Unggah langsung via Web App — Pengguna memilih berkas scan di halaman detail surat, dan sistem otomatis memperbarui revisi berkas di Google Drive via API (`Files.update`).
- Q: Apakah draf surat yang ditolak (Rejected) dapat diedit kembali dan diajukan ulang, atau diarsipkan permanen? (FR-007) → A: Draf yang ditolak diarsipkan permanen (terkunci sebagai arsip audit); Drafter dapat membuat draf baru (dapat menyalin data dari draf lama); Nomor surat yang sebelumnya terkunci dirilis kembali ke sistem agar dapat digunakan kembali tanpa lubang penomoran.
- Q: Bagaimana daftar dan urutan peninjau (Reviewer & Approver) ditentukan saat Drafter membuat draf surat? (FR-003) → A: Dinamis oleh Drafter — Drafter memilih sendiri urutan Reviewer (minimal 0 atau lebih) dan 1 Approver akhir dari daftar pengguna whitelist aktif pada saat pengisian form draf.
- Q: Bagaimana batasan hak akses membaca/melihat (read permission) data dan berkas surat? (FR-012) → A: Terbuka untuk surat final saja — Draf dalam peninjauan bersifat rahasia (hanya dapat diakses oleh partisipan alur & Admin), namun setelah berstatus `Approved` dokumen final menjadi arsip yang dapat dicari dan dilihat oleh seluruh pengguna whitelist terdaftar.
- Q: Bagaimana mekanisme teknis alokasi kembali nomor surat yang dirilis setelah penolakan? (FR-004) → A: Antrean Nomor Daur Ulang (Recycled Pool) — Nomor yang dirilis dicatat ke daftar nomor bebas per kategori/bulan, dan draf berikutnya yang diajukan akan mengambil nomor dari daftar ini sebelum menaikkan counter urutan baru.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pembuatan Draf Surat & Penomoran Otomatis Unik (Priority: P1)

Sebagai seorang Drafter, saya ingin membuat draf surat dinas baru dari template yang tersedia, mengisi data variabel yang diperlukan, menentukan urutan peninjau (Reviewer/Approver) secara dinamis, dan memperoleh nomor surat resmi yang unik secara otomatis, sehingga proses administrasi surat dapat dimulai secara cepat, fleksibel, dan tanpa risiko nomor ganda.

**Why this priority**: Merupakan inti fungsional pertama sistem (Core MVP). Tanpa kemampuan membuat draf dan menerbitkan nomor surat yang sah dan unik, seluruh alur lanjutan tidak dapat berjalan.

**Independent Test**: Drafter login, memilih template (misalnya SP1), mengisi formulir, menentukan urutan peninjau dinamis (misal 1 Reviewer dan 1 Approver), lalu menyimpan draf. Sistem memeriksa antrean nomor daur ulang atau counter baru, menerbitkan nomor surat resmi berformat unik (misal: `0001.SP1/IX/2026`), dan draf tersimpan dengan status `In Review`.

**Acceptance Scenarios**:

1. **Given** Drafter yang terdaftar dan aktif membuka formulir pembuatan surat, **When** Drafter memilih jenis template, mengisi seluruh data wajib, memilih secara dinamis urutan Reviewer (minimal 0 atau lebih) serta 1 Approver akhir dari daftar pengguna whitelist aktif, dan menekan tombol kirim draf, **Then** Sistem menghasilkan nomor surat unik (dari antrean daur ulang jika tersedia, atau alokasi counter baru), membuat berkas draf dokumen, mengunci status menjadi `In Review`, dan mengarahkan giliran pertama ke peninjau urutan ke-1.
2. **Given** Dua Drafter mengajukan draf surat dengan jenis template yang sama secara bersamaan, **When** Kedua draf diproses oleh sistem, **Then** Masing-masing draf mendapatkan nomor urut yang berbeda dan berurutan secara atomik tanpa terjadinya duplikasi nomor.
3. **Given** Drafter mengisi formulir dengan data wajib yang belum lengkap, **When** Drafter mencoba mengirim draf, **Then** Sistem menolak pengiriman dan menampilkan indikator kesalahan pada kolom yang belum terisi.
4. **Given** Drafter mencoba memilih alamat email miliknya sendiri sebagai Reviewer atau Approver pada draf yang diajukan, **When** Drafter mencoba mengirim draf, **Then** Sistem menolak pengajuan dengan pesan kesalahan bahwa pembuat draf dilarang menjadi peninjau atau penyetuju pada surat buatannya sendiri (prinsip pemisahan wewenang / *separation of duties*).

---

### User Story 2 - Alur Persetujuan Berjenjang & Catatan Revisi (Priority: P1)

Sebagai seorang Reviewer atau Approver, saya ingin meninjau draf surat yang ditugaskan kepada saya sesuai urutan giliran, memeriksa pratinjau dokumen, dan memberikan keputusan (setuju atau tolak disertai catatan revisi), sehingga kualitas naskah dinas terjamin sebelum diterbitkan resmi.

**Why this priority**: Alur persetujuan berjenjang adalah mekanisme kontrol utama tata kelola surat resmi organisasi untuk mencegah penerbitan surat tanpa otorisasi bertingkat.

**Independent Test**: Reviewer menerima draf pada urutan giliran aktifnya, memeriksa isi draf, lalu memilih "Approve" (melanjutkan ke peninjau berikutnya) atau "Reject" dengan catatan perbaikan (menghentikan alur, mengunci draf sebagai arsip, melepaskan nomor surat ke recycled pool, dan mengembalikan notifikasi ke Drafter).

**Acceptance Scenarios**:

1. **Given** Draf surat berada pada urutan persetujuan ke-$n$, **When** Peninjau urutan ke-$n$ menyetujui (Approve) draf, **Then** Status peninjau ke-$n$ berubah menjadi disetujui, dan status draf surat dialihkan ke giliran peninjau urutan ke-($n+1$).
2. **Given** Draf surat berada pada urutan persetujuan ke-$n$, **When** Peninjau urutan ke-($n+1$) mencoba melakukan persetujuan sebelum peninjau ke-$n$ selesai, **Then** Sistem menolak aksi tersebut dan menegaskan bahwa giliran peninjauan belum tiba.
3. **Given** Peninjau pada tahap mana pun menemukan ketidaksesuaian data, **When** Peninjau menekan tombol tolak (Reject) dengan menyertakan alasan revisi, **Then** Seluruh alur persetujuan berhenti seketika, status surat berubah permanen menjadi `Rejected` (terkunci permanen sebagai arsip audit tanpa izin edit ulang), nomor surat yang digunakan dilepaskan (release) ke dalam antrean nomor daur ulang (recycled pool), catatan penolakan tersimpan di log audit, dan Drafter menerima pemberitahuan revisi dengan opsi membuat draf baru menyalin data lama.

---

### User Story 3 - Finalisasi Dokumen dengan Tanda Tangan Digital atau Basah (Priority: P1)

Sebagai seorang Approver akhir, saya ingin dapat memilih metode pengesahan dokumen antara Tanda Tangan Digital (otomatis menyuntikkan tanda tangan dan menerbitkan PDF final) atau Tanda Tangan Basah (dokumen fisik dicetak, ditandatangani manual, dan hasil scan diunggah langsung via Web App), sehingga pengesahan surat dapat menyesuaikan kebutuhan hukum dan operasional instansi.

**Why this priority**: Tahap ini menyelesaikan seluruh siklus hidup surat hingga menjadi dokumen PDF sah yang berkekuatan hukum dan siap didistribusikan.

**Independent Test**: Approver akhir menyetujui surat. Jika memilih digital: berkas PDF final langsung terbit dengan tanda tangan tertanam dan status menjadi `Approved`. Jika memilih basah: status tertahan menunggu tanda tangan basah; pengguna mengunggah hasil scan langsung melalui form di Web App, sistem memperbarui versi dokumen draf via API, dan setelah terverifikasi status berubah menjadi `Approved`.

**Acceptance Scenarios**:

1. **Given** Approver akhir menyetujui surat dengan metode "Tanda Tangan Digital", **When** Persetujuan dikonfirmasi, **Then** Sistem menyematkan gambar tanda tangan digital approver ke template dokumen, mengekspor berkas ke PDF final, mencatat status surat menjadi `Approved`, dan menyediakan tautan unduh PDF.
2. **Given** Approver akhir menyetujui surat dengan metode "Tanda Tangan Basah", **When** Persetujuan dikonfirmasi, **Then** Sistem menyiapkan berkas draf tanpa tanda tangan di folder bersama, menetapkan indikator `awaitingWetSignature`, menyediakan antarmuka form unggah berkas scan, dan mempertahankan status surat dalam peninjauan.
3. **Given** Surat dengan jalur tanda tangan basah telah dicetak dan ditandatangani manual, **When** Pengguna mengunggah berkas scan langsung melalui formulir di halaman detail surat Web App dan sistem memverifikasi pembaruan revisi berkas di Google Drive via API, **Then** Sistem mengubah status surat menjadi `Approved` dan mencatat penyelesaian dokumen di log audit.

---

### User Story 4 - Autentikasi Pengguna & Whitelist Akses (Priority: P2)

Sebagai pengguna dan administrator, saya ingin pengguna masuk menggunakan akun Google yang divalidasi terhadap daftar email terdaftar (whitelist) dengan peran tertentu (Drafter, Reviewer, Approver, Admin), sehingga hak akses aplikasi terlindungi dari pengguna yang tidak berwenang.

**Why this priority**: Menjaga keamanan data organisasi dan menjamin bahwa hanya personel yang terdaftar yang dapat membaca draf, melakukan persetujuan, atau mengubah konfigurasi pengguna.

**Independent Test**: Akses dicoba dengan email terdaftar aktif (berhasil masuk ke dashboard) dan email yang tidak terdaftar atau non-aktif (langsung ditolak dengan pesan kesalahan).

**Acceptance Scenarios**:

1. **Given** Pengguna dengan akun Google yang terdaftar di whitelist dan berstatus aktif mengakses sistem, **When** Sistem memverifikasi identitas pengguna, **Then** Pengguna diberikan akses ke dashboard sesuai dengan role dan izin yang ditetapkan.
2. **Given** Pengguna dengan akun Google yang tidak terdaftar di whitelist mengakses sistem, **When** Sistem memeriksa daftar whitelist, **Then** Akses ditolak dan sistem menampilkan pesan bahwa email belum terdaftar di sistem.
3. **Given** Pengguna terdaftar tetapi status akunnya dinonaktifkan (`isActive = FALSE`) oleh Admin, **When** Pengguna mencoba mengakses sistem atau melakukan tindakan, **Then** Sistem menolak akses dan menghentikan seluruh sesi operasi.
4. **Given** Pengguna dengan peran Admin mengakses halaman pengaturan pengguna, **When** Admin menambahkan email baru, mengubah role, atau menonaktifkan pengguna, **Then** Data whitelist diperbarui dan perubahan langsung berlaku pada sesi pengguna berikutnya.

---

### User Story 5 - Dashboard Pemantauan, Privasi & Riwayat Surat (Priority: P2)

Sebagai pengguna sistem, saya ingin melihat dashboard terorganisir yang menampilkan surat-surat yang membutuhkan tindakan saya, draf yang sedang diajukan, surat yang telah selesai, serta riwayat audit lengkap dengan batasan privasi yang tepat, sehingga proses pemantauan berlangsung transparan namun tetap menjaga kerahasiaan draf internal.

**Why this priority**: Memberikan visibilitas operasional bagi semua pihak yang terlibat dalam tata kelola surat-menyurat dengan batasan hak baca yang jelas.

**Independent Test**: Pengguna membuka dashboard dan melihat filter surat (Perlu Tindakan, Draf Saya, Selesai, Ditolak). Draf yang masih dalam proses peninjauan hanya tampil bagi partisipan alur & Admin, sedangkan surat yang telah `Approved` dapat dicari dan dibaca oleh seluruh pengguna whitelist.

**Acceptance Scenarios**:

1. **Given** Peninjau memiliki surat yang menunggu giliran persetujuannya, **When** Peninjau membuka dashboard, **Then** Surat tersebut muncul di bagian teratas tab "Perlu Tindakan".
2. **Given** Drafter membuka dashboard, **When** Drafter melihat tab "Draf Saya", **Then** Seluruh draf surat yang pernah diajukan tampil beserta status peninjauannya yang terkini.
3. **Given** Pengguna terdaftar bukan merupakan pembuat ataupun peninjau pada surat yang masih berstatus `In Review`, **When** Pengguna melihat dashboard atau mencoba mengakses URL surat tersebut, **Then** Sistem menyembunyikan dan memblokir akses ke draf tersebut demi kerahasiaan proses internal.
4. **Given** Sebuah surat telah mencapai status `Approved`, **When** Pengguna whitelist mana pun mencari atau melihat arsip surat, **Then** Dokumen surat dan PDF final terbuka untuk dapat dibaca dan diunduh sebagai arsip organisasi.
5. **Given** Pengguna berwenang membuka detail sebuah surat, **When** Pengguna melihat bagian riwayat (audit log), **Then** Seluruh catatan waktu, aktor yang bertindak, jenis aksi (submit, approve, reject), dan catatan revisi ditampilkan secara kronologis.

---

### User Story 6 - Notifikasi Email Otomatis (Priority: P3)

Sebagai pihak yang terlibat dalam alur surat, saya ingin menerima notifikasi email otomatis saat giliran peninjauan saya tiba atau saat surat yang saya buat telah diputuskan (disetujui/ditolak), sehingga tidak perlu melakukan pengecekan manual secara berulang.

**Why this priority**: Meningkatkan kecepatan respon antar-pegawai dalam siklus persetujuan dokumen dinas.

**Independent Test**: Saat draf diserahkan ke peninjau berikutnya, email pemberitahuan masuk ke kotak surat peninjau terkait dengan tautan langsung ke dokumen draf.

**Acceptance Scenarios**:

1. **Given** Surat memasuki giliran peninjau urutan ke-$n$, **When** Status giliran diperbarui, **Then** Sistem mengirimkan notifikasi email ke alamat peninjau ke-$n$ berisi nomor surat, perihal, nama pembuat, dan tautan surat.
2. **Given** Draf surat ditolak oleh peninjau, **When** Penolakan disimpan, **Then** Sistem mengirimkan notifikasi email ke Drafter pembuat surat berisi catatan alasan penolakan.
3. **Given** Surat telah difinalisasi menjadi `Approved`, **When** Berkas final selesai dibuat, **Then** Sistem mengirimkan notifikasi email berisi konfirmasi dan tautan unduh dokumen final kepada seluruh pihak terkait.

---

### Edge Cases

- **Permintaan Penomoran Bersamaan (High Concurrency)**: Ketika beberapa draf surat diajukan dalam milidetik yang sama, mekanisme pengunci transaksi atomik wajib mengantrekan proses pembacaan dan pembaruan nomor sehingga tidak ada nomor surat yang terduplikasi atau terlewati.
- **Pemanfaatan Antrean Nomor Daur Ulang (Recycled Numbers Pool)**: Ketika surat baru diajukan, sistem wajib memeriksa terlebih dahulu apakah terdapat nomor rilis (dari surat yang sebelumnya ditolak) pada kategori dan bulan yang sama. Jika ada, nomor dari antrean daur ulang diprioritaskan untuk dipakai sebelum menaikkan nomor urut counter.
- **Pergantian Bulan dan Tahun Baru**: Ketika tanggal berganti bulan atau tahun baru, penghitung nomor urut wajib otomatis mempartisi atau mereset urutan nomor sesuai format penomoran instansi (`NNNN.KODE/BULANROMAWI/TAHUN`), dan antrean nomor daur ulang lama dipartisi per periode.
- **Penolakan Permanen & Kunci Arsip**: Ketika peninjau di tengah alur menolak draf surat, draf dikunci permanen menjadi arsip audit dan nomor surat dilepaskan ke recycled pool. Drafter tidak dapat mengedit draf tersebut, tetapi dapat membuat draf baru dengan fasilitas salin data (clone).
- **Validasi Unggahan Tanda Tangan Basah Langsung**: Pengguna mengunggah berkas scan langsung pada form di Web App. Sistem wajib menolak penyelesaian dokumen jika berkas yang diunggah tidak valid atau jika revisi berkas di Google Drive gagal diperbarui via API.
- **Batasan Privasi Draf vs Arsip Terbuka**: Pengguna di luar alur persetujuan surat yang masih berstatus `In Review` atau `Draft` dilarang melihat metadata maupun konten draf. Setelah status `Approved`, akses membaca berkas final otomatis terbuka untuk semua akun whitelist.
- **Perubahan Status Pengguna di Tengah Proses**: Jika seorang approver dinonaktifkan akunnya saat alur sedang berjalan, sistem server-side guard wajib menolak akses approver tersebut dan mengharuskan Admin menata ulang konfigurasi peninjau.
- **Upaya Manipulasi Input (Formula Injection)**: Input teks formulir yang diawali karakter berbahaya seperti `=`, `+`, `-`, atau `@` wajib disanitasi sebelum disimpan ke lembar kerja basis data agar tidak dieksekusi sebagai formula.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem HARUS memverifikasi identitas pengguna menggunakan autentikasi sesi terdaftar terhadap daftar whitelist email aktif sebelum memberikan akses ke aplikasi.
- **FR-002**: Sistem HARUS menerapkan kontrol akses berbasis peran (Drafter, Reviewer, Approver, Admin) yang divalidasi pada sisi server pada setiap pemanggilan fungsi.
- **FR-003**: Sistem HARUS menyediakan formulir dinamis pembuatan draf surat berdasarkan template dokumen resmi, di mana Drafter memilih sendiri urutan Reviewer (minimal 0 atau lebih) dan 1 Approver akhir secara dinamis dari daftar pengguna whitelist aktif, dengan aturan ketat pemisahan wewenang (*separation of duties*): Drafter DILARANG menunjuk dirinya sendiri sebagai Reviewer maupun Approver pada draf buatannya.
- **FR-004**: Sistem HARUS menghasilkan nomor surat unik berurutan secara atomik dan bebas dari duplikasi dengan format standar `{urutan:04d}.{kode_template}/{bulan_romawi}/{tahun}`, dengan memprioritaskan alokasi nomor dari antrean nomor daur ulang (recycled pool) sebelum menaikkan counter urutan baru.
- **FR-005**: Sistem HARUS mereset atau mempartisi nomor urut surat baru secara otomatis saat memasuki pergantian bulan atau tahun baru.
- **FR-006**: Sistem HARUS menjalankan alur persetujuan berjenjang secara berurutan, di mana peninjau pada urutan ke-$n$ hanya dapat melakukan persetujuan setelah seluruh peninjau pada urutan $1 \dots n-1$ memberikan persetujuan.
- **FR-007**: Sistem HARUS menghentikan seluruh rangkaian alur persetujuan secara permanen apabila peninjau memilih opsi tolak (Reject), mewajibkan catatan alasan penolakan, mengunci draf sebagai arsip audit tanpa izin edit ulang, melepaskan nomor surat ke antrean nomor daur ulang, serta menyediakan opsi salin data (clone) bagi Drafter untuk pembuatan draf baru.
- **FR-008**: Sistem HARUS mengizinkan peninjau tahap akhir (Approver) untuk memilih metode penyelesaian antara Tanda Tangan Digital atau Tanda Tangan Basah.
- **FR-009**: Pada metode Tanda Tangan Digital, sistem HARUS menyematkan tanda tangan digital terdaftar ke dalam dokumen draf dan menerbitkan berkas PDF final berstatus `Approved`.
- **FR-010**: Pada metode Tanda Tangan Basah, sistem HARUS menyediakan berkas draf tanpa tanda tangan di ruang penyimpanan bersama, menetapkan penanda `awaitingWetSignature`, menyediakan formulir unggah berkas scan langsung pada Web App, dan HANYA mengubah status menjadi `Approved` setelah pembaruan revisi berkas hasil scan berhasil disimpan di Google Drive via API (`Files.update`) dan diverifikasi.
- **FR-011**: Sistem HARUS mencatat setiap tindakan pengajuan, persetujuan, penolakan, pemilihan metode tanda tangan, dan pengunggahan berkas ke dalam log audit permanen yang mencantumkan waktu, identitas pengguna, dan keterangan tindakan.
- **FR-012**: Sistem HARUS menyajikan antarmuka dashboard yang mengelompokkan surat berdasarkan status, dengan ketentuan privasi: draf surat berstatus `In Review` hanya dapat dilihat oleh pembuat (Drafter), para peninjau dalam alur, dan Admin; sedangkan surat yang telah berstatus `Approved` menjadi arsip terbuka yang dapat dicari dan dilihat oleh seluruh pengguna whitelist terdaftar.
- **FR-013**: Sistem HARUS mengirimkan notifikasi email otomatis ke peninjau giliran berikutnya ketika draf siap ditinjau, serta notifikasi hasil akhir kepada pembuat surat.
- **FR-014**: Sistem HARUS melakukan sanitasi defensif terhadap seluruh nilai input pengguna sebelum ditulis ke penyimpanan guna mencegah injeksi formula lembar data atau kerusakan struktur nama berkas.
- **FR-015**: Sistem HARUS menyediakan modul administrasi bagi Admin untuk mengelola status aktif, penugasan role, dan pendaftaran email whitelist pengguna.

### Key Entities *(include if feature involves data)*

- **Pengguna (User)**: Mewakili individu pegawai dalam sistem. Atribut meliputi alamat email, nama lengkap, role (`drafter`, `reviewer`, `approver`, `admin`), tautan tanda tangan referensi (khusus approver), dan status keaktifan akun (`isActive`).
- **Surat (Letter)**: Mewakili naskah surat resmi dinas. Atribut meliputi ID surat unik, nomor surat resmi, kode template surat, data isi variabel dinas (ContentData), email pembuat (drafterEmail), alur persetujuan (approvalFlow), status surat (`Draft`, `In Review`, `Approved`, `Rejected`), tautan berkas draf unsigned, tautan berkas PDF final, dan penanda verifikasi tanda tangan basah (`awaitingWetSignature`, `unsignedDraftBaseRevisionId`).
- **Tahap Persetujuan (Approval Flow Step)**: Elemen berurutan dalam alur persetujuan surat. Atribut meliputi nomor urutan giliran, nama/email peninjau, peran peninjau, status peninjauan (`Pending`, `Approved`, `Rejected`), tanggal waktu keputusan, dan catatan revisi penolakan.
- **Penghitung Urutan & Nomor Daur Ulang (Counter & Recycled Pool)**: Entitas pengelola urutan nomor surat atomik. Atribut meliputi kode template, bulan transaksi, tahun transaksi, angka urut terakhir berjalan, dan array daftar nomor yang dirilis kembali (`recycledNumbers`).
- **Catatan Audit (Approval Log)**: Entitas pencatat jejak audit permanen. Atribut meliputi waktu pencatatan, alamat email pelaku aksi, ID surat yang ditargetkan, jenis tindakan yang dilakukan, dan catatan pelengkap.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% nomor surat yang diterbitkan bersifat unik dan berurutan secara sah tanpa pernah terjadi duplikasi nomor, termasuk ketika nomor dialokasikan kembali dari antrean daur ulang.
- **SC-002**: Pengguna dengan peran Drafter dapat menyelesaikan pengisian formulir hingga penerbitan draf bernomor dalam waktu kurang dari 2 menit.
- **SC-003**: 100% keputusan penolakan (Reject) berhasil mengunci dokumen secara permanen, melepaskan nomor surat ke recycled pool, dan menghentikan alur persetujuan secara otomatis tanpa kegagalan sistem.
- **SC-004**: Dokumen final bertanda tangan digital terbit dan dapat diunduh dalam format PDF dalam waktu kurang dari 30 detik setelah konfirmasi persetujuan akhir.
- **SC-005**: 100% akses dari akun pengguna di luar daftar whitelist atau akun yang dinonaktifkan ditolak secara seketika pada lapis pengaman server.
- **SC-006**: 100% riwayat tindakan approval, penolakan, dan perubahan revisi dokumen tercatat akurat dan utuh pada catatan audit.
- **SC-007**: 95% pengguna yang berpartisipasi dalam uji coba operasional berhasil menyelesaikan tugas persetujuan atau pembuatan surat pada percobaan pertama tanpa kendala instruksi.
- **SC-008**: 100% draf yang masih berstatus peninjauan terlindungi dari akses baca pihak non-partisipan, dan 100% surat `Approved` dapat diakses pada arsip terbuka pengguna whitelist.

## Assumptions

- Seluruh pengguna memiliki akun Google aktif yang dapat diautentikasi melalui Google Workspace.
- Koneksi internet stabil tersedia selama proses interaksi web app.
- Master template dokumen surat resmi (SP1, Surat Tugas, dsb.) telah disiapkan di penyimpanan template bersama dengan placeholder variabel standar.
- Pengguna yang bertindak sebagai Approver telah mengunggah gambar tanda tangan resmi mereka sebelum melakukan persetujuan digital pertama.
- Skala volume surat pada prototipe awal (Fase 0) berada pada rentang puluhan hingga ratusan surat per bulan, sehingga batasan kuota platform Google Apps Script mencukupi kebutuhan operasional harian.
