import PIXI, { type Sprite } from "./pixi-node";
import fs from "fs";
import {
  getShapeAssetPath,
  getTextAssetPath,
  getVideoClipFramePath,
  getVisibleObjects,
} from "./utils";
import { TimeTracker } from "#root/utilities/grains";
import { imgType } from "./config";

import { videoFramesPath } from "#root/path";

import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";

type Task = number;

const createSprite = (clip: DataClip, clipData: any) => {
  const sprite = PIXI.Sprite.from(clipData);
  sprite.pivot.set(clip.coordinates.width / 2, clip.coordinates.height / 2);
  sprite.width = clip.coordinates.width;
  sprite.height = clip.coordinates.height;
  sprite.position.set(clip.coordinates.x, clip.coordinates.y);
  sprite.angle = clip.rotationAngle;
  sprite.alpha = clip.opacity;

  return sprite;
};

export const loop = (
  config: Media,
  limit: {
    start: number;
    duration: number;
  }
) => {
  const totalFrames =
    (limit.duration * config.videoProperties.frameRate) / 1000;
  const startFrame =
    1 + (limit.start * config.videoProperties.frameRate) / 1000;
  const endFrame = startFrame - 1 + totalFrames;
  const timeTracker = new TimeTracker();
  const statics = new Map<string, Sprite>();
  const time = {
    draw: 0,
    extract: 0,
    streamed: 0,
  };
  const renderer = PIXI.autoDetectRenderer({
    width: config.videoProperties.width,
    height: config.videoProperties.height,
    antialias: true,
    preserveDrawingBuffer: true,
    // clearBeforeRender: true,
  });

  const q: queueAsPromised<Task> = fastq.promise(asyncWorker, 10);

  async function asyncWorker(frame: Task): Promise<Buffer> {
    const baseData = await draw(frame);

    // fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
    //     encoding: 'base64'
    // })
    const buffer = Buffer.from(baseData, "base64");

    return buffer;
  }

  async function draw(currentFrame: number) {
    console.log(currentFrame);
    timeTracker.start();
    const currentTime =
      ((currentFrame - 1) * 1000) / config.videoProperties.frameRate;
    const visibleClipsInFrame = getVisibleObjects(config, currentTime);

    const container = new PIXI.Container();

    for (
      let clipIndex = 0;
      clipIndex < visibleClipsInFrame.length;
      clipIndex++
    ) {
      // 5ms
      const clip = visibleClipsInFrame[clipIndex];
      const clipStartFrame = Math.round(
        (clip.startOffSet * config.videoProperties.frameRate) / 1000
      );

      switch (clip.type) {
        case "VIDEO_CLIP": {
          const videoFramePath = getVideoClipFramePath({
            frame: currentFrame - clipStartFrame,
            format: imgType,
            clipName: clip.id,
            dir: videoFramesPath,
          });

          const img = await PIXI.Assets.load(videoFramePath);
          const sprite = createSprite(clip, img);

          container.addChild(sprite);

          break;
        }

        case "SHAPE_CLIP": {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const img = PIXI.Assets.get(getShapeAssetPath(clip.id));

            const sprite = createSprite(clip, img);
            statics.set(clip.id, sprite);

            container.addChild(sprite);
          }

          break;
        }

        case "IMAGE_CLIP": {
          const img = PIXI.Assets.get(clip.sourceUrl);

          const sprite = createSprite(clip, img);

          container.addChild(sprite);

          break;
        }

        case "TEXT_CLIP": {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const img = PIXI.Assets.get(getTextAssetPath(clip.id));

            const sprite = createSprite(clip, img);
            statics.set(clip.id, sprite);

            container.addChild(sprite);
          }

          break;
        }
      }
    }

    renderer.render(container);

    time.draw += timeTracker.now();

    timeTracker.start();
    const baseData = renderer.view
      .toDataURL?.("image/jpeg", 1)
      ?.split(";base64,")[1]!; // 5ms

    renderer.clear();

    time.extract += timeTracker.now();

    return baseData;
  }

  const promises = [];

  let frame = endFrame;
  while (frame >= startFrame) {
    promises.push(q.push(frame));
    frame--;
  }

  // print(`Processed ${totalFrames} frames.`);
  // frameStream.push(null);

  // renderer.destroy(true);

  return promises;
};
