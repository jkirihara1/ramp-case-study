# Design Spec: Subledger Close Workspace & Rewards Onboarding
**Ramp Financial Systems — Case Study**
**Version:** 5.3 | **Date:** 2026-04-13

---

# Part 1: Subledger Close Workspace

## Overview

### Problem
The current subledger-to-GL pipeline is manual and untraceable:

```
Subledger entries
      |
      v
Google Sheet / Snowflake view
      |
      v
Accountant manually aggregates → formats JE → posts to NetSuite
      |
      v
No linkage between JE and underlying entries.
No audit trail. Hard to reconcile. Hard to trust.
```

### Solution Vision
A dedicated web application that serves as both an **ongoing monitoring workspace** and the **monthly close workspace** for the subledger-to-GL step. Throughout the month, the accounting team monitors data pipeline health and catches issues BEFORE the close. At close, accounting shifts from data processor & reconciler to reviewer — the data is prepared for them; their job is to validate, resolve exceptions, and sign off.

### Core Process Transformation
| Today | With This App |
|-------|--------------|
| Accountant pulls data from Snowflake | Data is prepared and presented automatically |
| Manual aggregation into JE format | JE generated automatically from subledger |
| No linkage from GL JE back to entries | Full drill-through from GL JE to source event |
| No exception tracking | Structured exception queue with materiality quantifications |
| No audit trail for the close step | Every action logged; export history is permanent / immutable |

### Change Management

The core challenge is not technical — it is trust. Accountants who built the current process line by line in a spreadsheet have no reason to trust a system that produces the same numbers automatically. The app addresses this deliberately:

- **Subledger Review** lets accounting reproduce their manual totals by filtering and summing in the app. If the numbers match their spreadsheet, trust builds quickly.
- **JE Preview** shows side-by-side reconciliation between subledger totals and proposed GL lines — the "show your work" step.
- **Bank Reconciliation** ties subledger cash to external bank data — the strongest trust anchor, since it validates against a source accounting doesn't control.
- **Export History** provides the permanent audit trail that spreadsheets never had. Every GL journal is traceable to the subledger entries and source events that produced it.

**Role shift:** With the app, the accountant moves from **data processor** (pulling data, summing columns, typing into NetSuite) to **reviewer and approver** (data prepared for them; their job is to validate, apply judgment to exceptions, and sign off). This is a better use of their expertise — their value is knowing whether the numbers make sense, not in the data wrangling that precedes that judgment.

---

## Key Assumptions & Dependencies

Assumptions and external dependencies that shape the design. Updated as new information is confirmed.

| # | Assumption / Dependency | Source | Date |
|---|------------------------|--------|------|
| A1 | **Part 1 scope is employee spend / card activity only.** No rewards content in Part 1. Rewards (earning, redemption, breakage) is entirely Part 2's domain. | James / Will — April 7 | 2026-04-07 |
| A2 | **Upstream source systems own data accuracy.** The subledger depends on upstream event accuracy, and flags exceptions only for data quality issues (missing fields, duplicates, etc.), not business logic correctness. Finance/accounting owns the accounting treatment (how to book it) but not the determination logic. | Will — April 7 meeting | 2026-04-07 |
| A3 | **Systematic subledger-to-GL integration is not part of this case study scope.** The app produces a structured JE export (CSV); accounting owns the manual posting to NetSuite GL. Systematic GL integration is the long-term vision, but out of scope for Part 1. | Will — April 7 meeting | 2026-04-07 |
| A4 | **Frontend with mock data is the expected scope.** No backend required. Engineering owns backend work; this role is focused on vision and functional design. | Will — April 7 meeting | 2026-04-07 |
| A5 | **Interchange is provided per event by upstream.** The interchange amount (typically 1–3% of transaction) is pre-calculated by Transaction Canonical and included in the event, not derived by the subledger. | Design assumption | 2026-04-07 |
| A6 | **Refunds reverse interchange.** Conservative treatment — refund events reverse both the card AR/payable and the interchange receivable/revenue. Actual treatment depends on Ramp's card network agreements; would confirm during onboarding. | Design assumption | 2026-04-07 |
| A7 | **NetSuite GL has a JE approval workflow.** A manager reviews and approves the JE after it is posted to NetSuite. This app covers JE preparation and upload; the reviewer/approver step lives in NetSuite and is outside this app's scope. | Design assumption | 2026-04-09 |

---

## Mental Model

Everything in the app is organized around a **period**. An accounting period moves through a defined lifecycle:

```
Open → In Review → Exported → Closed
              ↑          |
              └──────────┘
           (Cancel Export reverts to In Review)
```

| Status | Meaning |
|--------|---------|
| **Open** | Entries accumulating; monitoring available; close not started |
| **In Review** | Accounting has begun the close process |
| **Exported** | JE downloaded and sent to NetSuite; period locked |
| **Closed** | Confirmed in NetSuite; fully closed; corrections require reversal in next period |

---

## Navigation Model

**Hub-and-spoke.** The Period Dashboard is home. All six pages are accessible at any time from the navigation bar. The current period status is always visible.

A **period status indicator** in the nav bar shows completion state for each page:

```
[1 Dashboard ✓]  [2 Exceptions ⚠ 3 open]  [3 Subledger Review ✓]  [4 Bank Recon ✓]  [5 JE Preview —]  [6 History]
```

**Contextual warnings** (non-blocking banners) appear when accounting navigates to a later step before completing an earlier one. Example:

> *"Exception Review has 3 unresolved exceptions ($4,200 aggregate impact). You can still review the JE, but you'll be asked to acknowledge open exceptions before approving."*

The **only hard gate** is the Approve button in Component 5 (JE Preview) — accounting must explicitly acknowledge both open exceptions and outstanding bank reconciliation items before export is triggered.

---

## Data Model

### Event Types

