import getConfig from "#root/utilities/getConfig";
import {
  TimeTracker,
  getMediaMetaData,
  handleProcessExit,
  print,
} from "#root/utilities/grains";
import saveTextClipAssets from "./saveTextClipAssets";
import initiateAndStream from "./initiateAndStream";
import { cleanAllAssets } from "./utils";

const createVideo = async (finalVideoPath: string) => {
  try {
    const { downloadedData: config } = await getConfig("data60");
    const totalTimeTracker = new TimeTracker();

    handleProcessExit(() => {
      cleanAllAssets();
    });

    totalTimeTracker.start();
    await saveTextClipAssets(config);

    await initiateAndStream(
      config,
      0,
      config.videoProperties.duration,
      finalVideoPath
    );
    totalTimeTracker.log("Total Time");

    getMediaMetaData(finalVideoPath).then((meta) => console.log(meta));
  } catch (err) {
    console.log(err);
  }
};

export default createVideo;
