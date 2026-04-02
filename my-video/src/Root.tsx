import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { FPS, WIDTH, HEIGHT, TOTAL_DURATION } from "./constants";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ReleaseVideo"
        component={MyComposition}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
