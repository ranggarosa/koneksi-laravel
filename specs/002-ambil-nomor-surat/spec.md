# Feature Specification: Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor)

**Feature Branch**: `002-ambil-nomor-surat`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Use Handoff of Option A in .specify/assessments/take-number/decision.md to specify decided take-number concept: Standalone letter number reservation (Ambil Nomor) for external/physical documents with 1-step Approver sign-off, atomic allocation, 7-day reconciliation window with scan upload, Day-5 email escalation, and Day-7 auto-release to recycled pool."

## Clarifications

### Session 2026-09-28
- Q: Apakah nomor surat yang berstatus Pending Upload dapat dibatalkan secara manual sebelum batas waktu 7 hari kalender berakhir? (FR-009) → A: Ya, Approver dan Admin berwenang membatalkan manual dengan alasan wajib sebelum 7 hari berakhir, mengubah status menjadi `Cancelled`, dan sistem langsung melepaskan nomor surat ke antrean daur ulang (recycled pool).
- Q: Setelah berkas scan PDF berhasil diunggah dan status surat bertransisi menjadi Approved, apakah berkas scan tersebut masih dapat diperbarui (re-upload) jika ditemukan kesalahan seperti halaman terpotong atau buram? (FR-007) → A: Hanya Admin yang memiliki akses khusus untuk memperbarui berkas scan pengganti pada surat yang telah berstatus Approved dengan kewajiban mencatat alasan revisi di log audit.
- Q: Apakah Drafter dapat membatalkan sendiri permohonan nomor surat saat masih berstatus In Review sebelum diputuskan oleh Approver? (FR-003) → A: Ya, Drafter berwenang membatalkan permohonannya sendiri selama masih berstatus In Review, status langsung berubah menjadi Cancelled tanpa alokasi nomor surat, dan permohonan dihapus dari antrean tindakan Approver.
- Q: Apakah pengisian kolom Tanggal Surat pada permohonan Ambil Nomor mengizinkan pemilihan tanggal lampau (backdating)? (FR-001) → A: Ketat (tanpa backdating); Tanggal Surat pada formulir Ambil Nomor dikunci hanya pada tanggal hari ini (tanggal pengajuan berjalan) demi menjaga integritas kronologis penerbitan nomor surat dinas.
- Q: Bagaimana tampilan nomor surat yang berstatus Expired atau Cancelled pada daftar arsip surat publik bagi seluruh pengguna whitelist? (FR-006) → A: Tetap tampil transparan di arsip publik dengan lencana visual abu-abu ("Expired" atau "Cancelled"), tombol unduhan dinonaktifkan, dan alasan pembatalan/pelepasan dicantumkan demi akuntabilitas buku agenda nomor surat.


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pengajuan Permohonan Nomor Surat Eksternal (Priority: P1)

Sebagai seorang Drafter, saya ingin mengajukan permohonan nomor surat dinas untuk naskah yang disusun di luar aplikasi (misalnya dokumen fisik, naskah desain grafis khusus, atau surat dari mitra kerja) dengan hanya mengisi metadata pokok (Perihal, Tujuan, Tanggal Surat, dan Kode Template) dan memilih 1 Approver, sehingga saya dapat mengurus administrasi penomoran resmi secara cepat tanpa harus menyusun draf naskah lengkap di editor aplikasi.

**Why this priority**: Merupakan gerbang utama fungsional fitur. Tanpa formulir pengajuan ringkas dan validasi metadata awal, alur persetujuan dan penerbitan nomor standalone tidak dapat dimulai.

**Independent Test**: Drafter login, membuka form "Ambil Nomor Surat", memilih jenis/kode template, mengisi Perihal, Tujuan, Tanggal Surat, memilih 1 Approver yang valid, lalu mengirimkan pengajuan. Sistem memverifikasi kelengkapan data, memastikan Drafter tidak memilih dirinya sendiri, dan menyimpan permohonan dengan status `In Review` menunggu persetujuan Approver.

**Acceptance Scenarios**:

