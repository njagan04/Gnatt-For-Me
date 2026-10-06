'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from '../lib/db';
import { getUser } from '../lib/auth';
import { addDays, monday } from '../lib/days';
import { ALL_HUES, freeHue, MAX_CATS } from '../lib/palette';

export async function logout() {
  (await cookies()).delete('session');
  redirect('/');
}

async function me() {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');
  return user;
}

const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
function checkRange(from, to) {
  if (!isDay(from) || !isDay(to)) throw new Error('Bad date');
}

export async function load(from, to) {
  const owner = await me();
  checkRange(from, to);
  const [logs, tasks, cats] = await Promise.all([
    sql`select t.id, t.name, t.label, to_char(l.day, 'YYYY-MM-DD') as day, l.hours::float as hours
        from logs l join tasks t on t.id = l.task_id
        where t.owner = ${owner} and l.day between ${from} and ${to}
        order by l.day`,
    sql`select name, label, notes from tasks where owner = ${owner} order by name`,
    sql`select name, hue from categories where owner = ${owner} order by name`,
  ]);
  return { logs, tasks, cats };
}

// The server owns colour choice: a category always gets a palette colour no other category of yours uses.
export async function saveCategory(name, hue) {
  const owner = await me();
  name = String(name || '').trim();
  if (!name || name.length > 40) throw new Error('Bad category');
  if (name.toLowerCase() === 'others') throw new Error('“Others” is built in: tasks without a category go there');
  const rows = await sql`select name, hue from categories where owner = ${owner}`;
  const others = rows.filter(c => c.name !== name).map(c => c.hue);
  if (!rows.some(c => c.name === name) && rows.length >= MAX_CATS) throw new Error(`Up to ${MAX_CATS} categories`);
  if (!ALL_HUES.includes(hue) || others.includes(hue)) hue = freeHue(others);
  if (hue === null) throw new Error('Every colour is in use');
  await sql`insert into categories (owner, name, hue) values (${owner}, ${name}, ${hue})
            on conflict (owner, name) do update set hue = excluded.hue`;
}

export async function deleteCategory(name) {
  const owner = await me();
  await sql.transaction([
    sql`delete from categories where owner = ${owner} and name = ${name}`,
    sql`update tasks set label = '' where owner = ${owner} and label = ${name}`,
  ]);
}

const deleteOld = (owner, { taskId, from, to }) =>
  sql`delete from logs where task_id = ${taskId} and day between ${from} and ${to}
      and task_id in (select id from tasks where owner = ${owner})`;

function checkOld(old) {
  if (!Number.isInteger(old?.taskId)) throw new Error('Bad task');
  checkRange(old.from, old.to);
}

// old = { taskId, from, to } of the bar being edited; it's replaced in the same transaction.
// notes: undefined keeps the task's existing notes.
export async function saveBar({ name, label, days, old, notes }) {
  const owner = await me();
  name = String(name || '').trim();
  label = String(label || '').trim();
  notes = notes === undefined ? null : String(notes).slice(0, 20000);
  if (!name || !Array.isArray(days) || !days.length || days.length > 62) throw new Error('Name and 1–62 days required');
  for (const d of days) {
    if (!isDay(d.day)) throw new Error('Bad date');
    if (d.hours !== null && !(d.hours > 0 && d.hours <= 24)) throw new Error('Hours must be 0–24');
  }
  if (old) checkOld(old);
  await sql.transaction([
    ...(old ? [deleteOld(owner, old)] : []),
    sql`insert into tasks (owner, name, label, notes) values (${owner}, ${name}, ${label}, coalesce(${notes}, ''))
        on conflict (owner, name) do update set label = excluded.label, notes = coalesce(${notes}, tasks.notes)`,
    sql`insert into logs (task_id, day, hours)
        select (select id from tasks where owner = ${owner} and name = ${name}), x.d, x.h
        from unnest(${days.map(d => d.day)}::date[], ${days.map(d => d.hours)}::numeric[]) as x(d, h)
        on conflict (task_id, day) do update set hours = coalesce(excluded.hours, logs.hours)`,
  ]);
}

// Days with any logged work, for the dots on the mini calendar.
export async function busyDays(from, to) {
  const owner = await me();
  checkRange(from, to);
  const rows = await sql`select distinct to_char(l.day, 'YYYY-MM-DD') as day
                         from logs l join tasks t on t.id = l.task_id
                         where t.owner = ${owner} and l.day between ${from} and ${to}`;
  return rows.map(r => r.day);
}

export async function removeBar(old) {
  const owner = await me();
  checkOld(old);
  await deleteOld(owner, old);
}

// Analytics, as of the client's local `today`: daily totals for 26 weeks, plus categories and top tasks for 30 days.
export async function stats(today) {
  const owner = await me();
  if (!isDay(today)) throw new Error('Bad date');
  const from = addDays(monday(today), -175), from30 = addDays(today, -29); // 26 weeks of days
  const [days, byCat, top, cats] = await Promise.all([
    sql`select to_char(l.day, 'YYYY-MM-DD') as day, coalesce(sum(l.hours), 0)::float as hours, count(*)::int as entries
        from logs l join tasks t on t.id = l.task_id
        where t.owner = ${owner} and l.day between ${from} and ${today}
        group by l.day order by l.day`,
    sql`select t.label, coalesce(sum(l.hours), 0)::float as hours, count(distinct l.day)::int as days
        from logs l join tasks t on t.id = l.task_id
        where t.owner = ${owner} and l.day between ${from30} and ${today}
        group by t.label order by hours desc, days desc`,
    sql`select t.name, t.label, coalesce(sum(l.hours), 0)::float as hours, count(*)::int as days
        from logs l join tasks t on t.id = l.task_id
        where t.owner = ${owner} and l.day between ${from30} and ${today}
        group by t.id order by hours desc, days desc limit 6`,
    sql`select name, hue from categories where owner = ${owner} order by name`,
  ]);
  return { from, days, byCat, top, cats };
}
