// ── Account mappings ─────────────────────────────────────────────────────────
export const glMappings = [
  { subledgerAccount: "Card Accounts Receivable", entity: "Ramp Financial LLC", glAccount: "Ramp Customer Receivables - Cards (US)", glNumber: 12004, type: "Asset" },
  { subledgerAccount: "Card Accounts Receivable", entity: "Ramp Canada", glAccount: "Ramp Customer Receivables - Cards (CA)", glNumber: 12005, type: "Asset" },
  { subledgerAccount: "Interchange Receivable", entity: null, glAccount: "Interchange Receivable", glNumber: 12010, type: "Asset" },
  { subledgerAccount: "Interchange Revenue", entity: null, glAccount: "Interchange Revenue", glNumber: 40100, type: "Revenue" },
  { subledgerAccount: "Card Network Payable", entity: "Ramp Financial LLC", glAccount: "Card Network Payable (US)", glNumber: 21001, type: "Liability" },
  { subledgerAccount: "Card Network Payable", entity: "Ramp Canada", glAccount: "Card Network Payable (CA)", glNumber: 21002, type: "Liability" },
  { subledgerAccount: "Cash", entity: "Ramp Financial LLC", glAccount: "Cash - Card Settlements (US)", glNumber: 10100, type: "Asset" },
  { subledgerAccount: "Cash", entity: "Ramp Canada", glAccount: "Cash - Card Settlements (CA)", glNumber: 10101, type: "Asset" },
  { subledgerAccount: "Reimbursement Receivable", entity: "Ramp Financial LLC", glAccount: "Reimbursement Receivable (US)", glNumber: 12020, type: "Asset" },
  { subledgerAccount: "Reimbursement Receivable", entity: "Ramp Canada", glAccount: "Reimbursement Receivable (CA)", glNumber: 12021, type: "Asset" },
];

// ── Helper ───────────────────────────────────────────────────────────────────
let _entryId = 0;
let _eventId = 0;
const eid = () => `ent_${String(++_entryId).padStart(4, "0")}`;
const evid = (prefix) => `evt_${prefix}_${String(++_eventId).padStart(4, "0")}`;

function makeEntry({ eventType, eventPrefix, effectiveDate, createdDate, postedPeriod, entity, businessId, businessName, merchantName, processorId, processorName, lines, status = "valid", dataSource = "Transaction Canonical" }) {
  return {
    entry_id: eid(),
    event_id: evid(eventPrefix),
    event_type: eventType,
    effective_date: effectiveDate,
    created_date: createdDate || effectiveDate,
    posted_period: postedPeriod,
    entity,
    business_id: businessId,
    business_name: businessName,
    merchant_name: merchantName || null,
    processor_id: processorId || null,
    processor_name: processorName || null,
    data_source: dataSource,
    lines,
    status,
  };
}

// ── Business names pool ──────────────────────────────────────────────────────
const usBusinesses = [
  { id: "biz_acme_001", name: "Acme Corp" },
  { id: "biz_globex_002", name: "Globex Industries" },
  { id: "biz_initech_003", name: "Initech LLC" },
  { id: "biz_umbrella_004", name: "Umbrella Holdings" },
  { id: "biz_stark_005", name: "Stark Enterprises" },
  { id: "biz_wayne_006", name: "Wayne Industries" },
  { id: "biz_cyberdyne_007", name: "Cyberdyne Systems" },
  { id: "biz_oscorp_008", name: "Oscorp Technologies" },
];

const caBusinesses = [
  { id: "biz_maple_101", name: "Maple Leaf Corp" },
  { id: "biz_northern_102", name: "Northern Analytics Inc" },
  { id: "biz_pacific_103", name: "Pacific Rim Trading" },
];

