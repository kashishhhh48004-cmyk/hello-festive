-- =====================================================================
--  NOTE: you already ran an earlier version of this file plus the
--  "instant publish" snippet. You do NOT need to run this again.
--  It is included in the zip only as a record of your final database.
--  (Running it twice would add the sample events twice.)
-- =====================================================================
--  HELLO FESTIVE : Supabase (PostgreSQL) schema
--  How to run: Supabase Dashboard -> SQL Editor -> New query
--              paste this whole file -> click RUN
--  Safe to run once on a fresh project.
-- =====================================================================

-- ---------- 0. Extensions ----------
-- pg_trgm makes "search as you type" (autocomplete) fast
create extension if not exists pg_trgm;


-- ---------- 1. PROFILES ----------
-- Supabase Auth keeps email/password in auth.users.
-- We keep extra info (name, role) in our own "profiles" table.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row whenever someone registers
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- 2. HELPER FUNCTIONS (used by security rules) ----------
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() = 'admin', false);
$$;


-- ---------- 3. CATEGORIES ----------
create table if not exists public.categories (
  id          serial primary key,
  name        text not null unique,
  slug        text not null unique,
  icon        text,                 -- an emoji used on the category cards
  sort_order  int not null default 0
);


-- ---------- 4. EVENTS ----------
create table if not exists public.events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 3 and 150),
  description   text not null check (char_length(description) between 10 and 2000),
  category_id   int  not null references public.categories(id),

  event_date    timestamptz not null,
  end_date      timestamptz,

  venue         text not null,
  city          text not null,
  state         text,
  latitude      double precision,   -- for the map pin
  longitude     double precision,

  event_type    text not null default 'local' check (event_type in ('college', 'local')),
  college_name  text,               -- only for college events

  is_free       boolean not null default true,
  price         numeric(10,2) check (price is null or price >= 0),

  poster_url    text,
  register_link text,               -- optional external registration link

  organizer_id  uuid references public.profiles(id) on delete set null,
  status        text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- a paid event must have a price, a free event must not
  constraint price_matches_free check (
    (is_free = true  and (price is null or price = 0)) or
    (is_free = false and price is not null and price > 0)
  )
);

-- Indexes: make search and filters fast
create index if not exists events_title_trgm_idx on public.events using gin (title gin_trgm_ops);
create index if not exists events_city_lower_idx on public.events (lower(city));
create index if not exists events_date_idx       on public.events (event_date);
create index if not exists events_category_idx   on public.events (category_id);
create index if not exists events_status_idx     on public.events (status);


-- ---------- 5. BOOKMARKS (saved events) ----------
create table if not exists public.bookmarks (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event_id    uuid not null references public.events(id)   on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, event_id)
);


-- ---------- 6. TRIGGER: protect "status" + keep updated_at fresh ----------
-- Normal users can never approve their own event.
-- (The backend uses the service key, where auth.uid() is null, so it can approve.)
create or replace function public.protect_event_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists events_protect_status on public.events;
create trigger events_protect_status
  before update on public.events
  for each row execute function public.protect_event_status();


-- ---------- 7. ROW LEVEL SECURITY (who can see / change what) ----------
alter table public.profiles   enable row level security;
alter table public.categories enable row level security;
alter table public.events     enable row level security;
alter table public.bookmarks  enable row level security;

-- profiles
drop policy if exists "profiles are readable"      on public.profiles;
drop policy if exists "users update own profile"   on public.profiles;
create policy "profiles are readable"
  on public.profiles for select using (true);
create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = public.get_my_role());  -- cannot make yourself admin

-- categories: everyone can read
drop policy if exists "categories are readable" on public.categories;
create policy "categories are readable"
  on public.categories for select using (true);

-- events
drop policy if exists "read approved or own or admin" on public.events;
drop policy if exists "logged in users create events" on public.events;
drop policy if exists "owner or admin update events"  on public.events;
drop policy if exists "owner or admin delete events"  on public.events;

create policy "read approved or own or admin"
  on public.events for select
  using (status = 'approved' or organizer_id = auth.uid() or public.is_admin());

create policy "logged in users create events"
  on public.events for insert
  with check (auth.uid() = organizer_id and status = 'approved');

create policy "owner or admin update events"
  on public.events for update
  using (organizer_id = auth.uid() or public.is_admin())
  with check (organizer_id = auth.uid() or public.is_admin());

create policy "owner or admin delete events"
  on public.events for delete
  using (organizer_id = auth.uid() or public.is_admin());

-- bookmarks: each user only sees and edits their own
drop policy if exists "own bookmarks" on public.bookmarks;
create policy "own bookmarks"
  on public.bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ---------- 8. STORAGE (event poster images) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-posters', 'event-posters', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "posters are public"        on storage.objects;
drop policy if exists "logged in users upload"    on storage.objects;
drop policy if exists "owners delete own posters" on storage.objects;

create policy "posters are public"
  on storage.objects for select
  using (bucket_id = 'event-posters');

create policy "logged in users upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-posters');

create policy "owners delete own posters"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-posters' and owner = auth.uid());


