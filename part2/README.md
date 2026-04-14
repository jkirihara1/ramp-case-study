# Part 2: Rewards Onboarding

Interactive design document and 3-month simulation (Jan–Mar 2025) for replacing the current 56-line manual rewards JE with an event-driven subledger. Covers earning, redemption (3 channels), breakage reserve, and per-entity JE generation.

**[Live app →](https://part2-three.vercel.app)**

### Pages

1. **Approach** — Proposed solution design and phased implementation strategy
2. **Handler Rules** — Accounting handler configuration for each rewards event type
3. **Subledger Review** — Period rewards activity, validation checks, flux analysis
4. **Breakage Reserve** — Liability rollforward and breakage true-up calculation
5. **JE Preview** — Auto-generated JE replacing the manual process; source-to-JE reconciliation

### Running Locally

```bash
npm install && npm run dev   # → http://localhost:5174
```

See [`design-spec.md`](../design-spec.md) for architecture and design decisions.
