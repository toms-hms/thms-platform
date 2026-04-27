---
name: Job Diagnosis & Management Tool
description: Full product spec for the guided maintenance workflow — wizard, AI diagnostic, contractor outreach, job detail dashboard
type: project
---

## Vision

Turn "something's wrong at my house" into "3 contractors contacted" in under 90 seconds. The AI does the heavy lifting of writing a contractor-ready brief so quotes come back apples-to-apples. Once outreach is sent, the job view becomes a single place to track communications, quotes, and scheduling.

**Why:** The current product is a manual CRM. Users open an empty job with tabs and don't know what to do. The new product is a guided workflow.

---

## Job kinds — three types of work

```ts
enum JobKind {
  ISSUE          // Something is wrong — Fix / Repair / Inspect
  IMPROVEMENT    // I want to upgrade something — Remodel / Install / Upgrade
  RECURRING_WORK // Scheduled maintenance — annual, seasonal, ongoing
}
```

`JobKind` drives wizard question tone, AI prompt framing, and job lifecycle. It is **not** related to contractor matching — that is always `TradeCategory`.

---

## TradeCategory — 12 values (contractor matching only)

```
PLUMBING, ELECTRICAL, HVAC, ROOFING, PAINTING,
LANDSCAPING, GENERAL_CONTRACTING, CARPENTRY, FLOORING,
PEST_CONTROL, DOORS_AND_WINDOWS, POOL_AND_SPA
```

UI labels differ from enum values (e.g. "Roofing & Gutters" displays but stores `ROOFING`). Appliance and Structural were explicitly excluded — appliance repair is a service-tech model, structural routes to General Contracting.

**How to apply:** `TradeCategory` is always the contractor matching dimension regardless of `JobKind`. The same plumber covers Issue + Improvement + RecurringWork.

---

## Information architecture

```
Home detail (list of jobs)
  │
  ├─▶ New Request (5-step wizard) — creates job
  │
  └─▶ Job Detail (in-progress) — tracks job
         ├─ Overview (pipeline + activity + AI summary)
         ├─ Contractors
         ├─ Communications
         ├─ Quotes
         └─ Photos & AI
```

---

## 5-step wizard

Jobs are immutable once "Ask for quotes" is pressed. Wizard state lives in client React only — abandoning clears state, no draft DB record.

### Step 1 — Kind
Two large split-cards: "Something is wrong" (ISSUE) and "I want to improve something" (IMPROVEMENT). Third card for RECURRING_WORK. Choosing kind routes the rest of the wizard. Cannot change kind without starting over.

### Step 2 — Category
Grid of tiles (icon + label). Filtered by kind. All tiles ultimately map to a `TradeCategory` value — the label is wizard-specific framing.

**Issue tiles (maps to TradeCategory):**
Plumbing, Electrical, HVAC, Roofing & Gutters → ROOFING, Pest Control, Doors & Windows, Flooring, Painting, Landscaping, General Contracting, Pool & Spa, Something else → GENERAL_CONTRACTING

**Improvement tiles:**
Kitchen Remodel → GENERAL_CONTRACTING, Bathroom Remodel → GENERAL_CONTRACTING + PLUMBING, Painting, New Flooring, Outdoor Project → LANDSCAPING, Addition or Remodel → GENERAL_CONTRACTING, Doors & Windows, Pool & Spa

**Recurring Work tiles:**
HVAC Servicing, Lawn Care → LANDSCAPING, Gutter Cleaning → ROOFING, Pest Prevention, Pool Maintenance → POOL_AND_SPA, Exterior Painting → PAINTING

### Step 3 — Describe + photos
- Title (required)
- Description (freeform)
- Photos (0–8, drag-drop or file picker) — strongly encouraged, enables remote quoting

### Step 4 — AI Diagnose
Conversational diagnostic. Behavior:
- AI opens with a greeting referencing the title
- 3–5 diagnostic questions tailored to category + kind — answered via multiple-choice button cards (A/B/C/D + label) — free-text input always available
- **V1: canned question sets per category for determinism** (not live LLM calls per question)
- After last answer: AI generates contractor-ready summary card with root cause, severity, scope, price range, constraints
- Summary is **editable** before proceeding
- User can **skip** — summary will be shorter
- The summary is what gets emailed to contractors

