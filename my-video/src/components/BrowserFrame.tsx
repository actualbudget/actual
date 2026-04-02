import { type ReactNode } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../constants";

type BrowserFrameProps = {
  children: ReactNode;
  accentColor?: string;
};

export function BrowserFrame({
  children,
  accentColor = COLORS.accentCyan,
}: BrowserFrameProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Rotate once every 3 seconds
  const angle = (frame / fps) * 120; // 120 degrees per second

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Rotating gradient border layer */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: 14,
          background: `conic-gradient(from ${angle}deg, transparent 0%, transparent 60%, ${accentColor} 75%, ${accentColor}cc 80%, transparent 95%, transparent 100%)`,
          filter: "blur(4px)",
        }}
      />
      {/* Subtle static glow underneath */}
      <div
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: 13,
          border: `1px solid ${accentColor}22`,
          boxShadow: `0 0 30px ${accentColor}15`,
        }}
      />
      {/* Main frame content */}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            background: "#2d2d3a",
            height: 40,
            display: "flex",
            alignItems: "center",
            paddingLeft: 16,
            paddingRight: 16,
            flexShrink: 0,
            position: "relative",
          }}
        >
          {/* Traffic lights */}
          <div style={{ display: "flex", gap: 8, zIndex: 1 }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ff5f57",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#ffbd2e",
              }}
            />
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#28c840",
              }}
            />
          </div>

          {/* Centered title */}
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: COLORS.textSecondary,
                fontSize: 13,
                fontFamily: "sans-serif",
              }}
            >
              Actual Budget
            </span>
          </div>
        </div>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            background: "#0f0f1a",
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
