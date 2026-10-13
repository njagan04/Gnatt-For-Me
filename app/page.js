import { getUser } from '../lib/auth';
import { sql } from '../lib/db';
import Board from './board/Board';
import Landing from './landing/Landing';

export default async function Page({ searchParams }) {
  const user = await getUser();
  if (!user) return <Landing error={(await searchParams).error} />;
  const [row] = await sql`select picture from users where email = ${user}`;
  return <Board user={user} picture={row?.picture || ''} />;
}
