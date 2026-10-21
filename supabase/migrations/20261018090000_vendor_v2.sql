-- Migrasi 11: Vendor v2, model harga fleksibel dan biaya tambahan
-- Hampir semua vendor menetapkan harga dengan pola yang sama: harga dasar yang mencakup
-- sejumlah unit, ditambah tarif per unit tambahan, ditambah biaya lain, ditambah pajak.
-- Harga per pax dan harga paket hanyalah dua kasus khusus dari pola itu. Migrasi ini:
-- 1) menambah kolom model harga pada vendors lalu mengonversi data lama,
-- 2) menghapus kolom lama (tipe_harga, harga, kapasitas) dan aturan paket wajib pax,
-- 3) menambah tabel vendor_biaya untuk biaya tambahan wajib dan opsional.

-- 1) Kolom model harga
--    cara_hitung: tetap (satu harga), per_satuan (tarif x jumlah), paket_tambahan (paket + tambahan per satuan)
--    satuan: apa yang dihitung, tamu (pax), jam, orang, atau buah
alter table public.vendors
  add column cara_hitung text not null default 'tetap'
    check (cara_hitung in ('tetap', 'per_satuan', 'paket_tambahan')),
  add column satuan text
    check (satuan in ('tamu', 'jam', 'orang', 'buah')),
  add column harga_dasar numeric(14,2) check (harga_dasar >= 0),
  add column jumlah_termasuk integer check (jumlah_termasuk > 0),
  add column tarif_per_satuan numeric(14,2) check (tarif_per_satuan >= 0),
  add column minimum_unit integer check (minimum_unit > 0),
  add column maksimum_unit integer check (maksimum_unit > 0),
  add column pajak_persen integer not null default 0
    check (pajak_persen between 0 and 100),
  add column pajak_termasuk boolean not null default true;

-- Konversi data lama. Paket menjadi harga tetap dengan batas maksimal bila punya kapasitas.
-- Per pax yang sudah berharga menjadi tarif per tamu. Vendor tanpa harga (misalnya vendor
-- cepat dari form pengeluaran) menjadi harga tetap yang belum diisi. Kapasitas pada vendor
-- per pax sudah diputuskan tidak berlaku, jadi tidak dibawa.
update public.vendors
set
  cara_hitung = case
    when tipe_harga = 'per_pax' and harga is not null then 'per_satuan'
    else 'tetap'
  end,
  satuan = case
    when tipe_harga = 'per_pax' and harga is not null then 'tamu'
    when tipe_harga = 'paket' and kapasitas is not null then 'tamu'
    else null
  end,
  harga_dasar = case when tipe_harga = 'paket' then harga else null end,
  tarif_per_satuan = case when tipe_harga = 'per_pax' then harga else null end,
  maksimum_unit = case when tipe_harga = 'paket' then kapasitas else null end;

-- Aturan keterkaitan antar kolom, dipasang setelah data lama rapi
alter table public.vendors
  add constraint vendors_cara_hitung_konsisten check (
    (cara_hitung = 'tetap'
       and jumlah_termasuk is null and tarif_per_satuan is null and minimum_unit is null)
    or (cara_hitung = 'per_satuan'
       and satuan is not null and harga_dasar is null and jumlah_termasuk is null)
    or (cara_hitung = 'paket_tambahan'
       and satuan is not null and jumlah_termasuk is not null and minimum_unit is null)
  ),
  add constraint vendors_batas_butuh_satuan check (
    (minimum_unit is null and maksimum_unit is null) or satuan is not null
  ),
  add constraint vendors_minimum_maksimum check (
    minimum_unit is null or maksimum_unit is null or minimum_unit <= maksimum_unit
  ),
  add constraint vendors_termasuk_maksimum check (
    jumlah_termasuk is null or maksimum_unit is null or jumlah_termasuk <= maksimum_unit
  );

