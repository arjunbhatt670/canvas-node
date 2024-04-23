import cluster from "cluster";

import { TimeTracker, print } from "#root/utilities/grains";
import { videoSegmentsPath } from "#root/path";
import initiateAndStream from "./initiateAndStream";

export default async function makeClusters() {
  if (!cluster.isPrimary) {
    const timeTracker = new TimeTracker();

    if (process.env.STATS) {
      global.stats = JSON.parse(process.env.STATS);
    }

    print(`Worker with id ${process.pid} started`);

    timeTracker.start();
    await initiateAndStream(
      JSON.parse(process.env.mediaConfig!) as Media,
      Number(process.env.start),
      Number(process.env.duration),
      `${videoSegmentsPath}/segment${Number(process.env.start)}.mp4`
    );
    cluster.worker?.send({ total: timeTracker.now(), stats: global.stats });

    cluster.worker?.disconnect();
  }
}