1. **Given** Drafter aktif membuka menu permohonan nomor surat standalone, **When** Drafter memilih kode template, mengisi Perihal, Tujuan, menyetujui Tanggal Surat yang terkunci otomatis pada tanggal hari ini (tanpa backdating), memilih 1 akun Approver aktif yang berbeda dari dirinya sendiri, dan mengirim formulir, **Then** Sistem mencatat permohonan surat dengan tipe eksternal, menetapkan status menjadi `In Review`, mengirimkan notifikasi email kepada Approver, dan menampilkan konfirmasi pengajuan berhasil kepada Drafter.
2. **Given** Drafter mengisi formulir dengan mengosongkan salah satu kolom wajib (Perihal, Tujuan, Tanggal Surat, atau Approver), **When** Drafter menekan tombol kirim, **Then** Sistem menolak pengiriman dan menampilkan indikator peringatan bahwa seluruh kolom metadata wajib diisi.
3. **Given** Drafter mencoba memilih alamat email miliknya sendiri sebagai Approver permohonan nomor, **When** Drafter menekan tombol kirim, **Then** Sistem menolak pengajuan dengan pesan kesalahan bahwa pemohon dilarang menyetujui permohonan buatannya sendiri (*separation of duties*).
4. **Given** Drafter memasukkan teks perihal atau tujuan yang diawali karakter berbahaya (`=`, `+`, `-`, `@`), **When** Data dikirim ke server, **Then** Sistem melakukan sanitasi defensif sebelum disimpan ke basis data lembar kerja.
5. **Given** Permohonan nomor surat masih berada dalam status `In Review`, **When** Drafter pemohon memilih opsi batalkan permohonan, **Then** Sistem memperbarui status permohonan menjadi `Cancelled`, menghilangkannya dari daftar tindakan Approver, mencatat pembatalan di log audit, dan memastikan tidak ada nomor surat yang dialokasikan.


---

### User Story 2 - Persetujuan & Penerbitan Atomik Nomor Surat (Priority: P1)

Sebagai seorang Approver, saya ingin meninjau rincian permohonan nomor surat yang diajukan kepada saya dan memutuskan apakah permohonan disetujui atau ditolak, sehingga nomor surat resmi hanya diterbitkan setelah mendapatkan otorisasi atasan, dan nomor yang terbit terjamin unik berurutan secara atomik.

**Why this priority**: Menjaga tata kelola dan akuntabilitas organisasi agar penomoran surat tidak disalahgunakan atau beredar tanpa persetujuan pihak yang berwenang.

**Independent Test**: Approver membuka dashboard persetujuan, melihat permohonan nomor surat dengan detail metadata pemohon, lalu menekan "Approve". Sistem secara atomik mengalokasikan nomor surat unik (dari antrean daur ulang jika ada, atau nomor counter berikutnya), mencatat batas waktu rekonsiliasi 7 hari kalender, mengubah status menjadi `Pending Upload`, dan mengirimkan email konfirmasi penerbitan nomor kepada Drafter.

**Acceptance Scenarios**:

1. **Given** Terdapat permohonan nomor berstatus `In Review`, **When** Approver yang ditugaskan membuka detail permohonan dan menekan tombol "Approve", **Then** Sistem mengunci transaksi secara atomik, mengalokasikan nomor surat resmi unik berformat standar (misal `0005.SP1/IX/2026`), menetapkan tanggal tenggat rekonsiliasi (7 hari kalender dari saat disetujui), mengubah status menjadi `Pending Upload`, dan mengirimkan notifikasi email berisi nomor resmi kepada Drafter.
2. **Given** Dua Approver menyetujui dua permohonan nomor berbeda pada waktu bersamaan, **When** Kedua alokasi nomor diproses oleh server, **Then** Mekanisme penguncian atomik menjamin masing-masing surat menerima nomor urut yang berbeda tanpa duplikasi nomor.
3. **Given** Approver menilai permohonan nomor tidak layak atau keliru, **When** Approver menekan tombol "Reject" disertai alasan penolakan, **Then** Alur permohonan dihentikan, status surat berubah permanen menjadi `Rejected`, nomor surat sama sekali TIDAK dialokasikan (counter tidak bertambah dan tidak ada nomor yang dilepas ke antrean daur ulang), dan Drafter menerima email pemberitahuan penolakan beserta catatannya.

---

### User Story 3 - Rekonsiliasi & Unggah Berkas Scan Dokumen Final (Priority: P1)

