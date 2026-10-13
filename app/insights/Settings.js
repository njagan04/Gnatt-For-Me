import AccountForm from '../account/AccountForm';
import ThemeSwitch from '../board/ThemeSwitch';
import '../board/editor.css';
import '../account/account.css';

// Settings: appearance, sign-in, admin. Each section is a sidebar anchor.
export default function Settings({ session, row, admin, welcome }) {
  return (
    <div className="set">
      {welcome && (
        <div className="acc-welcome">
          <div>
            <h1>Welcome to GnattForMe 👋</h1>
            <p className="muted">Your account is ready. Pick a username and password so you can also sign in on devices without Google.</p>
          </div>
          <a href="/" className="back">
            Skip for now →
          </a>
        </div>
      )}

      <section id="appearance" className="set-sec">
        <h2>Appearance</h2>
        <div className="set-card set-row">
          <div>
            <b>Theme</b>
            <p className="muted">Light, dark, or follow your system.</p>
          </div>
          <ThemeSwitch />
        </div>
      </section>

      <section id="sign-in" className="set-sec">
        <h2>Sign-in</h2>
        <AccountForm
          welcome={welcome}
          email={session.user}
          method={session.method}
          username={row?.username || ''}
          hasPassword={!!row?.has_password}
          passwordSetAt={row?.password_set_at ? new Date(row.password_set_at).toISOString() : null}
        />
      </section>

      {admin && (
        <section id="admin" className="set-sec">
          <h2>Admin</h2>
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
