import "./index.css";
import { Composition } from "remotion";
import { MyComposition } from "./Composition";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CraigMeeting"
      component={MyComposition}
      durationInFrames={140087}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
