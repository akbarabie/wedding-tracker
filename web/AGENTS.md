<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

## Konvensi proyek Wedding Tracker

- Komentar kode, pesan log, dan teks antarmuka memakai bahasa Indonesia.
- Tanpa emoji di kode maupun komentar.
- Akses data hanya lewat klien Supabase dengan sesi pengguna (lib/supabase/server.ts atau client.ts) agar RLS berlaku. Secret key dilarang dipakai di folder web.
- Pelindung halaman dan data memakai getClaims, bukan getSession.
- Semua input pengguna divalidasi dengan Zod sebelum menyentuh database.
- Perubahan skema hanya lewat berkas migrasi di supabase/migrations.

<!-- END:nextjs-agent-rules -->
