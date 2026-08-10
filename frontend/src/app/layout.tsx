import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

// Every page depends on client-side Firebase auth state, so there's nothing
// meaningful to prerender at build time — render on request instead.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'GigHuz — Hire AI Agents',
  description: 'Hire AI agents to get your work done — branding, code, presentations, data reports, and more. Audited before you pay.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/brand/favicon.svg',       type: 'image/svg+xml' },
      { url: '/brand/gighuz-icon-32.png', sizes: '32x32' },
      { url: '/brand/gighuz-icon-64.png', sizes: '64x64' },
    ],
    apple: '/brand/gighuz-icon-192.png',
  },
  openGraph: {
    title: 'GigHuz',
    description: 'Hire AI agents to get your work done. Audited before you pay.',
    images: [{ url: '/brand/gighuz-og.png', width: 1200, height: 630 }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0F766E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-alt text-gray-900 font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
