import os from "os";
import cluster from "cluster";
import { exec } from "child_process";

import saveTextClipAssets from "./saveTextClipAssets";
import {
  TimeTracker,
  getMediaMetaData,
  handleProcessExit,
  print,
} from "#root/utilities/grains";
import { finalsPath, videoSegmentsPath } from "#root/path";
import mergeVideos from "./mergeVideos";
import createVideo from "./createVideo";
import { cleanAllAssets } from "./utils";
import saveVideoClipFrames from "./saveVideoClipFrames";

export default async function primaryCluster(
  config: Media,
  finalVideoPath: string
) {
  if (cluster.isPrimary) {
    const totalCPUs = os.cpus().length;

    if (Math.ceil(config.videoProperties.duration / 1000) < totalCPUs) {
      await createVideo(finalVideoPath, config);
      return;
    }

    const totalTimeTracker = new TimeTracker();
    totalTimeTracker.start();

    print(`Number of CPUs is ${totalCPUs}`);
    print(`Master ${process.pid} is running`);

    exec(`rm -rf ${videoSegmentsPath}/*`);

    await saveTextClipAssets(config);
    await saveVideoClipFrames(config, {
      duration: config.videoProperties.duration,
      start: 0,
    });

    cluster.on("exit", (worker, code, signal) => {
      print(
        `worker ${worker.process.pid} died`,
        `Code - ${code}`,
        `Signal - ${signal}`
      );
    });

    let doneCount = 0;
    const time: string[] = [];
    cluster.on("disconnect", async () => {
      doneCount++;
      if (doneCount === totalCPUs) {
        await mergeVideos(finalVideoPath);

        getMediaMetaData(finalVideoPath).then((meta) => console.log(meta));

        const timeTracker = new TimeTracker();

        timeTracker.start();

        await cleanAllAssets();

        if (global.stats) global.stats.fileSystemCleanup = timeTracker.now();
        timeTracker.log("File system cleanup done");

        if (global.stats) global.stats.total = totalTimeTracker.now();
        totalTimeTracker.log("Total Time");

        console.log("Segments Time", time);

        process.send?.(global.stats);
      }
    });

    cluster.on("message", (worker, data) => {
      time.push(`[${worker.id}]: ${data.total}`);
      global.stats = data.stats;
    });

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
        STATS: JSON.stringify(global.stats),
      });
    }
  }
}
