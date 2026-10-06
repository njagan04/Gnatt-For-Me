import { redirect } from 'next/navigation';
import { getUser } from '../../lib/auth';
import Insights from '../Insights';

export const metadata = { title: 'Insights · GnattForMe' };

export default async function Page() {
  const user = await getUser();
  if (!user) redirect('/');
  return <Insights user={user} />;
}
