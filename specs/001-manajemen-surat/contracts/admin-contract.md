# Contract: Admin Controller Interface (`admin.controller.gs`)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Phase**: Phase 1 (Interface Contracts)  
**Protocol**: Google Apps Script `google.script.run`  

Dokumen ini mendefinisikan kontrak fungsi server-side untuk modul administrasi pengguna dan pengaturan tanda tangan.

---

## 1. `listUsers()`

Mengambil seluruh daftar pengguna terdaftar di sheet `Users` (khusus Admin).

### Request
Memeriksa role pemanggil di server (`role === 'admin'`).

```javascript
google.script.run
  .withSuccessHandler(onSuccess)
  .withFailureHandler(onError)
  .listUsers();
```

### Response Success
```json
{
  "success": true,
  "data": [
    {
      "email": "drafter@gmail.com",
      "name": "Drafter HR",
      "role": "drafter",
      "isActive": true,
      "createdAt": "2026-09-24T08:00:00.000Z"
    },
    {
      "email": "approver@gmail.com",
      "name": "Direktur HR",
      "role": "approver",
      "isActive": true,
      "hasSignature": true,
      "createdAt": "2026-09-24T08:00:00.000Z"
    }
  ]
}
```

---

## 2. `upsertUser(userData)`

Menambahkan pengguna baru atau memperbarui role/status keaktifan pengguna yang ada.

### Request Payload (`userData`)
```json
{
  "email": "new.user@gmail.com",
  "name": "Nama Pengguna Baru",
  "role": "reviewer", // "drafter" | "reviewer" | "approver" | "admin"
  "isActive": true
}
```

### Response Success
```json
{
  "success": true,
  "data": {
    "email": "new.user@gmail.com",
    "updated": true
  }
}
```

---

## 3. `uploadSignature(fileBase64, mimeType)`

Mengunggah gambar tanda tangan referensi untuk akun Approver aktif.

### Request Payload
```json
{
  "fileBase64": "data:image/png;base64,iVBORw0KGgo...",
  "mimeType": "image/png"
}
```

### Response Success
```json
{
  "success": true,
  "data": {
    "signatureFileId": "1AbCdEfGhIjKlMnOpQrStUvWxYz",
    "message": "Tanda tangan referensi berhasil disimpan."
  }
}
```
