-- Migrasi 14: aturan integritas timeline dan daftar tamu (PRD 6.3 dan 6.4)
--
-- Tabel timeline_tasks dan guests sudah ada sejak migrasi 2 beserta RLS-nya.
-- Migrasi ini hanya menambah penjaga di level database supaya aturan tetap
-- berlaku walaupun ada bug di lapisan aplikasi:
--   1. selesai_pada selalu mengikuti kolom selesai, tidak bisa diisi manual.
--   2. Deadline tugas dibatasi ke rentang wajar.
--   3. Jumlah tugas dan tamu per pernikahan dibatasi (perlindungan dari penyalahgunaan
--      pada layanan gratis).
--   4. View ringkasan_tamu untuk dashboard dan halaman tamu.
--
-- Pembatasan memakai trigger, bukan CHECK constraint, karena CHECK baru pada tabel
-- yang sudah berisi data lama bisa menggagalkan update yang tidak berkaitan.

-- Trigger tugas timeline: menjaga selesai_pada dan rentang deadline
create or replace function public.jaga_tugas_timeline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- selesai_pada tidak boleh diisi dari luar. Saat tugas baru ditandai selesai
  -- diisi waktu sekarang, saat tetap selesai dipertahankan, saat dibuka lagi dikosongkan.
  if new.selesai then
    if tg_op = 'UPDATE' and old.selesai then
      new.selesai_pada := old.selesai_pada;
    else
      new.selesai_pada := now();
    end if;
  else
    new.selesai_pada := null;
  end if;

  -- Deadline hanya diperiksa saat baru diisi atau berubah, supaya data lama
  -- tidak menghalangi update kolom lain
  if new.deadline is not null
     and (tg_op = 'INSERT' or new.deadline is distinct from old.deadline)
     and (new.deadline < date '2020-01-01' or new.deadline > date '2100-12-31') then
    raise exception 'Deadline tugas di luar rentang yang wajar';
  end if;

  -- Batas jumlah tugas per pernikahan, hanya dicek saat tugas baru dibuat
  if tg_op = 'INSERT' and (
    select count(*) from public.timeline_tasks t where t.wedding_id = new.wedding_id
  ) >= 300 then
    raise exception 'Satu pernikahan maksimal punya 300 tugas timeline';
  end if;

  return new;
end;
$$;

revoke all on function public.jaga_tugas_timeline() from public, anon, authenticated;

create trigger timeline_tasks_jaga
  before insert or update on public.timeline_tasks
  for each row execute function public.jaga_tugas_timeline();

-- Trigger tamu: batas jumlah baris tamu per pernikahan.
-- Batasnya 1000 baris undangan, jauh di atas kebutuhan pernikahan umum.
create or replace function public.jaga_batas_tamu()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.guests g where g.wedding_id = new.wedding_id
  ) >= 1000 then
    raise exception 'Satu pernikahan maksimal punya 1000 baris tamu';
  end if;
  return new;
end;
$$;

revoke all on function public.jaga_batas_tamu() from public, anon, authenticated;

create trigger guests_jaga_batas
  before insert on public.guests
  for each row execute function public.jaga_batas_tamu();

-- Ringkasan tamu per kategori dan status RSVP.
-- Satu kueri kecil (paling banyak 12 baris per pernikahan) cukup untuk kartu ringkasan,
-- estimasi konsumsi, dan dashboard nanti, jadi tidak perlu menarik ratusan baris tamu.
-- jumlah_orang dijumlahkan karena satu undangan bisa dihadiri beberapa orang.
create view public.ringkasan_tamu
with (security_invoker = true) as
select
  wedding_id,
  kategori,
  status_rsvp,
  count(*) as jumlah_undangan,
  sum(jumlah_orang) as jumlah_orang
from public.guests
group by wedding_id, kategori, status_rsvp;

revoke all on public.ringkasan_tamu from public, anon, authenticated;
grant select on public.ringkasan_tamu to authenticated, service_role;