const merchants = [
  "Delta Airlines", "United Airlines", "Hilton Hotels", "Marriott International",
  "Amazon Web Services", "Google Cloud", "Microsoft Azure", "Salesforce",
  "WeWork", "Uber Business", "DoorDash Corporate", "Staples",
  "FedEx", "UPS", "Southwest Airlines", "American Airlines",
  "Zoom Video", "Slack Technologies", "Adobe Systems", "Atlassian",
  "Home Depot", "Office Depot", "Best Buy Business", "Dell Technologies",
];

// ── Deterministic pseudo-random (seeded) ─────────────────────────────────────
function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
const rand = seededRandom(42);
const randBetween = (min, max) => Math.round((min + rand() * (max - min)) * 100) / 100;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randRate = () => Math.round((0.01 + rand() * 0.02) * 1000) / 1000; // 1.0%–3.0%

const processors = [
  { id: "proc_marqeta_01", name: "Marqeta" },
  { id: "proc_citi_02", name: "Citi" },
];

// ── Generate entries ─────────────────────────────────────────────────────────
const entries = [];

// Track card transactions per customer per period for statement generation
const cardTxnsByCustomerPeriod = {};

const periods = [
  { period: "2026-01", days: 31 },
  { period: "2026-02", days: 28 },
  { period: "2026-03", days: 31 },
  { period: "2026-04", days: 7 },  // partial month — proactive monitoring
];

