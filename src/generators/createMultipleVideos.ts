import fastq from 'fastq';

import createSingleVideo from './createSingleVideo.js';

//types
import type { VideoGenerationConfig } from 'types/index.js';

export default async function createMultipleVideos(
  videoGenerationConfigs: VideoGenerationConfig[],
) {
  const queue = fastq.promise(
    createSingleVideo,
    Number(process.env.CONCURRENCY),
  );

  return Promise.all(videoGenerationConfigs.map(queue.push));
}
