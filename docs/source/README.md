# Dokumen Sumber (Arsip)

Folder ini berisi dokumen desain awal yang menjadi bahan baku `requirement.md`, `design.md`, dan seluruh steering file di `.kiro/steering/`:
- `prd.md` — PRD MVP asli (target Firebase)
- `roadmap.md` — roadmap migrasi MVP → Enterprise
- `schema.md` — skema Firestore asli
- `wireframe.md` — outline UI/wireframe
- `architecture_rules.md` — aturan layered architecture & penamaan
- `commit_rules.md` — konvensi Conventional Commits

**Status: arsip/rujukan, bukan konteks aktif Kiro.** Isinya sudah didistilasi ke dalam `.kiro/specs/manajemen-surat/` dan `.kiro/steering/` — Kiro tidak membaca folder ini secara otomatis. Buka berkas di sini hanya bila perlu mengecek detail asli yang mungkin tidak sepenuhnya terbawa ke versi ringkas (mis. field Firestore asli di `schema.md`, atau tata letak wireframe lengkap).

Jika suatu saat perlu berkas ini otomatis termuat sebagai konteks Kiro, salin isinya ke `.kiro/steering/` dengan front matter `inclusion` yang sesuai, atau rujuk dari steering file lain lewat sintaks `#[[file:docs/source/nama-berkas.md]]`.