Sebagai Drafter atau Approver, saya ingin mengunggah berkas scan surat fisik/eksternal yang telah resmi ditandatangani ke dalam sistem sebelum batas waktu 7 hari berakhir, sehingga dokumen resmi terarsipkan utuh dan status surat bertransisi final menjadi `Approved`.

**Why this priority**: Menyelesaikan siklus hidup penomoran naskah eksternal dan menjamin organisasi memiliki arsip dokumen sah untuk setiap nomor yang telah beredar, mencegah terjadinya nomor hantu (*phantom numbers*).

**Independent Test**: Pengguna (Drafter atau Approver) membuka halaman detail nomor surat berstatus `Pending Upload`, mengunggah berkas scan PDF bertanda tangan sah melalui form web app. Sistem menyimpan berkas ke folder Google Drive arsip, memvalidasi keberhasilan simpan berkas, dan mengubah status surat menjadi `Approved`.

**Acceptance Scenarios**:

1. **Given** Sebuah nomor surat berada pada status `Pending Upload` dalam rentang waktu < 7 hari kalender, **When** Drafter atau Approver mengunggah berkas scan naskah final berformat PDF melalui halaman detail surat, **Then** Berkas tersimpan di folder Google Drive penyimpanan arsip, tautan berkas tercatat pada entitas surat, status surat diperbarui menjadi `Approved`, dan sistem mencatat penyelesaian rekonsiliasi pada log audit.
2. **Given** Pengguna mencoba mengunggah berkas dengan format di luar PDF (misalnya .exe atau .docx), **When** Pengguna memilih berkas, **Then** Sistem memvalidasi tipe berkas pada sisi klien dan server, menolak unggahan, dan meminta pengguna mengunggah dokumen PDF yang sah.
3. **Given** Pengguna lain yang bukan pembuat draf, bukan approver, dan bukan Admin mencoba mengakses form unggah scan, **When** Halaman diakses, **Then** Sistem membatasi hak unggah hanya kepada Drafter terkait, Approver terkait, dan Admin.
4. **Given** Surat telah berstatus `Approved` dan ditemukan kesalahan pemindaian fisik, **When** Admin mengunggah berkas scan revisi pengganti dan mengisi alasan revisi, **Then** Sistem memperbarui revisi berkas di Google Drive, mempertahankan status `Approved`, dan mencatat penggantian berkas beserta alasannya di log audit.


---

### User Story 4 - Visibilitas & Pelacakan Arsip Publik "Pending Upload" (Priority: P2)

Sebagai seluruh pengguna aktif terdaftar (whitelist), saya ingin dapat melihat dan mencari seluruh nomor surat yang telah diterbitkan pada daftar arsip publik—termasuk nomor berstatus `Pending Upload` yang ditandai lencana khusus—sehingga transparansi penomoran terjaga dan pengguna lain mengetahui bahwa nomor tersebut telah dipesan dan sedang dalam proses penyelesaian fisik.

**Why this priority**: Menghilangkan kebingungan atau kekhawatiran adanya nomor ganda/lompat antar-pegawai dengan memberikan visibilitas penuh terhadap status setiap nomor yang telah beredar.

**Independent Test**: Pengguna login, membuka menu Arsip Surat Publik, melakukan pencarian berdasarkan nomor atau perihal. Surat yang telah disetujui namun belum diunggah berkas scannya muncul dengan badge "Pending Upload" beserta hitung mundur hari tersisa, dan metadata perihal serta tanggal tampil secara akurat.

**Acceptance Scenarios**:

1. **Given** Pengguna whitelist membuka daftar arsip surat publik, **When** Pengguna melihat nomor surat yang baru disetujui dan menunggu unggahan scan, **Then** Sistem menampilkan nomor tersebut dengan lencana khusus bertuliskan "Pending Upload" dan keterangan sisa hari rekonsiliasi.
2. **Given** Pengguna membuka detail surat yang masih berstatus `Pending Upload`, **When** Pengguna melihat bagian berkas dokumen, **Then** Sistem menampilkan informasi bahwa berkas scan dokumen final masih dalam proses pengunggahan fisik oleh pihak terkait.
3. **Given** Surat telah berhasil diunggah berkas scannya dan status berubah menjadi `Approved`, **When** Pengguna whitelist membuka detail surat, **Then** Lencana "Pending Upload" hilang, status berubah menjadi "Approved", dan tautan pratinjau serta unduh PDF final langsung dapat diakses.
4. **Given** Sebuah nomor surat telah berstatus `Expired` atau `Cancelled`, **When** Pengguna whitelist membuka arsip surat publik atau mencari nomor tersebut, **Then** Nomor surat tetap muncul dalam daftar pencarian dengan lencana status abu-abu ("Expired" atau "Cancelled"), tombol unduh berkas dinonaktifkan, dan sistem menampilkan keterangan alasan pembatalan atau pelepasan nomor demi transparansi buku agenda dinas.


