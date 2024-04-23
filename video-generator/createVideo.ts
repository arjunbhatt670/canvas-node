import { TimeTracker, getMediaMetaData } from "#root/utilities/grains";
import saveTextClipAssets from "./saveTextClipAssets";
import initiateAndStream from "./initiateAndStream";
import { cleanAllAssets } from "./utils";
import saveVideoClipFrames from "./saveVideoClipFrames";

const createVideo = async (finalVideoPath: string, config: Media) => {
  const totalTimeTracker = new TimeTracker();
  try {
    totalTimeTracker.start();

    await saveTextClipAssets(config);
    await saveVideoClipFrames(config, {
      duration: config.videoProperties.duration,
      start: 0,
    });

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

    await cleanAllAssets();

    if (global.stats) global.stats.fileSystemCleanup = timeTracker.now();
    timeTracker.log("File system cleanup done");

    if (global.stats) global.stats.total = totalTimeTracker.now();
    totalTimeTracker.log("Total Time");
  }
};

export default createVideo;
