const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
const siteUrl = (rawUrl && rawUrl.length > 0 ? rawUrl : 'http://localhost:3000').replace(/\/$/, '');

export const siteConfig = {
  name: 'NZ Politicians Tracker',
  shortName: 'NZ Tracker',
  title: 'NZ Politicians Tracker — public New Zealand political data',
  titleTemplate: '%s · NZ Politicians Tracker',
  description:
    'Explore and analyse public New Zealand political data: Members of Parliament, bills, voting records, expenses, and opinion polls — grounded in official sources.',
  url: siteUrl,
  locale: 'en_NZ',
  themeColor: '#0a0a0a',
  keywords: [
    'New Zealand politics',
    'NZ Parliament',
    'Members of Parliament',
    'MP voting records',
    'NZ bills',
    'MP expenses',
    'opinion polling',
    'political parties',
    'Aotearoa',
    'open government data',
  ],
} as const;

export type SiteConfig = typeof siteConfig;
