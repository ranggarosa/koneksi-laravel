# Panduan Arsitektur & Penamaan (High-Level)

Dokumen ini berisi aturan standar arsitektur berlapis (Layered Architecture) dan konvensi penamaan agar kode aplikasi (MVP maupun Enterprise) tetap rapi, modular, dan mudah dipahami oleh tim.

## 1. Konsep Layered Architecture (Pemisahan Tugas)
Kode tidak boleh dicampur dalam satu file. Setiap fitur harus dibagi ke dalam 4 lapisan (layer) dengan komunikasi satu arah (dari atas ke bawah):

1. **View/Presentation Layer (`/pages`, `/components`)**
   - **Tugas:** Hanya mengatur tampilan antarmuka (UI) dan menerima interaksi user (klik, ketik).
   - **Aturan:** Dilarang berisi logika bisnis atau query database secara langsung.
2. **Controller Layer (`/controllers` atau Custom Hooks)**
   - **Tugas:** Menghubungkan UI dengan Service. Mengelola state aplikasi (loading, error, success) dan membaca input.
   - **Aturan:** Meneruskan data dari View ke Service.
3. **Service Layer (`/services`)**
   - **Tugas:** Pusat logika bisnis (business logic). Menangani validasi, kalkulasi penomoran surat, dan manipulasi data.
   - **Aturan:** Tidak boleh tahu menahu soal UI (React). Menerima data dari Controller, memprosesnya, dan memanggil Repository.
4. **Repository/Data Layer (`/repositories`)**
   - **Tugas:** Berkomunikasi langsung dengan database (Firestore / API). Melakukan operasi CRUD (Create, Read, Update, Delete).
   - **Aturan:** Hanya berisi query atau pemanggilan API. Tidak ada logika bisnis di sini.
5. **[BARU] Cloud Functions Layer (`/functions`):** 
   - **Tugas:** Menjalankan operasi berat di *backend* (Integrasi Google Docs API, Google Drive API, Injeksi Tanda Tangan).
   - **Aturan:** Harus dipisahkan dari folder *frontend* (`src/`). Ditulis dalam Node.js, merespons *trigger* dari perubahan Firestore (contoh: `onDocumentUpdated`).

## 2. Struktur Direktori (Berdasarkan Fitur / Feature-Driven)
Kelompokkan file berdasarkan fitur agar mudah dicari, bukan berdasarkan layer murni.
```text
project-root/
 ├── functions/              (Backend - Cloud Functions)
 │    ├── src/
 │    │    └── pdf-generator/ (Logika Google Docs API)
 │    └── package.json
 └── src/                    (Frontend - React)
      └── features/
           └── letters/
               ├── letter.model.ts       (Skema/Tipe Data)
               ├── letter.repository.ts  (Query ke Firestore)
               ├── letter.service.ts     (Logika Penomoran/Persetujuan)
               ├── letter.controller.ts  (Hook/Logic State UI)
               └── LetterView.tsx        (Komponen React UI)
```

## 3. Konvensi Penamaan (Naming Conventions)

- **File dan Modul:** Gunakan *kebab-case* dengan suffix layer.
  - Benar: `letter.service.ts`, `auth.controller.ts`
  - Salah: `LetterService.ts`, `authController.ts`
- **Komponen UI (React) & Model/Class:** Gunakan *PascalCase*.
  - Benar: `LetterDashboard`, `CreateLetterForm`, `User`, `Letter`
  - Salah: `letterDashboard`, `createLetterForm`
- **Variabel, Fungsi, & Instance Objek:** Gunakan *camelCase*.
  - Benar: `letterService`, `getLetterById`, `submitDraft`
  - Salah: `LetterService`, `GetLetterById`, `submit_draft`

## 4. Contoh Alur (Dependency Rule)
Jika user menekan tombol "Buat Surat" di `LetterView.tsx`:
1. UI memanggil fungsi `submitLetter()` di `letter.controller.ts`.
2. Controller mengatur state *loading* lalu memanggil `letterService.createDraft(data)`.
3. Service mengecek kelengkapan data, lalu memanggil `letterRepository.saveToFirestore(data)`.
4. Hasilnya dikembalikan berantai ke atas hingga UI menampilkan pesan sukses.
