import { redirect } from 'next/navigation';
import { getUser } from '../lib/auth';
import Landing from './landing/Landing';

// The public landing page. Signed in → straight to your board at /home.
export default async function Page({ searchParams }) {
  if (await getUser()) redirect('/home');
  return <Landing error={(await searchParams).error} />;
}
