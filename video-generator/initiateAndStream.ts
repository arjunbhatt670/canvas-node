import { Readable } from "stream";
import fs from "fs";
import { TimeTracker, getMediaMetaData, print } from "#root/utilities/grains";
import frame2VideoSpawn from "#root/utilities/frame2VideoSpawn";
import { loop } from "./frameLoop";
import saveVideoClipFrames from "./saveVideoClipFrames";
import loadAssets from "./loadAssets";

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

  await saveVideoClipFrames(config, limit);
  await loadAssets(config, limit);

  const promises = loop(config, limit);

  const frameStream = new Readable({
    read: async function () {
      // console.log("reading");
      const buffer = (await promises.pop()) as Buffer;
      // console.log("read");
      if (buffer) {
        this.push(buffer);
      } else {
        this.push(null);
      }
    },
  });

  await frame2VideoSpawn(
    frameStream,
    config.videoProperties.frameRate,
    outputVideoPath
  );
}