-- ---------- 9. SEED DATA: categories ----------
insert into public.categories (name, slug, icon, sort_order) values
  ('Hackathons',            'hackathons',     '💻', 1),
  ('College Fests',         'college-fests',  '🎉', 2),
  ('Educational Workshops', 'workshops',      '📚', 3),
  ('Festival Events',       'festivals',      '🪔', 4),
  ('Cultural & Music',      'cultural-music', '🎶', 5),
  ('Sports & Tournaments',  'sports',         '🏆', 6),
  ('Tech Talks & Seminars', 'tech-talks',     '🎤', 7),
  ('Competitions',          'competitions',   '🧠', 8),
  ('Food & Fairs',          'food-fairs',     '🍜', 9),
  ('Startup & Career',      'startup-career', '🚀', 10),
  ('Art & Exhibitions',     'art',            '🎨', 11),
  ('Social & Charity',      'charity',        '🤝', 12),
  ('Other',                 'other',          '✨', 99)
on conflict (slug) do nothing;


-- ---------- 10. SEED DATA: sample events (so the site is not empty) ----------
-- These are sample/demo events with no organizer. Delete them anytime with:
--   delete from public.events where organizer_id is null;
insert into public.events
  (title, description, category_id, event_date, venue, city, state, latitude, longitude,
   event_type, college_name, is_free, price, status)
values
  ('CodeStorm 24-Hour Hackathon',
   'Build, break and ship in 24 hours. Teams of up to 4, mentors on call, prizes for the top three projects.',
   (select id from categories where slug = 'hackathons'),
   now() + interval '6 days', 'Main Auditorium', 'Ghaziabad', 'Uttar Pradesh', 28.6692, 77.4538,
   'college', 'Sample Institute of Technology', false, 299, 'approved'),

  ('Spandan Annual College Fest',
   'Three days of music, dance, drama and food stalls. Open to students from all colleges.',
   (select id from categories where slug = 'college-fests'),
   now() + interval '12 days', 'College Ground', 'Noida', 'Uttar Pradesh', 28.5355, 77.3910,
   'college', 'Sample College of Arts', false, 150, 'approved'),

  ('Web Development Crash Course',
   'A hands-on workshop covering HTML, CSS and JavaScript basics. Bring your laptop.',
   (select id from categories where slug = 'workshops'),
   now() + interval '3 days', 'Seminar Hall B', 'Ghaziabad', 'Uttar Pradesh', 28.6692, 77.4538,
   'college', 'Sample Institute of Technology', true, null, 'approved'),

  ('Diwali Mela & Light Festival',
   'Lamps, rangoli, sweets and live folk performances for the whole family.',
   (select id from categories where slug = 'festivals'),
   now() + interval '9 days', 'Town Hall Park', 'Moradabad', 'Uttar Pradesh', 28.8386, 78.7733,
   'local', null, true, null, 'approved'),

  ('Sufi Night Live',
   'An evening of Sufi music under the open sky with a live band and food trucks.',
   (select id from categories where slug = 'cultural-music'),
   now() + interval '15 days', 'Riverfront Lawn', 'Delhi', 'Delhi', 28.6139, 77.2090,
   'local', null, false, 499, 'approved'),

  ('Inter-College Cricket Cup',
   'Knockout cricket tournament between 16 college teams. Entry for spectators is free.',
   (select id from categories where slug = 'sports'),
   now() + interval '20 days', 'City Sports Stadium', 'Lucknow', 'Uttar Pradesh', 26.8467, 80.9462,
   'college', 'Multiple colleges', true, null, 'approved'),

  ('AI in Everyday Life: Tech Talk',
   'Industry speakers share how AI is changing jobs and daily life, followed by a Q&A session.',
   (select id from categories where slug = 'tech-talks'),
   now() + interval '5 days', 'Conference Room 2', 'Noida', 'Uttar Pradesh', 28.5355, 77.3910,
   'college', 'Sample University', true, null, 'approved'),

  ('Street Food Carnival',
   'More than 40 food stalls, live cooking shows and a pani puri eating contest.',
   (select id from categories where slug = 'food-fairs'),
   now() + interval '8 days', 'Central Market Ground', 'Ghaziabad', 'Uttar Pradesh', 28.6692, 77.4538,
   'local', null, false, 50, 'approved'),

  ('Startup Pitch Day',
   'Ten student startups pitch to investors and mentors. Networking session after the pitches.',
   (select id from categories where slug = 'startup-career'),
   now() + interval '18 days', 'Innovation Hub', 'Delhi', 'Delhi', 28.6139, 77.2090,
   'college', 'Sample Business School', false, 199, 'approved'),

  ('Blood Donation Drive',
   'Donate blood and save lives. Refreshments and certificates for all donors.',
   (select id from categories where slug = 'charity'),
   now() + interval '4 days', 'Community Centre', 'Moradabad', 'Uttar Pradesh', 28.8386, 78.7733,
   'local', null, true, null, 'approved'),

  ('Inter-College Quiz Championship',
   'General knowledge, tech and current affairs quiz. Teams of two.',
   (select id from categories where slug = 'competitions'),
   now() + interval '10 days', 'Library Auditorium', 'Lucknow', 'Uttar Pradesh', 26.8467, 80.9462,
   'college', 'Sample Degree College', true, null, 'approved'),

  ('Rang Art Exhibition',
   'Paintings, sketches and photography by young local artists. Meet the artists on the weekend.',
   (select id from categories where slug = 'art'),
   now() + interval '7 days', 'City Art Gallery', 'Noida', 'Uttar Pradesh', 28.5355, 77.3910,
   'local', null, false, 30, 'approved');


-- ---------- 11. MAKE YOURSELF ADMIN (run AFTER you register on the site) ----------
-- Replace the email with the one you registered with, then run this one line:
--
--   update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'your-email@example.com');
