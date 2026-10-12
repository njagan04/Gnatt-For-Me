import './legal.css';

const CONTACT = 'adsfree1001@gmail.com';
const UPDATED = '12 October 2026';

// Shared frame for the privacy policy and terms pages (Google's consent screen links to both).
export default function Legal({ title, children }) {
  return (
    <main className="legal">
      <a href="/" className="legal-home">
        <span className="logo" /> GnattForMe
      </a>
      <h1>{title}</h1>
      <p className="muted">Last updated {UPDATED}</p>
      {children}
      <p className="legal-contact">
        Questions or requests: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>
      </p>
      <nav className="legal-nav">
        <a href="/privacy">Privacy policy</a> · <a href="/terms">Terms of service</a> · <a href="/">Home</a>
      </nav>
    </main>
  );
}
