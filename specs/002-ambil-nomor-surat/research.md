# Technical Research: Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor)

**Feature Branch**: `002-ambil-nomor-surat` | **Date**: 2026-09-28

---

## Executive Summary

Riset teknis ini mendokumentasikan keputusan arsitektur, pola integrasi, dan evaluasi alternatif untuk mengimplementasikan fitur Ambil Nomor pada sistem naskah dinas Koneksi. Seluruh keputusan dirancang untuk mematuhi Konstitusi Proyek (arsitektur berlapis, otorisasi server-side, atomisitas penomoran, sanitasi formula, dan auditabilitas permanen).

---

## Research Topics & Decisions

### 1. Model Data & Integrasi Penyimpanan Naskah Eksternal

- **Context**: Apakah permohonan nomor surat eksternal disimpan di tabel terpisah (`NumberReservations`) atau memperluas skema tabel `Letters` yang sudah ada?
- **Decision**: Memperluas tabel `Letters` dengan menambahkan atribut `documentType` (`INTERNAL` / `EXTERNAL`), `reconciliationDeadline`, `escalationSentAt`, dan `cancellationReason`.
- **Rationale**:
  - Tabel `Letters` sudah terhubung langsung dengan alur pencarian arsip publik, dashboard pengguna, dan audit logging.
  - Menghindari pembuatan sheet dan repository baru (`reservationRepository`) yang sebagian besar fungsinya duplikatif dengan `letterRepository`.
  - Format status surat pada `Letters` dapat diperluas dengan menambahkan status `PENDING_UPLOAD`, `EXPIRED`, dan `CANCELLED` tanpa merusak kompatibilitas draf internal.
- **Alternatives Considered**:
  - *Tabel Terpisah (`NumberReservations`)*: Ditolak karena menciptakan fragmentasi data, memerlukan dua repository terpisah, dan menyulitkan pencarian arsip publik tunggal yang diwajibkan oleh FR-006.

---

### 2. Mekanisme Penjadwalan Trigger Otomatis Harian (Daily Clock Trigger)

- **Context**: Bagaimana sistem secara andal mendeteksi surat yang memasuki hari ke-5 (eskalasi) dan hari ke-7 (kedaluwarsa otomatis) tanpa interaksi pengguna langsung?
- **Decision**: Menggunakan Google Apps Script Time-Driven Triggers (`ScriptApp.newTrigger`) yang berjalan otomatis sekali setiap hari (misalnya pukul 06.00 WIB) untuk menjalankan fungsi `scheduleService.runDailyReconciliationAudit()`.
- **Rationale**:
  - Google Apps Script menyediakan API native `ScriptApp` untuk menjadwalkan trigger berbasis jam/hari tanpa memerlukan server eksternal atau cron job pihak ketiga.
  - Eksekusi harian pada pagi hari (06.00 WIB) memberikan waktu yang cukup bagi email eskalasi hari ke-5 untuk dibaca oleh Approver dan Drafter di awal jam kerja.
  - Logika evaluasi status:
    - Menghitung selisih hari kalender antara tanggal saat ini dengan tanggal persetujuan (`approvedAt` / `reconciliationDeadline`).
    - Jika sisa waktu $\le 2$ hari (hari ke-5) dan `escalationSentAt` masih `null`: kirim email peringatan dan catat timestamp `escalationSentAt`.
    - Jika sisa waktu $\le 0$ hari (telah melewati hari ke-7): ubah status menjadi `EXPIRED`, panggil `numberingService.releaseNumber()`, catat log audit, dan kirim email pemberitahuan kedaluwarsa.
- **Alternatives Considered**:
  - *Evaluasi Pasif saat Akses Web App*: Ditolak karena jika tidak ada pengguna yang membuka aplikasi pada hari ke-7, nomor kedaluwarsa tidak akan dirilis tepat waktu dan antrean daur ulang tertahan.
  - *Webhook / Cloud Tasks Eksternal*: Ditolak karena arsitektur Fase 0 berbasis murni Google Apps Script tanpa infrastruktur cloud berbayar.

---

### 3. Penanganan Siklus Pelepasan Nomor Daur Ulang pada Transaksi Lintas Bulan

- **Context**: Jika sebuah nomor surat dialokasikan pada tanggal 28 September (Bulan 9: `0005.SP1/IX/2026`) dan dibatalkan atau kedaluwarsa pada tanggal 5 Oktober (Bulan 10), ke counter periode manakah nomor tersebut harus dikembalikan?
- **Decision**: Nomor yang dibatalkan atau kedaluwarsa wajib dikembalikan ke counter periode bulan asal penerbitannya (September / Bulan 9), menggunakan metadata `allocatedMonth` dan `allocatedYear` yang tersimpan pada rekaman surat.
- **Rationale**:
  - Format nomor surat mencantumkan bulan romawi dan tahun saat diterbitkan (`{urutan:04d}.{kode_template}/{bulan_romawi}/{tahun}`).
  - Jika nomor `0005.SP1/IX/2026` dimasukkan ke antrean daur ulang bulan Oktober (Bulan 10), maka saat digunakan kembali akan terjadi kontradiksi format penomoran (nomor berformat IX dialokasikan pada draf bulan X).
  - Fungsi `numberingService.releaseNumber(templateCode, month, year, sequenceNumber)` telah dirancang untuk menerima parameter bulan dan tahun asal secara eksplisit.
- **Alternatives Considered**:
  - *Menghanguskan Nomor Permanen*: Ditolak karena melanggar prinsip anti-gap penomoran (meninggalkan lubang nomor tak terpakai pada buku register resmi).

---

### 4. Arsitektur Antarmuka Pengguna (UI)

- **Context**: Bagaimana menyajikan antarmuka pengajuan Ambil Nomor tanpa membingungkan alur draf surat standar?
- **Decision**: Mengintegrasikan opsi tipe surat pada `CreateLetter.html` berupa pemilihan mode: **"Buat Surat Internal (Template Lengkap)"** atau **"Ambil Nomor Surat (Naskah Eksternal / Fisik)"**.
- **Rationale**:
  - Memanfaatkan halaman pembuatan surat yang sudah ada tanpa menambah rute URL baru.
  - Ketika mode "Ambil Nomor Surat" dipilih, antarmuka menyederhanakan formulir:
    - Menyembunyikan pilihan template Google Docs dan isian variabel teks dinamis.
    - Mengunci kolom Tanggal Surat pada tanggal hari ini (elemen input berstatus `disabled`/`readonly` dengan nilai default tanggal hari ini, divalidasi ulang di server).
    - Membatasi pemilihan peninjau menjadi tepat 1 Approver akhir.
- **Alternatives Considered**:
  - *Membuat Berkas HTML Baru (`TakeNumber.html`)*: Ditolak karena menambah overhead duplikasi layout, stylesheet, navigasi, dan skrip pemanggil client-side.