for (const { period, days } of periods) {
  const [year, month] = period.split("-");
  const isPartial = period === "2026-04";
  const txnCount = isPartial ? 8 : 25;
  const reimbCount = isPartial ? 2 : 8;
  const refundCount = isPartial ? 1 : 3;

  // ── Card Transactions ──────────────────────────────────────────────────────
  for (let i = 0; i < txnCount; i++) {
    const day = String(Math.min(Math.floor(rand() * days) + 1, days)).padStart(2, "0");
    const isCA = isPartial ? (i >= 6) : (i >= 20); // ~5 CA per full month, ~2 for partial
    const biz = isCA ? pick(caBusinesses) : pick(usBusinesses);
    const entity = isCA ? "Ramp Canada" : "Ramp Financial LLC";
    const merchant = pick(merchants);
    const processor = pick(processors);
    const txnAmount = randBetween(50, 5000);
    const interchangeRate = randRate();
    const interchangeAmt = Math.round(txnAmount * interchangeRate * 100) / 100;
    const glAR = isCA ? 12005 : 12004;
    const glPayable = isCA ? 21002 : 21001;

    // Track for statement generation
    const custKey = `${biz.id}_${period}`;
    if (!cardTxnsByCustomerPeriod[custKey]) {
      cardTxnsByCustomerPeriod[custKey] = { entity, total: 0 };
    }
    cardTxnsByCustomerPeriod[custKey].total += txnAmount;

    entries.push(makeEntry({
      eventType: "card_transaction",
      eventPrefix: "card_txn",
      effectiveDate: `${year}-${month}-${day}`,
      postedPeriod: period,
      entity,
      businessId: biz.id,
      businessName: biz.name,
      merchantName: merchant,
      processorId: processor.id,
      processorName: processor.name,
      lines: [
        { account: "Card Accounts Receivable", gl_account: glAR, debit: txnAmount, credit: 0 },
        { account: "Interchange Receivable", gl_account: 12010, debit: interchangeAmt, credit: 0 },
        { account: "Interchange Revenue", gl_account: 40100, debit: 0, credit: interchangeAmt },
        { account: "Card Network Payable", gl_account: glPayable, debit: 0, credit: txnAmount },
      ],
    }));
  }

  // ── Reimbursements ─────────────────────────────────────────────────────────
  for (let i = 0; i < reimbCount; i++) {
    const day = String(Math.min(Math.floor(rand() * days) + 1, days)).padStart(2, "0");
    const isCA = isPartial ? false : (i >= 6);
    const biz = isCA ? pick(caBusinesses) : pick(usBusinesses);
    const entity = isCA ? "Ramp Canada" : "Ramp Financial LLC";
    const merchant = pick(merchants);
    const processor = pick(processors);
    const amt = randBetween(25, 800);
    const glReceivable = isCA ? 12021 : 12020;
    const glCash = isCA ? 10101 : 10100;

    entries.push(makeEntry({
      eventType: "reimbursement",
      eventPrefix: "reimb",
      effectiveDate: `${year}-${month}-${day}`,
      postedPeriod: period,
      entity,
      businessId: biz.id,
      businessName: biz.name,
      merchantName: merchant,
      processorId: processor.id,
      processorName: processor.name,
      lines: [
        { account: "Reimbursement Receivable", gl_account: glReceivable, debit: amt, credit: 0 },
        { account: "Cash", gl_account: glCash, debit: 0, credit: amt },
      ],
    }));
  }

  // ── Refunds ────────────────────────────────────────────────────────────────
  for (let i = 0; i < refundCount; i++) {
    const day = String(Math.min(Math.floor(rand() * days) + 1, days)).padStart(2, "0");
    const biz = pick(usBusinesses);
    const entity = "Ramp Financial LLC";
    const merchant = pick(merchants);
    const processor = pick(processors);
    const refundAmt = randBetween(30, 500);
    const interchangeRate = randRate();
    const interchangeAmt = Math.round(refundAmt * interchangeRate * 100) / 100;

    entries.push(makeEntry({
      eventType: "refund",
      eventPrefix: "refund",
      effectiveDate: `${year}-${month}-${day}`,
      postedPeriod: period,
      entity,
      businessId: biz.id,
      businessName: biz.name,
      merchantName: merchant,
      processorId: processor.id,
      processorName: processor.name,
      lines: [
        { account: "Card Network Payable", gl_account: 21001, debit: refundAmt, credit: 0 },
        { account: "Interchange Revenue", gl_account: 40100, debit: interchangeAmt, credit: 0 },
        { account: "Card Accounts Receivable", gl_account: 12004, debit: 0, credit: refundAmt },
        { account: "Interchange Receivable", gl_account: 12010, debit: 0, credit: interchangeAmt },
      ],
    }));
  }

  // ── Statement Payments (monthly settlement — only for completed months) ───
  if (!isPartial) {
    // Statements settle the prior month's card activity; for Jan we simulate prior balances
    const priorPeriod = period === "2026-01" ? "2025-12" : periods[periods.findIndex(p => p.period === period) - 1]?.period;

    // Pick 4-6 customers to generate statement payments
    const statementCustomers = isPartial ? [] : [...usBusinesses.slice(0, 4), ...caBusinesses.slice(0, 1)];
    for (const biz of statementCustomers) {
      const day = String(Math.min(Math.floor(rand() * 10) + 15, days)).padStart(2, "0"); // mid-to-late month
      const isCA = caBusinesses.some(c => c.id === biz.id);
      const entity = isCA ? "Ramp Canada" : "Ramp Financial LLC";
      const processor = pick(processors);
      const glAR = isCA ? 12005 : 12004;
      const glCash = isCA ? 10101 : 10100;
      // Statement amount: approximate prior month card activity + some variance
      const stmtAmount = randBetween(2000, 15000);

      entries.push(makeEntry({
        eventType: "statement",
        eventPrefix: "stmt",
        effectiveDate: `${year}-${month}-${day}`,
        postedPeriod: period,
        entity,
        businessId: biz.id,
        businessName: biz.name,
        processorId: processor.id,
        processorName: processor.name,
        dataSource: "Financial Data Platform",
        lines: [
          { account: "Cash", gl_account: glCash, debit: stmtAmount, credit: 0 },
          { account: "Card Accounts Receivable", gl_account: glAR, debit: 0, credit: stmtAmount },
        ],
      }));
    }
  }
}

// ── Exception scenarios ──────────────────────────────────────────────────────