| Event Type | Source System | Description |
|---|---|---|
| `card_transaction` | Transaction Canonical | Customer's employee swipes Ramp card; creates receivable from customer, payable to card network, and interchange revenue |
| `reimbursement` | Transaction Canonical | Employee out-of-pocket expense submitted and approved; creates reimbursement expense and payable |
| `statement` | Financial Data Platform | Monthly settlement payment from customer to Ramp; clears the card AR balance |
| `refund` | Transaction Canonical | Merchant refund on a prior card transaction; reverses original entry (AR, payable, interchange) |

### Event-to-Entry Mapping

**card_transaction** ($500 swipe, $12 interchange @ ~2.4%):
| Account | Debit | Credit |
|---|---|---|
| Card Accounts Receivable | $500.00 | |
| Interchange Receivable | $12.00 | |
| Interchange Revenue | | $12.00 |
| Card Network Payable | | $500.00 |

**reimbursement** ($200 employee out-of-pocket expense):
| Account | Debit | Credit |
|---|---|---|
| Reimbursement Receivable | $200.00 | |
| Cash | | $200.00 |

**statement** ($5,000 monthly customer payment):
| Account | Debit | Credit |
|---|---|---|
| Cash | $5,000.00 | |
| Card Accounts Receivable | | $5,000.00 |

**refund** ($100 merchant refund, $2.40 interchange reversed):
| Account | Debit | Credit |
|---|---|---|
| Card Network Payable | $100.00 | |
| Interchange Revenue | $2.40 | |
| Card Accounts Receivable | | $100.00 |
| Interchange Receivable | | $2.40 |

### Entry Structure
```json
{
  "entry_id": "ent_001",
  "event_id": "evt_card_txn_4401",
  "event_type": "card_transaction",
  "effective_date": "2026-03-15",
  "created_date": "2026-03-15",
  "posted_period": "2026-03",
  "entity": "Ramp Financial LLC",
  "data_source": "Transaction Canonical",
  "business_id": "biz_acme_001",
  "business_name": "Acme Corp",
  "merchant_name": "Delta Airlines",
  "processor_id": "proc_marqeta_01",
  "processor_name": "Marqeta",
  "lines": [
    { "account": "Card Accounts Receivable", "gl_account": 12004, "debit": 500.00, "credit": 0 },
    { "account": "Interchange Receivable", "gl_account": 12010, "debit": 12.00, "credit": 0 },
    { "account": "Interchange Revenue", "gl_account": 40100, "debit": 0, "credit": 12.00 },
    { "account": "Card Network Payable", "gl_account": 21001, "debit": 0, "credit": 500.00 }
  ],
  "status": "valid"
}
```

### Account Structure

| Subledger Account | GL Account | GL Number | Type | Entity Routing |
|---|---|---|---|---|
| Card Accounts Receivable | Ramp Customer Receivables - Cards (US) | 12004 | Asset | Ramp Financial LLC |
| Card Accounts Receivable | Ramp Customer Receivables - Cards (CA) | 12005 | Asset | Ramp Canada |
| Interchange Receivable | Interchange Receivable | 12010 | Asset | — |
| Interchange Revenue | Interchange Revenue | 40100 | Revenue | — |
| Card Network Payable | Card Network Payable (US) | 21001 | Liability | Ramp Financial LLC |
| Card Network Payable | Card Network Payable (CA) | 21002 | Liability | Ramp Canada |
| Cash | Cash - Card Settlements (US) | 10100 | Asset | Ramp Financial LLC |
| Cash | Cash - Card Settlements (CA) | 10101 | Asset | Ramp Canada |
| Reimbursement Receivable | Reimbursement Receivable (US) | 12020 | Asset | Ramp Financial LLC |
| Reimbursement Receivable | Reimbursement Receivable (CA) | 12021 | Asset | Ramp Canada |

### Entities
| Entity | Description |
|---|---|
| Ramp Financial LLC | US parent entity |
| Ramp Canada | Canadian subsidiary |

### Handler Governance

A critical design principle: **handler rules are accounting policy, not engineering logic.** The accounting team owns and manages the rules that determine how events become entries. Engineering owns the execution platform (event ingestion, processing, storage); the accounting treatment — which accounts to debit and credit, how to handle edge cases, what GL mappings to use — is an accounting decision.

In practice, handler rules must be:
- **Visible** to accounting — not buried in code, but surfaced in a configuration interface where current rules and their logic are transparent
- **Changeable** by accounting — when policy changes (new GL account, updated rate, new event channel), accounting initiates the change without filing an engineering ticket
- **Versioned** — every change produces a new version with a timestamp; the prior version is preserved; historical entries are never reprocessed under new rules
- **Auditable** — who changed what, when, and why; approval workflows for material changes

**Onboarding a new event type** follows a standard four-step process:
1. **Define the event schema** — what fields does the source system provide? What is the unique identifier? What is the effective date?
2. **Build the handler** — what accounting entries does this event produce? Which accounts are debited and credited?
3. **Configure the GL mapping** — do subledger accounts used by this handler map to existing GL accounts, or do new ones need to be created in NetSuite?
4. **Seed test data and validate** — run the handler against historical data and compare to the manual JE it replaces.

**What makes onboarding hard is not the handler itself** — it is upstream data quality (does the source system reliably populate every required field?), GL mapping decisions (an accounting policy call that must happen before the handler can be built), and new exception types (each event type brings its own failure modes that the exception taxonomy must absorb).

### Seed Data Scenarios
The seed data covers January–March 2026 (complete) + April 2026 (partial, days 1–7):

| Scenario | Coverage |
|----------|----------|
| Card transactions | ~25 valid entries/month across US + CA entities, varying merchants and amounts ($50–$5,000), interchange rates 1–3% |
| Reimbursements | ~8 entries/month |
| Statement payments | 1–2 per customer per month (monthly settlement cycle) |
| Refunds | ~3 entries/month (reversals of prior card transactions) |
| Canadian entity entries | ~5 entries/month (Ramp Canada) |
| Unbalanced entry | 1 entry (DR ≠ CR) — exception scenario |
| Missing GL mapping | 1 entry (unmapped subledger account) — exception scenario |
| Period mismatch | 1 entry (effective date in prior period) — exception scenario |
| Prior period correction | 1 reversal entry in Feb for a Jan error |
| Pipeline gap day | 1 day in March with source events missing from event layer |
| Processing failure day | 1 day in March with events captured but entries failed |
| April partial month | 7 days of card activity + 1 exception for proactive monitoring |

