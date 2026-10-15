import { redirect } from 'next/navigation';
import { getSession, isAdmin } from '../../../lib/auth';
import { sql } from '../../../lib/db';
import Insights from './Insights';
import Settings from './Settings';

export const metadata = { title: 'Insights · GanttForMe' };

// Your page: sidebar (who you are + sections) with Insights (charts, loaded client-side) or one Settings section
// (?tab=settings&section=appearance|categories|sign-in|admin) or the daily log (?tab=journal&day=YYYY-MM-DD).
export default async function Page({ searchParams }) {
  const session = await getSession();
  if (!session) redirect('/');
  const q = await searchParams;
  const tab = ['settings', 'journal'].includes(q.tab) ? q.tab : 'insights';
  const admin = isAdmin(session.user);
  const sections = ['appearance', 'categories', 'sign-in', ...(admin ? ['admin'] : [])];
  const section = sections.includes(q.section) ? q.section : q.welcome ? 'sign-in' : 'appearance';
  const [row] = await sql`select name, picture, username, password_hash is not null as has_password, password_set_at
                          from users where email = ${session.user}`;
  const me = { email: session.user, name: row?.name || '', picture: row?.picture || '', username: row?.username || '' };
  // categories with how much uses them (tasks, hours, journal notes), for Settings → Categories
  const cats =
    tab === 'settings' && section === 'categories'
      ? await sql`select c.name, c.hue, c.color,
          (select count(*) from tasks t where t.owner = c.owner and t.label = c.name)::int as tasks,
          (select coalesce(sum(l.hours), 0) from logs l join tasks t on t.id = l.task_id where t.owner = c.owner and t.label = c.name)::float as hours,
          (select count(*) from journal j, jsonb_array_elements(j.notes) n where j.owner = c.owner and n->>'cat' = c.name)::int as notes
          from categories c where c.owner = ${session.user} order by c.name`
      : [];
  // every task with its category, status, description, first/last logged day and totals, for the per-category status lists
  const tasks =
    tab === 'settings' && section === 'categories'
      ? await sql`select t.name, t.label, t.status, t.notes, t.pinned, to_char(min(l.day), 'YYYY-MM-DD') as first, to_char(max(l.day), 'YYYY-MM-DD') as last,
          coalesce(sum(l.hours), 0)::float as hours, count(l.day)::int as days
          from tasks t left join logs l on l.task_id = t.id
          where t.owner = ${session.user} group by t.id order by max(l.day) desc nulls last, t.name`
      : [];
  const settings = tab === 'settings' && (
    <Settings section={section} session={session} row={row} cats={cats} tasks={tasks} welcome={!!q.welcome} />
  );
  return <Insights me={me} admin={admin} tab={tab} section={section} day={q.day || null} settings={settings} />;
}
