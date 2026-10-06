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
console.log('tables ready');
