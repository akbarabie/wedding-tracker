-- Migrasi 12: biaya lainnya bisa berupa potongan dan boleh belum punya nominal
-- Catatan vendor sering menulis "kena charge" tanpa menyebut tarif, dan sebagian vendor
-- memberi cashback atau diskon bersyarat. Keduanya perlu tertampung supaya perbandingan jujur.
-- 1) jenis: biaya (menambah total) atau potongan (mengurangi total)
-- 2) nominal boleh kosong untuk biaya yang tarifnya belum diketahui. Potongan tetap wajib
--    bernominal, karena potongan tanpa nilai tidak berarti apa pun.

alter table public.vendor_biaya
  add column jenis text not null default 'biaya'
    check (jenis in ('biaya', 'potongan')),
  alter column nominal drop not null;

-- Check nominal > 0 bawaan tetap berlaku untuk nilai yang diisi (nilai kosong dianggap lolos)
alter table public.vendor_biaya
  add constraint vendor_biaya_potongan_butuh_nominal
  check (jenis = 'biaya' or nominal is not null);
