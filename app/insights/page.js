import { redirect } from 'next/navigation';
import { getSession, isAdmin } from '../../lib/auth';
import { sql } from '../../lib/db';
import Insights from './Insights';
import Settings from './Settings';

export const metadata = { title: 'Insights · GnattForMe' };

// Two tabs: Insights (charts, loaded client-side) and Settings (?tab=settings).
export default async function Page({ searchParams }) {
  const session = await getSession();
  if (!session) redirect('/');
  const q = await searchParams;
  const tab = q.tab === 'settings' ? 'settings' : 'insights';
  let settings = null;
  if (tab === 'settings') {
    const [row] = await sql`select name, picture, username, password_hash is not null as password_hash, password_set_at, first_seen
                            from users where email = ${session.user}`;
    settings = <Settings session={session} row={row} admin={isAdmin(session.user)} welcome={!!q.welcome} />;
  }
  return <Insights user={session.user} tab={tab} settings={settings} />;
}
