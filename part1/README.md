# Part 1: Subledger Close Workspace

Accountant-facing workspace for subledger monitoring and month-end close. Covers employee spend / card activity — card transactions, reimbursements, statement payments, and refunds across US and Canadian entities.

**[Live app →](https://part1-teal.vercel.app)**

### Pages

1. **Dashboard** — Period pipeline health, daily event monitoring, flagged days
2. **Exceptions** — Exception queue with materiality quantification and acknowledgment flow
3. **Subledger Review** — Account-level totals, flux analysis, validation checks
4. **Bank Reconciliation** — Cash subledger tied to bank/processor balances (4 accounts)
5. **JE Preview** — Proposed GL journal with subledger reconciliation and approval gates
6. **Export History** — Permanent audit trail; full drill-through from NetSuite JE to source events

### Running Locally

```bash
npm install && npm run dev   # → http://localhost:5173
```

See [`design-spec.md`](../design-spec.md) for architecture and design decisions.
