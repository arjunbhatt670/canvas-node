import fs from "fs";
import { type Page } from "puppeteer";

import { TimeTracker, getMediaMetaData } from "#root/utilities/grains";
import saveTextClipAssets from "./saveTextClipAssets";
import initiateAndStream from "./initiateAndStream";
import { cleanAllAssets } from "./utils";
import saveVideoClipFrames from "./saveVideoClipFrames";
import { shapeAssetsPath, textAssetsPath, videoFramesPath } from "#root/path";

const createVideo = async (
  finalVideoPath: string,
  config: Media,
  puppeteerPage?: Page
) => {
  const totalTimeTracker = new TimeTracker();
  try {
    totalTimeTracker.start();

    !fs.existsSync(`${shapeAssetsPath}/${config.videoProperties.id}`) &&
      fs.mkdirSync(`${shapeAssetsPath}/${config.videoProperties.id}`);
    !fs.existsSync(`${textAssetsPath}/${config.videoProperties.id}`) &&
      fs.mkdirSync(`${textAssetsPath}/${config.videoProperties.id}`);
    !fs.existsSync(`${videoFramesPath}/${config.videoProperties.id}`) &&
      fs.mkdirSync(`${videoFramesPath}/${config.videoProperties.id}`);

    await Promise.all([
      puppeteerPage && saveTextClipAssets(config, puppeteerPage),
      saveVideoClipFrames(config, {
        duration: config.videoProperties.duration,
        start: 0,
      }),
    ]);

    await initiateAndStream(
      config,
      0,
      config.videoProperties.duration,
      finalVideoPath
    );

    getMediaMetaData(finalVideoPath).then((meta) => console.log(meta));
  } finally {
    const timeTracker = new TimeTracker();
    timeTracker.start();

    cleanAllAssets(config.videoProperties.id);

    if (global.stats) global.stats.fileSystemCleanup = timeTracker.now();
    timeTracker.log("File system cleanup done");

    if (global.stats) global.stats.total = totalTimeTracker.now();
    totalTimeTracker.log("Total Time");
  }
};

export default createVideo;
