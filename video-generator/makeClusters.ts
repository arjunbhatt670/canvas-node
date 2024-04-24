import cluster from "cluster";

import { TimeTracker, print } from "#root/utilities/grains";
import { videoSegmentsPath } from "#root/path";
import initiateAndStream from "./initiateAndStream";
import { getVideoSegmentPath } from "./utils";

export default async function makeClusters() {
  if (!cluster.isPrimary) {
    const timeTracker = new TimeTracker();

    if (process.env.STATS) {
      global.stats = JSON.parse(process.env.STATS);
    }

    print(`Worker with id ${process.pid} started`);

    const config = JSON.parse(process.env.mediaConfig!) as Media;

    timeTracker.start();
    await initiateAndStream(
      config,
      Number(process.env.start),
      Number(process.env.duration),
      getVideoSegmentPath(
        process.env.start!,
        `${videoSegmentsPath}/${config.videoProperties.id}`
      )
    );
    cluster.worker?.send({ total: timeTracker.now(), stats: global.stats });

    cluster.worker?.disconnect();
  }
}
