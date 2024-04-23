import cluster from "cluster";

import makeClusters from "./makeClusters";
import primaryCluster from "./primaryCluster";

(async () => {
  if (cluster.isPrimary) {
    if (!process.env.CONFIG) {
      throw new ReferenceError("Please provide CONFIG env variable");
    }

    if (!process.env.FINAL_PATH) {
      throw new ReferenceError("Please provide FINAL_PATH env variable");
    }

    if (process.env.STATS) {
      global.stats = JSON.parse(process.env.STATS);
    }

    const config = JSON.parse(process.env.CONFIG) as Media;
    const finalVideoPath = process.env.FINAL_PATH;

    await primaryCluster(config, finalVideoPath);
  } else {
    await makeClusters();
  }
})();
