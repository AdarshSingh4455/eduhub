create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    user_id uuid not null unique references auth.users(id) on delete cascade,
    name text,
    email text,
    role text not null default 'student',
    profile_picture text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.subjects (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.skills (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create unique index if not exists subjects_name_unique_lower on public.subjects (lower(name));
create unique index if not exists skills_name_unique_lower on public.skills (lower(name));

alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
update public.profiles set user_id = id where user_id is null;

alter table public.subjects add column if not exists user_id uuid;
alter table public.skills add column if not exists user_id uuid;
alter table public.books add column if not exists user_id uuid;
alter table public.videos add column if not exists user_id uuid;

do $$
declare
    subject_id_type text;
    skill_id_type text;
begin
    select data_type into subject_id_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'subjects' and column_name = 'id';

    if subject_id_type = 'uuid' then
        alter table public.subjects alter column id set default gen_random_uuid();
    elsif subject_id_type = 'text' then
        alter table public.subjects alter column id set default gen_random_uuid()::text;
    end if;

    select data_type into skill_id_type
    from information_schema.columns
    where table_schema = 'public' and table_name = 'skills' and column_name = 'id';

    if skill_id_type = 'uuid' then
        alter table public.skills alter column id set default gen_random_uuid();
    elsif skill_id_type = 'text' then
        alter table public.skills alter column id set default gen_random_uuid()::text;
    end if;
end $$;

create table if not exists public.books (
    id uuid primary key default gen_random_uuid(),
    subject_id text not null,
    title text not null,
    file_url text not null,
    file_path text,
    class text default '',
    course text default '',
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

create table if not exists public.videos (
    id uuid primary key default gen_random_uuid(),
    subject_id text not null,
    title text not null,
    video_url text not null,
    class text default '',
    course text default '',
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.skills enable row level security;
alter table public.books enable row level security;
alter table public.videos enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

drop policy if exists "subjects_select" on public.subjects;
drop policy if exists "subjects_insert_own" on public.subjects;
drop policy if exists "subjects_update_own" on public.subjects;
drop policy if exists "subjects_delete_own" on public.subjects;

drop policy if exists "skills_select" on public.skills;
drop policy if exists "skills_insert_own" on public.skills;
drop policy if exists "skills_update_own" on public.skills;
drop policy if exists "skills_delete_own" on public.skills;

drop policy if exists "books_select" on public.books;
drop policy if exists "books_insert_own" on public.books;
drop policy if exists "books_update_own" on public.books;
drop policy if exists "books_delete_own" on public.books;

drop policy if exists "videos_select" on public.videos;
drop policy if exists "videos_insert_own" on public.videos;
drop policy if exists "videos_update_own" on public.videos;
drop policy if exists "videos_delete_own" on public.videos;

create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = user_id and auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id and auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = user_id);

create policy "subjects_select" on public.subjects for select using (true);
create policy "subjects_insert_own" on public.subjects for insert with check (auth.uid() = user_id);
create policy "subjects_update_own" on public.subjects for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subjects_delete_own" on public.subjects for delete using (auth.uid() = user_id);

create policy "skills_select" on public.skills for select using (true);
create policy "skills_insert_own" on public.skills for insert with check (auth.uid() = user_id);
create policy "skills_update_own" on public.skills for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skills_delete_own" on public.skills for delete using (auth.uid() = user_id);

create policy "books_select" on public.books for select using (true);
create policy "books_insert_own" on public.books for insert with check (auth.uid() = user_id);
create policy "books_update_own" on public.books for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "books_delete_own" on public.books for delete using (auth.uid() = user_id);

create policy "videos_select" on public.videos for select using (true);
create policy "videos_insert_own" on public.videos for insert with check (auth.uid() = user_id);
create policy "videos_update_own" on public.videos for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "videos_delete_own" on public.videos for delete using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('books', 'books', true)
on conflict (id) do update set public = true;

drop policy if exists "books_storage_public_read" on storage.objects;
drop policy if exists "books_storage_auth_insert" on storage.objects;
drop policy if exists "books_storage_auth_update" on storage.objects;
drop policy if exists "books_storage_auth_delete" on storage.objects;

create policy "books_storage_public_read" on storage.objects
for select using (bucket_id = 'books');

create policy "books_storage_auth_insert" on storage.objects
for insert with check (bucket_id = 'books' and auth.role() = 'authenticated' and name like auth.uid()::text || '/%');

create policy "books_storage_auth_update" on storage.objects
for update using (bucket_id = 'books' and auth.role() = 'authenticated' and name like auth.uid()::text || '/%')
with check (bucket_id = 'books' and auth.role() = 'authenticated' and name like auth.uid()::text || '/%');

create policy "books_storage_auth_delete" on storage.objects
for delete using (bucket_id = 'books' and auth.role() = 'authenticated' and name like auth.uid()::text || '/%');
