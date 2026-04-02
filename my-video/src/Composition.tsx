import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { fade } from "@remotion/transitions/fade";
import { staticFile } from "remotion";
import {
  FPS,
  TITLE_DURATION,
  TIER1_SCENE_DURATION,
  TIER2_SCENE_DURATION,
  OUTRO_DURATION,
  TRANSITION_DURATION,
  TIER1_FEATURES,
  TIER2_FEATURES,
  TOTAL_DURATION,
} from "./constants";
import { TitleCard } from "./components/TitleCard";
import { FeatureScene } from "./components/FeatureScene";
import { OutroCard } from "./components/OutroCard";

export function MyComposition() {
  const fadeOutDuration = 2 * FPS; // 2 seconds fade out

  return (
    <AbsoluteFill>
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) =>
          interpolate(f, [TOTAL_DURATION - fadeOutDuration, TOTAL_DURATION], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
      <TransitionSeries>
        {/* Title scene */}
        <TransitionSeries.Sequence durationInFrames={TITLE_DURATION}>
          <TitleCard />
        </TransitionSeries.Sequence>

        {/* Tier 1 feature scenes */}
        {TIER1_FEATURES.map((feature) => (
          <React.Fragment key={feature.screenshot}>
            <TransitionSeries.Transition
              presentation={slide({ direction: "from-right" })}
              timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
            />
            <TransitionSeries.Sequence
              durationInFrames={TIER1_SCENE_DURATION}
              premountFor={TRANSITION_DURATION}
            >
              <FeatureScene feature={feature} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        {/* Tier 2 feature scenes */}
        {TIER2_FEATURES.map((feature) => (
          <React.Fragment key={feature.screenshot}>
            <TransitionSeries.Transition
              presentation={slide({ direction: "from-right" })}
              timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
            />
            <TransitionSeries.Sequence
              durationInFrames={TIER2_SCENE_DURATION}
              premountFor={TRANSITION_DURATION}
            >
              <FeatureScene feature={feature} />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}

        {/* Outro */}
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />
        <TransitionSeries.Sequence
          durationInFrames={OUTRO_DURATION}
          premountFor={TRANSITION_DURATION}
        >
          <OutroCard />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}
