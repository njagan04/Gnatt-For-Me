import Legal from '../legal/Legal';

export const metadata = { title: 'Terms of service · GnattForMe' };

export default function Terms() {
  return (
    <Legal title="Terms of service">
      <p>By signing in to GnattForMe you agree to these terms.</p>

      <h2>The service</h2>
      <p>
        GnattForMe is a free, personal tool for logging the work you do each day. It is provided as is, without warranties of any kind, and
        may change or stop at any time.
      </p>

      <h2>Your account and content</h2>
      <ul>
        <li>You sign in with your own Google account and are responsible for what you enter.</li>
        <li>Your tasks, hours and notes remain yours. They are only used to run the app for you (see the privacy policy).</li>
        <li>Do not use the service for anything unlawful or to disrupt it for other people.</li>
      </ul>

      <h2>Availability and data</h2>
      <p>
        We try to keep the service running and your data safe, but cannot guarantee it will always be available or that data can never be
        lost. Keep your own copy of anything important.
      </p>

      <h2>Liability</h2>
      <p>To the extent the law allows, the service's maker is not liable for any loss arising from using it.</p>

      <h2>Changes</h2>
      <p>These terms may be updated; the date at the top of this page shows when.</p>
    </Legal>
  );
}
