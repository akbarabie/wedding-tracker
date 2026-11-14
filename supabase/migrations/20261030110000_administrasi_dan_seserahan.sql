-- Migrasi 17: checklist administrasi nikah dan seserahan planner
--
-- Dua modul di luar PRD v1.0 yang disetujui pengguna untuk memperkuat aplikasi:
--   admin_documents  : checklist berkas pernikahan dengan status terpisah untuk
--                      calon pengantin pria (CPP) dan wanita (CPW).
--   seserahan_items  : daftar seserahan per kategori dengan status, vendor, tautan
--                      toko online, dan estimasi harga.
--
-- Keduanya memakai pola yang sama dengan tabel lain: wedding_id, RLS berdasarkan
-- keanggotaan pernikahan, dan pengaman agar wedding_id tidak bisa dipindah.
--
-- Template isi bawaan disediakan sebagai fungsi yang dipanggil pengguna (opt-in),
-- tidak otomatis saat pernikahan dibuat. Alasannya, isinya khas budaya dan agama
-- tertentu (urusan KUA, perlengkapan ibadah muslim), sedangkan aplikasi ini bisa dipakai
-- siapa saja. Pengguna memilih sendiri apakah mau memulai dari template.

-- ============================================================ admin_documents
create table public.admin_documents (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  judul text not null check (char_length(btrim(judul)) between 1 and 200),
  -- Untuk siapa dokumen ini berlaku. Kolom status pihak yang tidak berlaku dikunci false.
  berlaku_untuk text not null default 'keduanya'
    check (berlaku_untuk in ('keduanya', 'cpp', 'cpw')),
  selesai_cpp boolean not null default false,
  selesai_cpw boolean not null default false,
  catatan text check (catatan is null or char_length(catatan) <= 500),
  -- Urutan tampil. Dokumen buatan pengguna memakai nilai bawaan dan tampil di bawah template.
  urutan integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (berlaku_untuk <> 'cpw' or selesai_cpp = false),
  check (berlaku_untuk <> 'cpp' or selesai_cpw = false)
);

create index admin_documents_wedding_urutan_idx
  on public.admin_documents (wedding_id, urutan, created_at);

-- ============================================================ seserahan_items
create table public.seserahan_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  kategori text not null check (kategori in (
    'perlengkapan_ibadah', 'perhiasan', 'pakaian', 'perawatan_diri',
    'aksesoris_fashion', 'hobi_personal', 'perlengkapan_rumah', 'mahar'
  )),
  judul text not null check (char_length(btrim(judul)) between 1 and 160),
  status text not null default 'perlu_dibeli'
    check (status in ('perlu_dibeli', 'dipesan', 'selesai')),
  vendor text check (vendor is null or char_length(btrim(vendor)) between 1 and 120),
  -- Hanya http atau https, supaya tautan seperti javascript: tidak bisa tersimpan
  link_toko text check (
    link_toko is null
    or (char_length(link_toko) <= 2000 and link_toko ~* '^https?://')
  ),
  -- Kosong berarti harganya belum diketahui, berbeda dengan 0
  estimasi_harga numeric(14, 2) check (estimasi_harga is null or estimasi_harga >= 0),
  urutan integer not null default 1000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index seserahan_items_wedding_kategori_idx
  on public.seserahan_items (wedding_id, kategori, urutan, created_at);

-- ============================================================ trigger
-- Batas jumlah baris per pernikahan sebagai perlindungan dari penyalahgunaan.
-- Dipasang sebagai trigger insert. Insert massal dalam satu pernyataan ikut tertahan.
create or replace function public.jaga_batas_admin_documents()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.admin_documents d where d.wedding_id = new.wedding_id
  ) >= 100 then
    raise exception 'Satu pernikahan maksimal punya 100 dokumen administrasi';
  end if;
  return new;
end;
$$;

create or replace function public.jaga_batas_seserahan_items()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.seserahan_items s where s.wedding_id = new.wedding_id
  ) >= 300 then
    raise exception 'Satu pernikahan maksimal punya 300 item seserahan';
  end if;
  return new;
