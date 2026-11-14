-- Migrasi 16: kategori tamu yang lebih rinci, pihak (CPP atau CPW), dan jenis undangan
--
-- Kategori lama (keluarga, teman, kolega) terlalu kasar untuk perencanaan nyata.
-- Struktur baru ada tiga lapis:
--   kategori     : 7 kelompok besar (kolom guests.kategori yang sudah ada)
--   sub_kategori : 25 jenis relasi yang rinci, misalnya "keluarga_inti"
--   pihak        : cpp (calon pengantin pria), cpw (wanita), atau bersama
-- Pihak dipisah dari sub_kategori supaya satu sub-kategori tidak perlu ditulis dua kali
-- untuk tiap pihak, dan supaya jumlah tamu per pihak bisa dihitung langsung.
-- Jenis undangan (cetak, digital, atau keduanya) dicatat per tamu karena menentukan
-- berapa lembar yang perlu dicetak.
--
-- Daftar sub-kategori disimpan di tabel referensi dengan foreign key komposit, sehingga
-- sub-kategori yang tidak cocok dengan kategorinya ditolak oleh database sendiri.
--
-- Data lama aman: tamu yang sudah ada tetap valid dengan sub_kategori, pihak, dan
-- jenis_undangan kosong, ditampilkan sebagai "belum dirinci" sampai pengguna melengkapinya.

-- Tabel referensi sub-kategori. Isinya sama untuk semua pernikahan dan hanya bisa dibaca.
create table public.ref_sub_kategori_tamu (
  kategori text not null,
  sub_kategori text not null,
  -- Pihak yang boleh dipilih untuk sub-kategori ini
  pihak_diizinkan text[] not null
    check (pihak_diizinkan <@ array['cpp', 'cpw', 'bersama'] and cardinality(pihak_diizinkan) >= 1),
  urutan smallint not null,
  primary key (kategori, sub_kategori)
);

alter table public.ref_sub_kategori_tamu enable row level security;

create policy ref_sub_kategori_tamu_select on public.ref_sub_kategori_tamu
  for select to authenticated
  using (true);

revoke all on public.ref_sub_kategori_tamu from public, anon, authenticated;
grant select on public.ref_sub_kategori_tamu to authenticated, service_role;

insert into public.ref_sub_kategori_tamu (kategori, sub_kategori, pihak_diizinkan, urutan) values
  -- Keluarga
  ('keluarga', 'keluarga_inti',        array['cpp', 'cpw'], 1),
  ('keluarga', 'kakek_nenek',          array['cpp', 'cpw'], 2),
  ('keluarga', 'paman_bibi',           array['cpp', 'cpw'], 3),
  ('keluarga', 'sepupu',               array['cpp', 'cpw'], 4),
  ('keluarga', 'keponakan',            array['cpp', 'cpw'], 5),
  ('keluarga', 'ipar',                 array['cpp', 'cpw'], 6),
  -- Saudara dan kerabat
  ('saudara_kerabat', 'kerabat_marga', array['cpp', 'cpw'], 1),
  ('saudara_kerabat', 'kerabat_jauh',  array['cpp', 'cpw'], 2),
  -- Teman dan sahabat
  ('teman_sahabat', 'sahabat_karib',       array['cpp', 'cpw'], 1),
  ('teman_sahabat', 'teman_masa_kecil',    array['cpp', 'cpw'], 2),
  ('teman_sahabat', 'teman_sekolah',       array['cpp', 'cpw'], 3),
  ('teman_sahabat', 'pendamping',          array['cpp', 'cpw'], 4),
  ('teman_sahabat', 'komunitas_hobi',      array['cpp', 'cpw'], 5),
  ('teman_sahabat', 'komunitas_keagamaan', array['cpp', 'cpw'], 6),
  -- Kolega dan profesional
  ('kolega_profesional', 'rekan_kerja',        array['cpp', 'cpw'], 1),
  ('kolega_profesional', 'klien_partner',      array['cpp', 'cpw'], 2),
  ('kolega_profesional', 'relasi_organisasi',  array['cpp', 'cpw'], 3),
  -- Tetangga
  ('tetangga', 'tetangga_domisili', array['cpp', 'cpw'], 1),
  -- Tamu VIP dan khusus
  ('vip_khusus', 'pimpinan_atasan',   array['cpp', 'cpw'], 1),
  ('vip_khusus', 'tokoh_pejabat',     array['cpp', 'cpw'], 2),
  ('vip_khusus', 'tokoh_agama',       array['cpp', 'cpw'], 3),
  ('vip_khusus', 'guru_dosen_mentor', array['cpp', 'cpw'], 4),
  ('vip_khusus', 'vendor_utama',      array['bersama'], 5),
  ('vip_khusus', 'panitia_petugas',   array['bersama'], 6),
  -- Lainnya
  ('lainnya', 'lainnya', array['cpp', 'cpw', 'bersama'], 1);

