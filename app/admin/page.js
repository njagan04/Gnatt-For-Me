import { notFound, redirect } from 'next/navigation';
import { getUser, isAdmin } from '../../lib/auth';

// The users table lives in Settings → Admin now; non-admins get a plain 404 as before.
export default async function Admin() {
  const me = await getUser();
  if (!me || !isAdmin(me)) notFound();
  redirect('/insights?tab=settings&section=admin');
}
