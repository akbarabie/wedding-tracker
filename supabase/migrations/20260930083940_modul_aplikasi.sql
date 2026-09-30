-- Migrasi 2: tabel modul aplikasi
-- Membuat tabel budget_categories, vendors, expenses, payments, receipts,
-- timeline_tasks, guests, dan reminders beserta RLS, trigger, dan hak akses.
--
-- Prinsip integritas multi tenant: setiap tabel anak memakai foreign key gabungan
-- (id, wedding_id). Dengan begitu satu baris tidak mungkin menunjuk baris milik
-- pernikahan lain, sekalipun pengguna menebak id-nya. Foreign key tidak tunduk pada
-- RLS, jadi pengaman ini harus ada di level skema.

-- Ambang reminder per pernikahan (PRD 6.6): standar 7 hari dan 1 hari sebelum deadline
alter table public.weddings
  add column ambang_reminder_hari smallint[] not null default '{7,1}'
  check (cardinality(ambang_reminder_hari) between 1 and 5 and 0 < all (ambang_reminder_hari));

grant update (ambang_reminder_hari) on public.weddings to authenticated;

-- Kategori budget. Cincin, seserahan, dan mahar ditandai di luar budget resepsi.
create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  nama text not null check (char_length(btrim(nama)) between 1 and 80),
  nilai_rencana numeric(14,2) not null default 0 check (nilai_rencana >= 0),
  di_luar_budget_resepsi boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  unique (wedding_id, nama)
);

-- Kandidat vendor dan venue
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  category_id uuid,
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  lokasi text,
  tipe_harga text not null default 'paket' check (tipe_harga in ('per_pax', 'paket')),
  harga numeric(14,2) check (harga >= 0),
  kapasitas integer check (kapasitas > 0),
  kontak text,
  catatan_survei text,
  status text not null default 'disurvei'
    check (status in ('disurvei', 'dihubungi', 'negosiasi', 'deal', 'ditolak')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint vendors_category_fk foreign key (category_id, wedding_id)
    references public.budget_categories (id, wedding_id) on delete set null (category_id)
);

-- Pengeluaran. Entri berstatus draf berasal dari ekstraksi nota dan belum masuk laporan.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  category_id uuid,
  vendor_id uuid,
  deskripsi text,
  nominal numeric(14,2) not null check (nominal > 0),
  tanggal date not null default current_date,
  status_pembayaran text not null default 'dp_terjadwal'
    check (status_pembayaran in ('dp_terjadwal', 'dicicil', 'lunas')),
  sumber text not null default 'manual' check (sumber in ('manual', 'ekstraksi_ai')),
  status_entri text not null default 'final' check (status_entri in ('draf', 'final')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint expenses_category_fk foreign key (category_id, wedding_id)
    references public.budget_categories (id, wedding_id),
  constraint expenses_vendor_fk foreign key (vendor_id, wedding_id)
    references public.vendors (id, wedding_id),
  -- Entri final wajib punya kategori dan vendor (PRD 6.1), draf boleh belum lengkap
  constraint expenses_final_wajib_lengkap check (
    status_entri = 'draf' or (category_id is not null and vendor_id is not null)
  )
);

-- Riwayat cicilan per pengeluaran. dibayar_pada kosong berarti belum dibayar.
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  expense_id uuid not null,
  label text not null default 'Cicilan' check (char_length(btrim(label)) between 1 and 60),
  nominal numeric(14,2) not null check (nominal > 0),
  jatuh_tempo date not null,
  dibayar_pada date,
  catatan text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint payments_expense_fk foreign key (expense_id, wedding_id)
    references public.expenses (id, wedding_id) on delete cascade
);

