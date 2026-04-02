import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Video } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { type Feature, COLORS, FRAMES_PER_BEAT } from "../constants";
import { AnimatedText } from "./AnimatedText";
import { BrowserFrame } from "./BrowserFrame";

const { fontFamily } = loadFont();

type FeatureSceneProps = {
  feature: Feature;
};

export function FeatureScene({ feature }: FeatureSceneProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Browser frame slides in from right
  const slideProgress = spring({
    frame,
    fps,
    config: {
      damping: 20,
      stiffness: 200,
    },
  });

  const translateX = interpolate(slideProgress, [0, 1], [400, 0]);

  // Subtle zoom from 1.0 to 1.05 over 5 seconds (150 frames)
  const zoom = interpolate(frame, [0, 150], [1.0, 1.05], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at 30% 50%, ${feature.accentColor}18 0%, ${COLORS.bgDark} 60%)`,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "60px 80px",
        gap: 60,
        fontFamily,
      }}
    >
      {/* Background gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(135deg, ${COLORS.bgDark} 0%, ${COLORS.bgGradient} 100%)`,
          zIndex: 0,
        }}
      />

      {/* Accent glow */}
      <div
        style={{
          position: "absolute",
          left: -100,
          top: "50%",
          transform: "translateY(-50%)",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(ellipse at center, ${feature.accentColor}20 0%, transparent 70%)`,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Text area */}
      <div
        style={{
          flex: "0 0 360px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          zIndex: 1,
        }}
      >
        <AnimatedText
          text={feature.title}
          delay={0}
          fontSize={42}
          fontWeight="bold"
          color={feature.accentColor}
          style={{ lineHeight: 1.2 }}
        />
        <AnimatedText
          text={feature.tagline}
          delay={FRAMES_PER_BEAT}
          fontSize={22}
          fontWeight={400}
          color={COLORS.textSecondary}
          style={{ lineHeight: 1.5 }}
        />
      </div>

      {/* Browser frame with video */}
      <div
        style={{
          flex: 1,
          height: "100%",
          transform: `translateX(${translateX}px)`,
          zIndex: 1,
        }}
      >
        <BrowserFrame accentColor={feature.accentColor}>
          <div
            style={{
              width: "100%",
              height: "100%",
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              overflow: "hidden",
            }}
          >
            <Video
              src={staticFile(`recordings/${feature.recording}`)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              muted
            />
          </div>
        </BrowserFrame>
      </div>
    </AbsoluteFill>
  );
}
