-- Migrasi 10: status vendor dikunci sebagai deal setelah ada pembayaran, dan paket wajib pax maksimal
-- 1) Bila sudah ada pembayaran yang tercatat dibayar, status vendor hanya boleh deal.
--    Status baru bisa diubah lagi setelah pembayarannya dibatalkan atau pengeluarannya dihapus.
--    Aturan ini menggantikan aturan sebelumnya yang hanya mengunci status ditolak.
-- 2) Data lama yang melanggar aturan itu dirapikan: vendor yang sudah punya pembayaran
--    dibayar tetapi statusnya belum deal diubah menjadi deal.
-- 3) Harga paket wajib punya pax maksimal supaya bisa dibandingkan dengan harga per pax.

-- 1) Mengganti penjaga status vendor
drop trigger if exists vendors_cek_ditolak on public.vendors;
drop function if exists public.cek_vendor_ditolak();

create or replace function public.cek_status_vendor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Hanya perubahan status yang dicek. Mengubah kolom lain pada vendor lama yang
  -- statusnya belum rapi tidak boleh ikut gagal.
  if new.status is distinct from old.status and new.status <> 'deal' then
    if exists (
      select 1
      from public.payments p
      join public.expenses e
        on e.id = p.expense_id and e.wedding_id = p.wedding_id
      where e.vendor_id = new.id
        and e.wedding_id = new.wedding_id
        and p.dibayar_pada is not null
    ) then
      raise exception 'Status vendor dikunci sebagai deal karena sudah ada pembayaran yang tercatat dibayar. Batalkan pembayarannya atau hapus pengeluarannya terlebih dahulu';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.cek_status_vendor() from public, anon, authenticated;

create trigger vendors_cek_status
  before update of status on public.vendors
  for each row execute function public.cek_status_vendor();

-- 2) Merapikan data lama yang sudah punya pembayaran dibayar tetapi bukan deal
update public.vendors v
set status = 'deal'
where v.status <> 'deal'
  and exists (
    select 1
    from public.payments p
    join public.expenses e
      on e.id = p.expense_id and e.wedding_id = p.wedding_id
    where e.vendor_id = v.id
      and e.wedding_id = v.wedding_id
      and p.dibayar_pada is not null
  );

-- 3) Paket wajib punya pax maksimal. Memakai trigger pada kolom tipe_harga dan kapasitas,
--    bukan CHECK constraint, supaya vendor paket lama tanpa kapasitas tidak membuat
--    pembaruan status otomatis (vendor menjadi deal) ikut gagal. Aturan ini berlaku
--    pada data baru dan setiap kali vendor disimpan lewat form.
create or replace function public.wajibkan_pax_paket()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tipe_harga = 'paket' and new.kapasitas is null then
    raise exception 'Harga paket wajib mengisi pax maksimal paket';
  end if;
  return new;
end;
$$;

create trigger vendors_wajib_pax_paket
  before insert or update of tipe_harga, kapasitas on public.vendors
  for each row execute function public.wajibkan_pax_paket();

-- 4) Aturan kunci berlaku dua arah. Saat pembayaran ditandai dibayar, vendor otomatis
--    menjadi deal (kecuali ditolak, yang tetap diblokir). Fungsi dari migrasi 9 ini
--    diperluas, namanya dipertahankan agar trigger payments_cek_vendor_ditolak tetap terpasang.
create or replace function public.cek_pembayaran_vendor_ditolak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor_id uuid;
  v_status text;
begin
  if new.dibayar_pada is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.dibayar_pada is not distinct from new.dibayar_pada then
    return new;
  end if;

  select v.id, v.status into v_vendor_id, v_status
  from public.expenses e
  join public.vendors v
    on v.id = e.vendor_id and v.wedding_id = e.wedding_id
  where e.id = new.expense_id
    and e.wedding_id = new.wedding_id;

  if v_status = 'ditolak' then
    raise exception 'Vendor pengeluaran ini berstatus ditolak. Ubah status vendor terlebih dahulu sebelum mencatat pembayaran';
  end if;

  -- Ada uang yang sudah dibayar berarti ada kesepakatan, jadi vendor ikut deal
  if v_vendor_id is not null and v_status <> 'deal' then
    update public.vendors
    set status = 'deal'
    where id = v_vendor_id and wedding_id = new.wedding_id;
  end if;

  return new;
end;
$$;

-- 5) Vendor cepat dari form pengeluaran belum punya harga. Tipe harganya dibuat per_pax
--    supaya tidak terbentur aturan paket wajib pax maksimal. Tipe dan harga yang
--    sebenarnya diisi saat pengguna melengkapi data vendor.
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
    insert into public.vendors (wedding_id, category_id, nama, tipe_harga, status)
    values (p_wedding_id, p_category_id, btrim(p_vendor_baru), 'per_pax', 'deal')
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
