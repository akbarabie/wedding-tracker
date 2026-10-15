-- Migrasi 8: jenis pembayaran terstruktur (DP, cicilan, pelunasan)
-- Label tidak lagi menjadi sumber kebenaran. Jenis disimpan sebagai kolom
-- tersendiri supaya aturan bisnis bisa dijaga database, bukan hanya aplikasi.
alter table public.payments
  add column jenis text not null default 'cicilan'
  check (jenis in ('dp', 'cicilan', 'pelunasan'));

-- Data lama diisi ulang berdasarkan label yang pernah diketik
update public.payments set jenis = 'dp' where lower(btrim(label)) = 'dp';
update public.payments set jenis = 'pelunasan' where lower(btrim(label)) = 'pelunasan';

-- Setelah data lama beres, nilai awal dihapus supaya setiap insert baru
-- wajib menyebut jenisnya secara eksplisit
alter table public.payments alter column jenis drop default;

-- Satu pengeluaran hanya boleh punya satu DP dan satu pelunasan. Unique index
-- parsial ini juga menahan klik ganda atau dua tab yang mengirim bersamaan.
create unique index payments_satu_dp_idx
  on public.payments (expense_id) where jenis = 'dp';
create unique index payments_satu_pelunasan_idx
  on public.payments (expense_id) where jenis = 'pelunasan';