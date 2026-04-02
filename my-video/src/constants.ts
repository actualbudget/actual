export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;

export const BPM = 139;
export const FRAMES_PER_BEAT = Math.round((60 / BPM) * FPS); // ~13

export const TITLE_DURATION = 120;
export const TIER1_SCENE_DURATION = 160;
export const TIER2_SCENE_DURATION = 180;
export const OUTRO_DURATION = 240;
export const TRANSITION_DURATION = FRAMES_PER_BEAT;

export const COLORS = {
  bgDark: "#1a1a2e",
  bgGradient: "#16213e",
  accentCyan: "#00d2ff",
  accentCoral: "#e94560",
  accentGold: "#ffd700",
  accentPurple: "#7c3aed",
  white: "#ffffff",
  textSecondary: "#94a3b8",
};

export type Feature = {
  title: string;
  tagline: string;
  recording: string;
  accentColor: string;
};

export const TIER1_FEATURES: Feature[] = [
  {
    title: "Drag & Drop Reordering",
    tagline: "Reorder transactions — your way",
    recording: "drag-drop.webm",
    accentColor: COLORS.accentCyan,
  },
  {
    title: "Donut Chart Reports",
    tagline: "Beautiful category breakdowns",
    recording: "donut-chart.webm",
    accentColor: COLORS.accentCyan,
  },
  {
    title: "Payee Locations",
    tagline: "Know where you spend",
    recording: "payee-locations.webm",
    accentColor: COLORS.accentCyan,
  },
];

export const TIER2_FEATURES: Feature[] = [
  {
    title: "Budget Notes",
    tagline: "Annotate your budget",
    recording: "budget-notes.webm",
    accentColor: COLORS.accentCoral,
  },
  {
    title: "Actual CLI",
    tagline: "Your budget, from the command line",
    recording: "cli-tool.webm",
    accentColor: COLORS.accentCoral,
  },
  {
    title: "Custom Themes",
    tagline: "Make it yours",
    recording: "themes.webm",
    accentColor: COLORS.accentCoral,
  },
  {
    title: "Smarter Imports",
    tagline: "More control over your data",
    recording: "imports.webm",
    accentColor: COLORS.accentCoral,
  },
];

// Total = TITLE + 3*TIER1 + 4*TIER2 + OUTRO - 8*TRANSITION
export const TOTAL_DURATION =
  TITLE_DURATION +
  TIER1_FEATURES.length * TIER1_SCENE_DURATION +
  TIER2_FEATURES.length * TIER2_SCENE_DURATION +
  OUTRO_DURATION -
  (TIER1_FEATURES.length + TIER2_FEATURES.length + 1) * TRANSITION_DURATION;
