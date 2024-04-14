import start from "./start";
import os from "os";
import cluster from "cluster";
import { exec } from "child_process";

import getConfig from "#root/utilities/getConfig";
import saveTextClipAssets from "./saveTextClipAssets";
import { TimeTracker, print } from "#root/utilities/grains";
import { videoSegmentsPath } from "#root/path";
import { cleanAllAssets } from "./utils";

export default async function startInCluster() {
  if (cluster.isPrimary) {
    const totalCPUs = os.availableParallelism();
    const totalTimeTracker = new TimeTracker();
    totalTimeTracker.start();

    print(`Number of CPUs is ${totalCPUs}`);
    print(`Master ${process.pid} is running`);

    const { downloadedData: config } = await getConfig();

    exec(`rm -rf ${videoSegmentsPath}/*`);

    await saveTextClipAssets(config);

    cluster.on("exit", (worker, code, signal) => {
      print(
        `worker ${worker.process.pid} died`,
        `Code - ${code}`,
        `Signal - ${signal}`
      );
    });

    let doneCount = 0;
    const time: any = [];
    cluster.on("disconnect", () => {
      doneCount++;
      if (doneCount === totalCPUs) {
        console.log("Total Time", time);
        cleanAllAssets();
      }
    });

    cluster.on("message", (worker, msg) => {
      time.push({ [worker.id]: msg });
    });

    if (Math.ceil(config.videoProperties.duration / 1000) < totalCPUs) {
      await start(
        config,
        0,
        config.videoProperties.duration,
        `${videoSegmentsPath}/segment0.mp4`
      );
      totalTimeTracker.log("Total Time");
      cleanAllAssets();
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
  } else {
    print(`Worker with id ${process.pid} started`);

    const timeTracker = new TimeTracker();

    timeTracker.start();
    await start(
      JSON.parse(process.env.mediaConfig!) as Media,
      Number(process.env.start),
      Number(process.env.duration),
      `${videoSegmentsPath}/segment${Number(process.env.start)}.mp4`
    );

    cluster.worker?.send(timeTracker.now());

    cluster.worker?.disconnect();
  }
}

startInCluster();
