import { Readable } from "stream";

import { videoSegmentsPath } from "#root/path";
import createFrames from "./createFrames";
import { getMediaMetaData } from "#root/utilities/grains";
import frame2VideoSpawn from "#root/utilities/frame2VideoSpawn";

export default function start(
  config: Media,
  start: number = 0,
  duration: number = config.videoProperties.duration
) {
  const frameStream = new Readable({
    read: () => {},
  });

  return new Promise<void>((resolve) => {
    const outputVideoPath =
      process.env.OUTPUT || `${videoSegmentsPath}/pixi_shape${start}.mp4`;

    frame2VideoSpawn(
      frameStream,
      config.videoProperties.frameRate,
      outputVideoPath
    ).then(() => {
      getMediaMetaData(outputVideoPath).then((meta) => {
        console.log(process.pid, meta);
      });
      resolve();
    });

    createFrames(config, frameStream, {
      duration,
      start,
    });
  });
}
