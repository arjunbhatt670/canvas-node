import cluster from 'cluster';

import { getVideoSegmentsTextFile } from 'generators/utils.js';
import mergeVideos from 'utilities/ffmpeg/mergeVideos.js';

// types
import { type VideoGenerationConfig } from 'types/index.js';

/** Splits the video creation into multiple independent clusters/workers */
export async function startClusteringProcess(
  videoGenerationConfig: VideoGenerationConfig,
) {
  if (!cluster.isPrimary)
    return Promise.reject('Cannot be called outside primary process');

  const { tmpDirPath, videoWithoutAudioPath, segments } = videoGenerationConfig;

  return new Promise<void>((resolve) => {
    let disconnectedCount = 0;

    segments.forEach((segment) => {
      const worker = cluster.fork();

      worker.once('message', (message) => {
        if (message.ready) {
          worker.send({
            data: {
              segment,
              videoGenerationConfig,
            },
          });
        }
      });
    });

    cluster.on('disconnect', async () => {
      disconnectedCount++;

      if (disconnectedCount === segments.length) {
        const textFilePath = getVideoSegmentsTextFile({
          tmpDirPath,
        });
        await mergeVideos({
          inputVideosTextFile: textFilePath,
          outputVideoPath: videoWithoutAudioPath,
        });

        resolve();
      }
    });
  });
}
