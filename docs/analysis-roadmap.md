# Analysis Roadmap

Compelling analysis directions and visualisations to build with NZ politicians' public
data, plus the legal and ethical guardrails to respect. This is a living roadmap — items
are aspirational until wired to real collected data.

> Guiding principle for every analysis below: **always attach a date/time context**
> (period covered, "as of" freshness, or time axis), especially for money-related views.

---

## 1. Voting behaviour & party discipline

**Goal:** See how individual MPs deviate from their party, where factions exist, and which
issues are most contentious.

**Analyses**
- **Deviation rate per MP** — `deviation_rate = (# votes where individual ≠ party) / (# votes where both exist)`.
- **Party cohesion per bill/issue** — `cohesion = 1 − (# cross-party or dissent votes) / (# total votes)`.
- **Issue clusters** — group votes by topic (health, environment, etc.) and see which MPs
  consistently align or dissent within those clusters.

**Graphics**
- Heatmap: MPs × bills/issues, coloured by vote (aye/nay/absent), party as rows.
- Scatter: each MP a point — x = overall deviation rate, y = issue-specific deviation.
- Tree map / bar chart: party cohesion by bill, sorted by lowest cohesion.

Stories: "who is the most independent MP?", "which party is most disciplined?"

---

## 2. Expense patterns & transparency

**Goal:** Understand how MPs and Ministers use public money, spot outliers, and compare by
role/party/electorate.

**Analyses**
- Total expenses per MP/Minister **over time**.
- Category breakdown: travel vs accommodation vs other.
- Electorate vs urban/rural: do MPs from remote electorates have higher travel costs?
- Role effect: Ministers vs ordinary MPs; committee chairs vs others.

**Graphics**
- Bar chart: top 10 MPs/Ministers by total expenses.
- Stacked bar / pie: expense categories per MP or per party.
- Time series: expenses per quarter/year for specific MPs or overall.
- Map: choropleth of NZ by electorate, coloured by average MP expenses.

Questions: "are travel costs higher for rural electorates?", "which party's MPs spend most
on accommodation?"

> **Data note:** source expense data is quarterly (`YYYY-QN`). Time-based views should label
> quarters human-readably (e.g. `Oct–Dec 2025`) and state the coverage range.

---

## 3. Bill authorship & legislative influence

**Goal:** Measure which MPs are most active in initiating legislation and what they sponsor.

**Analyses**
- Bills per MP (proponent count).
- Bill success rate (of sponsored bills, how many reached final passage).
- Topic distribution per MP (social, economic, environmental…).
- Cross-party collaboration: bills with multiple sponsors from different parties.

**Graphics**
- Bar chart: bills sponsored per MP, filtered by party.
- Stacked bar: bill topics per MP or per party.
- Network graph: MPs as nodes, edges = co-sponsorship or joint support.
- Table: "most influential sponsors" by bill count and success rate.

---

## 4. Integrated dashboard: MP profile

**Goal:** For any MP, show a complete picture — voting, expenses, and bill authorship.

**Components**
- Vote summary: total votes, aye/nay/absent, deviation rate vs party, breakdown by issue.
- Expenses: total over time, category breakdown.
- Bills: number sponsored, success rate, topics.

**Graphics**
- Profile page: KPI cards (total votes, expenses, bills); small charts (vote pie, expense
  bar, bills timeline).
- Filters: by year, party, electorate.

Audience: voters, journalists, researchers.

---

## 5. Time-based trends & anomaly detection

**Goal:** See how behaviour changes over time and flag unusual patterns.

**Analyses**
- Trends: expenses per MP over quarters; voting patterns per party over elections.
- Anomalies: MPs with sudden spikes in expenses; bills with unusually low party cohesion.

**Graphics**
- Line charts: expenses over time per MP or per party.
- Control charts: expenses with mean ± 2σ bands to highlight outliers.
- Heatmap over time: votes per party per quarter.

---

## Legal & ethical concerns

### 1. Licensing and reuse rights
- Most data is public government data under the **NZGOAL** framework, typically **Creative
  Commons** (e.g. CC BY 4.0) or "no known rights" statements.
- Check per-source terms: Parliament.nz, data.govt.nz, DIA, Treasury, Stats NZ; and
  aggregators (PublicData.co.nz, voted.nz) which may add their own restrictions.
- **Rules:** respect stated licenses (CC BY requires attribution); never claim ownership of
  original data; keep license notices and source links when redistributing raw datasets.

### 2. Privacy Act 2020 and "personal information"
- Names, roles, and financial data linked to individuals can be personal information.
- Data already publicly released for accountability (MP expenses, voting records) is
  generally intended for public use, but:
  - Don't combine with other sensitive data in ways that create new privacy risks.
  - Avoid publishing in ways that enable harassment or targeted abuse.
- **Rules:** use data for public-interest purposes only; don't republish in a way that eases
  targeting individuals (e.g. geolocation + expenses + personal details); add clear
  disclaimers ("Based on publicly available data from [source]").

### 3. Copyright in derived works
- You can reuse **facts** (vote yes/no, expense amounts, bill titles).
- Do not copy large portions of textual content (full Hansard speeches, detailed
  descriptions) without checking license, and don't redistribute scraped HTML/layouts.
- **Rules:** store only structured data you need; keep source URLs for auditability without
  reproducing large text blocks; attribute sources clearly.

### 4. Accuracy, fairness, and reputational risk
- Simple metrics ("most expensive MP") mislead without context (rural vs urban, role).
- **Rules:** add context (averages, ranges, explanations); use neutral language; include a
  disclaimer that analysis is interpretive and based on public data.

### 5. Scraping and technical compliance
- Respect site terms of use, reasonable rate limits, and explicit anti-scraping prohibitions.
- Prefer official datasets (CSV/JSON on data.govt.nz) and public APIs where available.

---

## Productisation ideas
- Multi-tenant SaaS: media outlets, researchers, civic groups each with a workspace to run
  custom queries, build dashboards, and export reports.
- AI features: "Explain this MP's voting pattern", "Summarize expense trends for this party"
  over the normalized data.
- Use the `nz-politics-data-collector` skill to ingest/normalize data and expose queries and
  filters as API endpoints.