---

## Component 1: Period Dashboard + Pipeline Health

### Purpose
Entry point for the ongoing subledger monitoring throughout the period, and for period-end subledger close. Gives accounting a summary view of the current/prior period's data pipeline status and flags any issues before the subledger review begins.

### Layout

**Top section — Period selector + current period status**
- Period dropdown (e.g., 2026-03, 2026-02, 2026-01)
- Current period status badge (Open / In Review / Exported / Closed)
- Summary cards (4): Total Revenue (interchange), Card Spend Volume, Source System Events, Open Exceptions — all derived from subledger entries for cross-page consistency

**Balance status banner**
Prominent DR = CR indicator displayed below summary cards. Green when balanced; red with variance amount when not. Derived from valid subledger entries only (same dataset as Subledger Review).

**Main section — Daily Pipeline Health visualization**
A day-by-day bar chart for the current period showing three tiers per day:

```
Tier 1: Events generated in source system (upstream count)
Tier 2: Events captured in event layer (did we receive everything?)
Tier 3: Valid subledger entries produced (did processing succeed?)
```

- Gap between Tier 1 and Tier 2 = **pipeline failure** (events lost in transit → engineering owner)
- Gap between Tier 2 and Tier 3 = **processing failure** (handler/validation errors → accounting rules owner)
- Days with any gap highlighted in amber/red; zero-event days flagged as complete outage
- Chart shows illustrative production-scale volume (not tied 1:1 to seed data entries)
- **Data source filter** — defaults to "All Sources" (consolidated view); dropdown allows drill-down to individual source (Transaction Canonical or Financial Data Platform) to isolate pipeline issues

**Flagged Days table**
Displayed below the pipeline chart when any flagged days exist. Columns: Date, Issue (badge: "No data received" / "Pipeline failure" / "Processing failure"), Gap (event count or description), Action ("View exceptions →" link). Allows accounting to triage without reading the chart in detail.

**Bottom section — Prior periods summary**
Simple table showing all recent periods with status, entry count, total revenue, and card spend volume.

### Key Interactions
- Click any flagged day → drills to Exception Review filtered to that day
- Click a prior period row → loads that period across all components

---

## Component 2: Exception Handling Review

### Purpose
Surface all subledger data pipeline and data processing exceptions with enough context for accounting to make materiality judgments and take ownership to facilitate remediation. Does **not** require all exceptions to be resolved before proceeding — accounting applies judgment, documents decisions, and the app captures the audit trail.

### Layout

**Top — Aggregate exposure summary**
- Total open exceptions: count and aggregate $ impact
- Breakdown by exception type
- "Proceed with open exceptions" path available (requires acknowledgment)

**Main — Exception table**
Each exception row contains:

| Field | Description |
|-------|-------------|
| Exception ID | Unique reference |
| Type | Category (see types below) |
| Affected entry/entries | Link to the entry or entries |
| $ Impact | Individual dollar impact on the JE |
| Root cause observation | System-generated explanation of likely cause |
| Recommended action | Suggested next step |
| Status | Open / Under Review / Resolved / Accepted |
| Notes | Free text field for accountant to document decision |

### Exception Taxonomy

**Category 1: Upstream / Source System Issues**
| Type | Description | Likely Owner |
|------|-------------|-------------|
| Incomplete/missing data | No events received for a given day or data source | Engineering / Source System |
| Data quality issue | Event records missing key attributes needed for accounting (e.g., entity, amount, currency) | Engineering / Source System |
| Duplicate source events | Same transaction appears with different source IDs — passes idempotency but could double-book | Engineering |
| Late-arriving events | Events belonging to a prior period that arrive after that period's close | Engineering / Accounting |

**Category 2: Data Pipeline Issues**
| Type | Description | Likely Owner |
|------|-------------|-------------|
| Event layer storage failure | Events generated upstream but not captured in the event layer | Engineering |
| Integration failure/delay | Pipeline timeout, connection failure, or processing delay | Engineering |
| Schema/format change | Upstream system changed event structure; event layer validation rejects records | Engineering / Source System |

**Category 3: Subledger Accounting Issues**
| Type | Description | Likely Owner |
|------|-------------|-------------|
| Unbalanced entry | DR ≠ CR on a single entry | Engineering |
| No defined rule for event | New event type or use case appears in source with no handler configured | Engineering / Accounting |

**Category 4: Subledger to GL Mapping Issues**
| Type | Description | Likely Owner |
|------|-------------|-------------|
| Missing GL mapping | Subledger account has no GL account mapping | Accounting / Systems |
| Mapping ambiguity | Subledger account requires dimension-based routing but dimension is missing or unrecognized | Accounting / Systems |
| Inactive GL account | Mapping points to a GL account that has been deactivated in NetSuite | Accounting / Systems |

**Note on cross-period / close impacts:** Exceptions in categories 1–4 can cause downstream financial impacts (entries posted to closed periods, corrections spanning periods, accrual/estimate true-ups). These are not exception types themselves — they are consequences that should be surfaced in the **Subledger Review** validations to help accounting understand the financial implications of unresolved exceptions.

### Acknowledgment Flow
When accounting proceeds with unresolved exceptions, the app captures:
> *"I acknowledge [N] open exceptions with [$X] aggregate impact and am proceeding with the JE review."*
This acknowledgment is recorded in the period audit log with timestamp and user.

### Expanded Exception Detail
When a user expands an exception card, show enough context for troubleshooting without leaving the app:

- **Event/transaction ID** — upstream reference (e.g., card transaction ID, settlement batch ID) for tracing back to the source system
- **Key event attributes** — varies by exception type: for unbalanced entries, show DR/CR lines; for missing GL mappings, show the unmapped account string; for pipeline gaps, show which source events are missing
- **Timeline** — when the event occurred, when it hit the subledger, when the exception was flagged
- **Related entries** — if the exception produced a partial or reversal entry, link to it