-- Perluas kolom kategori. Constraint lama dilepas dulu karena nilai lama harus dipetakan.
alter table public.guests drop constraint guests_kategori_check;

update public.guests
set kategori = case kategori
  when 'teman' then 'teman_sahabat'
  when 'kolega' then 'kolega_profesional'
  else kategori
end;

alter table public.guests
  add constraint guests_kategori_check check (kategori in (
    'keluarga', 'saudara_kerabat', 'teman_sahabat', 'kolega_profesional',
    'tetangga', 'vip_khusus', 'lainnya'
  ));

-- Nilai bawaan lama ('teman') tidak berlaku lagi
alter table public.guests alter column kategori set default 'lainnya';

alter table public.guests
  add column sub_kategori text,
  add column pihak text check (pihak in ('cpp', 'cpw', 'bersama')),
  add column jenis_undangan text check (jenis_undangan in ('cetak', 'digital', 'cetak_digital'));

-- Foreign key komposit. Bila sub_kategori kosong (tamu lama), pemeriksaan dilewati.
alter table public.guests
  add constraint guests_sub_kategori_fkey
  foreign key (kategori, sub_kategori)
  references public.ref_sub_kategori_tamu (kategori, sub_kategori);

-- Pihak harus sesuai dengan sub-kategori. Dipasang sebagai trigger karena aturannya
-- bergantung pada isi tabel referensi, yang tidak bisa dibaca dari CHECK.
create or replace function public.jaga_kategori_tamu()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_diizinkan text[];
begin
  if new.sub_kategori is null then
    -- Tamu yang belum dirinci tidak boleh punya pihak, supaya datanya konsisten
    if new.pihak is not null then
      raise exception 'Pihak hanya boleh diisi bersama sub-kategori';
    end if;
    return new;
  end if;

  select r.pihak_diizinkan into v_diizinkan
  from public.ref_sub_kategori_tamu r
  where r.kategori = new.kategori and r.sub_kategori = new.sub_kategori;

  if new.pihak is null or not (new.pihak = any (v_diizinkan)) then
    raise exception 'Pihak tidak sesuai dengan sub-kategori tamu ini';
  end if;

  return new;
end;
$$;

revoke all on function public.jaga_kategori_tamu() from public, anon, authenticated;

create trigger guests_jaga_kategori
  before insert or update on public.guests
  for each row execute function public.jaga_kategori_tamu();

-- Indeks untuk filter dan ringkasan per pihak dan jenis undangan
create index guests_wedding_pihak_idx on public.guests (wedding_id, pihak);

-- Ringkasan undangan per pihak dan jenis undangan. Dipakai halaman Tamu untuk kuota per pihak
-- dan jumlah undangan cetak yang perlu dibuat. Paling banyak 16 baris per pernikahan.
create view public.ringkasan_undangan_tamu
with (security_invoker = true) as
select
  wedding_id,
  pihak,
  jenis_undangan,
  count(*) as jumlah_undangan,
  sum(jumlah_orang) as jumlah_orang
from public.guests
group by wedding_id, pihak, jenis_undangan;

revoke all on public.ringkasan_undangan_tamu from public, anon, authenticated;
grant select on public.ringkasan_undangan_tamu to authenticated, service_role;
