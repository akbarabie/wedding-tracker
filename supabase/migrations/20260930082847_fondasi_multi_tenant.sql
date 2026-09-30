-- Migrasi 1: fondasi multi tenant
-- Membuat tabel weddings, wedding_members, dan wedding_invitations beserta aturan RLS.
-- Semua tabel modul lain nanti bergantung pada wedding_id dari tabel weddings.

-- Fungsi umum untuk memperbarui kolom updated_at secara otomatis
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Unit multi tenant utama: satu baris mewakili satu pernikahan
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  nama_pasangan text not null check (char_length(btrim(nama_pasangan)) between 1 and 120),
  tanggal_hari_h date,
  budget_total_resepsi numeric(14,2) not null default 0 check (budget_total_resepsi >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger weddings_set_updated_at
  before update on public.weddings
  for each row execute function public.set_updated_at();

-- Keanggotaan: menghubungkan pengguna ke pernikahan, mendukung akses berbagi pasangan
create table public.wedding_members (
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  peran text not null default 'member' check (peran in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (wedding_id, user_id)
);

create index wedding_members_user_id_idx on public.wedding_members (user_id);

-- Setiap pernikahan hanya boleh punya satu owner
create unique index wedding_members_satu_owner_idx
  on public.wedding_members (wedding_id) where peran = 'owner';

-- Undangan untuk pasangan: dicocokkan lewat email pengguna yang login
create table public.wedding_invitations (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings (id) on delete cascade,
  email text not null check (email = lower(email) and char_length(email) <= 254),
  invited_by uuid references auth.users (id) on delete set null default auth.uid(),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days'
);

-- Satu email hanya boleh punya satu undangan aktif per pernikahan
create unique index wedding_invitations_pending_idx
  on public.wedding_invitations (wedding_id, email) where status = 'pending';

create index wedding_invitations_email_idx on public.wedding_invitations (email);

-- Fungsi pembantu untuk aturan RLS.
-- Memakai security definer supaya pengecekan keanggotaan tidak memicu RLS secara berulang.
create or replace function public.is_wedding_member(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = p_wedding_id
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_wedding_owner(p_wedding_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.wedding_members m
    where m.wedding_id = p_wedding_id
      and m.user_id = (select auth.uid())
      and m.peran = 'owner'
  );
$$;

-- Membuat pernikahan baru sekaligus menjadikan pembuatnya owner, dalam satu transaksi.
-- Insert langsung ke weddings tidak diizinkan agar tidak ada pernikahan tanpa owner.
create or replace function public.create_wedding(
  p_nama_pasangan text,
  p_tanggal_hari_h date default null,
  p_budget_total_resepsi numeric default 0
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_wedding_id uuid;
begin
  if v_user_id is null then
    raise exception 'Pengguna belum login';
  end if;

  insert into public.weddings (nama_pasangan, tanggal_hari_h, budget_total_resepsi, created_by)
  values (p_nama_pasangan, p_tanggal_hari_h, p_budget_total_resepsi, v_user_id)
  returning id into v_wedding_id;

  insert into public.wedding_members (wedding_id, user_id, peran)
  values (v_wedding_id, v_user_id, 'owner');

  return v_wedding_id;
end;
$$;

-- Menerima undangan: email pada token login harus sama dengan email undangan
create or replace function public.accept_wedding_invitation(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_wedding_id uuid;
  v_jumlah_anggota integer;
begin
  if v_user_id is null then
    raise exception 'Pengguna belum login';
  end if;

  select i.wedding_id into v_wedding_id
  from public.wedding_invitations i
  where i.id = p_invitation_id
    and i.status = 'pending'
    and i.email = v_email
    and i.expires_at > now()
  for update;

  if v_wedding_id is null then
    raise exception 'Undangan tidak ditemukan, sudah dipakai, atau sudah kedaluwarsa';
  end if;

  -- Kunci baris pernikahan supaya dua penerimaan bersamaan tidak melewati batas anggota
  perform 1 from public.weddings w where w.id = v_wedding_id for update;

  select count(*) into v_jumlah_anggota
  from public.wedding_members m
  where m.wedding_id = v_wedding_id;

  if v_jumlah_anggota >= 2 then
    raise exception 'Ruang kerja sudah berisi dua anggota';
  end if;

  insert into public.wedding_members (wedding_id, user_id, peran)
  values (v_wedding_id, v_user_id, 'member')
  on conflict do nothing;

  update public.wedding_invitations set status = 'accepted' where id = p_invitation_id;

  return v_wedding_id;
end;
$$;

-- Aktifkan RLS pada semua tabel
alter table public.weddings enable row level security;
alter table public.wedding_members enable row level security;
alter table public.wedding_invitations enable row level security;

-- Aturan weddings: anggota boleh melihat dan mengubah, hanya owner yang boleh menghapus
create policy weddings_select on public.weddings
  for select to authenticated
  using (public.is_wedding_member(id));

create policy weddings_update on public.weddings
  for update to authenticated
  using (public.is_wedding_member(id))
  with check (public.is_wedding_member(id));

create policy weddings_delete on public.weddings
  for delete to authenticated
  using (public.is_wedding_owner(id));

-- Aturan wedding_members: anggota saling melihat, owner tidak pernah bisa dihapus lewat API.
-- Penambahan anggota hanya lewat fungsi accept_wedding_invitation.
create policy wedding_members_select on public.wedding_members
  for select to authenticated
  using (public.is_wedding_member(wedding_id));

create policy wedding_members_delete on public.wedding_members
  for delete to authenticated
  using (
    peran <> 'owner'
    and (user_id = (select auth.uid()) or public.is_wedding_owner(wedding_id))
  );

-- Aturan wedding_invitations: anggota mengelola undangan, penerima bisa melihat undangan untuk emailnya
create policy wedding_invitations_select on public.wedding_invitations
  for select to authenticated
  using (
    public.is_wedding_member(wedding_id)
    or email = lower((select auth.jwt() ->> 'email'))
  );

create policy wedding_invitations_insert on public.wedding_invitations
  for insert to authenticated
  with check (
    public.is_wedding_member(wedding_id)
    and invited_by = (select auth.uid())
    and status = 'pending'
  );

create policy wedding_invitations_update on public.wedding_invitations
  for update to authenticated
  using (public.is_wedding_member(wedding_id))
  with check (status = 'cancelled');

-- Hak akses eksplisit (prinsip least privilege), anon tidak diberi apa pun
grant select, delete on public.weddings to authenticated;
grant update (nama_pasangan, tanggal_hari_h, budget_total_resepsi) on public.weddings to authenticated;

grant select, delete on public.wedding_members to authenticated;

grant select on public.wedding_invitations to authenticated;
grant insert (wedding_id, email) on public.wedding_invitations to authenticated;
grant update (status) on public.wedding_invitations to authenticated;

-- Layanan worker Go memakai secret key yang berperan sebagai service_role
grant all on public.weddings, public.wedding_members, public.wedding_invitations to service_role;

-- Batasi eksekusi fungsi: hanya pengguna login dan service_role
revoke all on function public.is_wedding_member(uuid) from public, anon;
revoke all on function public.is_wedding_owner(uuid) from public, anon;
revoke all on function public.create_wedding(text, date, numeric) from public, anon;
revoke all on function public.accept_wedding_invitation(uuid) from public, anon;

grant execute on function public.is_wedding_member(uuid) to authenticated, service_role;
grant execute on function public.is_wedding_owner(uuid) to authenticated, service_role;
grant execute on function public.create_wedding(text, date, numeric) to authenticated;
grant execute on function public.accept_wedding_invitation(uuid) to authenticated;