---

### User Story 5 - Peringatan Eskalasi H-2 & Pelepasan Nomor Kedaluwarsa Otomatis (Priority: P2)

Sebagai pengelola arsip dan sistem, saya ingin sistem secara otomatis mengirimkan email pengingat eskalasi kepada Approver dan Drafter pada hari ke-5 (2 hari sebelum jatuh tempo), serta secara otomatis membatalkan status nomor dan melepaskannya kembali ke antrean daur ulang jika hingga hari ke-7 naskah scan belum diunggah, sehingga nomor yang hangus tidak menjadi lubang permanen pada buku agenda surat dinas.

**Why this priority**: Menjamin kepatuhan batas waktu operasional (SLA 7 hari) secara otomatis tanpa memerlukan pengawasan manual harian oleh tim sekretariat.

**Independent Test**: Eksekusi rutin trigger terjadwal harian dijalankan. Pada hari ke-5 setelah nomor disetujui tanpa ada unggahan berkas, sistem mengirimkan email peringatan eskalasi. Pada hari ke-7 setelah jatuh tempo tanpa unggahan berkas, sistem mengubah status menjadi `Expired`, melepaskan nomor ke `recycledNumbers` pool pada counter template terkait, dan mencatat pembatalan otomatis di log audit.

**Acceptance Scenarios**:

1. **Given** Nomor surat berstatus `Pending Upload` telah memasuki hari ke-5 kalender sejak tanggal disetujui dan berkas scan belum diunggah, **When** Pemicu terjadwal harian dieksekusi, **Then** Sistem mengirimkan email peringatan eskalasi kepada Approver dan Drafter yang menegaskan bahwa tersisa 2 hari sebelum nomor kedaluwarsa dan dilepas ke antrean daur ulang.
2. **Given** Nomor surat berstatus `Pending Upload` telah melewati 7 hari kalender penuh (H+7) sejak disetujui tanpa ada unggahan berkas scan, **When** Pemicu terjadwal harian dieksekusi, **Then** Sistem memperbarui status surat menjadi `Expired`, melepaskan nomor urut terkait ke antrean daur ulang (`recycledNumbers`) pada kategori dan periode bulan terkait, mencatat waktu kedaluwarsa pada log audit, dan mengirimkan email pemberitahuan kedaluwarsa kepada Drafter dan Approver.
3. **Given** Nomor surat telah berubah status menjadi `Expired`, **When** Surat baru dengan kode template dan bulan yang sama diajukan dan disetujui di kemudian hari, **Then** Sistem mengutamakan pengambilan nomor yang telah dilepaskan dari antrean daur ulang tersebut sebelum menaikkan nomor urut counter baru.
4. **Given** Pengguna mencoba mengunggah berkas scan pada nomor surat yang telah berstatus `Expired`, **When** Aksi unggah dikirimkan, **Then** Sistem menolak unggahan dan menginformasikan bahwa alokasi nomor surat tersebut telah kedaluwarsa dan dilepaskan.

---

### Edge Cases