-- Nota belanja. Berkas gambar disimpan di storage privat, di sini hanya path-nya
-- (bukan URL publik), supaya akses selalu lewat signed URL berumur singkat.
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  expense_id uuid,
  path_gambar text not null check (char_length(path_gambar) between 1 and 500),
  status_proses text not null default 'menunggu'
    check (status_proses in ('menunggu', 'diproses', 'selesai', 'gagal')),
  hasil_ekstraksi jsonb,
  pesan_galat text,
  diunggah_oleh uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_expense_fk foreign key (expense_id, wedding_id)
    references public.expenses (id, wedding_id) on delete set null (expense_id)
);

-- Tugas timeline. Fase: 1 = 12 sampai 9 bulan, 2 = 8 sampai 6 bulan, 3 = 5 sampai 3 bulan,
-- 4 = 2 sampai 1 bulan, 5 = 2 minggu terakhir sampai hari H.
create table public.timeline_tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  judul text not null check (char_length(btrim(judul)) between 1 and 160),
  fase smallint not null check (fase between 1 and 5),
  deadline date,
  selesai boolean not null default false,
  selesai_pada timestamptz,
  penanggung_jawab uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, wedding_id),
  -- Penanggung jawab harus anggota pernikahan yang sama
  constraint timeline_tasks_pj_fk foreign key (wedding_id, penanggung_jawab)
    references public.wedding_members (wedding_id, user_id) on delete set null (penanggung_jawab)
);

-- Daftar tamu dan RSVP
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  kategori text not null default 'teman' check (kategori in ('keluarga', 'teman', 'kolega')),
  kontak text,
  status_rsvp text not null default 'belum_konfirmasi'
    check (status_rsvp in ('belum_konfirmasi', 'hadir', 'tidak_hadir', 'ragu')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Reminder, sekaligus berfungsi sebagai notifikasi in app.
-- Unik per (sumber, ambang) supaya pengecekan cron yang berulang tidak menggandakan reminder.
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  jenis text not null check (jenis in ('tugas', 'pembayaran')),
  task_id uuid,
  payment_id uuid,
  ambang_hari smallint not null check (ambang_hari >= 0),
  pesan text not null,
  waktu_kirim timestamptz not null default now(),
  email_terkirim_pada timestamptz,
  dibaca_pada timestamptz,
  created_at timestamptz not null default now(),
  constraint reminders_task_fk foreign key (task_id, wedding_id)
    references public.timeline_tasks (id, wedding_id) on delete cascade,
  constraint reminders_payment_fk foreign key (payment_id, wedding_id)
    references public.payments (id, wedding_id) on delete cascade,
  constraint reminders_satu_referensi check (
    (jenis = 'tugas' and task_id is not null and payment_id is null)
    or (jenis = 'pembayaran' and payment_id is not null and task_id is null)
  )
);

create unique index reminders_tugas_unik_idx
  on public.reminders (task_id, ambang_hari) where task_id is not null;
create unique index reminders_pembayaran_unik_idx
  on public.reminders (payment_id, ambang_hari) where payment_id is not null;

-- Indeks untuk pola kueri yang paling sering dipakai
create index vendors_wedding_category_idx on public.vendors (wedding_id, category_id);
create index expenses_wedding_category_idx on public.expenses (wedding_id, category_id);
create index expenses_vendor_idx on public.expenses (vendor_id);
create index payments_expense_idx on public.payments (expense_id);
create index payments_belum_dibayar_idx on public.payments (wedding_id, jatuh_tempo)
  where dibayar_pada is null;
create index receipts_wedding_status_idx on public.receipts (wedding_id, status_proses);
create index timeline_tasks_wedding_deadline_idx on public.timeline_tasks (wedding_id, deadline)
  where selesai = false;
create index guests_wedding_rsvp_idx on public.guests (wedding_id, status_rsvp);
create index reminders_wedding_belum_dibaca_idx on public.reminders (wedding_id)
  where dibaca_pada is null;

-- Trigger: cegah pemindahan baris antar pernikahan
create or replace function public.cegah_ubah_wedding_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.wedding_id is distinct from old.wedding_id then
    raise exception 'wedding_id tidak boleh diubah';
  end if;
  return new;
