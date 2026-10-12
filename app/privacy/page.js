import Legal from '../legal/Legal';

export const metadata = { title: 'Privacy policy · GnattForMe' };

export default function Privacy() {
  return (
    <Legal title="Privacy policy">
      <p>
        GnattForMe is a personal work log: you record which days you worked on which tasks, and for how long. This page explains what the
        app stores and why.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <b>Your Google email address, name and profile photo.</b> When you sign in with Google, the app receives these and stores them to
          identify your account (your name and photo are only shown to the app's administrator). It does not receive your password,
          contacts, files or anything else from your Google account.
        </li>
        <li>
          <b>When you sign in.</b> The time of your first and most recent sign-in, and how many times you have signed in.
        </li>
        <li>
          <b>What you enter.</b> Task names, categories, the days and hours you log, and any notes you write.
        </li>
        <li>
          <b>A sign-in cookie.</b> A signed cookie keeps you signed in for up to 30 days. There are no advertising or tracking cookies and
          no analytics.
        </li>
      </ul>

      <h2>How it is used</h2>
      <p>
        Your data is used only to show you your own board and insights. Each account sees only its own data. Nothing is sold, shared with
        advertisers or used for any other purpose.
      </p>

      <h2>Where it is stored</h2>
      <p>
        The app runs on Vercel and stores data in a Neon Postgres database. These providers host the service and do not use your data for
        their own purposes.
      </p>

      <h2>Deleting your data</h2>
      <p>
        You can delete any task or category inside the app at any time. To have your whole account and everything in it removed, email the
        address below from your Google account's email and it will be deleted.
      </p>

      <h2>Changes</h2>
      <p>If this policy changes, the date at the top of this page will be updated.</p>
    </Legal>
  );
}
