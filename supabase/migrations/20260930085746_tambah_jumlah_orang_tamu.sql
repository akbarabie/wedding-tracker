-- Migrasi 3: jumlah orang per undangan tamu
-- Satu undangan bisa dihadiri beberapa orang, jadi estimasi konsumsi (PRD 6.4)
-- dihitung dari jumlah orang, bukan dari jumlah baris tamu.
alter table public.guests
  add column jumlah_orang smallint not null default 1
  check (jumlah_orang between 1 and 20);