end;
$$;

-- Trigger: pasang pengaman wedding_id pada semua tabel modul,
-- dan updated_at otomatis pada tabel yang punya kolom itu
do $$
declare
  v_tabel text;
begin
  foreach v_tabel in array array[
    'budget_categories', 'vendors', 'expenses', 'payments',
    'receipts', 'timeline_tasks', 'guests', 'reminders'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.cegah_ubah_wedding_id()',
      v_tabel || '_cegah_ubah_wedding_id', v_tabel
    );
  end loop;

  foreach v_tabel in array array[
    'budget_categories', 'vendors', 'expenses', 'payments',
    'receipts', 'timeline_tasks', 'guests'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      v_tabel || '_set_updated_at', v_tabel
    );
  end loop;
end $$;

-- Trigger: hitung ulang status_pembayaran pengeluaran setiap kali cicilan berubah.
-- Status dihitung dari cicilan yang sudah dibayar, jadi tidak bisa salah diisi manual.
create or replace function public.hitung_status_pembayaran()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expense_id uuid := coalesce(new.expense_id, old.expense_id);
  v_nominal numeric;
  v_total_dibayar numeric;
begin
  select e.nominal into v_nominal from public.expenses e where e.id = v_expense_id;

  -- Pengeluaran sudah terhapus (penghapusan berantai), tidak ada yang perlu dihitung
  if v_nominal is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(p.nominal), 0) into v_total_dibayar
  from public.payments p
  where p.expense_id = v_expense_id and p.dibayar_pada is not null;

  update public.expenses
  set status_pembayaran = case
    when v_total_dibayar >= v_nominal then 'lunas'
    when v_total_dibayar > 0 then 'dicicil'
    else 'dp_terjadwal'
  end
  where id = v_expense_id;

  return coalesce(new, old);
end;
$$;

revoke all on function public.hitung_status_pembayaran() from public, anon, authenticated;

create trigger payments_hitung_status
  after insert or update or delete on public.payments
  for each row execute function public.hitung_status_pembayaran();

-- RLS: enam tabel dengan pola CRUD seragam, semua anggota pernikahan punya akses penuh
do $$
declare
  v_tabel text;
begin
  foreach v_tabel in array array[
    'budget_categories', 'vendors', 'expenses', 'payments', 'timeline_tasks', 'guests'
  ]
  loop
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

    execute format(
      'grant select, insert, update, delete on public.%I to authenticated', v_tabel
    );
  end loop;
end $$;

-- RLS receipts: pengguna hanya mengunggah dan melihat, hasil ekstraksi ditulis worker Go
alter table public.receipts enable row level security;

create policy receipts_select on public.receipts
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy receipts_insert on public.receipts
  for insert to authenticated
  with check (
    public.is_wedding_member(wedding_id)
    and diunggah_oleh = (select auth.uid())
  );

create policy receipts_delete on public.receipts
  for delete to authenticated
  using (public.is_wedding_member(wedding_id));

grant select, delete on public.receipts to authenticated;
grant insert (wedding_id, path_gambar) on public.receipts to authenticated;

-- RLS reminders: pengguna hanya membaca dan menandai sudah dibaca, pembuatnya worker Go
alter table public.reminders enable row level security;

create policy reminders_select on public.reminders
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy reminders_update on public.reminders
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));

grant select on public.reminders to authenticated;
grant update (dibaca_pada) on public.reminders to authenticated;

-- Hak penuh untuk service_role (worker Go memakai secret key)
grant all on
  public.budget_categories, public.vendors, public.expenses, public.payments,
  public.receipts, public.timeline_tasks, public.guests, public.reminders
to service_role;

-- Perbarui create_wedding: kategori budget bawaan langsung dibuat (PRD 6.1).
-- Tanda tangan fungsi tidak berubah, jadi hak eksekusi dari migrasi 1 tetap berlaku.
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

  return v_wedding_id;
end;
$$;