// 1. Unbalanced entry (March — DR ≠ CR on a card transaction)
entries.push(makeEntry({
  eventType: "card_transaction",
  eventPrefix: "card_txn",
  effectiveDate: "2026-03-12",
  postedPeriod: "2026-03",
  entity: "Ramp Financial LLC",
  businessId: "biz_acme_001",
  businessName: "Acme Corp",
  merchantName: "WeWork",
  processorId: "proc_marqeta_01",
  processorName: "Marqeta",
  status: "exception",
  lines: [
    { account: "Card Accounts Receivable", gl_account: 12004, debit: 1250.00, credit: 0 },
    { account: "Interchange Receivable", gl_account: 12010, debit: 30.00, credit: 0 },
    { account: "Interchange Revenue", gl_account: 40100, debit: 0, credit: 30.00 },
    { account: "Card Network Payable", gl_account: 21001, debit: 0, credit: 1245.00 },
  ],
}));

// 2. Missing GL mapping (March — new subledger account with no mapping)
entries.push(makeEntry({
  eventType: "card_transaction",
  eventPrefix: "card_txn",
  effectiveDate: "2026-03-18",
  postedPeriod: "2026-03",
  entity: "Ramp Financial LLC",
  businessId: "biz_globex_002",
  businessName: "Globex Industries",
  merchantName: "Salesforce",
  processorId: "proc_citi_02",
  processorName: "Citi",
  status: "exception",
  lines: [
    { account: "Card Accounts Receivable", gl_account: 12004, debit: 3200.00, credit: 0 },
    { account: "Interchange Receivable", gl_account: 12010, debit: 64.00, credit: 0 },
    { account: "Premium Interchange Revenue", gl_account: null, debit: 0, credit: 64.00 },
    { account: "Card Network Payable", gl_account: 21001, debit: 0, credit: 3200.00 },
  ],
}));

// 3. Period mismatch (Feb entry for a Jan effective date — late-arriving event)
entries.push(makeEntry({
  eventType: "card_transaction",
  eventPrefix: "card_txn",
  effectiveDate: "2026-01-28",
  createdDate: "2026-02-02",
  postedPeriod: "2026-02",
  entity: "Ramp Financial LLC",
  businessId: "biz_initech_003",
  businessName: "Initech LLC",
  merchantName: "Delta Airlines",
  processorId: "proc_marqeta_01",
  processorName: "Marqeta",
  status: "exception",
  lines: [
    { account: "Card Accounts Receivable", gl_account: 12004, debit: 875.00, credit: 0 },
    { account: "Interchange Receivable", gl_account: 12010, debit: 21.00, credit: 0 },
    { account: "Interchange Revenue", gl_account: 40100, debit: 0, credit: 21.00 },
    { account: "Card Network Payable", gl_account: 21001, debit: 0, credit: 875.00 },
  ],
}));

// 4. Prior period reversal in Feb (reversing entry 3 so net is zero)
entries.push(makeEntry({
  eventType: "refund",
  eventPrefix: "reversal",
  effectiveDate: "2026-02-03",
  postedPeriod: "2026-02",
  entity: "Ramp Financial LLC",
  businessId: "biz_initech_003",
  businessName: "Initech LLC",
  merchantName: "Delta Airlines",
  processorId: "proc_marqeta_01",
  processorName: "Marqeta",
  lines: [
    { account: "Card Network Payable", gl_account: 21001, debit: 875.00, credit: 0 },
    { account: "Interchange Revenue", gl_account: 40100, debit: 21.00, credit: 0 },
    { account: "Card Accounts Receivable", gl_account: 12004, debit: 0, credit: 875.00 },
    { account: "Interchange Receivable", gl_account: 12010, debit: 0, credit: 21.00 },
  ],
}));

// 5. April exception — pipeline gap for proactive monitoring
entries.push(makeEntry({
  eventType: "card_transaction",
  eventPrefix: "card_txn",
  effectiveDate: "2026-04-03",
  postedPeriod: "2026-04",
  entity: "Ramp Financial LLC",
  businessId: "biz_stark_005",
  businessName: "Stark Enterprises",
  merchantName: "Amazon Web Services",
  processorId: "proc_marqeta_01",
  processorName: "Marqeta",
  status: "exception",
  lines: [
    { account: "Card Accounts Receivable", gl_account: 12004, debit: 4500.00, credit: 0 },
    { account: "Interchange Receivable", gl_account: 12010, debit: 90.00, credit: 0 },
    { account: "Interchange Revenue", gl_account: 40100, debit: 0, credit: 90.00 },
    { account: "Card Network Payable", gl_account: null, debit: 0, credit: 4500.00 },
  ],
}));

