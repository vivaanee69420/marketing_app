# Design Doc — Marketing ROI Command Center (SaaS)

The visual system, ported and formalized from the reference app (`m1/`). Calm,
warm, editorial dashboard aesthetic: cream/off-white surfaces, gold accent, soft
shadows, generous radius. No Tailwind, no UI kit — plain CSS + CSS variables.
Build React components against these exact tokens.

---

## 1. Design principles

1. **Calm over flashy.** Warm neutrals, low-contrast surfaces, one gold accent.
   Data is the hero, not chrome.
2. **Editorial density.** Generous radius (14–18px), soft layered shadows, 13px
   base text. Reads like a well-set report, not a control panel.
3. **Status is colored, everything else is neutral.** Green/amber/red reserved
   for health (ok/warn/err). Gold = brand/primary action only.
4. **Cards everywhere.** Every panel is a white card on cream. Nested cards for
   sub-forms (lighter, no shadow).
5. **No external charting lib.** Charts are hand-rolled inline SVG (polylines +
   gridlines), matching the muted palette.

---

## 2. Color tokens (CSS variables — `:root`)

```css
:root {
  --bg:           #f7f5f1;  /* page background (warm cream) */
  --sidebar:      #fbfaf8;  /* sidebar surface */
  --panel:        #ffffff;  /* card / panel */
  --panel-soft:   #fcfaf6;  /* nested / soft panel */
  --line:         #e6ddcf;  /* primary border / divider */
  --text:         #4b4b4b;  /* body text */
  --heading:      #4a4a4a;  /* headings */
  --muted:        #8b847c;  /* secondary / muted text */
  --gold:         #d7a10d;  /* primary accent / CTA */
  --gold-soft:    #f7efdf;  /* gold tint background */
  --blue:         #1f7ae0;  /* active nav / focus */
  --danger:       #a5473c;  /* error text */
  --danger-soft:  #fff2ef;  /* error background */
  --warning:      #9b7310;  /* warning text */
  --warning-soft: #fff8ea;  /* warning background */
  --success:      #497a4d;  /* success text */
  --success-soft: #eef8ee;  /* success background */
  --shadow: 0 2px 10px rgba(62,49,24,0.06), 0 12px 24px rgba(62,49,24,0.04);
}
```

### Role reference

| Role | Value |
|---|---|
| Page background | `#f7f5f1` |
| Sidebar | `#fbfaf8` |
| Card / panel | `#ffffff` |
| Soft / nested panel | `#fcfaf6` (also `#faf6ee` for hero stat tiles) |
| Primary border | `#e6ddcf` · table divider `#f0e8da` |
| Body text | `#4b4b4b` · heading `#4a4a4a` · muted `#8b847c` |
| Metric label | `#7e776e` · metric note `#9a9288` |
| Primary / gold | `#d7a10d` · gold soft `#f7efdf` · gold hover text `#a17a07` |
| Active nav / focus | `#1f7ae0` |
| Success | text `#497a4d`, bg `#eef8ee`, border `#cde6d0` |
| Warning | text `#9b7310`, bg `#fff8ea`, border `#ebdbb0` |
| Error / danger | text `#a5473c`, bg `#fff2ef`, border `#efc7c0` |
| Badge text | `#9e7a10` (on gold-soft) |
| Tab inactive text | `#758299` |
| Brand mark | bg `#111`, text `#fff` |
| Sidebar footer | bg `#4f4f4f`, text `#ece6dd`, strong `#f2e6bf` |

---

## 3. Typography