- **Upaya Unggah pada Detik-Detik Terakhir**: Ketika pengguna mengunggah berkas scan pada hari ke-7 beberapa saat sebelum pemicu terjadwal harian berjalan, sistem memproses transaksi unggah terlebih dahulu dan memperbarui status menjadi `Approved`, sehingga saat pemicu terjadwal berjalan, surat tersebut dilewati dan tidak dibatalkan.
- **Penolakan Permohonan Tanpa Alokasi Nomor**: Jika Approver menolak permohonan standalone pada tahap `In Review`, sistem memastikan counter nomor sama sekali tidak disentuh, nomor tidak pernah diterbitkan, dan tidak ada nomor kosong yang masuk ke antrean daur ulang.
- **Pelepasan Nomor pada Pergantian Bulan**: Jika nomor disetujui pada akhir bulan (misalnya tanggal 28 September) dan kedaluwarsa pada tanggal 5 Oktober, pelepasan nomor daur ulang wajib dikembalikan secara akurat ke counter periode bulan asal penerbitannya (September/Bulan 9), bukan bulan saat eksekusi trigger kedaluwarsa (Oktober/Bulan 10).
- **Kegagalan Penyimpanan Berkas Scan di Google Drive**: Jika terjadi gangguan jaringan atau kegagalan API saat mengunggah berkas scan ke Google Drive, sistem tidak boleh memperbarui status surat menjadi `Approved`, melainkan menampilkan pesan kegagalan dan mempertahankan status `Pending Upload` agar pengguna dapat mengunggah kembali.
- **Pencegahan Injeksi Formula pada Isian Formulir**: Setiap input teks formulir yang diawali karakter berbahaya (`=`, `+`, `-`, `@`) pada kolom Perihal dan Tujuan disanitasi secara ketat pada lapis server sebelum disimpan ke lembar kerja basis data.
- **Pembatalan Manual Sebelum Batas Waktu**: Ketika Approver atau Admin membatalkan nomor berstatus `Pending Upload` secara manual sebelum hari ke-7, sistem mencatat alasan pembatalan di log audit, mengubah status menjadi `Cancelled`, dan secara atomik melepaskan nomor surat ke antrean daur ulang.
- **Koreksi Berkas Scan Pasca-Approved**: Jika ditemukan kesalahan fisik (misal halaman terpotong atau buram) pada surat yang telah berstatus `Approved`, hanya peran Admin yang diizinkan memperbarui berkas scan pengganti dengan kewajiban mencatat alasan koreksi pada log audit.
- **Pencegahan Tanggal Mundur (No Backdating)**: Sistem mengunci kolom Tanggal Surat pada tanggal hari pengajuan berjalan dan menolak manipulasi tanggal lampau atau tanggal masa depan guna menjaga integritas kronologis penomoran instansi.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistem HARUS menyediakan formulir pengajuan nomor surat eksternal (Ambil Nomor) yang dapat diakses oleh seluruh pengguna aktif dengan peran Drafter, mewajibkan pengisian: Kode Template/Kategori, Perihal (Subject), Tujuan (Recipient), Tanggal Surat (dikunci ketat pada tanggal hari ini saat pengajuan tanpa izin tanggal mundur/backdating), dan penunjukan tepat 1 orang pengguna aktif dengan peran Approver.
- **FR-002**: Sistem HARUS menerapkan aturan pemisahan wewenang (*separation of duties*): Drafter DILARANG menunjuk alamat email miliknya sendiri sebagai Approver pada permohonan nomor yang diajukan.

- **FR-003**: Sistem HARUS mencatat permohonan nomor surat eksternal baru dengan status awal `In Review` tanpa membuat dokumen draf Google Docs di Google Drive.
- **FR-004**: Sistem HARUS menyediakan antarmuka bagi Approver untuk meninjau metadata permohonan nomor surat dan memberikan keputusan:
  - Jika **Disetujui (Approve)**: Sistem HARUS secara atomik mengalokasikan nomor surat unik menggunakan antrean daur ulang (`recycledNumbers`) jika tersedia atau menaikkan urutan counter baru, mencatat batas tenggat waktu 7 hari kalender (168 jam) sejak waktu persetujuan, dan memperbarui status menjadi `Pending Upload`.
  - Jika **Ditolak (Reject)**: Sistem HARUS mewajibkan pengisian alasan penolakan, mengunci status menjadi `Rejected`, dan TIDAK mengalokasikan nomor surat apa pun.