The level of detail depends on what the subledger captures from upstream events. For the prototype, seed representative detail for each exception scenario.

### Exception Download
**Approach:** Summary CSV for triage — a single download of all exceptions with shared columns (exception ID, type, status, period, $ impact, description, resolution notes). The detailed type-specific drill-down stays in-app only.

**Rationale:** A "master" detail download with type-specific schemas (different columns per exception type) gets messy fast — either a wide sparse CSV or multiple tabs. The summary CSV covers the primary use case (tracking, triage, sharing with upstream teams) cleanly. A production version could add type-specific detail exports if needed.

### Closing the Loop

Detection and tracking are necessary but not sufficient. The harder problem is preventing recurrence:

- **Exception trending.** If the same exception type appears month after month, it is not an exception — it is a systemic issue. A quarterly view of exception volume by type and source system makes this visible and creates the basis for upstream improvement conversations.
- **Source system SLAs.** Pipeline health monitoring creates the data to hold upstream systems accountable. "Transaction Canonical delivered 99.8% of events within 2 hours" is a conversation that only happens if it is being measured.
- **Materiality-based judgment.** Not every exception needs to be resolved before close. The acknowledgment flow is intentional — accounting applies judgment, documents the rationale, and proceeds. The aggregate exposure metric supports that call with data rather than intuition. A $50 variance on a $2M period is not worth holding the close for.

---

## Component 3: Subledger Accounting Review

### Purpose
Financial validation of the full period. Accounting reviews the subledger totals across all dimensions and runs sanity checks before moving to JE generation. This is where accounting satisfies themselves the numbers are right.

### Layout

**Top — Balance confirmation**
Prominent DR = CR check for the full period. Must be green before JE review is appropriate.

**Main — Account summary table**
Always grouped by subledger account (sorted by GL number: assets → liabilities → revenue). Filterable by:
- **Entity** (All / Ramp Financial LLC / Ramp Canada)
- **Event Type** (All / card_transaction / reimbursement / statement / refund)
- **Data Source** (All / Transaction Canonical / Financial Data Platform)

Shows Lines, Total DR, and Total CR per account with totals row.

**Flux Analysis** is displayed as a full table above the validation checks panel, showing all accounts (sorted by GL number) with current period, prior period, change, and % change. Accounts exceeding the 15% threshold are highlighted with an amber background and warning icon. Flux analysis is only applicable for completed periods since mid-month flux analysis isn't meaningful or truly comparable.

**Validation panel — Sanity checks**
Displayed as a checklist with pass / warning / fail status. Accounting can expand any item for detail.

| Validation | Description | Implemented |
|------------|-------------|-------------|
| **Balance** | Total DR = Total CR for the period | ✓ pass/fail |
| **Unresolved exceptions** | Count + aggregate $ exposure of open exceptions | ✓ pass/fail |
| **Period boundary** | No entries with effective dates outside the posted period | ✓ pass/warning |
| **Flux / period-over-period** | Current vs. prior period for all accounts (sorted by GL number); significant movements >15% highlighted | ✓ pass/warning + detail table |
| **Interchange rate check** | Interchange revenue / card spend volume should be 1–3% | ✓ pass/warning |
| **Zero-amount entries** | Any entries with $0 amounts flagged for review | ✓ pass/warning |
| **Bank reconciliation** | Cash accounts reconciled to bank/processor balances; count of reconciling items + net exposure | ✓ pass/warning |
| **Orphaned events** | Event layer count vs. entry count by event type — no silent gaps | Future |
| **Handler coverage** | No event types in the event layer without a registered handler | Future |
| **New event types** | Flag any event types appearing this period not seen in prior periods | Future |
| **Reversals matched** | All reversal entries have a corresponding original entry | Future |

**Note:** GL mapping completeness is not a separate validation — unmapped GL accounts are surfaced as exceptions in the Exception Review page.

**Subledger detail** — Full line-level CSV download (one row per account line per entry) with all dimensions. Replaces individual entry table in the UI.

---

## Component 4: Bank Reconciliation

### Purpose
Reconcile subledger cash account balances to bank/processor reported balances. Each entity + processor combination maps to a distinct bank account. Accounting must verify cash ties out to external data before closing.

### Layout

**Top — Summary cards**
Four aggregate metrics across all bank accounts:
- Subledger Cash (Net) — total net cash activity from subledger entries
- Bank Balances (Total) — sum of all bank-reported balances
- Reconciling Items (Net) — net amount of all outstanding reconciling items
- Unexplained Variance — difference after reconciling items (should be zero)

**Top — Reconciliation status**
Overall banner: all reconciled (green) or variance detected (red).

**Main — Bank account cards**
One expandable card per bank account (entity + processor), sorted by entity then processor:

| Bank Account | Entity | Processor | GL |
|---|---|---|---|
| 7291043856 | Ramp Financial LLC (US) | Marqeta | 10100 |
| 3847261095 | Ramp Financial LLC (US) | Citi | 10100 |
| 5618390274 | Ramp Canada | Marqeta | 10101 |
| 9024718563 | Ramp Canada | Citi | 10101 |

Each collapsed card shows: bank account label, account ID, GL number, subledger net, bank balance, reconciling item count, reconciled/variance badge.

**Expanded detail — Reconciliation waterfall**
- Subledger Cash — Net Activity (with debit/credit breakdown)
- Reconciling Items (each with description, type label, signed amount)
- Adjusted Subledger Balance (subledger net + reconciling items)
- Bank Reported Balance
- Unexplained Variance

Reconciling item types:
- **Bank only** — "In bank, not yet in subledger" (e.g., settlement in transit, processor fees)
- **Subledger only** — "In subledger, not yet in bank" (e.g., timing cutoff on reimbursements)

---

## Component 5: GL Journal Entry Preview + Approval

### Purpose
Show accounting exactly what should be posted to NetSuite General Ledger for Subledger Activity, and prove the GL Journal reconciles to the subledger summary. Facilitate the formal user approval / acceptance of the GL Journal before export.

