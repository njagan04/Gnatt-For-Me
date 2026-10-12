import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

await sql`create table if not exists tasks (
  id serial primary key,
  owner text not null,
  name text not null,
  label text not null default '',
  unique (owner, name)
)`;
await sql`create table if not exists logs (
  task_id int not null references tasks(id) on delete cascade,
  day date not null,
  hours numeric(4,2) check (hours > 0 and hours <= 24),
  primary key (task_id, day)
)`;
await sql`alter table logs alter column hours drop not null`;
await sql`create table if not exists categories (
  owner text not null,
  name text not null,
  hue int not null,
  primary key (owner, name)
)`;
// Labels used before categories existed become categories.
await sql`insert into categories (owner, name, hue)
  select distinct owner, label, abs(hashtext(label)) % 360 from tasks where label <> ''
  on conflict do nothing`;
await sql`alter table tasks add column if not exists notes text not null default ''`;
// One row per person who has signed in (written on every Google sign-in).
await sql`create table if not exists users (
  email text primary key,
  name text not null default '',
  picture text not null default '',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  sign_ins int not null default 1
)`;
// People who used the app before this table existed.
await sql`insert into users (email) select distinct owner from tasks on conflict do nothing`;
console.log('tables ready');
