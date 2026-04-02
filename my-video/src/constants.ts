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
  screenshot?: string;
  accentColor: string;
};

export const TIER1_FEATURES: Feature[] = [
  {
    title: "Donut Chart Reports",
    tagline: "Beautiful category breakdowns",
    screenshot: "donut-chart.png",
    accentColor: COLORS.accentCyan,
  },
  {
    title: "Budget Notes",
    tagline: "Monthly per-category notes",
    screenshot: "budget-notes.png",
    accentColor: COLORS.accentCyan,
  },
];

export const TIER2_FEATURES: Feature[] = [
  {
    title: "Drag & Drop Reordering",
    tagline: "Reorder transactions — your way",
    screenshot: "drag-drop.png",
    accentColor: COLORS.accentCyan,
  },
  {
    title: "Actual CLI",
    tagline: "Your budget, from the command line",
    screenshot: "cli-tool.png",
    accentColor: COLORS.accentCoral,
  },
  {
    title: "And much more...",
    tagline: "Custom themes, import improvements, payee locations",
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
