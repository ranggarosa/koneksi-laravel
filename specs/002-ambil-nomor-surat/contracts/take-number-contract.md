# Contract: Take Number & Reconciliation Controller Interface

**Feature**: `specs/002-ambil-nomor-surat/spec.md`  
**Phase**: Phase 1 (Interface Contracts)  
**Protocol**: Google Apps Script `google.script.run`  

Dokumen ini mendefinisikan kontrak fungsi server-side untuk alur Ambil Nomor, otorisasi persetujuan, unggah rekonsiliasi berkas scan, pembatalan, dan eksekusi audit pemicu terjadwal.

---

## 1. `submitTakeNumberRequest(payload)`

Diajukan oleh Drafter untuk memohon nomor surat eksternal/fisik.

### Request Payload (`payload`)
```json
{
  "templateCode": "ST",
  "templateType": "Surat Tugas",
  "contentData": {
    "perihal": "Tugas Monitoring Program Wilayah",
    "tujuan": "Dinas Pendidikan Kabupaten Bandung",
    "tanggalSurat": "2026-09-28"
  },
  "approver": {
    "email": "kepala.bagian@gmail.com",
    "name": "Budi Santoso",
    "role": "approver"
  }
}
```

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "status": "In Review",
    "documentType": "EXTERNAL",
    "approverEmail": "kepala.bagian@gmail.com",
    "message": "Permohonan nomor surat berhasil diajukan dan menunggu persetujuan atasan."
  }
}
```

### Error Scenarios
- `400`: Metadata wajib tidak lengkap (Perihal, Tujuan, Approver kosong).
- `400`: Pemohon memilih dirinya sendiri sebagai Approver (*separation of duties*).
- `400`: Tanggal surat bukan tanggal hari ini (*no backdating policy*).
- `403`: Sesi pengguna tidak aktif atau tidak terdaftar di whitelist.

---

## 2. `approveTakeNumberRequest(letterId)`

Dieksekusi oleh Approver untuk menyetujui permohonan dan secara atomik menerbitkan nomor surat resmi.

### Request
- `letterId`: `String` (UUID surat)

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "letterNumber": "0005.ST/IX/2026",
    "status": "Pending Upload",
    "reconciliationDeadline": "2026-10-05T08:00:00.000Z",
    "isRecycled": false
  }
}
```

### Error Scenarios
- `403`: Pengguna aktif bukan merupakan Approver yang ditunjuk pada permohonan tersebut.
- `409`: Surat tidak berada dalam status `In Review`.
- `503`: Gagal memperoleh `LockService` dalam batas waktu 30 detik (sistem sedang sibuk).

---

## 3. `rejectTakeNumberRequest(letterId, reason)`

Dieksekusi oleh Approver untuk menolak permohonan nomor surat.

### Request
- `letterId`: `String`
- `reason`: `String` (Wajib, minimal 5 karakter)

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "status": "Rejected",
    "notes": "Kegiatan belum disetujui pimpinan",
    "letterNumber": null
  }
}
```

---

## 4. `cancelTakeNumberByDrafter(letterId)`

Dieksekusi oleh Drafter untuk membatalkan permohonannya sendiri saat masih `In Review`.

### Request
- `letterId`: `String`

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "status": "Cancelled",
    "message": "Permohonan berhasil dibatalkan oleh pemohon."
  }
}
```

### Error Scenarios
- `403`: Pengguna aktif bukan merupakan Drafter pembuat permohonan.
- `409`: Surat sudah tidak lagi berstatus `In Review` (sudah disetujui atau ditolak).

---

## 5. `cancelTakeNumberManual(letterId, reason)`

Dieksekusi oleh Approver atau Admin untuk membatalkan nomor berstatus `Pending Upload` sebelum H+7.

### Request
- `letterId`: `String`
- `reason`: `String` (Wajib)

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "letterNumber": "0005.ST/IX/2026",
    "status": "Cancelled",
    "recycled": true,
    "message": "Nomor surat dibatalkan dan telah dilepas kembali ke antrean daur ulang."
  }
}
```

### Error Scenarios
- `403`: Pengguna aktif bukan Approver terkait dan bukan Admin.
- `409`: Surat tidak berstatus `Pending Upload`.

---

## 6. `uploadTakeNumberScan(letterId, fileData)`

Dieksekusi oleh Drafter, Approver, atau Admin untuk mengunggah berkas scan PDF bertanda tangan basah.

### Request Payload (`fileData`)
```json
{
  "fileName": "Scan_Surat_Tugas_0005.pdf",
  "mimeType": "application/pdf",
  "base64": "JVBERi0xLjQKJ..."
}
```

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "letterNumber": "0005.ST/IX/2026",
    "status": "Approved",
    "finalPdfUrl": "https://drive.google.com/file/d/1XyZ.../view",
    "message": "Berkas scan berhasil diunggah. Dokumen resmi telah sah dan terarsipkan."
  }
}
```

### Error Scenarios
- `400`: Format berkas bukan PDF atau ukuran berkas melebihi 10 MB.
- `403`: Pengguna tidak berwenang mengunggah pada surat ini.
- `409`: Surat telah berstatus `Expired` atau `Rejected`.

---

## 7. `replaceTakeNumberScanAsAdmin(letterId, fileData, reason)`

Dieksekusi khusus oleh Admin untuk mengoreksi berkas scan pada surat yang telah `Approved`.

### Request
- `letterId`: `String`
- `fileData`: `{ fileName, mimeType, base64 }`
- `reason`: `String` (Wajib, alasan penggantian berkas)

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "4c9e7821-2e6b-4e67-8cfb-6f0d1a4e21a0",
    "status": "Approved",
    "finalPdfUrl": "https://drive.google.com/file/d/1NewScanId.../view",
    "message": "Berkas scan revisi berhasil diperbarui oleh Admin."
  }
}
```

### Error Scenarios
- `403`: Pengguna bukan Admin aktif.
- `400`: Alasan koreksi belum diisi.

---

## 8. `runDailyReconciliationAudit()`

Fungsi sistem yang dieksekusi otomatis satu kali sehari oleh Time-Driven Trigger Apps Script.

### Request
*None (Internal Trigger Context)*

### Response Result
```json
{
  "success": true,
  "stats": {
    "checked": 12,
    "escalated": 2,
    "expired": 1,
    "retained": 9
  }
}
```
