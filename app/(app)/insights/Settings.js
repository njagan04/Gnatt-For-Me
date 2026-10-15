import Link from 'next/link';
import AccountForm from '../../account/AccountForm';
import AdminUsers from '../../admin/AdminUsers';
import CategorySettings from './CategorySettings';
import ThemeSwitch from '../../board/ThemeSwitch';
import '../../board/editor.css';
import '../../account/account.css';
import '../../admin/admin.css';

// One settings section at a time, picked in the sidebar: appearance, categories, sign-in, admin (admins only; checked by the page).
export default function Settings({ section, session, row, cats, tasks, welcome }) {
  return (
    <div className={'set' + (section === 'admin' ? ' wide' : section === 'categories' ? ' full' : '')} key={section}>
      {section === 'appearance' && (
        <section className="set-sec">
          <h2>Appearance</h2>
          <p className="muted set-lead">How GanttForMe looks on this device.</p>
          <div className="set-card set-row">
            <div>
              <b>Theme</b>
              <p className="muted">Light, dark, or follow your system.</p>
            </div>
            <ThemeSwitch />
          </div>
        </section>
      )}

      {section === 'categories' && (
        <section className="set-sec">
          <CategorySettings cats={cats} tasks={tasks} />
        </section>
      )}

      {section === 'sign-in' && (
        <section className="set-sec">
          {welcome && (
            <div className="acc-welcome">
              <div>
                <h1>Welcome to GanttForMe 👋</h1>
                <p className="muted">
                  Your account is ready. Pick a username and password so you can also sign in on devices without Google.
                </p>
              </div>
              <Link href="/home" className="back">
                Skip for now →
              </Link>
            </div>
          )}
          <h2>Sign-in</h2>
          <p className="muted set-lead">Google is always on. Add a username and password to sign in anywhere.</p>
          <AccountForm
            welcome={welcome}
            email={session.user}
            method={session.method}
            username={row?.username || ''}
            hasPassword={!!row?.has_password}
            passwordSetAt={row?.password_set_at ? new Date(row.password_set_at).toISOString() : null}
          />
        </section>
      )}

      {section === 'admin' && (
        <section className="set-sec">
          <h2>Admin</h2>
          <p className="muted set-lead">Everyone who has signed in. Only you can see this.</p>
          <AdminUsers me={session.user} />
        </section>
      )}
    </div>
  );
}
