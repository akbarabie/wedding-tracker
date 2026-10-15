-- Migrasi 4: pengecekan status email untuk alur daftar dan lupa kata sandi
-- Mengembalikan salah satu dari tiga nilai:
--   'tidak_ada'         email belum pernah didaftarkan
--   'belum_verifikasi'  email terdaftar tetapi tautan verifikasinya belum dipakai
--   'terverifikasi'     email terdaftar dan sudah diverifikasi
--
-- Fungsi ini membaca auth.users, sehingga hanya boleh dipanggil dari server
-- dengan secret key (service_role). Pengguna biasa dan anon sengaja tidak diberi
-- akses, supaya orang tidak bisa menebak daftar email lewat API publik.
create or replace function public.status_email(p_email text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when u.id is null then 'tidak_ada'
    when u.email_confirmed_at is null then 'belum_verifikasi'
    else 'terverifikasi'
  end
  from (select 1) as dasar
  left join auth.users u on lower(u.email) = lower(btrim(p_email))
  limit 1;
$$;

revoke all on function public.status_email(text) from public, anon, authenticated;
grant execute on function public.status_email(text) to service_role;