- **Family:** `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Base body:** 13px, color `--text`, line-height ~1.45–1.6.

| Token | Size | Weight |
|---|---|---|
| Page heading (h2) | 18px | 700 |
| Section heading (h3) | 14px | 700 |
| Brand name (h1) | 15px | 700 |
| Metric value | 20px | 700 |
| Hero main title | 18px | 700 |
| Table header / label | 14px | 600 |
| Body / table cell | 13px | 400 |
| Input/filter label | 13px | 400 |
| Metric label | 14px | 400 |
| Metric note / badge / pill / tab | 12–13px | 600 (badge/pill) |
| Sidebar footer strong | 16px | 700 |

---

## 4. Spacing, radius, shadow

**Spacing scale (px):** 6 · 10 · 12 · 14 · 18 · 20 · 28 · 32.
Common: card padding 18px, nested card 14px, grid gap 14px, content padding
`18px 28px 32px`, page-header gap & margin-bottom 18px.

**Radius (px):** 12 (tabs) · 14 (cards, inputs, buttons, notices, metric icon)
· 16 (hero stat tile, sidebar footer, tab container) · 18 (cards, nav link) ·
999 (badges, pills).

**Shadows:**
- Card/hero: `0 2px 10px rgba(62,49,24,0.06), 0 12px 24px rgba(62,49,24,0.04)`
- Nav active: `0 1px 2px rgba(31,122,224,0.08)`
- Tab active: `0 1px 3px rgba(62,49,24,0.08)`

---

## 5. Layout

**App shell** — CSS grid, 2 columns:
```css
.shell { display: grid; grid-template-columns: 268px 1fr; min-height: 100vh; }
```
- **Sidebar:** 268px, `--sidebar` bg, 1px right border `--line`, padding 18px,
  flex column (brand → nav → footer pushed to bottom with `margin-top:auto`).
- **Content:** padding `18px 28px 32px`, `--bg` background.
- **Page header:** flex, space-between, gap 18px, margin-bottom 18px; description
  max-width 58rem.

**Grid system:** `.grid` gap 14px; modifiers `.cols-2/.cols-3/.cols-4/.cols-5`
(equal columns); `.chart-layout` = `2fr 0.95fr`.

**Responsive — single breakpoint `max-width: 1200px`:**
- All grids → `1fr` (stack).
- Shell → single column; sidebar full-width, right border becomes bottom border.
- Page header → column; review rows → column.

---

## 6. Component specs

### Card
`bg #fff`, `1px solid #e6ddcf`, radius 18px, shadow `--shadow`, padding 18px.
Nested/soft card: padding 14px, no shadow, `--panel-soft` bg.

### Metric card
Flex space-between, min-height 110px. Label `#7e776e` 14px (mb 8px) · value
`#4a4a4a` 20px/700 (mb 4px) · note `#9a9288` 12px. **Metric icon:** 42×42,
radius 14px, bg `#f7efdf`, color `#d7a10d`, grid place-items center, 700.

### Hero card (Highest-ROI business)
Grid `1fr auto`, gap 14px, items center. Title `#a17a07` 13px · main `#4a4a4a`
18px/700 · subtitle `#8b847c` 13px. **Hero stat tile:** min-width 86px, bg
`#faf6ee`, radius 16px, padding `12px 14px`, centered; label 12px `#8b847c`,
value 700 `#4a4a4a`.

### Button
Inline-flex center, `1px solid #e6ddcf`, bg `#fff`, color `#4a4a4a`, radius 14px,
padding `10px 14px`, cursor pointer.
- **Primary:** bg + border `#d7a10d`, text `#fff`.
- **Secondary:** white bg, `--line` border, `#4a4a4a` text.

### Input / select / textarea
Width 100%, `1px solid #e6ddcf`, radius 14px, padding `11px 12px`, white bg,
`#4a4a4a` text. Textarea min-height 96px, resize vertical. **Filter select:**
height 36px, radius 14px, padding `0 14px`, min-width 180px.

### Badge
Inline-flex center, padding `4px 10px`, radius 999px, bg `#f7efdf`, text
`#9e7a10`, 12px/600.

### Pill (status)
Inline-flex center, padding `5px 10px`, radius 999px, 12px/600.
- `.ok` → bg `#eef8ee`, text `#497a4d`
- `.warn` → bg `#fff8ea`, text `#9b7310`
- `.err` → bg `#fff2ef`, text `#a5473c`