- **FR-005**: Sistem HARUS memastikan seluruh nomor surat yang dialokasikan mengikuti format standar organisasi `{urutan:04d}.{kode_template}/{bulan_romawi}/{tahun}` dengan jaminan atomik bebas dari balapan kondisi (*race conditions*) melalui mekanisme penguncian naskah (`LockService`).
- **FR-006**: Sistem HARUS menampilkan nomor surat yang berstatus `Pending Upload`, `Expired`, maupun `Cancelled` pada daftar arsip surat publik bagi seluruh pengguna whitelist terdaftar:
  - Untuk status `Pending Upload`: Ditampilkan dengan lencana visual khusus "Pending Upload" dan informasi sisa waktu pemenuhan berkas.
  - Untuk status `Expired` dan `Cancelled`: Ditampilkan dengan lencana visual abu-abu ("Expired" atau "Cancelled"), tautan/tombol unduh dinonaktifkan, dan keterangan alasan penutupan nomor ditampilkan demi transparansi buku agenda surat dinas.

- **FR-007**: Sistem HARUS menyediakan fasilitas pengunggahan berkas scan dokumen final (format PDF, ukuran maksimal 10 MB) pada halaman detail surat berstatus `Pending Upload`, yang hanya dapat dilakukan oleh Drafter pemohon, Approver penyetujui, atau Admin.
- **FR-008**: Sistem HARUS memvalidasi keberhasilan penyimpanan berkas scan ke Google Drive sebelum mengubah status surat dari `Pending Upload` menjadi `Approved`.
- **FR-009**: Sistem HARUS menjalankan fungsi terjadwal otomatis harian (*daily time-driven trigger*) untuk memeriksa seluruh surat berstatus `Pending Upload`:
  - **Eskalasi Hari ke-5 (H-2)**: Jika usia status persetujuan mencapai 5 hari kalender dan belum ada berkas scan yang diunggah, sistem HARUS mengirimkan email peringatan eskalasi kepada Drafter dan Approver.
  - **Kedaluwarsa Hari ke-7 (H+7)**: Jika usia status persetujuan telah melewati 7 hari kalender penuh tanpa berkas scan, sistem HARUS mengubah status surat menjadi `Expired`, melepaskan nomor urut terkait kembali ke antrean daur ulang (`recycledNumbers`) sesuai periode bulan dan tahun pembuatannya, dan mengirimkan email pemberitahuan kedaluwarsa.
- **FR-010**: Sistem HARUS menolak upaya pengunggahan berkas scan pada surat yang telah berstatus `Expired` atau `Rejected`.
- **FR-011**: Sistem HARUS mencatat seluruh peristiwa siklus penomoran (pengajuan permohonan, persetujuan nomor, penolakan permohonan, pengunggahan scan, pengiriman email eskalasi, pembatalan manual, dan pembatalan kedaluwarsa) ke dalam log audit permanen (`ApprovalLog`) yang mencatat timestamp, pelaku aksi, ID surat, dan rincian transisi status.
- **FR-012**: Sistem HARUS melakukan sanitasi defensif terhadap seluruh input pengguna guna mengeliminasi risiko injeksi formula lembar data sebelum disimpan ke basis data.
- **FR-013**: Sistem HARUS mengizinkan Approver atau Admin untuk membatalkan nomor surat berstatus `Pending Upload` secara manual sebelum batas waktu 7 hari kalender berakhir dengan menyertakan alasan pembatalan wajib, mengubah status surat menjadi `Cancelled`, dan langsung melepaskan nomor surat tersebut kembali ke antrean daur ulang (`recycledNumbers`).
- **FR-014**: Sistem HARUS mengunci berkas scan dari pengunggahan ulang oleh Drafter dan Approver setelah status surat menjadi `Approved`, namun HARUS menyediakan hak akses khusus bagi peran Admin untuk memperbarui berkas scan pengganti dengan mewajibkan pengisian alasan koreksi dan mencatat pembaruan revisi berkas di log audit.
- **FR-015**: Sistem HARUS mengizinkan Drafter pemohon untuk membatalkan permohonan nomor surat yang masih berstatus `In Review`, mengubah status permohonan menjadi `Cancelled`, dan memastikan tidak ada nomor surat yang dialokasikan atau memengaruhi counter penomoran.

### Key Entities *(include if feature involves data)*


