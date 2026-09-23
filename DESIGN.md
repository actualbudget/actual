---
name: Actual Budget
description: Local-first personal finance, built around envelope budgeting
# All color values are the light-theme palette mapping; dark and midnight
# remap the same semantic roles via `theme.*` tokens (see The Semantic Token Rule).
colors:
  actual-purple: '#8719e0'
  actual-purple-hover: '#a368fc'
  navy-ink: '#102a43'
  navy-slate: '#627d98'
  navy-mist: '#e8ecf0'
  navy-frost: '#f7fafc'
  page-text: '#272630'
  surface-white: '#ffffff'
  positive-green: '#147d64'
  negative-red: '#e12d39'
  link-blue: '#1980d4'
  warning-gold: '#b88115'
typography:
  display:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '30px'
    fontWeight: 600
  headline:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '20px'
    fontWeight: 700
    letterSpacing: '0.5px'
  title:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '15px'
    fontWeight: 500
  body:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '16px'
    fontWeight: 400
    fontFeature: 'tnum, ss01, ss04'
  label:
    fontFamily: 'Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
    fontSize: '13px'
    fontWeight: 400
rounded:
  sm: '4px'
  md: '6px'
spacing:
  xs: '5px'
  sm: '10px'
  md: '16px'
  lg: '20px'
components:
  button-primary:
    backgroundColor: '{colors.actual-purple}'
    textColor: '{colors.surface-white}'
    rounded: '{rounded.sm}'
    padding: '5px 10px'
  button-primary-hover:
    backgroundColor: '{colors.actual-purple-hover}'
    textColor: '{colors.surface-white}'
  button-normal:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.navy-ink}'
    rounded: '{rounded.sm}'
    padding: '5px 10px'
  input:
    backgroundColor: '{colors.surface-white}'
    textColor: '{colors.page-text}'
    rounded: '{rounded.sm}'
    padding: '5px'
---

# Design System: Actual Budget

## 1. Overview

**Creative North Star: "The Home Office"**

Actual feels like a tidy personal desk: familiar, unpretentious, everything within reach. It is a tool people open weekly for years to reconcile accounts and move envelope money around, so the interface optimizes for routine, not first impressions. Density is moderate-to-high (this is a table-driven app), feedback is instant, and decoration is close to zero. The financial numbers are the interface; everything else exists to keep them legible and trustworthy.

The system explicitly rejects fintech-startup gloss (gradient heroes, glassmorphism, crypto-dashboard neon) and corporate banking UI (navy-and-gold enterprise-portal density). It is calm, trustworthy, and practical, and it must render identically well in three themes: light, dark, and midnight.

**Key Characteristics:**

- Table-first layouts with tabular numerals everywhere money appears
- One accent (Actual Purple) used sparingly for primary actions and selection
- Semantic color tokens only; components never hardcode hex values
- Utilitarian, compact components built for daily repetition
- Flat-first surfaces; shadows reserved for transient overlays

## 2. Colors

A calm navy-neutral base with one confident purple accent and strict semantic roles for money.

All hex values in this file (frontmatter included) are the light-theme palette mapping. The dark and midnight themes remap the same semantic roles to different palette values, so never use these hexes directly in components — route every color through the `theme.*` semantic tokens (see The Semantic Token Rule below).

### Primary

