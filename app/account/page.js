import { redirect } from 'next/navigation';

// Sign-in options moved into Insights → Settings; keep old links (and the first-sign-in redirect) working.
export default async function Account({ searchParams }) {
  redirect('/insights?tab=settings&section=sign-in' + ((await searchParams).welcome ? '&welcome=1' : ''));
}
