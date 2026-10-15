import { redirect } from 'next/navigation';
import { getUser, isAdmin } from '../../lib/auth';
import { sql } from '../../lib/db';
import Shell from './Shell';

// Signed-in pages (the board, Insights, Daily log, Settings) share this frame: the left rail stays on screen and
// only the page next to it changes when you switch, the board included.
export default async function AppLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/');
  const [row] = await sql`select name, picture, username from users where email = ${user}`;
  const me = { email: user, name: row?.name || '', picture: row?.picture || '', username: row?.username || '' };
  return (
    <Shell me={me} admin={isAdmin(user)}>
      {children}
    </Shell>
  );
}