end;
$$;

revoke all on function public.jaga_batas_admin_documents() from public, anon, authenticated;
revoke all on function public.jaga_batas_seserahan_items() from public, anon, authenticated;

create trigger admin_documents_jaga_batas
  before insert on public.admin_documents
  for each row execute function public.jaga_batas_admin_documents();

create trigger seserahan_items_jaga_batas
  before insert on public.seserahan_items
  for each row execute function public.jaga_batas_seserahan_items();

do $$
declare
  v_tabel text;
begin
  foreach v_tabel in array array['admin_documents', 'seserahan_items']
  loop
    -- wedding_id tidak boleh dipindahkan ke pernikahan lain
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.cegah_ubah_wedding_id()',
      v_tabel || '_cegah_ubah_wedding_id', v_tabel
    );
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      v_tabel || '_set_updated_at', v_tabel
    );

    -- RLS: hanya anggota pernikahan yang boleh membaca dan menulis
    execute format('alter table public.%I enable row level security', v_tabel);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_wedding_member(wedding_id))',
      v_tabel || '_select', v_tabel
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.is_wedding_member(wedding_id))',
      v_tabel || '_insert', v_tabel
    );
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.is_wedding_member(wedding_id))
         with check (public.is_wedding_member(wedding_id))',
      v_tabel || '_update', v_tabel
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.is_wedding_member(wedding_id))',
      v_tabel || '_delete', v_tabel
    );

    execute format('revoke all on public.%I from public, anon', v_tabel);
    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', v_tabel
    );
  end loop;
end $$;

