import os from "os";
import cluster from "cluster";
import { exec } from "child_process";

import getConfig from "#root/utilities/getConfig";
import saveTextClipAssets from "./saveTextClipAssets";
import { TimeTracker, print } from "#root/utilities/grains";
import { finalsPath, videoSegmentsPath } from "#root/path";
import { cleanAllAssets } from "./utils";
import initiateAndStream from "./initiateAndStream";
import mergeVideos from "./mergeVideos";

export default async function makeClusters() {
  if (cluster.isPrimary) {
    const totalCPUs = os.cpus().length;
    const totalTimeTracker = new TimeTracker();
    totalTimeTracker.start();

    print(`Number of CPUs is ${totalCPUs}`);
    print(`Master ${process.pid} is running`);

    const { downloadedData: config } = await getConfig("data60");

    exec(`rm -rf ${videoSegmentsPath}/*`);

    await saveTextClipAssets(config);

    process.on("exit", (code) => {
      print("process exited with code", code);
      cleanAllAssets();
    });

    cluster.on("exit", (worker, code, signal) => {
      print(
        `worker ${worker.process.pid} died`,
        `Code - ${code}`,
        `Signal - ${signal}`
      );
    });

    let doneCount = 0;
    const time: any = [];
    cluster.on("disconnect", async () => {
      doneCount++;
      if (doneCount === totalCPUs) {
        await mergeVideos(`${finalsPath}/merge.mp4`);
        console.log("Segments Time", time);
        totalTimeTracker.log("Total Time");
      }
    });

    cluster.on("message", (worker, msg) => {
      time.push({ [worker.id]: msg });
    });

    if (Math.ceil(config.videoProperties.duration / 1000) < totalCPUs) {
      await initiateAndStream(
        config,
        0,
        config.videoProperties.duration,
        `${videoSegmentsPath}/segment0.mp4`
      );
      totalTimeTracker.log("Total Time");
      mergeVideos(`${finalsPath}/merge.mp4`);
      return;
    }

    const timePatch =
      Math.floor(config.videoProperties.duration / (totalCPUs * 1000)) * 1000;

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
    await initiateAndStream(
      JSON.parse(process.env.mediaConfig!) as Media,
      Number(process.env.start),
      Number(process.env.duration),
      `${videoSegmentsPath}/segment${Number(process.env.start)}.mp4`
    );

    cluster.worker?.send(timeTracker.now());

    cluster.worker?.disconnect();
  }
}
