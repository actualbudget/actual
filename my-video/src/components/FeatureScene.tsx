import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
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
          left: feature.screenshot ? -100 : "50%",
          top: "50%",
          transform: feature.screenshot ? "translateY(-50%)" : "translate(-50%, -50%)",
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
          flex: feature.screenshot ? "0 0 360px" : 1,
          display: "flex",
          flexDirection: "column",
          alignItems: feature.screenshot ? "flex-start" : "center",
          justifyContent: feature.screenshot ? "flex-start" : "center",
          gap: 16,
          zIndex: 1,
        }}
      >
        <AnimatedText
          text={feature.title}
          delay={0}
          fontSize={feature.screenshot ? 42 : 56}
          fontWeight="bold"
          color={feature.accentColor}
          style={{ lineHeight: 1.2, textAlign: feature.screenshot ? "left" : "center" }}
        />
        <AnimatedText
          text={feature.tagline}
          delay={FRAMES_PER_BEAT}
          fontSize={feature.screenshot ? 22 : 28}
          fontWeight={400}
          color={COLORS.textSecondary}
          style={{ lineHeight: 1.5, textAlign: feature.screenshot ? "left" : "center" }}
        />
      </div>

      {/* Browser frame with screenshot */}
      {feature.screenshot && (
        <div
          style={{
            flex: 1,
            transform: `translateX(${translateX}px)`,
            zIndex: 1,
          }}
        >
          <BrowserFrame accentColor={feature.accentColor}>
            <Img
              src={staticFile(`screenshots/${feature.screenshot}`)}
              style={{ width: "100%", display: "block" }}
            />
          </BrowserFrame>
        </div>
      )}
    </AbsoluteFill>
  );
}
