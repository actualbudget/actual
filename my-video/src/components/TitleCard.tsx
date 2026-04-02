import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS } from "../constants";

const { fontFamily } = loadFont();

export function TitleCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo springs in with heavy config
  const logoProgress = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 80,
      mass: 2,
    },
  });

  const logoScale = interpolate(logoProgress, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(logoProgress, [0, 1], [0, 1]);

  // Version badge fades in at 1-2s (30-60 frames)
  const badgeOpacity = interpolate(frame, [30, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // "Here's what's new" subtitle springs in at 2s (frame 60)
  const subtitleProgress = spring({
    frame: frame - 60,
    fps,
    config: {
      damping: 200,
      stiffness: 200,
    },
  });

  const subtitleTranslateY = interpolate(subtitleProgress, [0, 1], [20, 0]);
  const subtitleOpacity = interpolate(subtitleProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, ${COLORS.bgGradient} 0%, ${COLORS.bgDark} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily,
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${COLORS.accentPurple}22 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* Logo + title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
        }}
      >
        <Img
          src={staticFile("logo.svg")}
          style={{ width: 120, height: 120 }}
        />
        <div
          style={{
            fontSize: 64,
            fontWeight: "bold",
            color: COLORS.white,
            letterSpacing: -1,
          }}
        >
          Actual Budget
        </div>
      </div>

      {/* Version badge */}
      <div
        style={{
          marginTop: 20,
          opacity: badgeOpacity,
          background: COLORS.accentPurple,
          color: COLORS.white,
          fontSize: 22,
          fontWeight: 600,
          padding: "6px 20px",
          borderRadius: 999,
          letterSpacing: 1,
        }}
      >
        v26.4.0
      </div>

      {/* Subtitle */}
      <div
        style={{
          marginTop: 32,
          fontSize: 32,
          color: COLORS.textSecondary,
          fontWeight: 400,
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleTranslateY}px)`,
        }}
      >
        {"Here's what's new"}
      </div>
    </AbsoluteFill>
  );
}
