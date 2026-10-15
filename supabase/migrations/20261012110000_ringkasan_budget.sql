-- Migrasi 6: view ringkasan budget per kategori
-- Satu kueri menghasilkan rencana, komitmen (total pengeluaran final), dan total
-- yang sudah dibayar per kategori, jadi halaman budget tidak perlu banyak kueri.
-- security_invoker membuat RLS tabel dasar tetap berlaku sesuai pengguna yang membaca.
-- Subkueri dikelompokkan per (wedding_id, category_id) supaya filter wedding_id
-- bisa didorong turun oleh planner dan indeks yang ada ikut terpakai.
create view public.ringkasan_kategori
with (security_invoker = true) as
select
  c.id as category_id,
  c.wedding_id,
  c.nama,
  c.nilai_rencana,
  c.di_luar_budget_resepsi,
  coalesce(k.total_komitmen, 0) as total_komitmen,
  coalesce(k.jumlah_pengeluaran, 0) as jumlah_pengeluaran,
  coalesce(b.total_dibayar, 0) as total_dibayar
from public.budget_categories c
left join (
  select wedding_id, category_id,
         sum(nominal) as total_komitmen,
         count(*) as jumlah_pengeluaran
  from public.expenses
  where status_entri = 'final'
  group by wedding_id, category_id
) k on k.wedding_id = c.wedding_id and k.category_id = c.id
left join (
  select e.wedding_id, e.category_id, sum(p.nominal) as total_dibayar
  from public.payments p
  join public.expenses e on e.id = p.expense_id and e.wedding_id = p.wedding_id
  where p.dibayar_pada is not null and e.status_entri = 'final'
  group by e.wedding_id, e.category_id
) b on b.wedding_id = c.wedding_id and b.category_id = c.id;

revoke all on public.ringkasan_kategori from public, anon, authenticated;
grant select on public.ringkasan_kategori to authenticated, service_role;