### Step 5 — Pick contractors
- Filter chips: All / By category (pre-filtered to matching TradeCategory)
- List of matching contractors with name, company, category, contact info
- Select up to **3** (cap enforced in UI)
- "Ask N for quotes" CTA:
  1. Sends AI summary as email to selected contractors in parallel
  2. Creates job record with status IN_PROGRESS
  3. Navigates to Job Detail
  4. Outbound emails hidden from Communications tab until contractor replies

---

## Job Detail

Sticky header + tabs. Header visible while scrolling any tab.

### Sticky header
- Title + "In Progress" chip + category + home
- Stat strip: `Contractors: N · Quotes: N of 3 · Est: $X–$Y`
- Edit / More actions

### Tab: Overview
Two-column layout.
- Left: AI Diagnosis card (severity, scope, range, editable via "Regenerate") + Contractor Pipeline (3 kanban columns: Requested / Replied / Scheduled)
- Right: Recent Activity feed + "Next step" CTA card (surfaces single most important action)

### Tab: Contractors
List of job contractors with per-row status chip (Awaiting reply / Quote received / Scheduled). Per-row actions: Message, Call, More. "Add contractor" button.

### Tab: Communications
Thread list (left) + active thread (right).
- Filter: All / Needs review
- Needs review = threads with quote or question from contractor
- Unread dot indicator
- Thread detail: body + extracted quote summary block + action buttons (Reply, Accept quote, AI draft reply)
- Auto-extraction: incoming emails parsed for price/warranty/availability → populates Quotes tab

### Tab: Quotes
Side-by-side cards per contractor. Each card: name, total, line items, warranty, ETA, Accept + Message buttons. AI picks "Best match" with explanation banner. Best match recomputed on each new quote arrival.

### Tab: Photos & AI
User uploads (tagged "Original") + AI concepts (tagged "AI — not construction-accurate"). Generate AI concept button. Empty state guides to upload first.

---

## Data model additions needed (not yet in DB)

```ts
Job: add kind: JobKind
Job: add diagnosis: { messages: ChatMessage[]; summary: DiagnosisSummary | null }
// DiagnosisSummary: { rootCause, severity, scope, priceRange: [number, number], constraints: string[] }

JobContractor: add stage: 'requested' | 'replied' | 'scheduled'
// (in addition to existing granular status enum — stage is the simplified pipeline view)

Quote: add isBestMatch: boolean
Quote: add lineItems: { label: string; amount: number }[]
Quote: add warranty: string | null
Quote: add eta: string | null
```

---

## Key behaviors

1. **Outbound emails hidden until reply** — inbox stays focused on incoming work
2. **Contractors never see each other** — separate threads per contractor
3. **Pipeline stage updates automatically** from thread events — no manual status-setting
4. **Best match recomputed** every time a new quote arrives
5. **State persists on refresh** — mid-wizard state uses localStorage
6. **Max 3 contractors per job** — enforced in UI, allows apples-to-apples comparison
7. **AI summary editable** before sending in Step 5
8. **Job immutable after outreach** — kind, category, title locked once IN_PROGRESS

---

## Implementation phases

### Phase 1 — Wizard (steps 1–3) + data model
- Add `kind` to Job model + migration
- Replace "New Job" modal with full-page wizard
- Steps 1–3 functional
- Steps 4–5 stubbed (skip-able AI, contractor list works, email sends if integration connected)

### Phase 2 — AI diagnostic (step 4)
- Canned question sets per TradeCategory
- LLM-generated contractor summary from Q&A answers
- Summary editable before step 5

### Phase 3 — Job detail redesign
- Sticky header with stat strip
- Overview: kanban pipeline + activity feed + next-step CTA
- Quotes: side-by-side + best match AI
- Communications: thread-list layout + auto-extraction

---

## Out of scope for V1
- Payment / deposit flow
- Contractor-facing interface
- Scheduling UI beyond showing confirmed appointment
- Multi-property switcher in wizard
- SMS / phone call logging
- Project phases / milestones (single-visit jobs only)
- Draft wizard state saved to DB

## Resolved decisions
- **No draft DB records** — wizard state in localStorage only
- **Canned questions for V1** — not live LLM per question (deterministic, no latency)
- **Contractor source** — existing DB filtered by TradeCategory
- **Email review** — Step 4 summary IS the review; user edits before Step 5 sends
- **Appliance excluded** — service-tech model, not contractor-quote workflow
- **Structural excluded** — routes to GENERAL_CONTRACTING
