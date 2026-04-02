# Actual Budget v26.4.0 Release Video — Design Spec

## Overview

A 52-second social media teaser video showcasing the most important features in Actual Budget v26.4.0. Built with Remotion (React), using real screen recordings captured via Playwright and synced to a music track at ~139 BPM.

**Format:** 1280x720, 30fps, ~52 seconds
**Style:** Branded & colorful — Actual brand colors, energetic transitions, playful feel
**Music:** `public/music.mp3` — upbeat tech track, 139 BPM. Using first 52 seconds only.
**Content:** Real screen recordings with bold text overlays (feature name + tagline)

## Music Analysis

- **BPM:** ~139 (beat interval: ~0.43s = ~13 frames at 30fps)
- **0–4s:** Quiet intro build-up (energy rises from silence to medium)
- **4s+:** Full energy drop, sustained loud level throughout
- **Track total:** 4:24, but we only use 0–52s

## Video Timeline

### Scene 1: Title Card (0.0s – 4.0s | frames 0–120)

- Actual Budget logo animates in during quiet intro
- "v26.4.0" and subtitle fade in on rising energy
- Beat drop at 4.0s triggers transition to first feature
- Background: dark gradient with brand colors

### Tier 1: Hero Features (4.0s – 20.0s | frames 120–600)

Each feature gets ~5.3s (160 frames / 12 beats). Screen recording fills most of the frame in a styled browser mockup. Text overlay appears on the first beat.

**Feature 1: Drag & Drop Transaction Reordering (4.0s – 9.3s)**
- Screen recording: user dragging transactions to reorder within the same day
- Text: "Reorder transactions — your way"
- Playwright scenario: open an account, drag a transaction up/down within same-day group

**Feature 2: Concentric Donut Chart (9.3s – 14.7s)**
- Screen recording: custom reports page showing the new donut chart visualization
- Text: "Beautiful category breakdowns"
- Playwright scenario: navigate to custom reports, show a donut chart with category data

**Feature 3: Payee Locations MVP (14.7s – 20.0s)**
- Screen recording: payee management showing location data
- Text: "Know where you spend"
- Playwright scenario: open payees section, show payee with location info

### Tier 2: Quick Highlights (20.0s – 44.0s | frames 600–1320)

Each feature gets ~6s (180 frames / 14 beats). Same layout but slightly faster-paced transitions.

**Feature 4: Monthly Budget Cell Notes (20.0s – 26.0s)**
- Screen recording: adding a note to a monthly budget cell
- Text: "Annotate your budget"
- Playwright scenario: click a budget cell, add a note, show the note indicator

**Feature 5: Actual CLI Tool (26.0s – 32.0s)**
- Screen recording: terminal showing CLI commands querying budget data
- Text: "Your budget, from the command line"
- Note: This will be a terminal recording/mockup rather than Playwright, since it's a CLI tool

**Feature 6: Custom Theme Improvements (32.0s – 38.0s)**
- Screen recording: switching themes, showing custom fonts and light/dark options
- Text: "Make it yours"
- Playwright scenario: open settings, switch between themes, toggle light/dark

**Feature 7: Import Improvements (38.0s – 44.0s)**
- Screen recording: import dialog showing new options
- Text: "Smarter imports"
- Playwright scenario: open import dialog, show "import since" date filter, swap payee/memo toggle

### Scene 9: Outro (44.0s – 52.0s | frames 1320–1560)

- Stats flash in sequence: "4 features · 45 enhancements · 32 bugfixes"
- CTA: "Update now — actualbudget.org"
- Logo + version badge fade out
- Music continues to natural phrase ending

## Visual Design

### Color Palette

- **Background:** Dark (#1a1a2e / #16213e gradient)
- **Tier 1 accent:** Cyan (#00d2ff)
- **Tier 2 accent:** Coral/Red (#e94560)
- **Outro accent:** Gold (#ffd700)
- **Text:** White (#ffffff) with subtle shadows
- **Brand purple:** Used for logo and accent elements

### Typography

- Feature names: Bold, large sans-serif
- Taglines: Regular weight, slightly smaller
- Stats/CTA: Bold, emphasized with accent color

### Transitions

- Scene transitions: slide/zoom synced to beat hits
- Screen recordings slide in from right
- Text overlays pop in with spring animation on beat
- Slight zoom-in on screen recordings during playback for energy

### Screen Recording Frame

- Styled browser mockup wrapper (rounded corners, subtle shadow)
- Dark chrome to match overall aesthetic
- Fills ~80% of frame width, centered

## Remotion Architecture

### Composition Structure

```
<MyComposition>  (1560 frames, 30fps, 1280x720)
  <Audio src="music.mp3" />
  <TitleCard />           {frames 0-120}
  <FeatureScene />        {frames 120-280}   -- Drag & Drop
  <FeatureScene />        {frames 280-440}   -- Donut Chart
  <FeatureScene />        {frames 440-600}   -- Payee Locations
  <FeatureScene />        {frames 600-780}   -- Budget Notes
  <FeatureScene />        {frames 780-960}   -- CLI Tool
  <FeatureScene />        {frames 960-1140}  -- Themes
  <FeatureScene />        {frames 1140-1320} -- Imports
  <OutroCard />           {frames 1320-1560}
</MyComposition>
```

### Key Components

- **TitleCard:** Animated logo + version text with fade/scale entrance
- **FeatureScene:** Reusable component accepting screen recording source, title, tagline, accent color, and frame range. Handles slide-in animation, text overlay timing, and zoom effect.
- **OutroCard:** Sequential stat counter animations + CTA
- **BrowserFrame:** Decorative wrapper around screen recordings

### Screen Recordings

Captured as video files via Playwright (webm/mp4) and placed in `public/recordings/`. Each recording is pre-trimmed to show the key interaction for that feature.

## Playwright Recording Plan

Each recording captures a specific user interaction in the running Actual Budget app:

1. **drag-drop.webm** — Open checking account, drag transaction to reorder
2. **donut-chart.webm** — Navigate to reports, create/view donut chart
3. **payee-locations.webm** — Open payees, show payee with location
4. **budget-notes.webm** — Click budget cell, type a note, save
5. **cli-tool.webm** — (Terminal recording, not Playwright)
6. **themes.webm** — Settings > Themes, switch themes, toggle dark/light
7. **imports.webm** — File > Import, show new import options

The app needs to be running with demo data (`yarn start` + "View demo" setup) before capturing.

## Dependencies

- **Remotion 4.0.443** (already installed)
- **@remotion/player** — for preview
- **Tailwind CSS 4** (already installed)
- **Playwright** — for screen recordings (project dependency)
- **ffmpeg** — for audio trimming if needed
