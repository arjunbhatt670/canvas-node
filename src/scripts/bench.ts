import fs from 'fs';
import 'dotenv/config';

import createVideoTemplates from 'benchmark/createVideoTemplates.js';
import { createStatsMeta } from 'benchmark/index.js';
import { finalsPath } from 'localPath.js';
import { saveToCsv } from 'utilities/general.js';
import metaOf from 'utilities/ffmpeg/meta.js';
import TimeTracker from 'utilities/TimeTracker.js';
import { getFinalVideoPath, helpFlagCheck } from 'generators/utils.js';
import createVideoInit from 'generators/createVideoInit.js';
import { PROCESS_FLAGS } from 'constants/index.js';

// types
import type { VideoTemplate } from 'types/videoTemplate.js';

helpFlagCheck();

(async () => {
  const timeTracker = new TimeTracker();

  const rows = createStatsMeta({
    timeListParam: [60000],
    fpsListParam: [30],
    resListParam: [[640, 360]],
  });
  const videoTemplates = rows.map(
    (row, index) =>
      createVideoTemplates(row, index) as unknown as VideoTemplate,
  );

  const videoStreams = await createVideoInit({
    templates: videoTemplates,
    isClusterFlagPresent: process.argv.includes(PROCESS_FLAGS.CLUSTER),
  });

  const benchmarksPath = `${finalsPath}/benchmark.csv`;

  timeTracker.start();
  await Promise.all(
    videoStreams.map(async (videoStream, index) => {
      const videoOutputPath = getFinalVideoPath(
        videoTemplates[index].variationName,
      );

      return new Promise<void>((resolve) =>
        videoStream
          .pipe(fs.createWriteStream(videoOutputPath))
          .on('finish', () => {
            if (process.env.DEBUG_MODE === 'true') {
              metaOf(videoOutputPath).then((meta) => {
                console.log('Final video meta information', meta.format);
                saveToCsv({
                  obj: meta.format as Record<string, string>,
                  pathToCsv: benchmarksPath,
                });
                resolve();
              });
            }
          }),
      );
    }),
  );

  timeTracker.log('Benchmarks created');
})();
