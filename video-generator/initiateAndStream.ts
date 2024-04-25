import { Readable } from "stream";
import frame2VideoSpawn from "#root/utilities/frame2VideoSpawn";
import { loop } from "./frameLoop";

export default async function initiateAndStream(
  config: Media,
  start: number,
  duration: number,
  outputVideoPath: string
) {
  const limit = {
    duration,
    start,
  };

  const frameStream = new Readable({
    read: () => {},
  });

  // await saveVideoClipFrames(config, limit);

  await Promise.all([
    frame2VideoSpawn(
      frameStream,
      config.videoProperties.frameRate,
      outputVideoPath
    ),
    loop(config, frameStream, limit),
  ]);
}
