// ── Part 2 Seed Data: Rewards Onboarding ─────────────────────────────────────
// Month 1 (Jan 2025): derived from actual Ramp sample data
// Months 2–3 (Feb–Mar 2025): synthetically generated with growth trends

const fmt = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
const fmtPts = (v) => new Intl.NumberFormat("en-US").format(Math.round(v));

// ── Earn Rate Configuration ──────────────────────────────────────────────────
// From config_earn_rate.csv — one row per business-currency pair
export const earnRateConfig = [
  { id: "900001", businessId: "90001", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900002", businessId: "90002", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900003", businessId: "90003", rate: 1.0, currency: "USD", source: "DEAL_DESK" },
  { id: "900004", businessId: "90004", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900005", businessId: "90005", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900006", businessId: "90006", rate: 1.25, currency: "USD", source: "DEAL_DESK" },
  { id: "900007", businessId: "90007", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900008", businessId: "90008", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900009", businessId: "90008", rate: 1.0, currency: "CAD", source: "BILLING_CONFIG" },
  { id: "900010", businessId: "90009", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900011", businessId: "90010", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900012", businessId: "90011", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900013", businessId: "90012", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900014", businessId: "90013", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900015", businessId: "90013", rate: 1.0, currency: "CAD", source: "BILLING_CONFIG" },
  { id: "900016", businessId: "90014", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900017", businessId: "90015", rate: 1.0, currency: "USD", source: "DEAL_DESK" },
  { id: "900018", businessId: "90016", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900019", businessId: "90017", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900020", businessId: "90018", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900021", businessId: "90019", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900022", businessId: "90020", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900023", businessId: "90020", rate: 1.0, currency: "CAD", source: "BILLING_CONFIG" },
  { id: "900024", businessId: "90021", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900025", businessId: "90022", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900026", businessId: "90023", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900027", businessId: "90024", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900028", businessId: "90025", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900029", businessId: "90026", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900030", businessId: "90026", rate: 1.0, currency: "CAD", source: "BILLING_CONFIG" },
  { id: "900031", businessId: "90027", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900032", businessId: "90028", rate: 1.25, currency: "USD", source: "DEAL_DESK" },
  { id: "900033", businessId: "90029", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900034", businessId: "90030", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900035", businessId: "90031", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900036", businessId: "90031", rate: 1.0, currency: "CAD", source: "BILLING_CONFIG" },
  { id: "900037", businessId: "90032", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900038", businessId: "90033", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900039", businessId: "90034", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900040", businessId: "90035", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
  { id: "900041", businessId: "90035", rate: 1.0, currency: "CAD", source: "BILLING_CONFIG" },
  { id: "900042", businessId: "90036", rate: 1.5, currency: "USD", source: "BILLING_CONFIG" },
];

// ── Handler Rules ────────────────────────────────────────────────────────────
export const handlerRules = [
  {
    id: "H-RWD-001",
    name: "Rewards Earning",
    version: "1.0",
    effectiveDate: "2025-01-01",
    trigger: "Card transaction clears with rewards-eligible program",
    description: "Records rewards liability when points are earned on a card transaction",
    entries: [
      { account: "Rewards Expense", glAccount: 60201, side: "debit", amountRule: "points ÷ 100" },
      { account: "Rewards Liability", glAccount: 22001, side: "credit", amountRule: "points ÷ 100" },
    ],
    parameters: [
      { name: "Earn Rate", value: "Per business config (1.0%–1.5%)", configRef: "config_earn_rate" },
      { name: "Points Conversion", value: "100 pts = $1.00", configRef: "system" },
    ],
    validations: [
      "Earn rate matches business configuration",
      "Transaction is CLEARED status",
      "Points amount > 0",
      "Business has active rewards configuration",
    ],
  },
  {
    id: "H-RWD-002",
    name: "Rewards Earning Reversal",
    version: "1.0",
    effectiveDate: "2025-01-01",
    trigger: "Earning reversal event (negative points)",
    description: "Reverses rewards liability when a prior earning is reversed (e.g., transaction refund)",
    entries: [
      { account: "Rewards Liability", glAccount: 22001, side: "debit", amountRule: "|points| ÷ 100" },
      { account: "Rewards Expense", glAccount: 60201, side: "credit", amountRule: "|points| ÷ 100" },
    ],
    parameters: [
      { name: "Points Conversion", value: "100 pts = $1.00", configRef: "system" },
    ],
    validations: [
      "Original earning exists",
      "Reversal amount ≤ original earning",
      "Points amount < 0",
    ],
  },
  {
    id: "H-RWD-003",
    name: "Redemption — Statement Credit",
    version: "1.0",
    effectiveDate: "2025-01-01",
    trigger: "Redemption event with converted_to = STATEMENT_CREDIT",
    description: "Records statement credit redemption at 1:1 value (100 pts = $1.00)",
    entries: [
      { account: "Rewards Liability", glAccount: 22001, side: "debit", amountRule: "points_redeemed ÷ 100" },
      { account: "Cash — Statement Credits", glAccount: 10100, side: "credit", amountRule: "points_redeemed ÷ 100" },
    ],
    parameters: [
      { name: "Redemption Value", value: "100% (1:1)", configRef: "system" },
    ],
    validations: [
      "Statement ID is populated",
      "Points balance ≥ points redeemed",
      "Redemption amount = points ÷ 100",
    ],
  },
  {
    id: "H-RWD-004",
    name: "Redemption — Gift Card (Provider A)",
    version: "1.0",
    effectiveDate: "2025-01-01",
    trigger: "Redemption event with converted_to = PROVIDER_A",
    description: "Records gift card redemption via Provider A — source data carries discounted cost",
    entries: [
      { account: "Rewards Liability", glAccount: 22001, side: "debit", amountRule: "points_redeemed ÷ 100 (face value)" },
      { account: "Cash — Provider A Payouts", glAccount: 10100, side: "credit", amountRule: "redemption_amount (cost from source)" },
      { account: "Rewards Expense", glAccount: 60201, side: "credit", amountRule: "(points ÷ 100) − redemption_amount" },
    ],
    parameters: [
      { name: "Expected Cost Rate", value: "~90% ($0.90 per $1.00)", configRef: "provider_config" },
      { name: "Source Field", value: "redemption_amount = actual cash cost", configRef: "source_system" },
    ],
    validations: [
      "Points balance ≥ points redeemed",
      "No statement_id (gift card, not statement credit)",
    ],
  },
  {
    id: "H-RWD-005",
    name: "Redemption — Gift Card (Provider B)",
    version: "1.0",
    effectiveDate: "2025-01-01",
    trigger: "Redemption event with converted_to = PROVIDER_B",
    description: "Records gift card redemption via Provider B — source data carries discounted cost",
    entries: [
      { account: "Rewards Liability", glAccount: 22001, side: "debit", amountRule: "points_redeemed ÷ 100 (face value)" },
      { account: "Cash — Provider B Payouts", glAccount: 10100, side: "credit", amountRule: "redemption_amount (cost from source)" },
      { account: "Rewards Expense", glAccount: 60201, side: "credit", amountRule: "(points ÷ 100) − redemption_amount" },
    ],
    parameters: [
      { name: "Expected Cost Rate", value: "~80% ($0.80 per $1.00)", configRef: "provider_config" },
      { name: "Source Field", value: "redemption_amount = actual cash cost", configRef: "source_system" },
    ],
    validations: [
      "Points balance ≥ points redeemed",
      "No statement_id (gift card, not statement credit)",
    ],
  },
  {
    id: "H-RWD-006",
    name: "Breakage Reserve True-Up",
    version: "1.0",
    effectiveDate: "2025-01-01",
    trigger: "Period-end close process",
    description: "Adjusts breakage reserve to reflect current portfolio balance × breakage rate",
    entries: [
      { account: "Rewards Liability", glAccount: 22001, side: "debit", amountRule: "true-up amount (if positive)" },
      { account: "Rewards Expense — Breakage", glAccount: 60201, side: "credit", amountRule: "true-up amount (if positive)" },
    ],
    parameters: [
      { name: "Breakage Rate", value: "5.0%", configRef: "breakage_config" },
      { name: "Basis", value: "Portfolio-level outstanding points balance", configRef: "system" },
    ],
    validations: [
      "All earning and redemption entries for the period are posted",
      "Prior period reserve balance confirmed",
    ],
  },
];

// ── Monthly Activity Data ────────────────────────────────────────────────────
// Jan 2025: from actual sample data
// Feb–Mar 2025: synthetic with ~5% monthly growth

export const monthlyActivity = {
  "2025-01": {
    label: "January 2025",
    status: "Closed",
    earnings: {
      transactionCount: 1326,
      totalPoints: 7732118,
      totalDollars: 77321.18,
      reversalCount: 123,
      reversalPoints: -738409,
      reversalDollars: -7384.09,
      netPoints: 6993709,
      netDollars: 69937.09,
      byBusiness: [
        { businessId: "90001", points: 42133, dollars: 421.33, currency: "USD", txnCount: 8 },
        { businessId: "90002", points: 95834, dollars: 958.34, currency: "USD", txnCount: 18 },
        { businessId: "90003", points: 25712, dollars: 257.12, currency: "USD", txnCount: 6 },
        { businessId: "90004", points: 92318, dollars: 923.18, currency: "USD", txnCount: 17 },
        { businessId: "90005", points: 110924, dollars: 1109.24, currency: "USD", txnCount: 20 },
        { businessId: "90006", points: 79891, dollars: 798.91, currency: "USD", txnCount: 16 },
        { businessId: "90007", points: 112340, dollars: 1123.40, currency: "USD", txnCount: 21 },
        { businessId: "90008", points: 60218, dollars: 602.18, currency: "USD", txnCount: 12 },
        { businessId: "90009", points: 89437, dollars: 894.37, currency: "USD", txnCount: 17 },
        { businessId: "90010", points: 142830, dollars: 1428.30, currency: "USD", txnCount: 26 },
        { businessId: "90011", points: 54212, dollars: 542.12, currency: "USD", txnCount: 10 },
        { businessId: "90012", points: 62748, dollars: 627.48, currency: "USD", txnCount: 12 },
        { businessId: "90013", points: 121645, dollars: 1216.45, currency: "USD", txnCount: 22 },
        { businessId: "90014", points: 148392, dollars: 1483.92, currency: "USD", txnCount: 27 },
        { businessId: "90015", points: 52384, dollars: 523.84, currency: "USD", txnCount: 10 },
        { businessId: "90016", points: 48219, dollars: 482.19, currency: "USD", txnCount: 9 },
        { businessId: "90017", points: 57832, dollars: 578.32, currency: "USD", txnCount: 11 },
        { businessId: "90018", points: 62450, dollars: 624.50, currency: "USD", txnCount: 12 },
        { businessId: "90019", points: 89234, dollars: 892.34, currency: "USD", txnCount: 17 },
        { businessId: "90020", points: 51238, dollars: 512.38, currency: "USD", txnCount: 10 },
        { businessId: "90021", points: 42156, dollars: 421.56, currency: "USD", txnCount: 8 },
        { businessId: "90022", points: 103521, dollars: 1035.21, currency: "USD", txnCount: 19 },
        { businessId: "90023", points: 54321, dollars: 543.21, currency: "USD", txnCount: 10 },
        { businessId: "90024", points: 35418, dollars: 354.18, currency: "USD", txnCount: 7 },
        { businessId: "90025", points: 132489, dollars: 1324.89, currency: "USD", txnCount: 24 },
        { businessId: "90026", points: 78543, dollars: 785.43, currency: "USD", txnCount: 15 },
        { businessId: "90027", points: 81234, dollars: 812.34, currency: "USD", txnCount: 15 },
        { businessId: "90028", points: 42518, dollars: 425.18, currency: "USD", txnCount: 8 },
        { businessId: "90029", points: 45321, dollars: 453.21, currency: "USD", txnCount: 9 },
        { businessId: "90030", points: 118432, dollars: 1184.32, currency: "USD", txnCount: 22 },
        { businessId: "90031", points: 62145, dollars: 621.45, currency: "USD", txnCount: 12 },
        { businessId: "90032", points: 68923, dollars: 689.23, currency: "USD", txnCount: 13 },
        { businessId: "90033", points: 95234, dollars: 952.34, currency: "USD", txnCount: 18 },
        { businessId: "90034", points: 72418, dollars: 724.18, currency: "USD", txnCount: 14 },
        { businessId: "90035", points: 98321, dollars: 983.21, currency: "USD", txnCount: 18 },
        { businessId: "90036", points: 42156, dollars: 421.56, currency: "USD", txnCount: 8 },
      ],
      byCurrency: { USD: { points: 6728110, dollars: 67281.10 }, CAD: { points: 265599, dollars: 2655.99 } },
    },
    redemptions: {
      totalCount: 56,
      totalPoints: 1726387,
      totalFaceValue: 17263.87,
      byChannel: {
        STATEMENT_CREDIT: { count: 26, points: 1296627, faceValue: 12966.27, cashPaid: 12966.27, gain: 0 },
        PROVIDER_A: { count: 19, points: 310930, faceValue: 3109.30, cashPaid: 2798.36, gain: 310.94 },
        PROVIDER_B: { count: 11, points: 118830, faceValue: 1188.30, cashPaid: 950.65, gain: 237.65 },
      },
      totalCashPaid: 16715.28,
      totalGain: 548.59,
    },
    exceptions: [
      {
        id: "EX-R-001",
        type: "Earn Rate Deviation",
        description: "Earning ID 700486 — multiplier 1.5× applied but business 90006 config rate is 1.25%",
        dollarImpact: 42.18,
        status: "Open",
        owner: "Accounting",
        eventRef: "700486",
      },
      {
        id: "EX-R-002",
        type: "Missing Initiated By",
        description: "Redemption 850010 — initiated_by field is empty (expected USER or SYSTEM)",
        dollarImpact: 394.06,
        status: "Open",
        owner: "Engineering",
        eventRef: "850010",
      },
      {
        id: "EX-R-003",
        type: "Unusual Redemption Amount",
        description: "Redemption 850054 — $5,000.00 statement credit (500,000 pts) is >3σ from mean redemption",
        dollarImpact: 5000.00,
        status: "Under Review",
        owner: "Accounting",
        eventRef: "850054",
      },
    ],
  },
  "2025-02": {
    label: "February 2025",
    status: "Closed",
    earnings: {
      transactionCount: 1392,
      totalPoints: 8118724,
      totalDollars: 81187.24,
      reversalCount: 115,
      reversalPoints: -691830,
      reversalDollars: -6918.30,
      netPoints: 7426894,
      netDollars: 74268.94,
      byBusiness: [
        { businessId: "90001", points: 44240, dollars: 442.40, currency: "USD", txnCount: 8 },
        { businessId: "90002", points: 100626, dollars: 1006.26, currency: "USD", txnCount: 19 },
        { businessId: "90003", points: 26998, dollars: 269.98, currency: "USD", txnCount: 6 },
        { businessId: "90004", points: 96934, dollars: 969.34, currency: "USD", txnCount: 18 },
        { businessId: "90005", points: 116470, dollars: 1164.70, currency: "USD", txnCount: 21 },
        { businessId: "90006", points: 83886, dollars: 838.86, currency: "USD", txnCount: 17 },
        { businessId: "90007", points: 117957, dollars: 1179.57, currency: "USD", txnCount: 22 },
        { businessId: "90008", points: 63229, dollars: 632.29, currency: "USD", txnCount: 13 },
        { businessId: "90009", points: 93909, dollars: 939.09, currency: "USD", txnCount: 18 },
        { businessId: "90010", points: 149972, dollars: 1499.72, currency: "USD", txnCount: 27 },
        { businessId: "90013", points: 127727, dollars: 1277.27, currency: "USD", txnCount: 23 },
        { businessId: "90014", points: 155812, dollars: 1558.12, currency: "USD", txnCount: 28 },
        { businessId: "90022", points: 108697, dollars: 1086.97, currency: "USD", txnCount: 20 },
        { businessId: "90025", points: 139113, dollars: 1391.13, currency: "USD", txnCount: 25 },
        { businessId: "90030", points: 124354, dollars: 1243.54, currency: "USD", txnCount: 23 },
        { businessId: "90033", points: 99996, dollars: 999.96, currency: "USD", txnCount: 19 },
        { businessId: "90035", points: 103237, dollars: 1032.37, currency: "USD", txnCount: 19 },
      ],
      byCurrency: { USD: { points: 7148016, dollars: 71480.16 }, CAD: { points: 278878, dollars: 2788.78 } },
    },
    redemptions: {
      totalCount: 62,
      totalPoints: 1864218,
      totalFaceValue: 18642.18,
      byChannel: {
        STATEMENT_CREDIT: { count: 29, points: 1401762, faceValue: 14017.62, cashPaid: 14017.62, gain: 0 },
        PROVIDER_A: { count: 21, points: 326415, faceValue: 3264.15, cashPaid: 2937.74, gain: 326.41 },
        PROVIDER_B: { count: 12, points: 136041, faceValue: 1360.41, cashPaid: 1088.33, gain: 272.08 },
      },
      totalCashPaid: 18043.69,
      totalGain: 598.49,
    },
    exceptions: [
      {
        id: "EX-R-004",
        type: "Earn Rate Deviation",
        description: "Earning ID 701892 — multiplier 2.0× applied but max configured rate is 1.5%",
        dollarImpact: 128.45,
        status: "Resolved",
        owner: "Engineering",
        eventRef: "701892",
        resolution: "Promotional multiplier was applied correctly — documented as approved override",
      },
    ],
  },
  "2025-03": {
    label: "March 2025",
    status: "In Review",
    earnings: {
      transactionCount: 1461,
      totalPoints: 8524660,
      totalDollars: 85246.60,
      reversalCount: 108,
      reversalPoints: -648219,
      reversalDollars: -6482.19,
      netPoints: 7876441,
      netDollars: 78764.41,
      byBusiness: [
        { businessId: "90001", points: 46452, dollars: 464.52, currency: "USD", txnCount: 9 },
        { businessId: "90002", points: 105657, dollars: 1056.57, currency: "USD", txnCount: 20 },
        { businessId: "90003", points: 28348, dollars: 283.48, currency: "USD", txnCount: 7 },
        { businessId: "90004", points: 101781, dollars: 1017.81, currency: "USD", txnCount: 19 },
        { businessId: "90005", points: 122294, dollars: 1222.94, currency: "USD", txnCount: 22 },
        { businessId: "90006", points: 88080, dollars: 880.80, currency: "USD", txnCount: 18 },
        { businessId: "90007", points: 123855, dollars: 1238.55, currency: "USD", txnCount: 23 },
        { businessId: "90008", points: 66390, dollars: 663.90, currency: "USD", txnCount: 14 },
        { businessId: "90009", points: 98604, dollars: 986.04, currency: "USD", txnCount: 19 },
        { businessId: "90010", points: 157471, dollars: 1574.71, currency: "USD", txnCount: 28 },
        { businessId: "90013", points: 134113, dollars: 1341.13, currency: "USD", txnCount: 24 },
        { businessId: "90014", points: 163603, dollars: 1636.03, currency: "USD", txnCount: 29 },
        { businessId: "90022", points: 114132, dollars: 1141.32, currency: "USD", txnCount: 21 },
        { businessId: "90025", points: 146069, dollars: 1460.69, currency: "USD", txnCount: 26 },
        { businessId: "90030", points: 130572, dollars: 1305.72, currency: "USD", txnCount: 24 },
        { businessId: "90033", points: 104996, dollars: 1049.96, currency: "USD", txnCount: 20 },
        { businessId: "90035", points: 108399, dollars: 1083.99, currency: "USD", txnCount: 20 },
      ],
      byCurrency: { USD: { points: 7505417, dollars: 75054.17 }, CAD: { points: 371024, dollars: 3710.24 } },
    },
    redemptions: {
      totalCount: 68,
      totalPoints: 2015836,
      totalFaceValue: 20158.36,
      byChannel: {
        STATEMENT_CREDIT: { count: 32, points: 1516982, faceValue: 15169.82, cashPaid: 15169.82, gain: 0 },
        PROVIDER_A: { count: 23, points: 348614, faceValue: 3486.14, cashPaid: 3137.53, gain: 348.61 },
        PROVIDER_B: { count: 13, points: 150240, faceValue: 1502.40, cashPaid: 1201.92, gain: 300.48 },
      },
      totalCashPaid: 19509.27,
      totalGain: 649.09,
    },
    exceptions: [
      {
        id: "EX-R-005",
        type: "Late-Arriving Earnings",
        description: "12 earning events with transaction dates in Feb posted to Mar period",
        dollarImpact: 1842.30,
        status: "Open",
        owner: "Engineering",
        eventRef: "multiple",
      },
      {
        id: "EX-R-006",
        type: "Earn Rate Deviation",
        description: "Earning ID 702134 — multiplier 1.5× applied but business 90003 config rate is 1.0%",
        dollarImpact: 67.89,
        status: "Open",
        owner: "Accounting",
        eventRef: "702134",
      },
    ],
  },
};

// ── Rewards Rollforward ──────────────────────────────────────────────────────
// Points-based rollforward across the 3-month simulation

export const BREAKAGE_RATE = 0.05;

function buildRollforward() {
  const periods = ["2025-01", "2025-02", "2025-03"];
  const rows = [];
  let openingPts = 0;

  for (const period of periods) {
    const m = monthlyActivity[period];
    const earned = m.earnings.totalPoints;
    const reversed = m.earnings.reversalPoints; // negative
    const redeemed = m.redemptions.totalPoints;
    const closing = openingPts + earned + reversed - redeemed;

    rows.push({
      period,
      label: m.label,
      opening: openingPts,
      earned,
      reversed,
      redeemed,
      closing,
      // Dollar equivalents (100 pts = $1)
      openingDollars: openingPts / 100,
      earnedDollars: earned / 100,
      reversedDollars: reversed / 100,
      redeemedDollars: redeemed / 100,
      closingDollars: closing / 100,
    });
    openingPts = closing;
  }
  return rows;
}

export const rollforward = buildRollforward();

// ── Breakage Reserve ─────────────────────────────────────────────────────────

function buildBreakageReserve() {
  const periods = ["2025-01", "2025-02", "2025-03"];
  const rows = [];
  let priorReserve = 0;

  for (let i = 0; i < periods.length; i++) {
    const rf = rollforward[i];
    const outstandingBalance = rf.closing;
    const calculatedReserve = Math.round(outstandingBalance * BREAKAGE_RATE);
    const trueUp = calculatedReserve - priorReserve;

    rows.push({
      period: periods[i],
      label: rf.label,
      outstandingPoints: outstandingBalance,
      outstandingDollars: outstandingBalance / 100,
      breakageRate: BREAKAGE_RATE,
      calculatedReserve,
      calculatedReserveDollars: calculatedReserve / 100,
      priorReserve,
      priorReserveDollars: priorReserve / 100,
      trueUp,
      trueUpDollars: trueUp / 100,
      direction: trueUp >= 0 ? "Additional reserve" : "Reserve release",
    });
    priorReserve = calculatedReserve;
  }
  return rows;
}

export const breakageReserve = buildBreakageReserve();

// ── Proposed Journal Entry ───────────────────────────────────────────────────

function buildProposedJEs(period) {
  const m = monthlyActivity[period];
  const br = breakageReserve.find((b) => b.period === period);

  // ── USD/CAD net earnings — byCurrency already contains net-of-reversal amounts ──
  const usdNetDollars = m.earnings.byCurrency.USD.dollars;
  const cadNetDollars = m.earnings.byCurrency.CAD.dollars;

  // ── Ramp Financial LLC (USD) ──────────────────────────────────────────────
  const usLines = [];
  let ln = 1;

  // Earnings
  usLines.push({ line: ln++, glAccount: 60201, glName: "Rewards Expense", description: "Rewards earned on card transactions (USD)", debit: usdNetDollars, credit: 0, source: "Earning handler" });
  usLines.push({ line: ln++, glAccount: 22001, glName: "Rewards Liability", description: "Points liability — net earnings (USD)", debit: 0, credit: usdNetDollars, source: "Earning handler" });

  // Redemptions — all USD
  const sc = m.redemptions.byChannel.STATEMENT_CREDIT;
  usLines.push({ line: ln++, glAccount: 22001, glName: "Rewards Liability", description: `Statement credit redemptions (${sc.count} events)`, debit: sc.faceValue, credit: 0, source: "Redemption handler" });
  usLines.push({ line: ln++, glAccount: 10100, glName: "Cash — Statement Credits", description: "Cash paid for statement credits", debit: 0, credit: sc.cashPaid, source: "Redemption handler" });

  const pa = m.redemptions.byChannel.PROVIDER_A;
  usLines.push({ line: ln++, glAccount: 22001, glName: "Rewards Liability", description: `Provider A gift card redemptions (${pa.count} events)`, debit: pa.faceValue, credit: 0, source: "Redemption handler" });
  usLines.push({ line: ln++, glAccount: 10100, glName: "Cash — Provider A Payouts", description: "Cash paid to Provider A (90% of face value)", debit: 0, credit: pa.cashPaid, source: "Redemption handler" });
  usLines.push({ line: ln++, glAccount: 60201, glName: "Rewards Expense", description: "Provider A redemption gain (10% spread)", debit: 0, credit: pa.gain, source: "Redemption handler" });

  const pb = m.redemptions.byChannel.PROVIDER_B;
  usLines.push({ line: ln++, glAccount: 22001, glName: "Rewards Liability", description: `Provider B gift card redemptions (${pb.count} events)`, debit: pb.faceValue, credit: 0, source: "Redemption handler" });
  usLines.push({ line: ln++, glAccount: 10100, glName: "Cash — Provider B Payouts", description: "Cash paid to Provider B (80% of face value)", debit: 0, credit: pb.cashPaid, source: "Redemption handler" });
  usLines.push({ line: ln++, glAccount: 60201, glName: "Rewards Expense", description: "Provider B redemption gain (20% spread)", debit: 0, credit: pb.gain, source: "Redemption handler" });

  // Breakage — kept on US entity (portfolio-level estimate, all redemptions USD)
  if (br.trueUp > 0) {
    usLines.push({ line: ln++, glAccount: 22001, glName: "Rewards Liability", description: `Breakage true-up — liability reduction (${(BREAKAGE_RATE * 100).toFixed(1)}% of outstanding)`, debit: br.trueUpDollars, credit: 0, source: "Breakage handler" });
    usLines.push({ line: ln++, glAccount: 60201, glName: "Rewards Expense — Breakage", description: "Breakage true-up — expense reduction", debit: 0, credit: br.trueUpDollars, source: "Breakage handler" });
  } else if (br.trueUp < 0) {
    usLines.push({ line: ln++, glAccount: 60201, glName: "Rewards Expense — Breakage", description: `Breakage true-up reversal (${(BREAKAGE_RATE * 100).toFixed(1)}% of outstanding)`, debit: Math.abs(br.trueUpDollars), credit: 0, source: "Breakage handler" });
    usLines.push({ line: ln++, glAccount: 22001, glName: "Rewards Liability", description: "Breakage true-up reversal — liability increase", debit: 0, credit: Math.abs(br.trueUpDollars), source: "Breakage handler" });
  }

  // ── Ramp Canada (CAD) ─────────────────────────────────────────────────────
  const caLines = [];
  let caLn = 1;
  caLines.push({ line: caLn++, glAccount: 60201, glName: "Rewards Expense", description: "Rewards earned on card transactions (CAD)", debit: cadNetDollars, credit: 0, source: "Earning handler" });
  caLines.push({ line: caLn++, glAccount: 22001, glName: "Rewards Liability", description: "Points liability — net earnings (CAD)", debit: 0, credit: cadNetDollars, source: "Earning handler" });

  return {
    "Ramp Financial LLC": { entity: "Ramp Financial LLC", currency: "USD", lines: usLines },
    "Ramp Canada": { entity: "Ramp Canada", currency: "CAD", lines: caLines },
  };
}

export const proposedJEs = {
  "2025-01": buildProposedJEs("2025-01"),
  "2025-02": buildProposedJEs("2025-02"),
  "2025-03": buildProposedJEs("2025-03"),
};

// ── GL Account Reference ─────────────────────────────────────────────────────

export const glAccounts = [
  { number: 10100, name: "Cash — Card Settlements", type: "Asset" },
  { number: 22001, name: "Rewards Liability", type: "Liability" },
  { number: 60201, name: "Rewards Expense", type: "Expense" },
];

// ── Periods list ─────────────────────────────────────────────────────────────
export const periods = ["2025-03", "2025-02", "2025-01"];

export default { monthlyActivity, rollforward, breakageReserve, proposedJEs, handlerRules, earnRateConfig, glAccounts, periods };
