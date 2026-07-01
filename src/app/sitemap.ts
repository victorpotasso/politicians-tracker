import type { MetadataRoute } from 'next';

import { getBills, getMps, getPartySummaries } from '@/lib/data';
import { siteConfig } from '@/lib/site';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const [mps, bills, parties] = await Promise.all([getMps(), getBills(), getPartySummaries()]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/politicians`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/parties`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/parliament`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/bills`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/polls`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/spending`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/analytics`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/chat`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];

  const mpRoutes: MetadataRoute.Sitemap = mps.records.map((mp) => ({
    url: `${base}/politicians/${mp.mpId}`,
    lastModified: mps.meta.collectedAt ? new Date(mps.meta.collectedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const billRoutes: MetadataRoute.Sitemap = bills.records.map((bill) => ({
    url: `${base}/bills/${bill.billId}`,
    lastModified: bills.meta.collectedAt ? new Date(bills.meta.collectedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  const partyRoutes: MetadataRoute.Sitemap = parties.map((party) => ({
    url: `${base}/parties/${party.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...mpRoutes, ...partyRoutes, ...billRoutes];
}
