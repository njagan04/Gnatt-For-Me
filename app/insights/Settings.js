import AccountForm from '../account/AccountForm';
import ThemeSwitch from '../board/ThemeSwitch';
import '../board/editor.css';
import '../account/account.css';

// One settings section at a time, picked in the sidebar: appearance, sign-in, admin (admins only; checked by the page).
export default function Settings({ section, session, row, welcome }) {
  return (
    <div className="set" key={section}>
      {section === 'appearance' && (
        <section className="set-sec">
          <h2>Appearance</h2>
          <p className="muted set-lead">How GnattForMe looks on this device.</p>
          <div className="set-card set-row">
            <div>
              <b>Theme</b>
              <p className="muted">Light, dark, or follow your system.</p>
            </div>
            <ThemeSwitch />
          </div>
        </section>
      )}

      {section === 'sign-in' && (
        <section className="set-sec">
          {welcome && (
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
          <p className="muted set-lead">Only you can see this.</p>
          <a href="/admin" className="set-card set-row set-link">
            <div>
              <b>Users</b>
              <p className="muted">Everyone who has signed in, their activity, and account removal.</p>
            </div>
            <span aria-hidden="true">→</span>
          </a>
        </section>
      )}
    </div>
  );
}
