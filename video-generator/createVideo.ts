import getConfig from "#root/utilities/getConfig";
import { TimeTracker, getMediaMetaData } from "#root/utilities/grains";
import saveTextClipAssets from "./saveTextClipAssets";
import initiateAndStream from "./initiateAndStream";
import { cleanAllAssets } from "./utils";

const createVideo = async (finalVideoPath: string) => {
  const { downloadedData: config } = await getConfig("shape_video");
  const totalTimeTracker = new TimeTracker();

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

  cleanAllAssets();
};

export default createVideo;
