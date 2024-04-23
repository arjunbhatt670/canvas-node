import cluster from "cluster";

import { finalsPath } from "#root/path";
import getConfig from "#root/utilities/getConfig";
import makeClusters from "./makeClusters";
import primaryCluster from "./primaryCluster";
import { handleProcessExit } from "#root/utilities/grains";
import { cleanAllAssets } from "./utils";

(async () => {
  if (cluster.isPrimary) {
    const { downloadedData: config } = await getConfig("data60");

    handleProcessExit(() => {
      cleanAllAssets();
    });

    await primaryCluster(config, `${finalsPath}/merge.mp4`);
  } else {
    makeClusters();
  }
})();
