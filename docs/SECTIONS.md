# Application Sections & UI Inventory

Exhaustive, panel-by-panel map of every screen and section, derived from a full
read of the reference app (`m1/`). This is the build checklist for the React UI —
nothing here should be missed.

**Totals:** 11 pages · 10 sidebar nav links · **~56 distinct UI sections** ·
11 tables · 8 form sections.

---

## Global navigation (Sidebar — 10 links, in order)

Brand shell (logo mark + product name + org switcher) → nav → footer.

1. `/` — **Overview**
2. `/setup` — **Setup**
3. `/growth` — **Growth Hub**
4. `/tasks` — **Task Manager**
5. `/businesses` — **Businesses**
6. `/conversions` — **Website Leads**
7. `/imports` — **Import / Bulk**
8. `/audit` — **Account Audit**
9. `/reports` — **Reports**
10. `/settings` — **Settings**

Footer: "Marketing Command Centre" heading + descriptor. Active link =
white bg + blue border. (SaaS: add our org switcher + user menu, backed by Supabase Auth.)

---

## Page 1 — `/` Overview (Dashboard) · 11 sections

1. **Page header** — title, subtitle, filter dropdowns (All Businesses, This
   Month), action buttons: **Run Sync**, **Generate Report**.
2. **Key metrics grid** — 6 metric cards: Total Marketing Spend, Tracked
   Revenue, ROAS, ROI, Morning Recipients, Open Tasks.
3. **Highest-ROI business hero card** — star icon, business name, 4 hero stats:
   Conversions, AI Report date, Open Issues, Tasks.
4. **System health notice** — latest sync/report/email health (good/error bar).
5. **Spend vs Revenue trend chart** — inline SVG, 2 polylines (gold spend, gray
   revenue), month labels Jan–Jun.
6. **Job health card grid** — one status card per scheduled job: name, run time,
   timezone, last run, ok/warn pill.
7. **Tabbed section header** — tabs: Business Performance, Campaign Performance,
   Automation Health.
8. **Business comparison table** — Business, Spend, Revenue, ROI, Connections
   (connection pills per row).
9. **Latest AI reports card** — list of report cards (business, type, date,
   summary).
10. **Operational suggestions card** — bulleted pre-production recommendations.
11. **Latest task queue table** — Task, Business, Priority, Status, Source.

---

## Page 2 — `/setup` Connection Setup · 6 sections

1. **Page header** — title, subtitle, actions: Open Settings, Open Manual Feed,
   Open Task Manager.
2. **Deployment readiness notice** — good/error showing required env status.
3. **Deployment checklist card** — ordered list of 6 setup steps.
4. **Live endpoints card** — bulleted list of 5 API endpoints.
5. **Env-var status cards** — one card per env group; each a table: Variable,
   Purpose, Status (pills: set / required / optional).
6. **Business connections table** — Business, Meta, Google, Actions; status
   pills + Connect Meta / Connect Google buttons.

> SaaS note: env-readiness becomes per-org connection readiness; Supabase Auth handles
> auth so "basic auth" rows are dropped.

---

## Page 3 — `/growth` Growth Hub · ~7 base + per-tab sections

**Common (all tabs):**
1. **Page header** — title, subtitle.
2. **Growth section card** — tab buttons: Patients · Marketing · Loyalty &
   Members · Reviews · Online Booking · Benchmark; business filter buttons (All
   + per-business).

**Patients tab:** 3) Practices & Patients header · 4) Practice performance cards
(per business: New Patients, Appointments, Completed, Revenue).

**Marketing tab:** 3) Summary metrics grid (Total Leads, Total Pipeline Value,
Average Conversion) · 4) Source breakdown table (Business, Spend, Revenue,
Converted, Avg Value, Pipeline) · 5) Treatment-mix / offer-value table
(Business, Primary Offer, Tracked Revenue, Suggested Next Step).

**Loyalty & Members tab:** 3) Summary metrics (Active Members, MRR, Avg LTV,
Retention Rate) · 4) Membership tier cards (name, price, benefits, members) ·
5) Automated rewards card (lifecycle journeys) · 6) Campaign performance notice.

**Reviews tab:** 3) Review stats (Avg Rating, Total Reviews, Awaiting Response,
Recovery Rate) · 4) Reviews-by-source table · 5) Reviews-by-practice table ·
6) Recent reviews stack (author, platform, business, date, body, responded /
needs-reply pill).

**Online Booking tab:** 3) Booking metrics (Today, This Week, This Month,
No-show Rate) · 4) Recent bookings table (Date/Time, Practice, Patient, Service,
Deposit, Status).

**Benchmark tab:** 3) Summary metrics (Overall Ranking, Better Than Avg, Top
Quartile Uplift) · 4) Performance vs UK Industry table (Metric, UK Avg, You,
Variance, Status pill) · 5) Top improvement opportunities card.

