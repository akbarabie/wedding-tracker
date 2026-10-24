-- Migrasi 15: template tugas timeline bawaan
--
-- Timeline yang kosong kurang menolong pengguna baru, jadi pernikahan baru langsung
-- diisi daftar tugas standar per fase (PRD 6.3), seperti kategori budget bawaan.
-- Daftar tugas hanya ditulis di satu tempat, yaitu fungsi isi_template_tugas, supaya
-- pembuatan pernikahan baru dan tombol "tambahkan template" untuk pernikahan yang sudah
-- ada memakai isi yang sama.
--
-- Tugas template sengaja dibuat tanpa deadline. Hari H bisa saja belum diisi, dan
-- deadline yang dihitung otomatis dari fase akan membuat banyak tugas langsung tampil
-- terlambat bila persiapan sudah berjalan. Pengguna menetapkan deadline sendiri.

-- Mengisi tugas template untuk satu pernikahan dan mengembalikan jumlah yang ditambahkan.
-- Idempoten berdasarkan judul: tugas dengan judul yang sudah ada dilewati, sehingga
-- aman dipanggil berulang kali. Konsekuensinya, tugas template yang judulnya sudah
-- diubah pengguna akan ditambahkan lagi dengan judul aslinya.
create or replace function public.isi_template_tugas(p_wedding_id uuid)
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

  -- created_at digeser per urutan template supaya urutan tampil di dalam satu fase
  -- tetap sesuai daftar, karena semua baris dalam satu pernyataan punya now() yang sama
  insert into public.timeline_tasks (wedding_id, judul, fase, created_at)
  select
    p_wedding_id,
    t.judul,
    t.fase,
    now() + (t.urutan * interval '1 microsecond')
  from (values
    -- Fase 1: 12 sampai 9 bulan sebelum hari H
    (1,  1, 'Diskusikan konsep, tema, dan perkiraan jumlah tamu bersama pasangan'),
    (2,  1, 'Tetapkan budget total resepsi dan pembagiannya per kategori'),
    (3,  1, 'Bicarakan pembagian biaya dan hal teknis dengan kedua keluarga'),
    (4,  1, 'Survei dan bandingkan kandidat venue'),
    (5,  1, 'Pilih venue, booking tanggal, dan bayar DP'),
    -- Fase 2: 8 sampai 6 bulan sebelum hari H
    (6,  2, 'Pilih dan booking vendor catering'),
    (7,  2, 'Pilih dan booking vendor dokumentasi (foto dan video)'),
    (8,  2, 'Pilih dan booking vendor rias dan busana pengantin'),
    (9,  2, 'Pilih dan booking vendor dekorasi'),
    (10, 2, 'Pilih MC dan hiburan'),
    (11, 2, 'Susun daftar tamu awal dari kedua keluarga'),
    (12, 2, 'Cari tahu persyaratan berkas administrasi pernikahan'),
    -- Fase 3: 5 sampai 3 bulan sebelum hari H
    (13, 3, 'Urus berkas administrasi pernikahan di kelurahan dan KUA atau catatan sipil'),
    (14, 3, 'Siapkan cincin, seserahan, dan mahar'),
    (15, 3, 'Desain dan pesan undangan serta souvenir'),
    (16, 3, 'Ikuti tes menu catering'),
    (17, 3, 'Fitting pertama busana pengantin dan busana keluarga'),
    (18, 3, 'Ikuti bimbingan pra nikah bila diwajibkan'),
    (19, 3, 'Pastikan semua DP vendor sudah dibayar sesuai jadwal'),
    -- Fase 4: 2 bulan sampai 1 bulan sebelum hari H
    (20, 4, 'Sebarkan undangan dan mulai catat konfirmasi kehadiran'),
    (21, 4, 'Lakukan fitting akhir dan sesuaikan ukuran busana'),
    (22, 4, 'Jadwalkan trial make up'),
    (23, 4, 'Susun rundown acara bersama MC dan vendor'),
    (24, 4, 'Kabari catering dan venue soal perkiraan jumlah tamu'),
    (25, 4, 'Tentukan petugas penerima tamu dan pengatur acara dari keluarga'),
    -- Fase 5: 2 minggu terakhir sampai hari H
    (26, 5, 'Hubungi tamu yang belum mengonfirmasi kehadiran'),
    (27, 5, 'Berikan jumlah porsi final ke catering'),
    (28, 5, 'Lunasi pembayaran vendor sesuai jadwal pelunasan'),
    (29, 5, 'Konfirmasi ulang jadwal dan lokasi dengan semua vendor'),
    (30, 5, 'Bagikan rundown final ke keluarga, panitia, dan vendor'),
    (31, 5, 'Siapkan perlengkapan hari H: cincin, mahar, berkas, dan amplop'),
    (32, 5, 'Pastikan dana darurat siap dan istirahat cukup')
  ) as t(urutan, fase, judul)
  where not exists (
    select 1
    from public.timeline_tasks x
    where x.wedding_id = p_wedding_id and x.judul = t.judul
  );

  get diagnostics v_jumlah = row_count;
  return v_jumlah;
end;
$$;

-- Hanya pengguna login yang boleh memanggil. Anggota dicek di dalam fungsi.
revoke all on function public.isi_template_tugas(uuid) from public, anon;
grant execute on function public.isi_template_tugas(uuid) to authenticated, service_role;

-- Perbarui create_wedding: tugas template ikut dibuat (PRD 6.3).
-- Tanda tangan fungsi tidak berubah, jadi hak eksekusi dari migrasi sebelumnya tetap berlaku.
-- Isinya sama dengan versi migrasi 2 ditambah satu pemanggilan di akhir.
create or replace function public.create_wedding(
  p_nama_pasangan text,
  p_tanggal_hari_h date default null,
  p_budget_total_resepsi numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_wedding_id uuid;
begin
  if v_user_id is null then
    raise exception 'Pengguna belum login';
  end if;

  insert into public.weddings (nama_pasangan, tanggal_hari_h, budget_total_resepsi, created_by)
  values (p_nama_pasangan, p_tanggal_hari_h, p_budget_total_resepsi, v_user_id)
  returning id into v_wedding_id;

  insert into public.wedding_members (wedding_id, user_id, peran)
  values (v_wedding_id, v_user_id, 'owner');

  insert into public.budget_categories (wedding_id, nama, di_luar_budget_resepsi) values
    (v_wedding_id, 'Venue dan Catering', false),
    (v_wedding_id, 'Dekorasi', false),
    (v_wedding_id, 'Rias dan Busana', false),
    (v_wedding_id, 'Dokumentasi', false),
    (v_wedding_id, 'MC dan Hiburan', false),
    (v_wedding_id, 'Undangan dan Souvenir', false),
    (v_wedding_id, 'Dana Darurat', false),
    (v_wedding_id, 'Cincin', true),
    (v_wedding_id, 'Seserahan', true),
    (v_wedding_id, 'Mahar', true);

  perform public.isi_template_tugas(v_wedding_id);

  return v_wedding_id;
end;
$$;
