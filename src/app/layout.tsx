import type { Metadata } from 'next';
import { Geist, Geist_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';

import { ModelPrefetcher } from '@/components/chat/model-prefetcher';
import { SiteNav } from '@/components/site-nav';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Politicians Tracker — NZ political data',
  description:
    'Explore and analyse public New Zealand political data: MPs, bills, and voting records.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased dark`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="bg-brand text-primary-foreground focus:ring-ring sr-only rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:ring-2 focus:outline-none"
        >
          Skip to content
        </a>
        <ModelPrefetcher />
        <SiteNav />
        {children}
      </body>
    </html>
  );
}
