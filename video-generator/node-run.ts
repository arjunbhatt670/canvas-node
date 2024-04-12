import getConfig from "#root/utilities/getConfig";
import { TimeTracker } from "#root/utilities/grains";
import saveTextClipAssets from "./saveTextClipAssets";
import start from "./start";

(async () => {
  const { downloadedData: config } = await getConfig();
  const totalTimeTracker = new TimeTracker();

  totalTimeTracker.start();
  await saveTextClipAssets(config);

  await start(config);
  totalTimeTracker.log("Total Time");
})();
