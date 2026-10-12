import { redirect } from 'next/navigation';
import { getSession } from '../../lib/auth';
import { sql } from '../../lib/db';
import AccountForm from './AccountForm';
import '../board/editor.css';
import './account.css';

export const metadata = { title: 'Sign-in options · GnattForMe' };
export const dynamic = 'force-dynamic';

export default async function Account({ searchParams }) {
  const welcome = !!(await searchParams).welcome;
  const s = await getSession();
  if (!s) redirect('/');
  const [row] = await sql`select username, password_hash is not null as has_password, password_set_at from users where email = ${s.user}`;
  return (
    <main className="account">
      <header className="top">
        <a href="/" className="brand" title="GnattForMe">
          <span className="logo" />
        </a>
        <a href="/" className="back">
          ← Board
        </a>
      </header>
      <div className="acc-body">
        {welcome ? (
          <div className="acc-welcome">
            <div>
              <h1>Welcome to GnattForMe 👋</h1>
              <p className="muted">
                Your account is ready. Pick a username and password so you can also sign in on devices without Google.
              </p>
            </div>
            <a href="/" className="back">
              Skip for now →
            </a>
          </div>
        ) : (
          <>
            <h1>Sign-in options</h1>
            <p className="muted acc-lead">
              Your account is created with Google. Add a username and password to sign in on devices where you don&apos;t use your Google
              account.
            </p>
          </>
        )}
        <AccountForm
          welcome={welcome}
          email={s.user}
          method={s.method}
          username={row?.username || ''}
          hasPassword={!!row?.has_password}
          passwordSetAt={row?.password_set_at ? new Date(row.password_set_at).toISOString() : null}
        />
      </div>
    </main>
  );
}