// ── Exceptions derived from entries ──────────────────────────────────────────
export const exceptions = [
  {
    id: "EXC-001",
    type: "Unbalanced entry",
    category: "Subledger Accounting",
    affectedEntries: [entries.find(e => e.status === "exception" && e.lines[0].debit === 1250)?.entry_id],
    impact: 5.00,
    rootCause: "Debit total ($1,280.00) does not equal credit total ($1,275.00). Card Network Payable is $5.00 short — likely a rounding error in the upstream settlement calculation.",
    recommendedAction: "Escalate to engineering to investigate the source event in Transaction Canonical. The $5.00 difference suggests a truncation error in the settlement pipeline.",
    status: "Open",
    notes: "",
    period: "2026-03",
    date: "2026-03-12",
    eventId: entries.find(e => e.status === "exception" && e.lines[0].debit === 1250)?.event_id,
    businessName: "Acme Corp",
    merchantName: "WeWork",
  },
  {
    id: "EXC-002",
    type: "Missing GL mapping",
    category: "Subledger to GL Mapping",
    affectedEntries: [entries.find(e => e.lines.some(l => l.account === "Premium Interchange Revenue"))?.entry_id],
    impact: 3264.00,
    rootCause: "Subledger account 'Premium Interchange Revenue' has no GL mapping in the account structure. This appears to be a new account introduced by a handler update that was not accompanied by a mapping configuration. The entire entry ($3,264.00) cannot be posted to GL until resolved.",
    recommendedAction: "Work with accounting systems team to either create a new GL mapping for 'Premium Interchange Revenue' or reclassify to existing 'Interchange Revenue' (40100) if the distinction is not needed for reporting.",
    status: "Open",
    notes: "",
    period: "2026-03",
    date: "2026-03-18",
    eventId: entries.find(e => e.lines.some(l => l.account === "Premium Interchange Revenue"))?.event_id,
    businessName: "Globex Industries",
    merchantName: "Salesforce",
  },
  {
    id: "EXC-003",
    type: "Period mismatch",
    category: "Upstream / Source System",
    affectedEntries: [entries.find(e => e.effective_date === "2026-01-28" && e.posted_period === "2026-02")?.entry_id],
    impact: 896.00,
    rootCause: "Entry has effective date 2026-01-28 but was not processed until 2026-02-02 (created date), after the January close. Posted to February. A corresponding reversal entry exists in the same period to offset.",
    recommendedAction: "Verify the reversal entry (Initech LLC / Delta Airlines, $875.00 + $21.00 interchange) properly offsets this late arrival. If the pair nets to zero, no further action needed — document as a known timing item.",
    status: "Open",
    notes: "",
    period: "2026-02",
    date: "2026-01-28",
    eventId: entries.find(e => e.effective_date === "2026-01-28" && e.posted_period === "2026-02")?.event_id,
    businessName: "Initech LLC",
    merchantName: "Delta Airlines",
  },
  {
    id: "EXC-004",
    type: "Missing GL mapping",
    category: "Subledger to GL Mapping",
    affectedEntries: [entries.find(e => e.posted_period === "2026-04" && e.status === "exception")?.entry_id],
    impact: 4590.00,
    rootCause: "Card Network Payable has no GL account mapping for this entry. Possible new card network or entity routing issue — the payable line has a null GL account.",
    recommendedAction: "Investigate whether this is a new card network requiring a mapping update or a data quality issue in the source event. Proactively resolve before April close.",
    status: "Open",
    notes: "",
    period: "2026-04",
    date: "2026-04-03",
    eventId: entries.find(e => e.posted_period === "2026-04" && e.status === "exception")?.event_id,
    businessName: "Stark Enterprises",
    merchantName: "Amazon Web Services",
  },
  {
    id: "EXC-005",
    type: "Incomplete/missing data",
    category: "Upstream / Source System",
    affectedEntries: [],
    impact: 0,
    rootCause: "No events were published by Transaction Canonical for 2026-04-05. The upstream pipeline appears to have failed entirely — zero source events, zero captured events, zero subledger journals for this day. This is not a partial gap; it is a complete outage.",
    recommendedAction: "Escalate immediately to engineering / source system team to investigate the Transaction Canonical pipeline for April 5. Confirm whether this is a pipeline failure (events exist upstream but were not published) or a legitimate zero-activity day. If pipeline failure, request a backfill once the issue is resolved.",
    status: "Open",
    notes: "",
    period: "2026-04",
    date: "2026-04-05",
    eventId: null,
    businessName: null,
    merchantName: null,
  },
];

