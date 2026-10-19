import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PrintHub - Scan & Print Instantly',
  description: 'Upload documents or scan physical pages from your phone for instant, silent printing at local print cafes with guaranteed privacy.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0c14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🖨️</text></svg>" />
      </head>
      <body>
        <main style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', padding: '16px 16px 100px 16px' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