**Footer (all tabs):** Organic snapshot table (Channel, Reach, Engagements,
Sessions) · "What this powers" card (how Growth Hub feeds AI reports + tasks).

---

## Page 4 — `/tasks` Task Manager · 4 sections

1. **Page header** — title, subtitle.
2. **Create task form** — Business select, Title, Description textarea, Category
   select, Priority select, Due Date, Add Task.
3. **Auto task rules card** — how AI analysis generates tasks.
4. **Task queue table** — Task, Business, Category, Priority, Status, Source,
   Created, Update; status pills; inline status select + Save.

---

## Page 5 — `/businesses` Businesses · 2 sections

1. **Page header** — title, subtitle.
2. **Businesses table** — Business, Spend, Revenue, ROI, Meta, Google, Timezone,
   Last Sync (integration status values per row).

> SaaS: add "Create Business" action + edit/delete; businesses are org-owned,
> not a fixed seed.

---

## Page 6 — `/conversions` Website Leads (Conversion Entry) · 3 sections

1. **Page header** — title, subtitle, action: Upload CSV Feed.
2. **Add conversion form** — Business select, Conversion Type select, Name,
   Email, Phone, Conversion Value, Conversion Date (datetime), UTM Source, UTM
   Campaign, UTM Ad Set, Source Notes textarea, Save Conversion.
3. **Recent conversions table** — Lead (name + contact), Business, Value,
   Matched To (campaign/ad-set match detail), Date.

---

## Page 7 — `/imports` Import / Bulk · 7 sections

1. **Page header** — title, subtitle, actions: Open Manual Conversion Entry,
   Open Task Manager.
2. **Upload CSV form** — Business select, Feed Type select, CSV File input,
   Upload CSV Feed.
3. **Manual feed rules card** — what syncs auto vs manual; CSV calc notice.
4. **Create review-automation task form** — Business select + Create button.
5. **CSV column guide table** — Feed, Required Columns (exact header names per
   feed type: conversions / reviews / bookings / organic).
6. **Review request automation card** — recommended live review-collection flow.
7. **Notes feed card** — Feed Owner input, Current Manual Inputs textarea,
   subtle helper text.

---

## Page 8 — `/audit` Account Audit · 2 sections

1. **Page header** — title, subtitle.
2. **Account status table** — Business, Meta, Google, Last Sync, Issue (status
   pills + issue text per business).

---

## Page 9 — `/reports` AI Reports · 4 sections

1. **Page header** — title, subtitle.
2. **Report cards list** — one card per report (business, type, date, summary).
3. **Per-report 6-column insight grid** — What is working (wins) · What is not
   working (losses) · Needs improvement (issues) · What to look at
   (opportunities) · Creative ideas · Ad copy ideas.
4. **Empty state notice** — when no reports exist.

> Note: reports also carry `nextActions` (used by task generation) even though
> the grid renders 6 columns.

---

## Page 10 — `/settings` Settings · 8 sections

1. **Page header** — title, subtitle.
2. **Morning automation settings card** — AI Model input, Email Provider input,
   3 reminder checkbox cards (Email / SMS / WhatsApp), Team Emails textarea,
   Save.
3. **Schedule card** — per scheduled job: Job Name, Run Time, Timezone, Save
   Schedule.
4. **Integrations card** — per business: Meta + Google forms (Account Name,
   Account/Customer ID, Access Token, Refresh Token, Notes textarea; Save +
   OAuth buttons).
5. **Conversion values card (form)** — Business select, Conversion Name,
   Category select, Default Value, Add Conversion Type.
6. **Conversion values table** — Business, Type, Value.
7. **Review automation card** — automation feature list; buttons: Open Manual
   Feed Hub, Open Reviews Dashboard.
8. **Implementation status card** — implemented-features list.

> SaaS: add a **Members** section (org members + roles from `memberships`, via Supabase Auth) and a **Billing**
> placeholder (Phase 2). SMS/WhatsApp toggles stay as UI but only email sends.

---

## Reusable components (from `m1` `components/`)

- `KpiCard` — metric card (label, value, optional subtext).
- `RoiCardSet` — 4-col KPI grid (Spend, Revenue, ROAS, ROI).
- `InputField` — labeled text/email/number/date/datetime input.
- `TextAreaField` — labeled textarea.

(Extend per [`DESIGN.md` §7](./DESIGN.md) component inventory.)

---

## Cross-page visual patterns

- **Page header:** title + description + `header-actions` row.
- **Notice bars:** good (green) / issue (red) / warning (amber).
- **Metric grids:** cols-3 / 4 / 5 / 6 by context.
- **Status pills:** ok / warn / err tones.
- **Nested cards:** sub-forms as cards (14px padding, no shadow).
- **Tables:** wrapped in `.table-wrap`.
- **Hero cards:** icon + name + stat tiles.
- **Charts:** custom inline SVG (no charting lib).
</content>
