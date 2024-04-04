import PIXI from "@pixi/node";
import { getVisibleObjects } from "./utils";
import {
  TimeTracker,
  Url,
  asyncIterable,
  getFramePath,
  print,
} from "#root/utilities/grains.js";
import { imgType } from "./config";

import { type Application } from "@pixi/node";
import { type Readable } from "stream";

export const loop = async (
  config: Media,
  inputStream: Readable,
  pixiApp: Application
) => {
  const totalFrames =
    (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;
  const timeTracker = new TimeTracker();
  const statics = new Map();
  const time = {
    draw: 0,
    extract: 0,
  };

  for await (const currentFrame of asyncIterable(totalFrames)) {
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
            const videoFramePath = getFramePath({
              frame: currentFrame - clipStartFrame,
              format: imgType,
              frameName: clip.id,
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
            const img = await PIXI.Assets.load(`${clip.id}.png`);

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
            const img = await PIXI.Assets.load(
              `${clip.id}.${Url(clip.sourceUrl).getExt()}`
            );

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
            const img = await PIXI.Assets.load(`${clip.id}.png`);
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

    await new Promise<void>((resolve) => {
      setTimeout(() => {
        inputStream.push(bufferData);
        resolve();
      });
    });

    time.extract += timeTracker.now();

    // fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
    //     encoding: 'base64'
    // })
  }

  print(`Processed ${totalFrames} frames.`);
  inputStream.push(null);

  return time;
};