-- 2) Vendor cepat dari form pengeluaran: belum punya harga, jadi harga tetap yang kosong
create or replace function public.buat_pengeluaran(
  p_wedding_id uuid,
  p_category_id uuid,
  p_vendor_id uuid,
  p_vendor_baru text,
  p_deskripsi text,
  p_nominal numeric,
  p_tanggal date
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_vendor_id uuid := p_vendor_id;
  v_expense_id uuid;
begin
  if v_vendor_id is null then
    if p_vendor_baru is null or char_length(btrim(p_vendor_baru)) = 0 then
      raise exception 'Vendor wajib dipilih atau diisi';
    end if;

    -- Pengeluaran berarti sudah ada kesepakatan, jadi vendor baru berstatus deal
    insert into public.vendors (wedding_id, category_id, nama, cara_hitung, status)
    values (p_wedding_id, p_category_id, btrim(p_vendor_baru), 'tetap', 'deal')
    returning id into v_vendor_id;
  end if;

  insert into public.expenses (
    wedding_id, category_id, vendor_id, deskripsi, nominal, tanggal
  )
  values (
    p_wedding_id, p_category_id, v_vendor_id, p_deskripsi, p_nominal, p_tanggal
  )
  returning id into v_expense_id;

  return v_expense_id;
end;
$$;

-- Aturan paket wajib pax maksimal digantikan model baru. Kolom lama dihapus.
drop trigger if exists vendors_wajib_pax_paket on public.vendors;
drop function if exists public.wajibkan_pax_paket();

alter table public.vendors
  drop column tipe_harga,
  drop column harga,
  drop column kapasitas;

-- 3) Biaya tambahan vendor, misalnya listrik, charge luar kota, atau sewa busana.
--    Biaya wajib selalu masuk total perbandingan, biaya opsional hanya ditampilkan.
--    nominal adalah harga satu kali, jumlah adalah banyaknya (misalnya 2 pramusaji).
create table public.vendor_biaya (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  vendor_id uuid not null,
  nama text not null check (char_length(btrim(nama)) between 1 and 120),
  nominal numeric(14,2) not null check (nominal > 0),
  jumlah integer not null default 1 check (jumlah between 1 and 999),
  satuan_label text
    check (satuan_label is null or char_length(btrim(satuan_label)) between 1 and 30),
  wajib boolean not null default false,
  created_at timestamptz not null default now(),
  unique (id, wedding_id),
  constraint vendor_biaya_vendor_fk foreign key (vendor_id, wedding_id)
    references public.vendors (id, wedding_id) on delete cascade
);

create index vendor_biaya_vendor_idx on public.vendor_biaya (vendor_id);

create trigger vendor_biaya_cegah_ubah_wedding_id
  before update on public.vendor_biaya
  for each row execute function public.cegah_ubah_wedding_id();

-- Batas jumlah baris per vendor, supaya satu vendor tidak bisa dipenuhi baris tanpa batas
create or replace function public.batasi_biaya_vendor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.vendor_biaya b
    where b.vendor_id = new.vendor_id and b.wedding_id = new.wedding_id
  ) >= 30 then
    raise exception 'Satu vendor maksimal punya 30 biaya tambahan';
  end if;
  return new;
end;
$$;

create trigger vendor_biaya_batasi
  before insert on public.vendor_biaya
  for each row execute function public.batasi_biaya_vendor();

-- RLS: semua anggota pernikahan punya akses penuh, sama seperti tabel modul lainnya
alter table public.vendor_biaya enable row level security;

create policy vendor_biaya_select on public.vendor_biaya for select to authenticated
  using (public.is_wedding_member(wedding_id));
create policy vendor_biaya_insert on public.vendor_biaya for insert to authenticated
  with check (public.is_wedding_member(wedding_id));
create policy vendor_biaya_update on public.vendor_biaya for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (public.is_wedding_member(wedding_id));
create policy vendor_biaya_delete on public.vendor_biaya for delete to authenticated
  using (public.is_wedding_member(wedding_id));

grant select, insert, update, delete on public.vendor_biaya to authenticated;
grant all on public.vendor_biaya to service_role;
