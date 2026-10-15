-- Migrasi 5: mengambil id akun yang emailnya belum diverifikasi
-- Dipakai alur daftar untuk menghapus akun lama yang belum terverifikasi,
-- supaya kata sandi dari pendaftar sebelumnya (yang mungkin bukan pemilik email)
-- tidak pernah ikut aktif saat pemilik email asli menekan tautan verifikasi.
--
-- Hanya mengembalikan id bila email_confirmed_at masih kosong. Akun yang sudah
-- terverifikasi tidak akan pernah muncul dari fungsi ini, jadi tidak mungkin
-- terhapus lewat jalur ini. Hanya service_role yang boleh memanggil.
create or replace function public.id_akun_belum_verifikasi(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(btrim(p_email))
    and u.email_confirmed_at is null
  limit 1;
$$;

revoke all on function public.id_akun_belum_verifikasi(text) from public, anon, authenticated;
grant execute on function public.id_akun_belum_verifikasi(text) to service_role;