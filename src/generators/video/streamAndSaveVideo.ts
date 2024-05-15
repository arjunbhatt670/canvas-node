import { Readable } from 'stream';

import generateAndStreamVideoFrames from './processors/videoFrames/generateAndStreamVideoFrames.js';
import frame2Video from 'utilities/ffmpeg/frame2Video.js';

//types
import { type VideoGenerationConfig } from 'types/index.js';

/** Connects the frame loop and frame to video conversion */
export default async function streamAndSaveVideo(
  videoGenerationConfig: VideoGenerationConfig,
  segment: VideoGenerationConfig['segments'][number],
) {
  const { template } = videoGenerationConfig;

  const frameStream = new Readable({
    read: () => {},
    autoDestroy: true,
  });

  await Promise.all([
    frame2Video({
      frameInputStream: frameStream,
      frameRate: template.videoProperties.frameRate,
      outputVideoPath: segment.path,
    }),
    generateAndStreamVideoFrames(videoGenerationConfig, frameStream, segment),
  ]);
}