### Layout

**Top — Reconciliation status**
Single indicator: subledger totals match proposed JE totals. Green = ready to approve. Any variance shown prominently.

**Main — Separate JE per data source**
Each data source produces its own JE section with a distinct reference (e.g., `JE-2026-03-TXN_CANONICAL-001`, `JE-2026-03-FIN_DATA-001`). Each section shows:
- Side-by-side reconciliation: JE lines (GL #, GL Account, Entity, Debit, Credit) vs. subledger source account totals
- Reconciled/Variance badge per section

JE references are derived from export history after export, so any edits made during confirmation flow are reflected. CSV download is only available as part of the approval action (no pre-approval downloads).

**Acknowledgement gates**
Before export, accounting must acknowledge two categories of open items (if any exist):
1. **Unresolved exceptions** — count + aggregate $ impact from Exception Review
2. **Bank reconciliation items** — count + net exposure from Bank Reconciliation

Each requires an explicit checkbox acknowledgement. Both are recorded in the export audit trail.

**Bottom — Approval + lifecycle actions**
- **Pre-export:** "Approve & Export All to NetSuite" button (downloads combined CSV with all JEs, distinguished by JE_Reference column). Gated by: reconciliation passing, period not Open, exceptions acknowledged, bank recon items acknowledged.
- **Post-export:** "Cancel Export" (reverts to In Review, marks exports as Cancelled, resets acknowledgements) + "Confirm in NetSuite" (opens confirmation panel with editable JE references, then closes period).
- **Open period:** Export button disabled with inline banner: "Period in progress — export available after period close."
- **Closed period:** Read-only view with "Confirmed" badges.

### Export Output
Structured CSV formatted for NetSuite JE import:
- Header-level memo (not per line)
- Combined CSV columns: JE_Reference, Data_Source, Date, GL_Account_Number, GL_Account_Name, Subsidiary, Debit, Credit
- Individual per-source CSV columns: JE_Reference, Date, GL_Account_Number, GL_Account_Name, Subsidiary, Debit, Credit
- UTF-8 BOM included for Excel compatibility

---

## Component 6: Export History

### Purpose
Permanent, immutable record of every export. Full reverse lineage from NetSuite JE back to subledger entries and source events. Support audit trail for future audits & reviews.

### Layout

**Main — Export log table**
| Column | Description |
|--------|-------------|
| Export ID | Unique reference |
| Period | Which accounting period |
| Data Source | Transaction Canonical / Financial Data Platform |
| Export date/time | When it was triggered |
| Exported by | User |
| Entry count | Number of subledger entries included |
| NetSuite JE ref | Reference number (read-only; set during JE confirmation) |
| Status | Exported / Confirmed in NetSuite / Cancelled |

Sorted by period descending, then export date descending.

**Drill-down**
Click any export → expanded detail showing:
- Period, data source, total DR/CR, NetSuite ref (read-only)
- **GL-to-Subledger Reconciliation** — same format as JE Preview (GL lines vs. subledger source accounts with reconciled/variance indicator)
- Acknowledged exceptions and bank recon items (with notes)
- Subledger entries filtered to that export's data source

Complete reverse lineage from NetSuite JE → GL lines → subledger accounts → individual entries → source events.

---

---

# Part 2: Rewards Onboarding

## Overview

Replace the current 56-line manual monthly JE with first-class event-driven subledger entries for rewards activity. Deliverable is an interactive React app that combines a design document with a 3-month simulation (Jan–Mar 2025) using Ramp's sample data.

The app is tailored to the accounting user who currently owns the manual process — it showcases what their future workflow looks like, not just the technical architecture.

---

## Assumptions (Part 2)

Part 1 assumptions A1–A7 continue to apply. Additional Part 2-specific assumptions:

| # | Assumption | Source | Date |
|---|-----------|--------|------|
| B1 | **Points conversion rate is 100 pts = $1.00.** All point-to-dollar conversions in the simulation use this fixed rate. | Sample data analysis | 2026-04-09 |
| B2 | **Breakage rate of 5% is an illustrative assumption.** In practice, this rate would be determined by actuarial analysis or historical redemption patterns and reviewed quarterly. | Design assumption | 2026-04-09 |
| B3 | **Earn rates are configured per business and currency.** Rates range from 1.0% to 1.5% based on sample config data. The handler uses the configured rate; deviations are flagged as exceptions. | Sample data (config_earn_rate.csv) | 2026-04-09 |
| B4 | **`redemption_amount` = actual cash cost to Ramp, not face value.** Gift card provider discounts (Provider A: ~90%, Provider B: ~80%) are reflected in the source data. The handler reads cost directly from the source — no need to maintain provider discount rates in the handler. The gain (face value − redemption_amount) reduces Rewards Expense (60201). | Will — April 9 email confirmation | 2026-04-09 |
| B5 | **Simulation uses Jan 2025 sample data for month 1, with Feb–Mar synthetically generated** to demonstrate 3-month rollforward behavior including breakage reserve calculations. | Design decision | 2026-04-09 |
| B6 | **Entity is derived from currency: USD = Ramp Financial LLC, CAD = Ramp Canada.** Earning data includes both USD and CAD activity; redemption sample data is USD-only. Canadian redemptions would follow the same handler logic in CAD. FX conversion between entities is not simulated — noted as a future design item. | Will — April 9 email + sample data | 2026-04-13 |
| B7 | **Rewards Breakage is a portfolio-level accounting estimate, not event-driven. There is no expiration on rewards under current terms of service.** A rewards activity rollforward (opening + earned − redeemed = closing) drives a ~5% breakage reserve calculation, producing a true-up JE each period. | Will — April 7 meeting | 2026-04-07 |
| B8 | **Rewards has its own upstream source system**, separate from Transaction Canonical (cards) and Financial Data Platform (banking). Onboarding rewards requires a new data pipeline from this source system into the subledger event layer. | Will — April 7 meeting | 2026-04-07 |
| B9 | **Redemption events carry channel identification.** Each redemption event includes enough information to distinguish statement credits (100% value) from gift card redemptions (80–90% of face value by provider). The handler uses this to apply the correct entry template per channel. | Will — April 7 meeting | 2026-04-07 |

---

## Deliverable

Interactive app (React) — 5 pages combining design approach, handler configuration, and simulated accounting output.

---

## Page Structure

### Page 1: Approach

**Section A — Proposed Solution Design**
Rewards can fit into the same architecture as Part 1, but with new/additional source systems for rewards. Source system event → handler → subledger entry → GL journal entry export. Onboarding rewards requires defining data models for the new event types (earnings, redemptions) and building data pipelines to integrate them into the subledger solution.

Components:
- Event types: Rewards Earning (incl. reversals), Redemption (3 channels)
- Handlers: Earning → Rewards Expense + Rewards Liability; Statement Credit → Rewards Liability + Cash; Gift Card (A/B) → Rewards Liability + Cash + Gain
- Accounts: 60201 Rewards Expense (including redemption gains and breakage), 22001 Rewards Liability, 10100 Cash

**Breakage Reserve note:** Breakage is not event-driven — it is a portfolio-level accounting estimate. The solution directly calculates the reserve balance and generates the required true-up journal entry each period. See Page 4 for methodology and calculation approach.

**Multi-entity note:** Entity is derived from currency — USD = Ramp Financial LLC, CAD = Ramp Canada. Handlers and entry templates are currency-agnostic; the entity dimension flows through from the source event and determines GL mapping at JE generation time.

**Section B — Implementation Approach**
Phased rollout emphasizing co-design with accounting and gradual trust-building. The accountant who produces the JE today is the primary design partner — their expertise shapes the system, and the system earns their trust through demonstrated accuracy.

- **Phase 1: Co-Design** — Partner with the accountant, map every JE line to its source event and accounting rule, document unwritten assumptions
- **Phase 2: Build & Shadow** — Build handlers, run against historical data, compare output to manual JE, investigate every difference
- **Phase 3: Parallel Run** — Both processes run simultaneously for 1–2 close cycles, differences reconciled, trust builds through consistency
- **Phase 4: Primary Cutover** — System becomes primary, accountant shifts to reviewer/approver, manual process retired

---

### Page 2: Handler Rules

Showcase the handler rule configuration for each rewards event type. Key design principle: **handler rules are accounting policy, not engineering logic** — the accounting team owns and manages these rules.

For each handler, display:
- **Event trigger** — what source event activates the handler
- **Entry template** — which accounts are debited/credited, with amount derivation logic
- **Configurable parameters** — earn rate, redemption channel rates, breakage percentage
- **Validation rules** — what the handler checks before producing entries

Handlers to display:
1. **Rewards Earning** — triggered by card transaction clearing; debits Rewards Expense, credits Rewards Liability; amount = transaction amount × earn rate (from config per business/currency). Reversals (negative points) reverse the original entry.
2. **Rewards Redemption — Statement Credit** — triggered by statement credit redemption; debits Rewards Liability, credits Cash; 1:1 value (100 pts = $1.00)
3. **Rewards Redemption — Gift Card (Provider A)** — debits Rewards Liability (face value from points), credits Cash (redemption_amount = actual cost from source), credits Rewards Expense (gain/spread)
4. **Rewards Redemption — Gift Card (Provider B)** — same pattern; source data carries the discounted cost directly; gain reduces Rewards Expense
5. **Breakage Reserve True-Up** — period-end accounting estimate (not event-driven); debits Rewards Liability, credits Rewards Expense (reducing both); calculated from portfolio balance × breakage rate. Direction reverses if reserve decreases.

**Handler Governance:** Each change is versioned with timestamp, prior version preserved, and approval workflow for material changes. Accounting owns the rules; engineering owns the execution platform.

---

### Page 3: Subledger Review (Rewards Activity)

Accountant verification workspace for the period's rewards activity — oriented toward the same review pattern as Part 1's Subledger Review.

**Summary Cards (4):**
- Total Events — earn + reversal + redemption counts
- Net Subledger Activity — total DR (balanced check inline)
- Redemption Gain — gift card spreads credited to 60201
- Open Exceptions — count + aggregate $ exposure

**GL Account Summary:**
Account-level view showing DR, CR, and Net for each GL account (10100, 22001, 60201). Total DR = Total CR balance check. Cross-reference note: "These account totals flow directly into the proposed JE on Page 5."

**Net Earnings by Entity:**
Sub-table showing Gross Earnings → Reversals → Net Earnings per entity (Ramp Financial LLC / Ramp Canada). Reversals proportioned by gross earning share, matching the JE builder logic. Note on USD-only redemption sample data.

**Activity by Event Type:**
Detailed breakdown of all rewards activity for the period, showing Points and $ Value with +/− signs and subtotals:

| Event | Points | $ Value |
|-------|--------|---------|
| Rewards Earning | +X | +$X |
| − Earning Reversal | −(X) | −($X) |
| **= Net Earnings** | X | $X |
| − Redemption — Statement Credit | −(X) | −($X) |
| − Redemption — Provider A | −(X) | −($X) |
| − Redemption — Provider B | −(X) | −($X) |
| **= Total Redemptions** | −(X) | −($X) |

**Redemption Detail by Channel:**
Supplementary table showing Face Value, Cash Paid, and Gain per channel (Statement Credit, Provider A, Provider B) with totals row.

**Flux Analysis** (collapsible):
Period-over-period comparison by GL account — current period, prior period, change, and % change with >15% threshold highlighting. Only shown when prior period data is available.

**Exceptions:**
Known data quality scenarios with status badges (Open, Under Review, Resolved) and dollar impact per exception.

**Validation Checks** (8 checks, same pattern as Part 1):
- Balance (DR = CR)
- Earn Rate Consistency (deviation events flagged with $ impact)
- Unresolved Exceptions (count + aggregate $ exposure)
- Reversal Rate (reversals as % of total earnings; warn >10%, fail >15%)
- Redemption Completeness (all redemptions have valid channel and initiator)
- Points Balance Reconciliation (opening + earned − reversed − redeemed = closing)
- Business Config Coverage (all earning businesses have a configured earn rate)
- Flux Analysis (accounts with >15% period-over-period movement)

**Note on filters:** Period selector is in the sidebar (app-level). Business ID and channel filters were scoped out; future state.

---

### Page 4: Breakage Reserve

Combines the rewards liability rollforward with the breakage reserve calculation.

**Section A — Rewards Liability Rollforward**
Collapsible 3-month comparative showing actual outstanding points:

| Line | Description | Jan | Feb | Mar |
|------|-------------|-----|-----|-----|
| | **Opening Balance** | — | X | X |
| + | Points Earned | X | X | X |
| − | Points Reversed | (X) | (X) | (X) |
| − | Points Redeemed | (X) | (X) | (X) |
| = | **Closing Balance** | X | X | X |

Displayed in both points and dollar amounts ($1.00 = 100 pts). Note: breakage is excluded from the rollforward — it is a GL-level accounting estimate, not a points-level deduction. The rollforward tracks actual outstanding points only.

**Section B — Methodology**
- Breakage rate assumption: ~5% of earned points will never be redeemed
- Basis: portfolio-level (not per-business)
- Applied to: outstanding points balance at period end
- No point expiration under current terms (per B7) — breakage is a behavioral estimate, not a contractual one

**Section C — Current Period Calculation**
| Line | Description | Amount |
|------|-------------|--------|
| | Outstanding points balance (end of period) | X pts |
| | Breakage rate | 5% |
| | **Current period calculated reserve** | **$X,XXX** |

**Section D — True-Up Calculation**
| Line | Description | Amount |
|------|-------------|--------|
| A | Prior period reserve balance (from GL) | $X,XXX |
| B | Current period calculated reserve | $X,XXX |
| C | **True-up amount (B − A)** | **$XXX** |

- Positive C → additional reserve needed: DR Rewards Liability (22001), CR Rewards Expense (60201)
- Negative C → reserve release (reverse direction)
- Cross-reference: "This true-up amount flows to the JE Preview on Page 5."

---

### Page 5: JE Preview

The culmination — the system-generated JE that replaces the 56-line manual process. Separate JE per legal entity.

**Source-to-JE Reconciliation panel:**
Maps each source amount (net earnings, statement credits, provider redemptions, breakage true-up) to the corresponding JE lines with match confirmation.

**Per-entity JEs:**

*JE-{period}-REWARDS-US (Ramp Financial LLC, USD):*
- Earning lines: Rewards Expense (DR) / Rewards Liability (CR) for net USD earnings
- Redemption lines per channel: Rewards Liability (DR) / Cash (CR) + Rewards Expense — Redemption Gain (CR)
- Breakage true-up: Rewards Liability (DR) / Rewards Expense (CR)

*JE-{period}-REWARDS-CA (Ramp Canada, CAD):*
- Earning lines: Rewards Expense (DR) / Rewards Liability (CR) for net CAD earnings

Each JE independently balanced (DR = CR). Lines grouped by source handler with balanced check per entity.

**Before/After comparison:**
- "Before" column: 56 journal lines manually prepared, single combined JE, no audit trail, offline breakage, manual gain calculation
- "After" column: separate JE per entity, auto-generated from source events, full traceability, systematic breakage, per-event gain computation
- Key message: "56 manual JE lines → N auto-generated lines across 2 entities with full traceability and source-to-JE reconciliation"

**Design decision — Approval & Export workflow:** In a production build, this page would include the same approval and export workflow demonstrated in Part 1 (acknowledge exceptions → approve → download CSV → confirm in NetSuite). For the purposes of this case study, the approval workflow is not replicated in Part 2 since the focus is on the rewards onboarding design and accounting approach, not the close workflow mechanics which are already demonstrated in Part 1.

---

## Seed Data

### Source Data (from Ramp)
- `card/transactions.csv` — 1,571 card transactions (Jan 2025), used to link earning events to card activity
- `rewards/earning_transactions.csv` — 1,468 earning events (Jan–Feb 2025), points earned/reversed per card transaction
- `rewards/redemptions.csv` — 56 redemption events (Jan 2025): 26 statement credits, 19 Provider A, 11 Provider B
- `rewards/config_earn_rate.csv` — 42 earn rate configs (36 businesses, rates: 1.0%, 1.25%, 1.5%)

### Simulation Approach
- **Month 1 (Jan 2025):** Process actual sample data through handlers to produce subledger entries
- **Months 2–3 (Feb–Mar 2025):** Generate synthetic data with similar volume and distribution, applying slight growth trends to demonstrate rollforward behavior and breakage reserve trending

### Known Data Quality Scenarios
- Earning ID 700486: multiplier 1.5× vs. configured rate 1.25% — flagged as earn rate deviation exception
- Redemption 850010: missing `initiated_by` field — flagged as data quality exception
- Redemption 850054: $5,000 statement credit (500,000 points) — unusually large; flagged for review

---

## Edge Cases & Design Considerations

Scenarios the rewards subledger must handle beyond the core happy path. Organized by category with proposed handling approach.

### Data Quality

| Scenario | Description | Proposed Handling |
|----------|-------------|-------------------|
| **Earn rate deviation** | Actual earn rate on a transaction differs from configured rate (e.g., 1.5× multiplier vs. 1.25% config). Could indicate a promotional rate, business override, or data error. | Flag as exception with deviation amount. Handler still processes the entry using the source amount (upstream owns the earn rate). Accountant investigates — if legitimate (promo/override), resolves with note; if error, escalates to upstream for correction. |
| **Missing required fields** | Source event missing critical fields (e.g., `business_id`, `currency`, `initiated_by`). | Handler rejects the event and creates an exception. No subledger entry produced until data is corrected upstream and event is reprocessed. |
| **Unusual amounts** | Single transaction with abnormally high point value (e.g., 500,000 pts / $5,000 statement credit). | Configurable threshold check in handler. Events exceeding threshold are processed but flagged for manual review. Threshold is set per event type (earn vs. redeem) and reviewed quarterly. |
| **Late-arriving events** | Source events arriving after the period has been closed (e.g., a January earning event arriving in February's feed). | Events are booked in the period they arrive (accounting principle: book when known). If material and relates to a closed period, the correction flows through the current open period with a memo reference to the original period. |
| **Duplicate events** | Same source event ID appearing multiple times in a feed. | Handler enforces idempotency on source event ID. Second occurrence is rejected with a duplicate exception. No double-booking. |
| **Negative points balance** | A business's cumulative points balance goes negative due to reversals exceeding earnings (e.g., bulk transaction reversal after partial redemption). | Handler allows negative balance at the transaction level but flags as exception. Accountant reviews — may indicate a reversal timing issue or upstream data error. Negative balances should not persist at period close. |
| **Unknown business** | Earning event references a `business_id` not present in the earn rate configuration. | Handler uses a default earn rate (if configured) and flags as exception. Alternatively, handler rejects the event entirely. Design decision depends on volume — if rare, reject; if frequent during onboarding, use default + flag. |

### Redemption-Specific

| Scenario | Description | Proposed Handling |
|----------|-------------|-------------------|
| **Provider cost outside expected range** | Gift card `redemption_amount` implies a discount rate significantly different from expected (~90% for Provider A, ~80% for Provider B). Could indicate a new provider deal, data error, or provider issue. | Handler processes using the source `redemption_amount` (source of truth for cost) but flags if the implied discount rate falls outside a configurable tolerance band (e.g., ±5% of expected). Accountant reviews before close. |
| **SYSTEM-initiated redemptions** | Redemptions not initiated by a user (e.g., auto-redemptions triggered by system rules, account closures, or balance sweeps). | Handler processes identically to user-initiated redemptions. `initiated_by = SYSTEM` is captured as an attribute on the subledger entry for audit trail. Volume of system-initiated redemptions tracked as a validation metric. |
| **Partial redemption failure** | A redemption event is received but the downstream fulfillment (gift card delivery, statement credit posting) fails. | Depends on upstream system design. If the source system sends the event only after successful fulfillment, no action needed. If sent before fulfillment, the subledger may need a reversal event on failure. Design requires clarification with the rewards source system team. |
| **New redemption channel** | A fourth redemption channel is introduced (e.g., charitable donations, travel credits). | New handler rule created following the same pattern: define event trigger, entry template (which accounts, amount logic), and validation rules. Requires accounting sign-off on GL treatment before activation. Handler versioning ensures the new channel doesn't affect existing channels. |

### Change Management

| Scenario | Description | Proposed Handling |
|----------|-------------|-------------------|
| **Earn rate change mid-period** | A business's configured earn rate changes partway through a month (e.g., 1.25% → 1.50% effective March 15). | Handler uses the rate effective at the time of the source event (event date drives rate lookup). Earn rate configuration supports effective dating. Mid-period changes produce a natural mix of rates within the same period — the flux analysis surfaces this as an expected variance. |
| **Breakage rate revision** | Actuarial review or business decision changes the breakage rate assumption (e.g., 5% → 4%). | New rate applies prospectively starting the next period. The true-up calculation naturally adjusts: if the new rate produces a lower reserve, the true-up releases the excess (DR Rewards Expense, CR Rewards Liability). The change and rationale are documented in the handler version history. |
| **New entity onboarding** | A third legal entity is added (e.g., Ramp UK Ltd with GBP). | Entity derivation rule extended (GBP = Ramp UK Ltd). New GL accounts provisioned for the entity. Handlers are currency-agnostic — no handler changes needed. JE generation automatically creates a third entity JE. Requires GL mapping configuration and accounting review of any FX implications. |
| **Handler rule correction** | A bug is discovered in a handler's entry template (e.g., wrong GL account for a specific scenario). | Fix the handler rule with a new version. For entries already posted in the current open period: reprocess affected events through the corrected handler, generating reversal entries for the incorrect postings and new entries with the correct GL treatment. For closed periods: book the correction in the current period with memo reference. |
| **GL account reclassification** | Finance decides to split an account or remap subledger accounts to different GL numbers (e.g., separating domestic vs. international rewards expense). | GL mapping configuration updated with effective date. New mapping applies to entries generated after the effective date. Prior period entries retain original GL mapping. If restatement is required, that is a separate accounting process outside the subledger's automated flow. |

### Period & Close

| Scenario | Description | Proposed Handling |
|----------|-------------|-------------------|
| **Corrections spanning closed periods** | An error is discovered in a prior closed period (e.g., January earnings were overstated by $10,000, discovered in March). | Correction booked in the current open period as a prior-period adjustment. Entry includes memo referencing the original period and error. Materiality assessment determines whether the prior period's JE needs to be restated in NetSuite (outside subledger scope — accounting judgment call). |
| **Restatement** | A material error requires restating a previously closed and reported period. | Restatement is a GL-level process, not a subledger operation. The subledger's role is to: (1) provide the corrected entries for the restated period, (2) maintain the audit trail showing the original and corrected entries, and (3) flag the affected period in the close status. Actual GL restatement happens in NetSuite. |
| **Period cutoff disputes** | Disagreement about whether an event belongs in the current or prior period (e.g., a redemption processed at 11:59 PM on January 31 but not received until February 1). | The subledger books based on the event's effective date from the source system. If the source system assigns January 31, the entry goes to January. Cutoff rules are defined at the source system level and documented in the handler specification. Period boundary validation check (already in Subledger Review) flags any events with dates outside the posted period. |

---

---

# Appendix: Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React (Vite) | Fast scaffold, modern, matches Ramp tooling |
| Styling | Tailwind CSS | Rapid UI without custom CSS overhead |
| Charts | Recharts | React-native charting for pipeline health viz |
| State | React useState/useContext | No backend needed; in-memory state |
| Data | Local JSON seed files | Portable, no backend, fully self-contained |
| Export | Client-side CSV generation | No backend required |
