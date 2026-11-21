-- Migrasi 18: bucket Storage privat untuk foto nota, kebijakan akses per pernikahan,
-- dan batas unggahan.
--
-- Aturan penamaan berkas: <id_pernikahan>/<uuid_acak>.<jpg|png|webp>
-- Folder pertama adalah id pernikahan, dan kebijakan akses membacanya dari path itu.
-- Bucket bersifat privat, jadi gambar hanya bisa dibuka lewat signed URL berumur singkat.

-- ============================================================ fungsi pembantu
-- Mengambil id pernikahan dari path berkas. Mengembalikan null bila path tidak
-- sesuai format baku, sehingga path aneh (misalnya "../" atau folder bukan uuid)
-- otomatis ditolak oleh kebijakan tanpa memicu galat konversi uuid.
create or replace function public.id_pernikahan_dari_path(p_path text)
returns uuid
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    then split_part(p_path, '/', 1)::uuid
    else null
  end;
$$;

-- Dipanggil dari kebijakan RLS atas nama pengguna login, jadi perlu hak eksekusi
revoke all on function public.id_pernikahan_dari_path(text) from public, anon;
grant execute on function public.id_pernikahan_dari_path(text) to authenticated, service_role;

-- ============================================================ bucket
-- Batas 4 MB mengikuti batas body request di Vercel (4,5 MB). Foto dikecilkan di
-- browser sebelum diunggah, jadi ukuran nyata biasanya di bawah 1 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nota',
  'nota',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================ kebijakan akses
-- Anggota pernikahan boleh melihat, mengunggah, dan menghapus berkas di folder
-- pernikahannya sendiri. Tidak ada kebijakan update, jadi berkas tidak bisa ditimpa.
-- Worker Go memakai service_role yang melewati RLS, jadi tidak butuh kebijakan.
create policy nota_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'nota'
    and public.is_wedding_member(public.id_pernikahan_dari_path(name))
  );

create policy nota_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'nota'
    and public.is_wedding_member(public.id_pernikahan_dari_path(name))
  );

create policy nota_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'nota'
    and public.is_wedding_member(public.id_pernikahan_dari_path(name))
  );

-- ============================================================ trigger unggahan nota
-- Dua tujuan. Pertama, path gambar pada baris receipts wajib berada di folder
-- pernikahan yang sama. Tanpa ini, anggota satu pernikahan bisa menulis path milik
-- pernikahan lain, lalu worker (yang memakai service_role dan melewati RLS) akan
-- membaca gambar orang lain dan memasukkan hasilnya ke data si penyerang.
-- Kedua, batas penggunaan supaya kuota gratis Storage dan Gemini tidak habis
-- oleh satu pernikahan: 300 nota total dan 30 unggahan per 24 jam.
create or replace function public.jaga_unggahan_nota()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_total integer;
  v_24_jam integer;
begin
  if public.id_pernikahan_dari_path(new.path_gambar) is distinct from new.wedding_id then
    raise exception 'Lokasi berkas nota tidak sesuai dengan pernikahan ini';
  end if;

  select
    count(*),
    count(*) filter (where r.created_at > now() - interval '24 hours')
  into v_total, v_24_jam
  from public.receipts r
  where r.wedding_id = new.wedding_id;

  if v_total >= 300 then
    raise exception 'Satu pernikahan maksimal punya 300 nota. Hapus nota lama yang sudah tidak diperlukan';
  end if;

  if v_24_jam >= 30 then
    raise exception 'Batas 30 unggahan nota dalam 24 jam sudah tercapai. Coba lagi besok';
  end if;

  return new;
end;
$$;

revoke all on function public.jaga_unggahan_nota() from public, anon, authenticated;

create trigger receipts_jaga_unggahan
  before insert on public.receipts
  for each row execute function public.jaga_unggahan_nota();