// ── Pipeline health data ─────────────────────────────────────────────────────
// Derived from entry data: count source events, captured events, valid entries per day
function generatePipelineHealth(period, days) {
  const [year, month] = period.split("-");
  const data = [];
  const periodEntries = entries.filter(e => e.posted_period === period);

  for (let d = 1; d <= days; d++) {
    const day = String(d).padStart(2, "0");
    const date = `${year}-${month}-${day}`;

    // Base event counts scale with entry density
    const baseEvents = Math.floor(60 + rand() * 80);
    let sourceEvents = baseEvents;
    let capturedEvents = baseEvents;
    let validEntriesCount = baseEvents;

    // Create a pipeline gap on March 7 (source events missing from event layer)
    if (period === "2026-03" && d === 7) {
      capturedEvents = sourceEvents - 14;
      validEntriesCount = capturedEvents;
    }
    // Create a processing failure on March 19 (events captured but entries failed)
    if (period === "2026-03" && d === 19) {
      validEntriesCount = capturedEvents - 10;
    }
    // April 3 — pipeline issue for proactive monitoring story
    if (period === "2026-04" && d === 3) {
      capturedEvents = sourceEvents - 6;
      validEntriesCount = capturedEvents;
    }
    // April 5 — complete pipeline failure, no events published by upstream
    if (period === "2026-04" && d === 5) {
      sourceEvents = 0;
      capturedEvents = 0;
      validEntriesCount = 0;
    }

    // Consume the random call to keep downstream sequence stable
    rand();

    // Split counts by data source (~65% Transaction Canonical, ~35% Financial Data Platform)
    const txnRatio = 0.6 + rand() * 0.1;  // 60-70%
    const txnSource = Math.round(sourceEvents * txnRatio);
    const txnCaptured = Math.round(capturedEvents * txnRatio);
    const txnValid = Math.round(validEntriesCount * txnRatio);

    // For March 7 pipeline gap, attribute it to Transaction Canonical
    const bySource = {
      "Transaction Canonical": {
        sourceEvents: txnSource,
        capturedEvents: (period === "2026-03" && d === 7) ? txnSource - 14 : txnCaptured,
        validEntries: (period === "2026-03" && d === 7) ? txnSource - 14
          : (period === "2026-03" && d === 19) ? txnCaptured - 10 : txnValid,
      },
      "Financial Data Platform": {
        sourceEvents: sourceEvents - txnSource,
        capturedEvents: (period === "2026-03" && d === 7) ? capturedEvents - (txnSource - 14) : capturedEvents - txnCaptured,
        validEntries: (period === "2026-03" && d === 7) ? capturedEvents - (txnSource - 14)
          : (period === "2026-03" && d === 19) ? validEntriesCount - (txnCaptured - 10) : validEntriesCount - txnValid,
      },
    };

    // For outage days, zero out both sources
    if (sourceEvents === 0) {
      bySource["Transaction Canonical"] = { sourceEvents: 0, capturedEvents: 0, validEntries: 0 };
      bySource["Financial Data Platform"] = { sourceEvents: 0, capturedEvents: 0, validEntries: 0 };
    }

    // For April 3 pipeline issue, attribute to Financial Data Platform
    if (period === "2026-04" && d === 3) {
      bySource["Transaction Canonical"] = { sourceEvents: txnSource, capturedEvents: txnSource, validEntries: txnSource };
      bySource["Financial Data Platform"] = {
        sourceEvents: sourceEvents - txnSource,
        capturedEvents: sourceEvents - txnSource - 6,
        validEntries: sourceEvents - txnSource - 6,
      };
    }

    data.push({ date, sourceEvents, capturedEvents, validEntries: validEntriesCount, bySource });
  }
  return data;
}

