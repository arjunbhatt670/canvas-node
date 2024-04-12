import start from "./start";
import os from "os";
import cluster from "cluster";
import { exec } from "child_process";

import getConfig from "#root/utilities/getConfig";
import saveTextClipAssets from "./saveTextClipAssets";
import { TimeTracker } from "#root/utilities/grains";
import { videoSegmentsPath } from "#root/path";

export default async function startInCluster() {
  const totalCPUs = os.availableParallelism();
  const totalTimeTracker = new TimeTracker();
  totalTimeTracker.start();

  if (cluster.isPrimary) {
    console.log(`Number of CPUs is ${totalCPUs}`);
    console.log(`Master ${process.pid} is running`);

    const { downloadedData: config } = await getConfig();

    exec(`rm -rf ${videoSegmentsPath}/*`);

    const textClipsAssets = await saveTextClipAssets(config);

    if (Math.ceil(config.videoProperties.duration / 1000) < totalCPUs) {
      await start(config);
      totalTimeTracker.log("Total Time");
      return;
    }

    const timePatch = Math.floor(config.videoProperties.duration / totalCPUs);

    const configJsonString = JSON.stringify(config);

    for (let i = 0; i < totalCPUs; i++) {
      cluster.fork({
        mediaConfig: configJsonString,
        start: i * timePatch,
        duration:
          i === totalCPUs - 1
            ? timePatch +
              (config.videoProperties.duration - totalCPUs * timePatch)
            : timePatch,
      });
    }

    let exitedWorkers = 0;
    cluster.on("exit", (worker, code, signal) => {
      exitedWorkers++;

      if (exitedWorkers === totalCPUs) {
        totalTimeTracker.log("Total Time");
        exec(`rm -rf ${textClipsAssets}`);
      }

      console.log(
        `worker ${worker.process.pid} died`,
        `Code - ${code}`,
        `Signal - ${signal}`
      );
    });
  } else {
    console.log(`Worker with id ${process.pid} started`);
    console.log("start and duration", process.env.start, process.env.duration);

    const timeTracker = new TimeTracker();

    timeTracker.start();
    await start(
      JSON.parse(process.env.mediaConfig!) as Media,
      Number(process.env.start),
      Number(process.env.duration)
    );
    timeTracker.log(`Cluster Total time with start ${process.env.start}`);

    // process.exit();
  }
}

startInCluster();
