import { Readable } from "stream";

import { videoSegmentsPath } from "#root/path";
import createFrames from "./createFrames";
import frame2Video from "#root/utilities/frame2Video";
import { getMediaMetaData } from "#root/utilities/grains";

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

    frame2Video(
      frameStream,
      config.videoProperties.frameRate,
      outputVideoPath
    ).then(() => {
      resolve();
      getMediaMetaData(outputVideoPath).then((meta) => {
        console.log(process.pid, meta);
        process.exit();
      });
    });

    createFrames(config, frameStream, {
      duration,
      start,
    });
  });
}
