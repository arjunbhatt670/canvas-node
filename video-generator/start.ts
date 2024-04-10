import { Readable } from "stream";

import { finalsPath } from "#root/path";
import createFrames from "./createFrames";
import frame2Video from "#root/utilities/frame2Video";
import { TimeTracker } from "#root/utilities/grains";

export default async function start(config: Media) {
  const totalTimeTracker = new TimeTracker();
  const frameStream = new Readable({
    read: () => {},
  });

  totalTimeTracker.start();

  frame2Video(
    frameStream,
    config.videoProperties.frameRate,
    process.env.OUTPUT || `${finalsPath}/pixi_shape.mp4`
  ).then(() => {
    totalTimeTracker.log("Total Time");
  });

  createFrames(config, frameStream, {
    duration: Number(process.env.duration ?? 20000),
    start: Number(process.env.start ?? 10000),
  });
}
