# Ramp Case Study — James Kirihara

Subledger accounting design and prototype submission.

## Live Apps

| | App | Description |
|---|---|---|
| **Part 1** | [Subledger Close Workspace](https://PLACEHOLDER-PART1.vercel.app) | Accountant workspace for subledger monitoring and month-end close — card activity, exceptions, bank reconciliation, JE export |
| **Part 2** | [Rewards Onboarding](https://PLACEHOLDER-PART2.vercel.app) | Event-driven accounting design for the rewards subledger — handler rules, 3-month simulation, breakage reserve, JE preview |

## Documentation

- [`design-spec.md`](design-spec.md) — Architecture, data model, handler governance, and edge cases for both parts

## Running Locally

```bash
# Part 1
cd part1 && npm install && npm run dev   # → http://localhost:5173

# Part 2
cd part2 && npm install && npm run dev   # → http://localhost:5174
```

## Stack

React · Vite · Tailwind CSS · Recharts · Lucide React
