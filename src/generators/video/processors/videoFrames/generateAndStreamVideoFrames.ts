import fastq from 'fastq';
import * as PIXI from '@pixi/node';
import composeFrameContent from './composeFrameContent.js';

// types
import { type Readable } from 'stream';
import { type VideoGenerationConfig } from 'types/index.js';

/** iterates over each frame and passes the drawn frame to the stream */
const generateAndStreamVideoFrames = async (
  videoGenerationConfig: VideoGenerationConfig,
  frameStream: Readable,
  limit: VideoGenerationConfig['segments'][number],
) => {
  const { template } = videoGenerationConfig;
  const { frameRate, width, height, backgroundColor } =
    template.videoProperties;

  const startFrame = 1 + (limit.start * frameRate) / 1000;
  const endFrame = ((limit.duration + limit.start) * frameRate) / 1000;
  const renderer = PIXI.autoDetectRenderer({
    width,
    height,
    antialias: true,
    backgroundColor,
  });

  const draw = composeFrameContent({ videoGenerationConfig, renderer });

  async function asyncWorker(frame: number) {
    const buffer = await draw(frame);
    frameStream.push(buffer);
  }

  try {
    const queue = fastq.promise(asyncWorker, 1);

    let frame = startFrame;
    while (frame <= endFrame) {
      queue.push(frame);
      frame++;
    }

    await queue.drained();
    frameStream.push(null);
  } finally {
    renderer.destroy(true);
  }
};

export default generateAndStreamVideoFrames;
