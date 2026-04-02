import { type ReactNode } from "react";
import { COLORS } from "../constants";

type BrowserFrameProps = {
  children: ReactNode;
  accentColor?: string;
};

export function BrowserFrame({
  children,
  accentColor = COLORS.accentCyan,
}: BrowserFrameProps) {
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: `0 0 40px ${accentColor}44, 0 0 80px ${accentColor}22`,
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
  );
}
