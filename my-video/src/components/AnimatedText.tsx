import { type CSSProperties } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

type AnimatedTextProps = {
  text: string;
  delay?: number;
  fontSize?: number;
  fontWeight?: CSSProperties["fontWeight"];
  color?: string;
  style?: CSSProperties;
};

export function AnimatedText({
  text,
  delay = 0,
  fontSize = 48,
  fontWeight = "bold",
  color = "#ffffff",
  style,
}: AnimatedTextProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: {
      damping: 20,
      stiffness: 200,
    },
  });

  const translateY = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        transform: `translateY(${translateY}px)`,
        opacity,
        ...style,
      }}
    >
      {text}
    </div>
  );
}
