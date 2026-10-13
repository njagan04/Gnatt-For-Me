'use server';
import { getUser } from '../../lib/auth';
import { sql } from '../../lib/db';

// A page is a list of free-placed notes: { id, x, y, w, html, cat }. The HTML is cleaned in the browser before it's
// sent and again before it's shown; here we only check shape and size.
const isDay = d => /^\d{4}-\d{2}-\d{2}$/.test(d);
const MAX_NOTES = 300,
  MAX_PAGE = 300000;

async function me() {
  const user = await getUser();
  if (!user) throw new Error('Not logged in');
  return user;
}

const num = (v, lo, hi) => Math.min(hi, Math.max(lo, Math.round(Number(v) || 0)));
function checkNotes(notes) {
  if (!Array.isArray(notes) || notes.length > MAX_NOTES) throw new Error('Too many notes on this page');
  return notes.map(n => ({
    id: String(n.id || '').slice(0, 64),
    x: num(n.x, 0, 20000),
    y: num(n.y, 0, 50000),
    w: num(n.w, 140, 2000),
    html: String(n.html || ''),
    cat: String(n.cat || '').slice(0, 40),
  }));
}

// One day's page, plus what was logged on the board that day (shown above the page) and category colours.
export async function getDay(day) {
  const owner = await me();
  if (!isDay(day)) throw new Error('Bad date');
  const [[page], logs, cats] = await Promise.all([
    sql`select notes, updated_at from journal where owner = ${owner} and day = ${day}`,
    sql`select t.name, t.label, t.status, l.hours::float as hours
        from logs l join tasks t on t.id = l.task_id
        where t.owner = ${owner} and l.day = ${day}
        order by l.hours desc nulls last, t.name`,
    sql`select name, hue, color from categories where owner = ${owner} order by name`,
  ]);
  return { notes: page?.notes ?? [], updatedAt: page?.updated_at ?? null, logs, cats };
}

// Days in [from, to] that have a page (calendar dots), and how many notes each category has (any day).
export async function pageDays(from, to) {
  const owner = await me();
  if (!isDay(from) || !isDay(to) || Date.parse(to) - Date.parse(from) > 120 * 864e5) throw new Error('Bad date range');
  const [inMonth, counts] = await Promise.all([
    sql`select to_char(day, 'YYYY-MM-DD') as day from journal where owner = ${owner} and day between ${from} and ${to}`,
    sql`select coalesce(n->>'cat', '') as cat, count(*)::int as n
        from journal j, jsonb_array_elements(j.notes) n where j.owner = ${owner} group by 1`,
  ]);
  return { days: inMonth.map(r => r.day), counts: Object.fromEntries(counts.map(r => [r.cat, r.n])) };
}

// Every note tagged with a category ('' = untagged), newest day first.
export async function notesByCategory(cat) {
  const owner = await me();
  cat = String(cat ?? '').slice(0, 40);
  return sql`select to_char(j.day, 'YYYY-MM-DD') as day, n->>'id' as id, n->>'html' as html
             from journal j, jsonb_array_elements(j.notes) n
             where j.owner = ${owner} and coalesce(n->>'cat', '') = ${cat}
             order by j.day desc limit 60`;
}

// Save a page (no notes = the page is removed).
export async function saveDay(day, notes) {
  const owner = await me();
  if (!isDay(day)) throw new Error('Bad date');
  notes = checkNotes(notes);
  const json = JSON.stringify(notes);
  if (json.length > MAX_PAGE) throw new Error('This page is too long');
  if (!notes.length) {
    await sql`delete from journal where owner = ${owner} and day = ${day}`;
    return { updatedAt: null };
  }
  const [r] = await sql`insert into journal (owner, day, notes) values (${owner}, ${day}, ${json}::jsonb)
                        on conflict (owner, day) do update set notes = excluded.notes, updated_at = now()
                        returning updated_at`;
  return { updatedAt: r.updated_at };
}
