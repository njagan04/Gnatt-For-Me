import { Inter } from 'next/font/google';
import Script from 'next/script';
import { themeScript } from '../lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'GnattForMe' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* applies the saved theme before first paint */}
        <Script id="theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
