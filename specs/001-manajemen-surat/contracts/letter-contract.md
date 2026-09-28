# Contract: Letter Controller Interface (`letter.controller.gs`)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Phase**: Phase 1 (Interface Contracts)  
**Protocol**: Google Apps Script `google.script.run`  

Dokumen ini mendefinisikan kontrak fungsi server-side untuk pembuatan, peninjauan, persetujuan, dan pengunggahan berkas surat.

---

## 1. `submitDraft(formData)`

Diajukan oleh Drafter untuk menerbitkan nomor surat resmi dan membuat draf surat baru.

### Request Payload (`formData`)
```json
{
  "templateCode": "SP1",
  "templateType": "Surat Peringatan 1",
  "contentData": {
    "namaKaryawan": "Ahmad Dani",
    "nik": "HR-2024-009",
    "departemen": "Operasional",
    "pelanggaran": "Keterlambatan berturut-turut",
    "tanggalEfektif": "2026-10-01"
  },
  "reviewers": [
    { "email": "spv.ops@gmail.com", "name": "Budi SPV", "role": "reviewer" }
  ],
  "approver": {
    "email": "head.hr@gmail.com",
    "name": "Siti Head of HR",
    "role": "approver"
  }
}
```

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
    "letterNumber": "0001.SP1/IX/2026",
    "status": "In Review",
    "currentReviewer": "spv.ops@gmail.com"
  }
}
```

---

## 2. `getLettersForUser(filterType)`

Mengambil daftar surat untuk dashboard pengguna sesuai hak akses privasi.

### Request
`filterType`: `"my_turn"` (perlu tindakan saya) | `"my_drafts"` (draf yang saya buat) | `"all_approved"` (arsip terbuka) | `"all"` (khusus Admin).

### Response Success
```json
{
  "success": true,
  "data": [
    {
      "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
      "letterNumber": "0001.SP1/IX/2026",
      "templateType": "Surat Peringatan 1",
      "drafterEmail": "drafter@gmail.com",
      "status": "In Review",
      "currentTurnEmail": "spv.ops@gmail.com",
      "awaitingWetSignature": false,
      "createdAt": "2026-09-24T09:15:00.000Z"
    }
  ]
}
```

---

## 3. `getLetterDetail(letterId)`

Mengambil informasi lengkap satu surat beserta riwayat approval dan log audit.

### Request
`letterId`: String UUID surat.

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
    "letterNumber": "0001.SP1/IX/2026",
    "templateType": "Surat Peringatan 1",
    "contentData": { "namaKaryawan": "Ahmad Dani", "nik": "HR-2024-009" },
    "status": "In Review",
    "drafterEmail": "drafter@gmail.com",
    "approvalFlow": [
      { "order": 1, "email": "spv.ops@gmail.com", "name": "Budi SPV", "role": "reviewer", "status": "approved", "decisionAt": "...", "notes": "OK" },
      { "order": 2, "email": "head.hr@gmail.com", "name": "Siti Head of HR", "role": "approver", "status": "pending", "decisionAt": null, "notes": "" }
    ],
    "canAct": true,
    "isFinalApprover": true,
    "awaitingWetSignature": false,
    "unsignedDriveFileId": null,
    "finalPdfUrl": null,
    "auditLogs": [
      { "actorEmail": "drafter@gmail.com", "action": "submit_draft", "notes": "", "timestamp": "..." }
    ]
  }
}
```

---

## 4. `decide(letterId, decision, notes, signatureMethod)`

Melakukan tindakan persetujuan (Approve) atau penolakan (Reject).

### Request
```json
{
  "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
  "decision": "approve", // "approve" | "reject"
  "notes": "Dokumen disetujui tanpa catatan.",
  "signatureMethod": "digital" // "digital" | "wet" (wajib jika isFinalApprover === true)
}
```

### Response Success (Digital Finalization)
```json
{
  "success": true,
  "data": {
    "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
    "status": "Approved",
    "finalPdfUrl": "https://drive.google.com/file/d/...",
    "finalFileName": "0001.SP1-IX-2026 - Surat Peringatan 1.pdf"
  }
}
```

### Response Success (Reject)
```json
{
  "success": true,
  "data": {
    "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
    "status": "Rejected",
    "releasedNumber": "0001.SP1/IX/2026",
    "message": "Draf ditolak dan diarsipkan permanen. Nomor surat telah dirilis kembali ke sistem."
  }
}
```

---

## 5. `uploadWetSignatureScan(letterId, fileBase64, mimeType, fileName)`

Mengunggah berkas scan tanda tangan basah langsung dari Web App untuk memperbarui revisi Google Drive via API `Files.update`.

### Request
```json
{
  "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
  "fileBase64": "data:application/pdf;base64,JVBERi0xLjQK...",
  "mimeType": "application/pdf",
  "fileName": "scan_sp1_signed.pdf"
}
```

### Response Success
```json
{
  "success": true,
  "data": {
    "letterId": "b8f52a1e-84d3-4876-9ec1-19b8417f7b11",
    "status": "Approved",
    "finalPdfUrl": "https://drive.google.com/file/d/...",
    "verifiedRevisionId": "2"
  }
}
```
