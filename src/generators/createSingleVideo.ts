import fs from 'fs';
import { PassThrough } from 'stream';

import processVideo from 'generators/video/processors/clip/video.js';
import { spawnNewVideoCreationProcess } from './video/parallelization/index.js';
import createAudio from 'generators/audio/createAudio.js';
import mergeAudioAndVideo from 'utilities/ffmpeg/mergeAudioAndVideo.js';

// types
import { type VideoGenerationConfig } from 'types/index.js';

/**
 * Creates a complete video for a single template
 * @returns stream of the video
 */
export default async function createSingleVideo(
  videoGenerationConfig: VideoGenerationConfig,
) {
  const { template, videoWithoutAudioPath, finalAudioPath } =
    videoGenerationConfig;

  const audioPromise = createAudio(videoGenerationConfig);

  await processVideo(videoGenerationConfig, {
    duration: template.videoProperties.duration,
    start: 0,
  });

  await spawnNewVideoCreationProcess(videoGenerationConfig);

  const isAudioPresent = await audioPromise;

  if (!isAudioPresent) {
    // Creating a readable stream from generated video and piping it to a transform stream
    return fs.createReadStream(videoWithoutAudioPath).pipe(new PassThrough());
  }

  return mergeAudioAndVideo(finalAudioPath, videoWithoutAudioPath);
}
