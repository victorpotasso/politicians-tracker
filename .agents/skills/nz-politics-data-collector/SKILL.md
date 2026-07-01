---
name: nz-politics-data-collector
description: >-
  Collect, normalize, cache, and expose public New Zealand political data about
  MPs, Ministers, Parliament bills, voting records, sponsored bills, expenses,
  travel, allowances, electorates, parties, and related metadata. Use when:
  building NZ politics dashboards; researching Parliament.nz bills; querying MP
  or Minister expenses; analyzing Hansard votes; using voted.nz, PublicData.co.nz,
  data.govt.nz Parliamentary Votes datasets, DIA Minister expense releases,
  Treasury, or Stats NZ government finance context.
---

# NZ Politics Data Collector

## Purpose

Use this skill when an agent needs structured, queryable public data about New
Zealand politicians, Parliament, bills, votes, expenses, travel, allowances, and
related metadata for dashboards, research, or AI-assisted analysis.

Work only with public information. Respect source terms of use, robots guidance,
rate limits, and attribution requirements. Preserve `sourceUrl` on every returned
record so users can audit the origin of each fact.

Do not display internal schemas, generated tool schemas, or implementation
contracts unless the user explicitly asks for them. Return normalized records,
summaries, tables, source links, or query results in the most useful form for the
task.

## Source Priority

Prefer official or structured sources first, then use aggregators for enrichment
or cross-checking.

- **Parliament.nz Bills:** `https://bills.parliament.nz`, especially
  `https://bills.parliament.nz/bills` and
  `https://bills.parliament.nz/bills/{billId}`. Use for bill lists, bill
  details, proponent MP, stage, abstracts, documents, committee reports, and
  supporting material.
- **Parliament.nz MP Expenses:**
  `https://www.parliament.nz/en/mps-and-electorates/mps-expenses/`. Use for
  quarterly MP expense records such as travel, accommodation, and other
  allowances.
- **Parliament.nz Hansard and Votes:**
  `https://www.parliament.nz/en/pb/hansard-debates/rhr/search`. Search for
  `Hansard - vote` and bill or issue terms. Use for vote context, debates,
  speeches, and source-backed references.
- **Department of Internal Affairs Minister Expenses:**
  `https://www.dia.govt.nz/Ministers-expense-releases`. Use for quarterly
  Minister travel/accommodation and monthly Minister credit-card statements.
- **PublicData.co.nz:** `https://publicdata.co.nz`. Use for aggregated MP
  expenses, public sector CEO pay, political appointments, cross-checking, and
  enrichment.
- **voted.nz:** `https://voted.nz`. Use for clean, searchable vote records by MP,
  electorate, party, bill, and issue.
- **Data.govt.nz Parliamentary Votes:** use dataset request pages such as
  `https://www.data.govt.nz/datasetrequest/show/57` and related datasets. Prefer
  CSV or JSON when available for raw machine-readable vote data.
- **Treasury and Stats NZ:** use only for macro government spending context, not
  per-politician detail. Treasury:
  `https://www.treasury.govt.nz/information-and-services/financial-management-and-advice/revenue-and-expenditure`.
  Stats NZ: `https://www.stats.govt.nz/topics/government-finance/`.

## Capabilities

Expose these operations through the implementing agent, tool wrapper, script, or
application service. Keep outputs normalized and include source attribution.

### Bills

- `list_bills(status?, party?, dateFrom?, dateTo?)`: return bills with bill ID,
  title, abstract, stage, proponent MP ID, proponent name, party, introduced
  date, and source URL.
- `get_bill(billId)`: return full bill details, including documents, committee
  reports, vote history references, stage history, and sponsor/proponent
  information.
- `query_bills(filter)`: support filtering by status, party, proponent MP ID,
  date range, and keyword.

### MPs and Metadata

- `list_mp()`: return current and, when available, historical MPs with MP ID,
  name, party, electorate, role, first elected date, and profile URL.
