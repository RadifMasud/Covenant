# Covenant Monitor

A Forward Deployed Engineer case study demonstrating instrumented compliance workflow tooling for financial institutions. Built in Next.js (App Router), TypeScript, and Tailwind CSS.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- **Compliance Workflow** → `/workflow`
- **Admin Dashboard (COO view)** → `/admin`

## Architecture Overview

```
src/
├── app/
│   ├── page.tsx           # Email gate — session entry point
│   ├── workflow/page.tsx  # 4-step compliance wizard + Sidecar
│   └── admin/page.tsx     # COO operations dashboard
├── components/
│   └── Sidecar.tsx        # Context-aware nudge panel
├── lib/
│   ├── session.ts         # localStorage session management
│   └── trackEvent.ts      # Telemetry utility
└── data/
    └── mock-sessions.json # 1,000 seeded session records
```

## Security: Email Gate & Session Persistence

The email gate collects a user identifier and stores it in `localStorage` under the key `covenant_email`. This provides:

- **Session persistence** across page refreshes without requiring a backend.
- **Basic data isolation** — each browser instance maintains its own session state. Events logged to `sessionStorage` are scoped to that tab and are automatically discarded when the browser tab closes.

This design is appropriate for a demo/internal tool where the goal is UX instrumentation, not authentication. For a production deployment, the email gate would be replaced with SSO and a server-side session token.

## Telemetry Schema

Every user interaction calls `trackEvent(stepName, actionType, metadata)`, which writes to both `console.log` and `sessionStorage` (key: `covenant_events`). Each event record has this shape:

```json
{
  "timestamp": "2025-04-28T12:00:00.000Z",
  "sessionEmail": "analyst@bankco.com",
  "stepName": "Validate",
  "actionType": "total_debt_changed",
  "metadata": { "value": "5000000" }
}
```

### Why We Track Backtracking and Field-Level Dwell Time

**Backtracking** (`backtracked_from_step_N` in metadata) captures when a user reverses direction in the workflow. High backtrack rates on a specific step are a leading indicator of confusion — either the data on that step is hard to gather, or the UI creates uncertainty that forces the user to re-check prior input.

**Dwell time** (`dwell_ms` on `step_exit` events) measures how long a user spends on each step. Unusually long dwell on the Analyze step correlates strongly with Poor scan quality documents (see Admin Dashboard data). Tracking at the field level (e.g., `total_debt_changed`, `total_equity_changed`) allows us to distinguish users who typed confidently from users who corrected themselves multiple times — a proxy for data legibility.

Together, these signals turn the workflow into a continuous friction audit. Analysts don't need to self-report pain points; the telemetry surfaces them automatically.

## Admin Dashboard

The `/admin` route gives a Bank COO a real-time view of aggregate session behavior across 1,000 mock sessions.

**Bar Chart — Document Quality vs. Approval Rate**: Compares approval, flag, and rejection rates for Good vs. Poor scan quality documents side by side. The gap in flag rates directly visualizes the quality bottleneck.

**Line Chart — Average Time to Decision by Document Type**: Shows how Poor-quality documents extend processing time across all document types (Form 1065, Schedule K-1, Ledger). Each data point represents the mean `totalTimeToDecision` for that cohort.

## The Next Sprint: Automated OCR Pre-Processor

The admin data makes a clear case: **Poor scan quality is the primary driver of Flagged compliance decisions**, with a ~40% higher flag rate and 1.5–2x longer processing times compared to Good-quality documents.

The highest-ROI investment for the next sprint is an **Automated OCR Pre-Processor** that runs before the Ingest step to:

1. Normalize document image quality (contrast, rotation, noise reduction).
2. Extract structured fields (Total Debt, Total Equity) directly, reducing manual data entry error.
3. Flag unreadable documents before analyst time is spent on them.

This intervention directly addresses the root cause in the data, rather than training analysts to work around bad inputs. Based on the observed flag rate delta, a successful OCR layer could reduce Flagged outcomes by an estimated 15–20 percentage points for the affected cohort.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Components | Shadcn/UI |
| Charts | Recharts |
| Deployment | Vercel |
