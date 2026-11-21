-- Migrasi 19: format nota diperluas menjadi JPG, PNG, WEBP, HEIC, dan PDF.
--
-- Dua tempat yang menentukan format dan keduanya harus seragam dengan kode Next.js:
-- 1. Fungsi id_pernikahan_dari_path, dipakai kebijakan Storage dan trigger receipts.
-- 2. Daftar MIME yang diizinkan pada bucket 'nota'.
-- Selain format ini, berkas ditolak di route unggah dan di database, jadi tidak
-- pernah masuk Storage maupun tabel receipts.

create or replace function public.id_pernikahan_dari_path(p_path text)
returns uuid
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|heic|pdf)$'
    then split_part(p_path, '/', 1)::uuid
    else null
  end;
$$;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf'
]
where id = 'nota';
