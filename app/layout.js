import { Inter } from 'next/font/google';
import { themeScript } from '../lib/theme';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = { title: 'GanttForMe' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* must run before first paint: applies the saved theme */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