export const pipelineHealth = {
  "2026-01": generatePipelineHealth("2026-01", 31),
  "2026-02": generatePipelineHealth("2026-02", 28),
  "2026-03": generatePipelineHealth("2026-03", 31),
  "2026-04": generatePipelineHealth("2026-04", 7),
};

// ── Period status ────────────────────────────────────────────────────────────
export const periodStatus = {
  "2026-01": "Exported",
  "2026-02": "Exported",
  "2026-03": "In Review",
  "2026-04": "Open",
};

// ── Export history ────────────────────────────────────────────────────────────
export const exportHistory = [
  {
    exportId: "EXP-001",
    period: "2026-01",
    dataSource: "Transaction Canonical",
    exportDate: "2026-02-03T14:30:00Z",
    exportedBy: "Melissa Chen",
    entryCount: entries.filter(e => e.posted_period === "2026-01" && e.data_source === "Transaction Canonical" && e.status === "valid").length,
    netsuiteRef: "JE-2026-01-TXN_CANONICAL-001",
    status: "Confirmed in NetSuite",
    acknowledgedExceptions: 0,
  },
  {
    exportId: "EXP-002",
    period: "2026-01",
    dataSource: "Financial Data Platform",
    exportDate: "2026-02-03T14:45:00Z",
    exportedBy: "Melissa Chen",
    entryCount: entries.filter(e => e.posted_period === "2026-01" && e.data_source === "Financial Data Platform" && e.status === "valid").length,
    netsuiteRef: "JE-2026-01-FIN_DATA-001",
    status: "Confirmed in NetSuite",
    acknowledgedExceptions: 0,
  },
  {
    exportId: "EXP-003",
    period: "2026-02",
    dataSource: "Transaction Canonical",
    exportDate: "2026-03-04T16:15:00Z",
    exportedBy: "Melissa Chen",
    entryCount: entries.filter(e => e.posted_period === "2026-02" && e.data_source === "Transaction Canonical" && e.status === "valid").length,
    netsuiteRef: "JE-2026-02-TXN_CANONICAL-001",
    status: "Confirmed in NetSuite",
    acknowledgedExceptions: 1,
    acknowledgedNote: "1 period mismatch exception ($896.00) — late-arriving Jan card transaction with offsetting reversal. Net impact $0. Accepted.",
  },
  {
    exportId: "EXP-004",
    period: "2026-02",
    dataSource: "Financial Data Platform",
    exportDate: "2026-03-04T16:30:00Z",
    exportedBy: "Melissa Chen",
    entryCount: entries.filter(e => e.posted_period === "2026-02" && e.data_source === "Financial Data Platform" && e.status === "valid").length,
    netsuiteRef: "JE-2026-02-FIN_DATA-001",
    status: "Confirmed in NetSuite",
    acknowledgedExceptions: 0,
  },
];

// ── Bank accounts & settlement data ──────────────────────────────────────────
export const bankAccounts = [
  { accountId: "7291043856", entity: "Ramp Financial LLC", processor: "Marqeta", glNumber: 10100, label: "US — Marqeta" },
  { accountId: "3847261095", entity: "Ramp Financial LLC", processor: "Citi", glNumber: 10100, label: "US — Citi" },
  { accountId: "5618390274", entity: "Ramp Canada", processor: "Marqeta", glNumber: 10101, label: "CA — Marqeta" },
  { accountId: "9024718563", entity: "Ramp Canada", processor: "Citi", glNumber: 10101, label: "CA — Citi" },
];

