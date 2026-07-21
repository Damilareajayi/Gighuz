import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

// Every page depends on client-side Firebase auth state, so there's nothing
// meaningful to prerender at build time — render on request instead.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GigHuz Africa — The Borderless Engine for Global Work',
  description: 'AI-orchestrated freelance marketplace connecting global clients with vetted African talent.',
  icons: {
    icon: [
      { url: '/brand/favicon.svg',       type: 'image/svg+xml' },
      { url: '/brand/gighuz-icon-32.png', sizes: '32x32' },
      { url: '/brand/gighuz-icon-64.png', sizes: '64x64' },
    ],
    apple: '/brand/gighuz-icon-192.png',
  },
  openGraph: {
    title: 'GigHuz Africa',
    description: 'The borderless engine for global work.',
    images: [{ url: '/brand/gighuz-og.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-alt text-gray-900 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
