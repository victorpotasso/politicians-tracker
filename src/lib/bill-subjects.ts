/**
 * Lightweight subject tagging for bills. Bills have no subject field in the
 * source data, so subjects are inferred from the title and abstract via keyword
 * matching. A bill can carry several subjects; those with none fall back to
 * "General". Kept dependency-free and client-safe so both the bills list
 * (badges/filter) and server-side stats can use it.
 */

interface SubjectRule {
  subject: string;
  keywords: RegExp;
}

const SUBJECT_RULES: SubjectRule[] = [
  {
    subject: 'Health',
    keywords:
      /\b(health|abortion|end of life|euthanas|medicinal|patient|hospital|mental|disabilit|vaccin|pandemic)\b/,
  },
  {
    subject: 'Drugs & Alcohol',
    keywords: /\b(drug|cannabis|misuse of drugs|alcohol|liquor|substance|smok|vaping|tobacco)\b/,
  },
  {
    subject: 'Social Issues',
    keywords:
      /\b(marriage|gambling|harm|famil|discrimination|equalit|relationship|gender|abuse|welfare)\b/,
  },
  {
    subject: 'Economy & Business',
    keywords:
      /\b(convention centre|business|tax|finance|financial|economic|trade|commerce|compan|investment|budget)\b/,
  },
  {
    subject: 'Retail & Trading',
    keywords: /\b(shop trading|trading hours|retail|easter trading|sale and supply|licen[cs])\b/,
  },
  {
    subject: 'Justice & Law',
    keywords:
      /\b(crime|justice|sentenc|court|offence|criminal|police|bail|prison|firearm|victim)\b/,
  },
  {
    subject: 'Environment',
    keywords:
      /\b(climate|environment|conservation|resource management|water|emission|carbon|biodiversity|pollution)\b/,
  },
  {
    subject: 'Education',
    keywords: /\b(education|school|student|universit|curriculum|teacher|tertiary)\b/,
  },
  {
    subject: 'Housing',
    keywords: /\b(housing|tenanc|residential|rent|landlord|homeless)\b/,
  },
  {
    subject: 'Employment',
    keywords: /\b(employment|worker|health and safety|wage|union|workplace|labour market)\b/,
  },
  {
    subject: 'Governance',
    keywords:
      /\b(electoral|parliament|constitution|referendum|local government|democracy|treaty|public service)\b/,
  },
  {
    subject: 'Transport',
    keywords: /\b(transport|road|rail|vehicle|traffic|maritime|aviation|driver)\b/,
  },
];

export const SUBJECT_COLORS: Record<string, string> = {
  Health: '#e11d48',
  'Drugs & Alcohol': '#9333ea',
  'Social Issues': '#0ea5e9',
  'Economy & Business': '#0d9488',
  'Retail & Trading': '#f59e0b',
  'Justice & Law': '#4f46e5',
  Environment: '#16a34a',
  Education: '#2563eb',
  Housing: '#d97706',
  Employment: '#db2777',
  Governance: '#64748b',
  Transport: '#0891b2',
  General: '#6b7280',
};

/** Colour for a subject tag; falls back to a neutral chart colour. */
export function subjectColor(subject: string): string {
  return SUBJECT_COLORS[subject] ?? 'var(--chart-3)';
}

/** Infer the subject tags for a bill from its title and abstract. */
export function billSubjects(bill: { title: string; abstract?: string | null }): string[] {
  const text = `${bill.title} ${bill.abstract ?? ''}`.toLowerCase();
  const subjects = SUBJECT_RULES.filter((rule) => rule.keywords.test(text)).map((r) => r.subject);
  return subjects.length > 0 ? [...new Set(subjects)] : ['General'];
}