// Compute subledger Cash activity per entity+processor per period, then build bank data with realistic variances
function buildBankData() {
  const data = {};
  for (const period of ["2026-01", "2026-02", "2026-03", "2026-04"]) {
    const periodEntries = entries.filter(e => e.posted_period === period && e.status === "valid");
    // Sum Cash debits and credits by entity + processor
    const cashByKey = {};
    for (const e of periodEntries) {
      for (const l of e.lines) {
        if (l.account !== "Cash") continue;
        const key = `${e.entity}|${e.processor_name || "Unknown"}`;
        if (!cashByKey[key]) cashByKey[key] = { debit: 0, credit: 0 };
        cashByKey[key].debit += l.debit;
        cashByKey[key].credit += l.credit;
      }
    }

    data[period] = bankAccounts.map((ba) => {
      const key = `${ba.entity}|${ba.processor}`;
      const cash = cashByKey[key] || { debit: 0, credit: 0 };
      const slDebit = Math.round(cash.debit * 100) / 100;
      const slCredit = Math.round(cash.credit * 100) / 100;
      const slNet = Math.round((slDebit - slCredit) * 100) / 100;

      // Bank-reported balance: start from subledger net, then add reconciling items
      const reconItems = [];

      // Realistic reconciling items (only for non-partial months with activity)
      if (period !== "2026-04" && (slDebit > 0 || slCredit > 0)) {
        // Settlement in transit — processor settled but subledger hasn't picked up yet
        if (ba.processor === "Marqeta" && ba.entity === "Ramp Financial LLC") {
          if (period === "2026-01") {
            reconItems.push({
              description: "Settlement in transit — Marqeta batch #3156 processed 1/31, subledger picks up in Feb",
              amount: 2150.00,
              type: "bank_only",
            });
          } else if (period === "2026-02") {
            reconItems.push({
              description: "Settlement in transit — Marqeta batch #3842 processed 2/28, subledger picks up in Mar",
              amount: 1876.50,
              type: "bank_only",
            });
          } else if (period === "2026-03") {
            reconItems.push({
              description: "Settlement in transit — Marqeta batch #4892 processed 3/31, subledger picks up in Apr",
              amount: 3245.80,
              type: "bank_only",
            });
          }
        }
        // Processor fee adjustment
        if (ba.processor === "Citi" && ba.entity === "Ramp Financial LLC" && period === "2026-03") {
          reconItems.push({
            description: "Citi monthly processing fee — not yet recorded in subledger",
            amount: -475.00,
            type: "bank_only",
          });
        }
        // Timing: subledger recorded a reimbursement, bank clears next day
        if (ba.processor === "Marqeta" && ba.entity === "Ramp Canada" && period === "2026-02") {
          reconItems.push({
            description: "Reimbursement #reimb_0047 — subledger recorded 2/28, bank cleared 3/1",
            amount: -312.45,
            type: "subledger_only",
          });
        }
        // Stale outstanding item
        if (ba.processor === "Citi" && ba.entity === "Ramp Canada" && period === "2026-03") {
          reconItems.push({
            description: "Customer payment — bank received, pending subledger matching (>5 days outstanding)",
            amount: 1580.00,
            type: "bank_only",
          });
        }
      }

      const totalReconAdjustment = reconItems.reduce((s, r) => s + r.amount, 0);
      const bankBalance = Math.round((slNet + totalReconAdjustment) * 100) / 100;

      return {
        ...ba,
        slDebit,
        slCredit,
        slNet,
        bankBalance,
        reconItems,
        variance: 0, // After reconciling items, variance should be zero
      };
    });
  }
  return data;
}

export const bankReconData = buildBankData();

export default entries;
