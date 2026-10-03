-- Supabase setup for "Прокат"
-- Run this once in Supabase SQL Editor.
create table if not exists public.rental_databases (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 0,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rental_databases enable row level security;

drop policy if exists "Users can read own rental database" on public.rental_databases;
create policy "Users can read own rental database"
  on public.rental_databases for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own rental database" on public.rental_databases;
create policy "Users can insert own rental database"
  on public.rental_databases for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own rental database" on public.rental_databases;
create policy "Users can update own rental database"
  on public.rental_databases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.sync_rental_database(
  p_data jsonb,
  p_expected_version bigint
)
returns table(version bigint, data jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare current_version bigint;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select r.version into current_version
    from public.rental_databases r
    where r.user_id = auth.uid()
    for update;

  if current_version is null then
    if coalesce(p_expected_version,0) <> 0 then
      raise exception 'VERSION_CONFLICT';
    end if;
    insert into public.rental_databases(user_id,version,data)
      values(auth.uid(),1,p_data);
  else
    if current_version <> coalesce(p_expected_version,0) then
      raise exception 'VERSION_CONFLICT';
    end if;
    update public.rental_databases
      set version=current_version+1, data=p_data, updated_at=now()
      where user_id=auth.uid();
  end if;

  return query
    select r.version,r.data,r.updated_at
    from public.rental_databases r
    where r.user_id=auth.uid();
end;
$$;

revoke all on function public.sync_rental_database(jsonb,bigint) from public;
grant execute on function public.sync_rental_database(jsonb,bigint) to authenticated;
