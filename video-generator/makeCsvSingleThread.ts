import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";

import getDynamicConfig from "#root/benchmarks/basis";
import {
  Row,
  createStatsMeta,
  getRowStatsObject,
  saveToCsv,
} from "#root/benchmarks/index";
import { finalsPath } from "#root/path";
import { downloadMedia, handleProcessExit } from "#root/utilities/grains";
import createVideo from "./createVideo";
import { cleanAllAssets } from "./utils";

const handleRow = async (row: Row) => {
  const config = await downloadMedia(getDynamicConfig(row));
  const outputPath = `${finalsPath}/output_${row.time}s_${row.resolution.join(
    "x"
  )}_${row.fps}fps.mp4`;

  global.stats = {
    pixiInit: 0,
    puppeteerInit: 0,
    processVideo: 0,
    processText: 0,
    processImage: 0,
    processShape: 0,
    createCache: 0,
    drawCanvas: 0,
    extractCanvas: 0,
    streamed: 0,
    ffmpeg: 0,
    removeCache: 0,
    fileSystemCleanup: 0,
    total: 0,
  };

  await createVideo(outputPath, config);

  const updatedRow = {
    ...row,
    ...getRowStatsObject(global.stats),

    "Output path": outputPath,
    config: JSON.stringify(config),
  };
  saveToCsv(updatedRow);
};

(async () => {
  const rows = createStatsMeta([60000], [30], [[640, 360]]);

  const q: queueAsPromised<Row, void> = fastq.promise(
    (row) => handleRow(row),
    1
  );

  const tasks: Promise<void>[] = [];

  handleProcessExit(() => {
    cleanAllAssets();
  });

  rows.forEach((row) => {
    tasks.push(q.push(row));
  });

  for (let task of tasks) {
    try {
      await task;
    } catch (error) {
      console.warn(error);
    }
  }
})();
