Phase 1: The "Shell" & Security (30 Minutes)
Prompt for Claude:

"I am building a Forward Deployed Engineer case study in Next.js (App Router), TypeScript, and Tailwind CSS.

Step 1: Create a simple 'Email Gate' landing page. It must collect a user's email, store it in a browser cookie or localStorage for session persistence, and then redirect to the main dashboard.
Step 2: Set up a layout with a Sidebar (the 'Sidecar' for context) and a Main Content area for a 4-step workflow.
Step 3: Use Shadcn/UI for the components (Progress bar, Cards, Buttons, Inputs)."

Phase 2: The Instrumented Workflow (60 Minutes)
Prompt for Claude:

"Now, implement a 4-step 'Covenant Monitoring' wizard.

The Steps: > 1. Ingest: A dropdown to select 'Tax Document' (Form 1065, Schedule K-1, Ledger) with a 'Scan Quality' toggle (Good/Poor).
2. Validate: Inputs for 'Total Debt' and 'Total Equity'.
3. Analyze: Display a calculated Debt-to-Equity ratio.
4. Decide: Buttons for 'Approve Compliance', 'Flag', or 'Reject'.

The Sidecar (Critical): Create a 'Sidecar' component that listens to the workflow state.

If Step 3 is active and Ratio > 2.5, show a 'High Risk' nudge button.

If Step 1 is 'Poor' quality, show a 'Manual Review Required' warning.

Instrumentation (The 'Strive' Secret): Create a trackEvent utility. Every field change, step navigation, and sidecar interaction must log to a console.log (simulating a DB) with: timestamp, sessionEmail, stepName, actionType, and metadata (e.g., 'backtracked_from_step_3')."

Phase 3: The Admin "Friction" Dashboard (45 Minutes)
Prompt for Claude:

"Build an /admin view for a Bank COO.

Requirement: Mock an array of 1,000 session objects.

Sessions with 'Poor' scan quality should have a 40% higher 'Flagged' rate and 2x longer 'Dwell Time' in the Analyze step.

Visuals: Use Recharts to create two charts:

A Bar Chart comparing 'Document Quality' vs 'Approval Rate'.

A Line Chart showing 'Average Time to Decision' based on Document Type.

The Goal: The data must visually prove that 'Poor' documents are causing a bottleneck, justifying the need for an automated OCR tool."

Phase 4: README & Final Polish (15 Minutes)
Prompt for Claude:

"Write a professional README.md for this repo that answers:

Security: Explain how the email gate provides basic session persistence and data isolation.

Telemetry Schema: Detail why we track 'backtracking' and 'field-level dwell time' to identify user friction.

The Next Sprint: Argue that an 'Automated OCR Pre-processor' is the #1 priority because 'Poor' document quality is the primary driver of 'Flagged' states in the admin data."

Critical Tips for Vercel Deployment
Environment Variables: If you use any (like a mock API key), tell Claude to use .env.local so you can add them to Vercel easily.

Deployment Command:

Initialize Git: git init

Create Repo: gh repo create (or via GitHub UI)

Deploy: Use the Vercel CLI (vercel) or simply connect the GitHub repo to the Vercel Dashboard for auto-builds.

Check for Errors: Ask Claude: "Run a final check on the TypeScript types to ensure the build won't fail during the Vercel deployment process."