import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, FRAMES_PER_BEAT, OUTRO_DURATION } from "../constants";

const { fontFamily } = loadFont();

const STATS = [
  { number: "4", label: "Features" },
  { number: "45", label: "Enhancements" },
  { number: "32", label: "Bugfixes" },
];

type StatCardProps = {
  number: string;
  label: string;
  delay: number;
};

function StatCard({ number, label, delay }: StatCardProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 15,
      stiffness: 120,
    },
  });

  const translateY = interpolate(progress, [0, 1], [40, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        transform: `translateY(${translateY}px)`,
        opacity,
      }}
    >
      <div
        style={{
          fontSize: 80,
          fontWeight: "bold",
          color: COLORS.accentGold,
          lineHeight: 1,
        }}
      >
        {number}
      </div>
      <div
        style={{
          fontSize: 22,
          color: COLORS.textSecondary,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export function OutroCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const statsEndDelay = STATS.length * FRAMES_PER_BEAT * 2;

  // CTA appears after stats
  const ctaProgress = spring({
    frame: frame - statsEndDelay,
    fps,
    config: {
      damping: 20,
      stiffness: 150,
    },
  });

  const ctaOpacity = interpolate(ctaProgress, [0, 1], [0, 1]);
  const ctaTranslateY = interpolate(ctaProgress, [0, 1], [20, 0]);

  // Fade out in last 1 second (30 frames)
  const fadeOutOpacity = interpolate(
    frame,
    [OUTRO_DURATION - 30, OUTRO_DURATION],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${COLORS.bgGradient} 0%, ${COLORS.bgDark} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        fontFamily,
        opacity: fadeOutOpacity,
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accentGold}10 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 80,
          alignItems: "center",
        }}
      >
        {STATS.map((stat, i) => (
          <StatCard
            key={stat.label}
            number={stat.number}
            label={stat.label}
            delay={i * FRAMES_PER_BEAT * 2}
          />
        ))}
      </div>

      {/* CTA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          opacity: ctaOpacity,
          transform: `translateY(${ctaTranslateY}px)`,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: "bold",
            color: COLORS.white,
          }}
        >
          Update now
        </div>
        <div
          style={{
            fontSize: 22,
            color: COLORS.accentCyan,
            fontWeight: 500,
          }}
        >
          actualbudget.org
        </div>
      </div>

      {/* Logo at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 40,
          opacity: 0.3,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Img
          src={staticFile("logo.svg")}
          style={{ width: 36, height: 36 }}
        />
        <span
          style={{
            color: COLORS.textSecondary,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Actual Budget
        </span>
      </div>
    </AbsoluteFill>
  );
}
