import { getUser } from '../lib/auth';
import Gantt from './Gantt';
import Landing from './Landing';

export default async function Page({ searchParams }) {
  const user = await getUser();
  if (!user) return <Landing error={(await searchParams).error} />;
  return <Gantt user={user} />;
}
