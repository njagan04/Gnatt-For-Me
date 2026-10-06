import { getUser } from '../lib/auth';
import Board from './board/Board';
import Landing from './landing/Landing';

export default async function Page({ searchParams }) {
  const user = await getUser();
  if (!user) return <Landing error={(await searchParams).error} />;
  return <Board user={user} />;
}
