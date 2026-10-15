-- Migrasi 5b: memperkuat konsistensi status dan cicilan pengeluaran
-- 1) status_pembayaran selalu dihitung dari cicilan, tidak bisa diisi manual
--    dan ikut dihitung ulang saat nominal pengeluaran diubah.
-- 2) Total cicilan tidak boleh melebihi nominal pengeluaran.
-- 3) Nominal pengeluaran tidak boleh diturunkan di bawah total cicilan yang sudah dijadwalkan.

create or replace function public.paksa_status_pembayaran()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total_jadwal numeric;
  v_total_dibayar numeric;
begin
  select
    coalesce(sum(p.nominal), 0),
    coalesce(sum(p.nominal) filter (where p.dibayar_pada is not null), 0)
  into v_total_jadwal, v_total_dibayar
  from public.payments p
  where p.expense_id = new.id;

  if v_total_jadwal > new.nominal then
    raise exception 'Nominal pengeluaran tidak boleh lebih kecil dari total cicilan yang sudah dijadwalkan';
  end if;

  new.status_pembayaran := case
    when v_total_dibayar >= new.nominal then 'lunas'
    when v_total_dibayar > 0 then 'dicicil'
    else 'dp_terjadwal'
  end;

  return new;
end;
$$;

revoke all on function public.paksa_status_pembayaran() from public, anon, authenticated;

create trigger expenses_paksa_status_pembayaran
  before insert or update of nominal, status_pembayaran on public.expenses
  for each row execute function public.paksa_status_pembayaran();

create or replace function public.cek_total_cicilan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nominal numeric;
  v_cicilan_lain numeric;
begin
  -- Kunci baris pengeluaran supaya dua cicilan yang dibuat bersamaan tidak
  -- sama-sama lolos pengecekan lalu totalnya melebihi nominal.
  select e.nominal into v_nominal
  from public.expenses e
  where e.id = new.expense_id
  for update;

  select coalesce(sum(p.nominal), 0) into v_cicilan_lain
  from public.payments p
  where p.expense_id = new.expense_id and p.id <> new.id;

  if v_cicilan_lain + new.nominal > v_nominal then
    raise exception 'Total cicilan melebihi nominal pengeluaran';
  end if;

  return new;
end;
$$;

revoke all on function public.cek_total_cicilan() from public, anon, authenticated;

create trigger payments_cek_total_cicilan
  before insert or update of nominal, expense_id on public.payments
  for each row execute function public.cek_total_cicilan();