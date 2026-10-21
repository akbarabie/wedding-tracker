-- Migrasi 9: sinkronisasi status vendor dengan pengeluaran dan penghapusan vendor yang aman
-- 1) Pengeluaran final yang dihubungkan ke vendor otomatis membuat vendor berstatus deal.
-- 2) Vendor tidak bisa diubah menjadi ditolak bila sudah ada pembayaran yang dibayar.
-- 3) Pembayaran tidak bisa dicatat dibayar untuk pengeluaran milik vendor yang ditolak.
-- 4) Fungsi hapus_vendor menghapus vendor beserta pengeluarannya secara atomik, hanya untuk
--    vendor ditolak yang belum punya pembayaran dibayar. Selain itu pengeluaran harus
--    dihapus lebih dulu oleh pengguna.

-- 1) Status vendor ikut deal saat pengeluaran final tercatat
create or replace function public.sinkron_vendor_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Draf hasil ekstraksi nota belum berarti kesepakatan, baru entri final yang dihitung
  if new.status_entri <> 'final' or new.vendor_id is null then
    return new;
  end if;

  -- Perubahan kolom lain (misalnya nominal) tidak boleh mengubah status vendor lagi
  if tg_op = 'UPDATE'
     and old.vendor_id is not distinct from new.vendor_id
     and old.status_entri = new.status_entri then
    return new;
  end if;

  -- wedding_id ikut dicocokkan supaya hanya vendor di pernikahan yang sama yang tersentuh
  update public.vendors
  set status = 'deal'
  where id = new.vendor_id
    and wedding_id = new.wedding_id
    and status <> 'deal';

  return new;
end;
$$;

revoke all on function public.sinkron_vendor_deal() from public, anon, authenticated;

create trigger expenses_sinkron_vendor_deal
  after insert or update of vendor_id, status_entri on public.expenses
  for each row execute function public.sinkron_vendor_deal();

-- 2) Vendor dengan pembayaran yang sudah dibayar tidak logis bila ditolak
create or replace function public.cek_vendor_ditolak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ditolak' and old.status is distinct from 'ditolak' then
    if exists (
      select 1
      from public.payments p
      join public.expenses e
        on e.id = p.expense_id and e.wedding_id = p.wedding_id
      where e.vendor_id = new.id
        and e.wedding_id = new.wedding_id
        and p.dibayar_pada is not null
    ) then
      raise exception 'Vendor tidak bisa ditolak karena sudah ada pembayaran yang tercatat dibayar (DP atau cicilan)';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.cek_vendor_ditolak() from public, anon, authenticated;

create trigger vendors_cek_ditolak
  before update of status on public.vendors
  for each row execute function public.cek_vendor_ditolak();

-- 3) Menjaga aturan nomor 2 dari arah sebaliknya: vendor yang sudah ditolak
--    tidak boleh menerima catatan pembayaran dibayar
create or replace function public.cek_pembayaran_vendor_ditolak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.dibayar_pada is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.dibayar_pada is not distinct from new.dibayar_pada then
    return new;
  end if;

  if exists (
    select 1
    from public.expenses e
    join public.vendors v
      on v.id = e.vendor_id and v.wedding_id = e.wedding_id
    where e.id = new.expense_id
      and e.wedding_id = new.wedding_id
      and v.status = 'ditolak'
  ) then
    raise exception 'Vendor pengeluaran ini berstatus ditolak. Ubah status vendor terlebih dahulu sebelum mencatat pembayaran';
  end if;

  return new;
end;
$$;

revoke all on function public.cek_pembayaran_vendor_ditolak() from public, anon, authenticated;

create trigger payments_cek_vendor_ditolak
  before insert or update of dibayar_pada on public.payments
  for each row execute function public.cek_pembayaran_vendor_ditolak();

-- 4) Hapus vendor secara atomik. security invoker membuat RLS tetap berlaku
--    untuk pemanggil. Mengembalikan jumlah pengeluaran yang ikut terhapus.
create or replace function public.hapus_vendor(
  p_wedding_id uuid,
  p_vendor_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status text;
  v_jumlah integer;
  v_dibayar integer;
begin
  -- Kunci baris vendor supaya status tidak berubah di tengah proses
  select v.status into v_status
  from public.vendors v
  where v.id = p_vendor_id and v.wedding_id = p_wedding_id
  for update;

  if not found then
    raise exception 'Vendor tidak ditemukan';
  end if;

  -- Kunci pengeluaran vendor agar pembayaran tidak ditandai dibayar saat dicek
  perform 1
  from public.expenses e
  where e.vendor_id = p_vendor_id and e.wedding_id = p_wedding_id
  for update;

  select count(*) into v_jumlah
  from public.expenses e
  where e.vendor_id = p_vendor_id and e.wedding_id = p_wedding_id;

  if v_jumlah > 0 then
    select count(*) into v_dibayar
    from public.payments p
    join public.expenses e
      on e.id = p.expense_id and e.wedding_id = p.wedding_id
    where e.vendor_id = p_vendor_id
      and e.wedding_id = p_wedding_id
      and p.dibayar_pada is not null;

    if v_dibayar > 0 then
      raise exception 'Vendor ini punya pembayaran yang sudah dibayar. Hapus pengeluarannya terlebih dahulu';
    end if;

    if v_status <> 'ditolak' then
      raise exception 'Vendor ini masih punya % pengeluaran. Hapus pengeluarannya terlebih dahulu', v_jumlah;
    end if;

    -- Vendor ditolak tanpa pembayaran dibayar: pengeluarannya ikut dihapus.
    -- Jadwal pembayaran terhapus lewat on delete cascade.
    delete from public.expenses e
    where e.vendor_id = p_vendor_id and e.wedding_id = p_wedding_id;
  end if;

  delete from public.vendors v
  where v.id = p_vendor_id and v.wedding_id = p_wedding_id;

  return v_jumlah;
end;
$$;

revoke all on function public.hapus_vendor(uuid, uuid) from public, anon;
grant execute on function public.hapus_vendor(uuid, uuid) to authenticated;
