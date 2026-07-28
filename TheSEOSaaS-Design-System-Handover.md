# TheSEOSaaS — Design System Handover (v0.1)

Prepared for: Design partner (Claude Design)
Purpose: Foundation for building out the shadcn-based UI design system.

---

## 1. Brand Feel

TheSEOSaaS should feel like **an experienced SEO Lead sitting next to the founder** — calm, sharp, and directive.

It is:
- **Trustworthy** — clean, structured, never gimmicky
- **Confident** — states conclusions, not just data
- **Execution-first** — every screen implies "here's what happens next," not just "here's what's happening"

It is NOT:
- A chatbot (no playful bubbles, no casual AI-assistant tone)
- An analytics dashboard (no dense metric grids, no raw tables as the primary UI)
- A generic SaaS template (avoid default shadcn "gray card" sameness — needs a distinct, opinionated identity)

Emotional targets: relief, confidence, momentum, competitive urgency (see product spec's Brand Psychology section).

---

## 2. Typography

- **Primary typeface:** Inter (or Geist as an alternative) — clean, neutral, highly legible at data + prose sizes
- **Headings:** Semibold/Bold, tight letter-spacing, larger scale contrast to feel authoritative (this is a "consultant telling you something important," not a label)
- **Body/UI copy:** Regular/Medium, generous line-height (1.5–1.6) since copy will read like consultant narration, not just UI labels
- **Numerics/scores** (e.g. SEO Score): Tabular figures, slightly larger weight to draw the eye — these are the "verdict" moments

Suggested scale: 12 / 14 / 16 / 18 / 24 / 32 / 48px

---

## 3. Color — "Trust Blue" (Light Mode Only, v0.1)

| Role | Hex | Use |
|---|---|---|
| Primary | `#2563EB` | CTAs, links, active states, brand accents |
| Secondary | `#0EA5E9` | Supporting accents, highlights, secondary buttons |
| Accent | `#F97316` | Urgency/opportunity callouts, warnings, "act now" moments |

Neutrals (shadcn default slate/gray scale recommended for backgrounds, borders, text) — keep neutrals quiet so the blue/orange carry all emphasis.

Semantic mapping:
- Success/healthy: green (standard shadcn success, not part of core 3)
- Opportunity/urgency: Accent orange — reserved specifically for "competitors are winning" / "you're missing X" moments
- Primary actions ("Generate," "Publish," "Subscribe"): Primary blue

Map directly to shadcn CSS variables (`--primary`, `--secondary`, `--accent`, plus generated `-foreground` pairs) once tokens are finalized.

---

## 4. Layout & Spacing

- 4px base spacing unit (4/8/12/16/24/32/48/64)
- Sidebar-driven app shell: fixed left sidebar (Dashboard, Audits, Keywords, Competitors, Content, Settings)
- Content areas favor **narrative cards** over dense tables — each card should read like a consultant's note (headline conclusion + supporting detail + recommended action), not a raw stat block

---

## 5. Border Radius Levels

Use shadcn's radius token system, mapped to a slightly rounded, modern-but-serious feel (not playful/bubbly):

| Token | Value | Use |
|---|---|---|
| `sm` | 6px | Inputs, badges, tags |
| `md` | 8px | Buttons, small cards |
| `lg` | 12px | Primary cards, modals |
| `xl` | 16px | Hero/report containers, audit score panel |

---

## 6. Core UX Flow (drives layout priority)

Audit → Find Opportunities → Generate Content → Publish → Track Rankings

Every screen should visibly connect to this loop. No dead-end screens — every insight card ends in an action (button), not just a stat.

---

## 7. Component Voice Rules

- Never show a bare number/metric without a one-line "why it matters" underneath
- Every recommendation module needs a visible primary action (e.g., "Generate 3 articles"), styled in Primary blue
- Paywalled actions (full blog generation, more keyword tracking) should look like an upgrade, not a broken/locked feature — no greyed-out disabled states; use a subtle lock/badge affordance instead

---

## 8. Open Items for Design

- Dark mode (deferred — not in v0.1 scope)
- Data viz style for future Strategist page (v0.2)
- Empty/loading states for the audit crawl sequence (checklist-style loader shown in product spec)
