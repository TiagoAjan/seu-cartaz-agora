begin;

create table public.sca_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete restrict,
  revision integer not null default 0 check (revision >= 0),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ? 'company'
    and jsonb_typeof(data -> 'company') = 'object'
    and data -> 'company' ? 'name'
    and jsonb_typeof(data -> 'company' -> 'name') = 'string'
    and char_length(btrim(data #>> '{company,name}')) between 1 and 150
    and octet_length(data::text) <= 4194304
  ),
  created_at timestamptz not null default now()
);

alter table public.sca_workspaces enable row level security;
revoke all on table public.sca_workspaces from public, anon, authenticated;
grant select (id, revision, data) on public.sca_workspaces to authenticated;
grant update (data, revision) on public.sca_workspaces to authenticated;

create policy "Owner reads workspace"
on public.sca_workspaces for select to authenticated
using (owner_id = (select auth.uid()));

create policy "Owner updates workspace"
on public.sca_workspaces for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sca-assets','sca-assets',false,2097152,array['image/png','image/jpeg','image/webp']);

create policy "Owner reads SCA assets"
on storage.objects for select to authenticated
using (bucket_id = 'sca-assets' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select id from public.sca_workspaces));

create policy "Owner uploads SCA assets"
on storage.objects for insert to authenticated
with check (bucket_id = 'sca-assets' and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (select id from public.sca_workspaces));

commit;

