# Contract: Auth Controller Interface (`auth.controller.gs`)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Phase**: Phase 1 (Interface Contracts)  
**Protocol**: Google Apps Script `google.script.run`  

Dokumen ini mendefinisikan kontrak fungsi server-side yang diekspos oleh `auth.controller.gs` untuk dipanggil dari UI client (`Login.html`, `Index.html`, dll).

---

## 1. `getCurrentUser()`

Memeriksa identitas sesi aktif Google pengguna dan mencocokkannya dengan whitelist di sheet `Users`.

### Request
Tidak memerlukan parameter (menggunakan identitas sesi server `Session.getActiveUser().getEmail()`).

```javascript
google.script.run
  .withSuccessHandler(onSuccess)
  .withFailureHandler(onError)
  .getCurrentUser();
```

### Response Success
Objek profil pengguna terdaftar:
```json
{
  "success": true,
  "data": {
    "email": "budi.hr@gmail.com",
    "name": "Budi Santoso",
    "role": "drafter",
    "hasSignature": false,
    "isActive": true
  }
}
```

### Error Responses
1. **Sesi Google Tidak Terdeteksi**:
   ```json
   {
     "success": false,
     "error": "SESSION_NOT_DETECTED",
     "message": "Sesi akun Google aktif tidak terdeteksi. Silakan login ke akun Google Anda."
   }
   ```
2. **Email Tidak Terdaftar di Whitelist**:
   ```json
   {
     "success": false,
     "error": "NOT_WHITELISTED",
     "message": "Akun 'user@gmail.com' belum terdaftar di whitelist sistem. Hubungi Administrator."
   }
   ```
3. **Akun Dinonaktifkan**:
   ```json
   {
     "success": false,
     "error": "ACCOUNT_DEACTIVATED",
     "message": "Akun Anda telah dinonaktifkan oleh Administrator."
   }
   ```
