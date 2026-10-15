import { redirect } from 'next/navigation';
import { getUser } from '../../../lib/auth';
import { sql } from '../../../lib/db';
import Board from '../../board/Board';

export const metadata = { title: 'Board · GanttForMe' };

// The board: your home once signed in. Signed out → the landing page.
export default async function Home() {
  const user = await getUser();
  if (!user) redirect('/');
  const [row] = await sql`select picture from users where email = ${user}`;
  return <Board user={user} picture={row?.picture || ''} />;
}
