import { redirect } from 'next/navigation';
import { getSession, isAdmin } from '../../lib/auth';
import { sql } from '../../lib/db';
import Insights from './Insights';
import Settings from './Settings';

export const metadata = { title: 'Insights · GnattForMe' };

// Your page: sidebar (who you are + sections) with Insights (charts, loaded client-side) or Settings (?tab=settings).
export default async function Page({ searchParams }) {
  const session = await getSession();
  if (!session) redirect('/');
  const q = await searchParams;
  const tab = q.tab === 'settings' ? 'settings' : 'insights';
  const admin = isAdmin(session.user);
  const [row] = await sql`select name, picture, username, password_hash is not null as has_password, password_set_at
                          from users where email = ${session.user}`;
  const me = { email: session.user, name: row?.name || '', picture: row?.picture || '', username: row?.username || '' };
  const settings = tab === 'settings' && <Settings session={session} row={row} admin={admin} welcome={!!q.welcome} />;
  return <Insights me={me} admin={admin} tab={tab} settings={settings} />;
}
