-- Migrasi 7: fungsi pembuatan pengeluaran dalam satu transaksi
-- Membuat vendor baru (bila diminta) dan pengeluaran sekaligus. security invoker
-- membuat RLS tetap berlaku untuk pemanggil, dan foreign key gabungan memastikan
-- kategori dan vendor milik pernikahan yang sama.
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
    insert into public.vendors (wedding_id, category_id, nama, status)
    values (p_wedding_id, p_category_id, btrim(p_vendor_baru), 'deal')
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

revoke all on function public.buat_pengeluaran(uuid, uuid, uuid, text, text, numeric, date)
  from public, anon;
grant execute on function public.buat_pengeluaran(uuid, uuid, uuid, text, text, numeric, date)
  to authenticated;