import PIXI, { type Sprite, type Texture } from "./pixi-node";
import { type Readable } from "stream";

import {
  getImageAssetPath,
  getShapeAssetPath,
  getTextAssetPath,
  getVideoClipFramePath,
  getVisibleObjects,
} from "./utils";
import { TimeTracker, print } from "#root/utilities/grains";
import { videoFramesPath } from "#root/path";
import { imgType } from "./config";

const createSprite = async (clip: DataClip, src: string) => {
  const imgTexture = await PIXI.loadNodeTexture.load?.<Texture>(src, {})!;

  imgTexture.orig.width = clip.coordinates.width;
  imgTexture.orig.height = clip.coordinates.height;

  const sprite = PIXI.Sprite.from(imgTexture);
  sprite.pivot.set(clip.coordinates.width / 2, clip.coordinates.height / 2);
  sprite.width = clip.coordinates.width;
  sprite.height = clip.coordinates.height;
  sprite.position.set(clip.coordinates.x, clip.coordinates.y);
  sprite.angle = clip.rotationAngle;
  sprite.alpha = clip.opacity;

  return sprite;
};

export const loop = async (
  config: Media,
  frameStream: Readable,
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
  timeTracker.start();
  const renderer = PIXI.autoDetectRenderer({
    width: config.videoProperties.width,
    height: config.videoProperties.height,
    antialias: true,
    preserveDrawingBuffer: true,
  });
  if (global.stats) global.stats.pixiInit = timeTracker.now();
  timeTracker.log("Renderer detected");

  async function draw(currentFrame: number) {
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
            dir: `${videoFramesPath}/${config.videoProperties.id}`,
          });

          const sprite = await createSprite(clip, videoFramePath);

          container.addChild(sprite);

          break;
        }

        case "SHAPE_CLIP": {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const sprite = await createSprite(
              clip,
              getShapeAssetPath(clip.id, config.videoProperties.id)
            );

            statics.set(clip.id, sprite);

            container.addChild(sprite);
          }

          break;
        }

        case "IMAGE_CLIP": {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const sprite = await createSprite(clip, clip.sourceUrl!);
            statics.set(clip.id, sprite);

            container.addChild(sprite);
          }

          break;
        }

        case "TEXT_CLIP": {
          if (statics.has(clip.id)) {
            container.addChild(statics.get(clip.id)!);
          } else {
            const sprite = await createSprite(
              clip,
              getTextAssetPath(clip.id, config.videoProperties.id)
            );
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
      ?.split(";base64,")[1]!;
    const bufferData = Buffer.from(baseData, "base64");
    renderer.clear();
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

  const loopTimeTracker = new TimeTracker();
  loopTimeTracker.start();

  try {
    await makeDraw(startFrame);

    if (global.stats) global.stats.drawCanvas = time.draw;
    if (global.stats) global.stats.extractCanvas = time.extract;
    if (global.stats) global.stats.streamed = time.streamed;

    print(`Processed ${totalFrames} frames.`);
    print(
      `Frames iteration took ${loopTimeTracker.now()} ms. (Drawing - ${
        time.draw
      } ms) (Extract - ${time.extract} ms) (Streamed - ${time.streamed} ms)`
    );

    frameStream.push(null);
  } finally {
    renderer.destroy(true);
  }
};