### Notice (banner)
Padding `12px 14px`, radius 14px, 13px, line-height 1.45. Default = warning
(`#fff8ea`/`#ebdbb0`/`#9b7310`).
- `.good` → `#eef8ee` / `#cde6d0` / `#497a4d`
- `.issue` → `#fff2ef` / `#efc7c0` / `#a5473c`

### Table
Width 100%, border-collapse, wrap in `.table-wrap` (overflow auto). `th`/`td`:
text-align left, padding `12px 10px`, border-bottom `1px solid #f0e8da`,
vertical-align top, 13px. `th` color `#8b847c`, 600.

### Tabs
Container: inline-flex, gap 4px, bg `#f7f0e0`, radius 16px, padding 4px.
Tab: padding `7px 12px`, radius 12px, color `#758299`, 13px. Active: white bg,
`#4a4a4a` text, shadow `0 1px 3px rgba(62,49,24,0.08)`.

### Navigation (sidebar)
Nav: grid, gap 10px, margin-top 20px. Nav link: flex center, gap 12px, padding
`12px 14px`, radius 18px, `1.5px solid transparent`, color `#4a4a4a`. Hover/
active: white bg, border `#1f7ae0`, shadow `0 1px 2px rgba(31,122,224,0.08)`.
Nav dot: 16×16, radius 4px, `1.5px solid currentColor`, opacity 0.8.

### Sidebar footer
margin-top auto, bg `#4f4f4f`, text `#ece6dd`, radius 16px, padding 16px.
Strong: block, `#f2e6bf`, 16px, mb 6px. Paragraph: 13px, line-height 1.45.

### Section head
Flex space-between, gap 14px, mb 10px. h3: `#4a4a4a` 14px/700. p: `#8b847c` 12px.

### Empty state
Padding 18px, `1px dashed #e6ddcf`, radius 16px, color `#8b847c`, white bg.

### Misc
`.list` (pl 18px, 13px, lh 1.6) · `.subtle` (`#8b847c` 12px) · `.stack` (grid,
gap 14px) · `.row` (flex, gap 12px, wrap) · `.review-row` (flex space-between,
gap 14px, border-bottom `#f0e8da`, pb 12px).

### Charts
Inline SVG only. Gridlines in `--line`; spend polyline in gold `#d7a10d`,
revenue polyline in muted gray; data points as small circles. Month labels
`#8b847c` 12px.

---

## 7. Component inventory (build list)

Reusable primitives to build first (mirrors `m1` `components/`):

- `AppShell` (sidebar + content grid) · `Sidebar` (brand, nav, footer) ·
  `PageHeader` (title, description, actions)
- `Card`, `SoftCard`, `SectionHead`, `EmptyState`
- `KpiCard` (label/value/note/icon) · `KpiGrid` (cols-N) · `RoiCardSet`
  (Spend/Revenue/ROAS/ROI) · `HeroCard` + `HeroStat`
- `Notice` (good/warn/issue) · `Pill` (ok/warn/err) · `Badge`
- `DataTable` (`.table-wrap` + th/td) · `Tabs`
- `InputField`, `TextAreaField`, `SelectField`, `FilterSelect`, `Button`
  (primary/secondary)
- `TrendChart` (SVG line chart)

---

## 8. Adapt for SaaS shell

The reference brand ("GM Dashboard", `marketing.gm-dental.co.uk`) was hardcoded.
For the SaaS:
- Brand block becomes neutral product name; show our **own org-switcher component**
  (a dropdown listing the signed-in user's organizations from `memberships`) near
  the brand so users switch tenants.
- Add our own **user menu** (avatar + sign-out / profile dropdown, backed by the
  Supabase session via `@supabase/supabase-js`) in the sidebar footer or a top bar.
- Keep all tokens and component specs identical — only the brand/identity slots
  change per org.
</content>