- **Surat / Permohonan Nomor (Letter / External Reservation Entity)**:
  - Mewakili naskah surat fisik/eksternal yang dimohonkan nomornya.
  - Atribut tambahan / ekstensi model:
    - `letterId`: Pengidentifikasi unik surat (UUID string).
    - `letterNumber`: Nomor surat resmi yang dialokasikan (bernilai `null` saat masih `In Review`, dan terisi setelah `Approve`).
    - `documentType`: Penanda tipe naskah dinas (`INTERNAL` untuk pembuatan surat biasa, `EXTERNAL` untuk ambil nomor mandiri).
    - `templateCode`: Kode template/klasifikasi surat (misal `SP1`, `ST`).
    - `contentData`: Struktur objek ter-sanitasi berisi metadata pokok: `{ perihal, tujuan, tanggalSurat }`.
    - `drafterEmail`: Alamat email pemohon nomor.
    - `approvalFlow`: Array tahapan persetujuan (berisi 1 langkah Approver akhir).
    - `status`: Status siklus hidup (`In Review`, `Pending Upload`, `Approved`, `Rejected`, `Expired`, `Cancelled`).
    - `reconciliationDeadline`: Waktu tenggat 7 hari kalender setelah nomor disetujui (ISO 8601 string).
    - `escalationSentAt`: Waktu pengiriman email peringatan hari ke-5 (ISO 8601 string / null).
    - `finalPdfUrl`: Tautan berkas scan PDF resmi di Google Drive setelah diunggah.
    - `createdAt`, `updatedAt`: Waktu pembuatan dan pembaruan terakhir.
- **Penghitung & Antrean Daur Ulang (Counter & Recycled Pool)**:
  - Entitas pengelola urutan nomor atomik (reused dari `001-manajemen-surat`).
  - Menyimpan nomor yang dirilis kembali (`recycledNumbers`) ketika surat ditolak atau kedaluwarsa.
- **Catatan Jejak Audit (Approval Log)**:
  - Entitas pencatat riwayat permanen mutasi data (reused dari `001-manajemen-surat`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% nomor surat yang dialokasikan melalui jalur permohonan eksternal terjamin unik dan berurutan secara atomik tanpa duplikasi nomor, termasuk nomor yang dialokasikan kembali dari antrean daur ulang.
- **SC-002**: Pengguna dengan peran Drafter dapat menyelesaikan pengisian formulir permohonan nomor surat eksternal hingga berhasil diajukan dalam waktu kurang dari 60 detik.
- **SC-003**: 100% nomor surat yang disetujui langsung tampil pada daftar arsip surat publik dengan penanda lencana status "Pending Upload" dalam waktu kurang dari 5 detik setelah persetujuan dikonfirmasi.
- **SC-004**: 100% surat berstatus `Pending Upload` yang belum memiliki berkas scan pada hari ke-5 menerima email peringatan eskalasi secara otomatis.
- **SC-005**: 100% nomor surat yang melewati batas waktu 7 hari kalender tanpa unggahan berkas scan secara otomatis bertransisi menjadi `Expired` dan nomornya kembali tersedia di antrean daur ulang untuk periode bulan terkait.
- **SC-006**: 0% draf kosong (*dummy in-app drafts*) yang dibuat di sistem semata-mata untuk memanen nomor surat setelah fitur ini diaktifkan.
- **SC-007**: 100% riwayat tindakan pengajuan, persetujuan, unggah scan, dan pembatalan otomatis tercatat akurat dan utuh pada log audit.

## Assumptions

- Seluruh pengguna memiliki akun Google aktif yang terdaftar pada whitelist sistem dengan peran yang sesuai (`drafter`, `approver`, atau `admin`).
- Pemohon dan peninjau memahami bahwa fitur Ambil Nomor ditujukan khusus untuk dokumen fisik atau dokumen yang disusun di luar aplikasi yang tetap membutuhkan nomor registrasi resmi instansi.
- Pemicu terjadwal harian (*time-driven trigger*) di Google Apps Script dapat dieksekusi secara andal satu kali setiap hari (misalnya pada pukul 01.00 atau 06.00 WIB) untuk menjalankan pengecekan eskalasi dan kedaluwarsa.
- Berkas scan fisik yang diunggah berformat PDF dengan ukuran wajar yang didukung oleh Google Drive API melalui Web App (maksimal 10 MB per berkas).
- Tidak ada perpanjangan masa kedaluwarsa manual; jika nomor telah kedaluwarsa dan dilepas ke antrean daur ulang, Drafter harus mengajukan permohonan nomor baru.
