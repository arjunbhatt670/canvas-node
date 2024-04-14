import PIXI, { type Application } from "./pixi-node";
import {
  getShapeAssetPath,
  getTextAssetPath,
  getVideoClipFramePath,
  getVisibleObjects,
} from "./utils";
import { TimeTracker, print } from "#root/utilities/grains";
import { imgType } from "./config";

import { type Readable } from "stream";
import { videoFramesPath } from "#root/path";

export const loop = async (
  config: Media,
  frameStream: Readable,
  pixiApp: Application,
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
  const statics = new Map();
  const time = {
    draw: 0,
    extract: 0,
    streamed: 0,
  };

  async function draw(currentFrame: number) {
    timeTracker.start();
    const currentTime =
      ((currentFrame - 1) * 1000) / config.videoProperties.frameRate;
    const visibleClipsInFrame = getVisibleObjects(config, currentTime);

    const container = new PIXI.Container();
    pixiApp.stage = container;

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
          try {
            const videoFramePath = getVideoClipFramePath({
              frame: currentFrame - clipStartFrame,
              format: imgType,
              clipName: clip.id,
              dir: videoFramesPath,
            });

            const img = await PIXI.Assets.get(videoFramePath);

            const sprite = PIXI.Sprite.from(img);
            sprite.x = clip.coordinates.x;
            sprite.y = clip.coordinates.y;
            sprite.width = clip.coordinates.width;
            sprite.height = clip.coordinates.height;

            container.addChild(sprite);
          } catch (_err) {
            /**  */
          }

          break;
        }

        case "SHAPE_CLIP": {
          if (statics.has(clip)) {
            container.addChild(statics.get(clip));
          } else {
            const img = await PIXI.Assets.get(getShapeAssetPath(clip.id));

            const sprite = PIXI.Sprite.from(img);
            sprite.x = clip.coordinates.x;
            sprite.y = clip.coordinates.y;
            sprite.width = clip.coordinates.width;
            sprite.height = clip.coordinates.height;

            statics.set(clip, sprite);
            container.addChild(sprite);
          }

          break;
        }

        case "IMAGE_CLIP": {
          if (statics.has(clip)) {
            container.addChild(statics.get(clip));
          } else {
            const img = await PIXI.Assets.get(clip.sourceUrl);

            const sprite = PIXI.Sprite.from(img);
            sprite.x = clip.coordinates.x;
            sprite.y = clip.coordinates.y;
            sprite.width = clip.coordinates.width;
            sprite.height = clip.coordinates.height;

            statics.set(clip, sprite);
            container.addChild(sprite);
          }

          break;
        }

        case "TEXT_CLIP": {
          if (statics.has(clip)) {
            container.addChild(statics.get(clip));
          } else {
            const img = await PIXI.Assets.get(getTextAssetPath(clip.id));
            const sprite = PIXI.Sprite.from(img);

            sprite.x = clip.coordinates.x;
            sprite.y = clip.coordinates.y;
            sprite.width = clip.coordinates.width;
            sprite.height = clip.coordinates.height;

            statics.set(clip, sprite);
            container.addChild(sprite);
          }

          break;
        }
      }
    }

    pixiApp.render();

    time.draw += timeTracker.now();

    timeTracker.start();
    const baseData = pixiApp.view.toDataURL?.("image/jpeg", 1)!; // 5ms
    const bufferData = Buffer.from(
      baseData,
      // .split('base64,')[1]
      "base64"
    );

    time.extract += timeTracker.now();

    // fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
    //     encoding: 'base64'
    // })

    return bufferData;
  }

  async function makeDraw(frame: number) {
    if (frame > endFrame) return;

    const data = await draw(frame);

    await new Promise<void>((resolve) => {
      frameStream.once("data", async () => {
        time.streamed += timeTracker.now();

        await makeDraw(++frame);

        resolve();
      });

      timeTracker.start();
      frameStream.push(data);
    });
  }

  await makeDraw(startFrame);

  print(`Processed ${totalFrames} frames.`);
  frameStream.push(null);

  return time;
};