- **Actual Purple** (#8719e0): The single brand accent. Primary buttons, selected rows and borders, active navigation, mobile header. Hover lightens to **Lifted Purple** (#a368fc).

### Neutral

- **Navy Ink** (#102a43): Sidebar background, darkest text. The app's anchor dark.
- **Page Ink** (#272630): Default body text on light surfaces.
- **Navy Slate** (#627d98): Secondary and subdued text, table headers.
- **Navy Mist** (#e8ecf0): Page background, table borders, dividers.
- **Navy Frost** (#f7fafc): Hover rows, raised header rows.
- **Surface White** (#ffffff): Tables, cards, menus, modals.

### Tertiary (semantic money and status colors)

- **Positive Green** (#147d64): Positive amounts and funded budgets.
- **Negative Red** (#e12d39): Negative amounts, overspending, failures.
- **Link Blue** (#1980d4): Links and informational highlights.
- **Warning Gold** (#b88115): Underfunded templates, pending states.

### Named Rules

**The Semantic Token Rule.** Components never use raw palette values or hex codes. Every color goes through the `theme.*` semantic layer (`--color-*` custom properties) so all three themes (light, dark, midnight) stay correct. A hardcoded hex in a component is a bug.

**The One Accent Rule.** Actual Purple appears on well under 10% of any screen: primary action, current selection, active nav. It never decorates.

**The Never-Color-Alone Rule.** Positive/negative money state is conveyed by sign and context as well as color; green/red are reinforcement, never the only signal.

## 3. Typography

**Body Font:** Inter Variable (with system-ui fallback stack)
**Label/Mono behavior:** Same family; financial figures switch on tabular OpenType features

**Character:** One workhorse sans at compact sizes. No display serif, no font pairing games: hierarchy comes from weight and size, and the typographic star is the number column.

### Hierarchy

- **Display** (600, 30px): Page-level headings and large balances. Rare.
- **Headline** (700, 20px, 0.5px letter-spacing): Section titles.
- **Title** (500, 15px): Emphasized in-table and card text.
- **Body** (400, 16px): Default text.
- **Label** (400, 13px): Table meta, menus, dense secondary text; 12px and 10px steps exist for the tightest spots.

### Named Rules

**The Tabular Number Rule.** Every standalone financial figure renders with `font-feature-settings: "tnum", "ss01", "ss04"` (via `FinancialText` or `styles.tnum`) so digits align in columns and disambiguate. A proportional-figure money column is a bug.

## 4. Elevation

Flat-first with ambient shadows. Structure comes from 1px borders (Navy Mist) and background shifts (White on Mist, Frost on hover), not depth. Shadows exist only to lift **transient** surfaces above the page: menus, tooltips, popovers, modals. Persistent surfaces like tables and cards sit flat or carry the faint card shadow at most.

### Shadow Vocabulary

- **Card** (`box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)`): Resting cards and small raised widgets.
- **Ambient** (`box-shadow: 0 2px 4px 0 rgba(0,0,0,0.1)`): Focused inputs, subtle lift.
- **Large** (`box-shadow: 0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)`): Tooltips, popovers, floating panels.

### Named Rules

**The Transient-Only Rule.** If a surface stays on screen, it gets a border. If it appears on interaction and disappears, it may cast a shadow.

## 5. Components

Utilitarian and quick: compact paddings, instant state feedback, built for daily repetition. All values below are the light theme; every color routes through the semantic token layer.

### Buttons

- **Shape:** Gently rounded (4px radius), compact padding (5px 10px)
- **Primary:** Actual Purple background, white text; hover lifts to Lifted Purple with a soft shadow transition (`box-shadow .25s`)
- **Normal:** White background, Navy Ink text, 1px navy border
- **Bare:** Transparent, 5px padding; background tint on hover/press. The workhorse for in-table actions

### Inputs / Fields

- **Style:** White background, 1px border, 4px radius, 5px padding
- **Focus:** Border switches to the selected accent; big inputs drop the border and take the ambient shadow instead
- **Big variant:** 10px padding for mobile and prominent forms (40px minimum touch height on mobile)

### Cards / Containers

- **Corner Style:** 6px radius on table containers (top corners), 4px elsewhere
- **Background:** Surface White on Navy Mist page background
- **Shadow Strategy:** Card shadow at most; structure via 1px Navy Mist border
- **Internal Padding:** 16-20px

### Navigation

- **Sidebar:** Navy Ink background, light navy text; hover darkens the row, selection marked with a purple accent and purple text. Status states (pending/positive/failed) tint the item background gold/green/red
- **Mobile:** Purple header, white nav bar, purple selected item

### Pills / Chips

- **Style:** Editor pills: tinted background, 4px radius, 3px 5px padding. Used for rule conditions and inline tokens

### Signature Component: The Money Table

The core surface of the app. White rows on 1px Navy Mist borders, Frost hover, purple-bordered selection, sticky header with Slate 13px text, amounts right-aligned in tabular figures colored by the semantic money tokens. Alternate-row striping is theme-controlled, never hardcoded.

## 6. Do's and Don'ts

### Do:

- **Do** route every color through `theme.*` semantic tokens so light, dark, and midnight themes all work. Test all three.
- **Do** wrap standalone financial numbers in `FinancialText` or apply `styles.tnum`.
- **Do** keep components compact and quick: 4px radii, 5-10px paddings, instant hover/press states.
- **Do** reuse the existing component library (`@actual-app/components`) before writing new UI.
- **Do** keep Actual Purple scarce: primary action and selection only.
- **Do** respect the breakpoints: 512px (small), 730px (medium), 1100px (wide); mobile touch targets are at least 40px tall.

### Don't:

- **Don't** use fintech-startup gloss: gradient heroes, glassmorphism, neon accents, crypto-dashboard styling (PRODUCT.md anti-reference).
- **Don't** use corporate banking UI patterns: navy-and-gold, enterprise-portal density, legalese energy (PRODUCT.md anti-reference).
- **Don't** hardcode hex values or raw `--palette-*` colors in components; the semantic layer is the only entry point.
- **Don't** rely on color alone for positive/negative amounts.
- **Don't** put shadows on persistent surfaces; shadows are for transient overlays only.
- **Don't** use `border-left`/`border-right` thicker than 1px as a colored accent stripe.
- **Don't** animate layout properties; transitions are for color, opacity, and shadow (like the button's `box-shadow .25s`).
