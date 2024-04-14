import { Readable } from "stream";

import createFrames from "./createFrames";
import { getMediaMetaData, print } from "#root/utilities/grains";
import frame2VideoSpawn from "#root/utilities/frame2VideoSpawn";

export default function initiateAndStream(
  config: Media,
  start: number,
  duration: number,
  outputVideoPath: string
) {
  const frameStream = new Readable({
    read: () => {},
  });

  return new Promise<void>((resolve) => {
    frame2VideoSpawn(
      frameStream,
      config.videoProperties.frameRate,
      outputVideoPath
    )
      .then(() => {
        resolve();
      })
      .catch((reason) => print(reason));

    createFrames(config, frameStream, {
      duration,
      start,
    });
  });
}
