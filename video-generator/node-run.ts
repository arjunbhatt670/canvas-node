import { exec } from "child_process";

import getConfig from "#root/utilities/getConfig";
import { TimeTracker } from "#root/utilities/grains";
import saveTextClipAssets from "./saveTextClipAssets";
import start from "./start";
import saveVideoClipFrames from "./saveVideoClipFrames";

(async () => {
  const { downloadedData: config } = await getConfig();
  const totalTimeTracker = new TimeTracker();

  if (!process.env.OUTPUT) {
    throw new ReferenceError("Please provide OUTPUT env variable");
  }

  totalTimeTracker.start();
  const { clean: cleanTextAssets } = await saveTextClipAssets(config);
  const { clean: cleanVideoFrames } = await saveVideoClipFrames(config, {
    duration: config.videoProperties.duration,
    start: 0,
  });

  exec(`rm -rf ${process.env.OUTPUT}`);

  await start(config, 0, config.videoProperties.duration, process.env.OUTPUT);
  totalTimeTracker.log("Total Time");

  cleanTextAssets();
  cleanVideoFrames();
})();