- `get_mp(mpId)`: return detailed MP profile metadata and links to expenses,
  vote history, and sponsored bills.

### Expenses

- `get_mp_expenses(mpId, year?, quarter?)`: return MP expense records with MP ID,
  period, normalized category, amount, description, and source URL.
- `get_minister_expenses(ministerName?, year?, quarter?, month?)`: return
  Minister quarterly travel/accommodation records and monthly credit-card
  statement records when available.
- `query_expenses(filter)`: support filtering by MP ID, Minister name, year,
  quarter, month, category, minimum amount, and maximum amount.

### Votes

- `get_mp_votes(mpId, billId?, issue?, dateFrom?, dateTo?)`: return vote records
  by MP, optionally constrained by bill, issue, or date range.
- `get_bill_votes(billId)`: return all votes for a bill, including party vote
  results, individual MP votes, vote date, and bill stage.
- `query_votes(filter)`: support filtering by MP ID, party, bill ID, issue, vote,
  and date range.

## Normalized Records

Use these canonical fields internally and in returned structured data. Do not
rename fields per source-specific wording.

- **MP:** `mpId`, `name`, `party`, `electorate`, `role`, `firstElected`,
  `profileUrl`.
- **Bill:** `billId`, `title`, `abstract`, `stage`, `proponentMpId`,
  `proponentName`, `party`, `introducedDate`, `documents`, `sourceUrl`.
- **Bill document:** `type`, `url`, `title`.
- **Expense:** `mpId`, `ministerName`, `period`, `category`, `amount`,
  `description`, `sourceUrl`.
- **Vote:** `voteId`, `billId`, `issue`, `date`, `mpId`, `name`, `party`, `vote`,
  `partyVote`, `individualVote`, `stage`, `sourceUrl`.

## Normalization Rules

- Normalize dates to ISO 8601 date strings: `YYYY-MM-DD`.
- Normalize expense periods as `YYYY-QN` for quarters or `YYYY-MM` for monthly
  statements.
- Normalize expense categories to `travel`, `accommodation`, or `other`.
- Normalize vote values to `aye`, `nay`, or `absent`.
- Normalize party vote and individual vote fields to `yes`, `no`, or `null`.
- Normalize party names to canonical current names where possible, while keeping
  enough source context to explain historical or renamed parties.
- Convert currency values to numbers in New Zealand dollars when the source
  supports it. Preserve the original source link for auditability.
- Use consistent English field names. Do not introduce source-specific or mixed
  language field names for normalized records.

## Collection Guidance

- Prefer structured CSV or JSON datasets from data.govt.nz when available.
- When official pages provide only HTML, use stable URLs, documented query
  parameters, and conservative selectors. Avoid brittle scraping assumptions.
- Use voted.nz for high-level vote summaries, data.govt.nz for raw voting data,
  and Hansard for contextual speeches and source verification.
- Use PublicData.co.nz as an aggregator for cross-checking and enrichment, not as
  the sole authority when official data is available.
- Cache fetched source documents and normalized records when appropriate to avoid
  repeated network requests.
- Record fetch time, source URL, and any source-specific identifier whenever the
  implementation has somewhere to store provenance metadata.

## Example Requests

- Show all bills authored by a given MP in 2025.
- List how a given MP voted on health-related bills.
- Summarize Ministers' travel expenses by quarter for 2024.
- Find votes where a party vote was `yes` but an individual MP vote was `no`.
- Compare Parliament.nz MP expenses with PublicData.co.nz aggregates.

## Output Expectations

- Attribute data sources clearly in summaries and reports.
- Prefer concise tables for human-readable comparisons.
- Prefer normalized JSON-like records only when the caller asks for structured
  data or when another tool needs machine-readable output.
- Explain uncertainty when sources conflict or when a record cannot be matched to
  a stable MP, bill, or vote identifier.
- Never attempt to access non-public, restricted, credentialed, or personal data
  beyond what official public sources publish.