-- ============================================================ template
-- Template checklist administrasi. Idempoten berdasarkan judul: dokumen dengan judul
-- yang sudah ada dilewati, jadi aman dipanggil berulang. Mengembalikan jumlah yang ditambahkan.
create or replace function public.isi_template_administrasi(p_wedding_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jumlah integer;
begin
  -- security definer melewati RLS, jadi keanggotaan dicek manual di sini
  if not public.is_wedding_member(p_wedding_id) then
    raise exception 'Pernikahan tidak ditemukan';
  end if;

  insert into public.admin_documents (wedding_id, judul, berlaku_untuk, urutan)
  select p_wedding_id, t.judul, t.berlaku_untuk, t.urutan
  from (values
    (1,  'Surat Pengantar dari RT/RW', 'keduanya'),
    (2,  'Fotocopy KTP', 'keduanya'),
    (3,  'Fotocopy KK', 'keduanya'),
    (4,  'Fotocopy Akta Kelahiran', 'keduanya'),
    (5,  'Fotocopy Ijazah Terakhir', 'keduanya'),
    (6,  'Surat Keterangan Menikah (Formulir N1)', 'keduanya'),
    (7,  'Surat Keterangan Asal Usul Mempelai (Formulir N2)', 'keduanya'),
    (8,  'Surat Pernyataan Persetujuan Mempelai (Formulir N3)', 'keduanya'),
    (9,  'Surat Persetujuan Mempelai (Formulir N4)', 'keduanya'),
    (10, 'Surat Pernyataan tentang Orang Tua (Formulir N5)', 'keduanya'),
    (11, 'Fotocopy KTP Orang Tua / Wali Nikah', 'keduanya'),
    (12, 'Fotocopy Kutipan Akta Nikah Orang Tua (khusus CPW)', 'cpw'),
    (13, 'Fotocopy KTP 2 Orang Saksi Nikah', 'keduanya'),
    (14, 'Surat Keterangan / Sertifikat Layak Kawin dan Vaksin TT', 'keduanya'),
    (15, 'Surat Keterangan Belum Kawin dari Desa / Kelurahan', 'keduanya'),
    (16, 'Pas Foto Background Biru 2x3 (5 lembar)', 'keduanya'),
    (17, 'Pas Foto Background Biru 3x4 (5 lembar)', 'keduanya'),
    (18, 'Pas Foto Background Biru 4x6 (2 lembar)', 'keduanya'),
    (19, 'Jenis dan Besaran Mas Kawin / Mahar', 'cpp'),
    (20, 'Bukti Pendaftaran SIMKAH Online / Pendaftaran KUA', 'keduanya'),
    (21, 'Sertifikat Bimbingan Pra-Nikah KUA', 'keduanya')
  ) as t(urutan, judul, berlaku_untuk)
  where not exists (
    select 1
    from public.admin_documents x
    where x.wedding_id = p_wedding_id and x.judul = t.judul
  );

  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

-- Template seserahan. Idempoten berdasarkan pasangan kategori dan judul.
create or replace function public.isi_template_seserahan(p_wedding_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jumlah integer;
begin
  if not public.is_wedding_member(p_wedding_id) then
    raise exception 'Pernikahan tidak ditemukan';
  end if;

  insert into public.seserahan_items (wedding_id, kategori, judul, urutan)
  select p_wedding_id, t.kategori, t.judul, t.urutan
  from (values
    -- Perlengkapan ibadah
    (1,  'perlengkapan_ibadah', 'Al-Qur''an'),
    (2,  'perlengkapan_ibadah', 'Mukenah'),
    (3,  'perlengkapan_ibadah', 'Sajadah'),
    (4,  'perlengkapan_ibadah', 'Tasbih'),
    (5,  'perlengkapan_ibadah', 'Buku Doa / Saku'),
    -- Perhiasan
    (6,  'perhiasan', 'Cincin'),
    (7,  'perhiasan', 'Kalung'),
    (8,  'perhiasan', 'Gelang'),
    (9,  'perhiasan', 'Anting'),
    -- Pakaian
    (10, 'pakaian', 'Dress / Gaun'),
    (11, 'pakaian', 'Kain Batik / Bahan'),
    (12, 'pakaian', 'Lingerie'),
    (13, 'pakaian', 'Piyama / Baju Tidur'),
    (14, 'pakaian', 'Jilbab / Hijab'),
    (15, 'pakaian', 'Set Underwear'),
    -- Bodycare, skincare, dan perawatan diri
    (16, 'perawatan_diri', 'Deodorant'),
    (17, 'perawatan_diri', 'Parfum'),
    (18, 'perawatan_diri', 'Handuk Besar'),
    (19, 'perawatan_diri', 'Hairdryer'),
    (20, 'perawatan_diri', 'Hairserum / Haircare'),
    -- Aksesoris dan fashion
    (21, 'aksesoris_fashion', 'Tas'),
    (22, 'aksesoris_fashion', 'Sandal'),
    (23, 'aksesoris_fashion', 'Flatshoes / Heels'),
    (24, 'aksesoris_fashion', 'Dompet'),
    (25, 'aksesoris_fashion', 'Jam Tangan'),
    -- Hobi dan personal
    (26, 'hobi_personal', 'Buku Bacaan'),
    (27, 'hobi_personal', 'Notebook / Journal'),
    -- Perlengkapan rumah dan tambahan
    (28, 'perlengkapan_rumah', 'Box / Jasa Hias Seserahan'),
    (29, 'perlengkapan_rumah', 'Bed Cover Set'),
    (30, 'perlengkapan_rumah', 'Setrika'),
    -- Mahar
    (31, 'mahar', 'Mahar Uang (Frame / Cash)'),
    (32, 'mahar', 'Emas / Logam Mulia')
  ) as t(urutan, kategori, judul)
  where not exists (
    select 1
    from public.seserahan_items x
    where x.wedding_id = p_wedding_id and x.kategori = t.kategori and x.judul = t.judul
  );

  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

revoke all on function public.isi_template_administrasi(uuid) from public, anon;
revoke all on function public.isi_template_seserahan(uuid) from public, anon;
grant execute on function public.isi_template_administrasi(uuid) to authenticated, service_role;
grant execute on function public.isi_template_seserahan(uuid) to authenticated, service_role;
