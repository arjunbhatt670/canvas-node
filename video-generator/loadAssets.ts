import fs from "fs";

import { TimeTracker } from "#root/utilities/grains";

import PIXI from "./pixi-node";
import {
  getImageAssetPath,
  getShapeAssetPath,
  getTextAssetPath,
} from "./utils";
import imageResize from "#root/utilities/imageResize";

export default async function loadAssets(
  config: Media,
  limit: {
    start: number;
    duration: number;
  }
) {
  const timeTracker = new TimeTracker();
  const assets: string[] = [];

  const shapeClips = config.tracks
    .map((track) =>
      track.clips.filter(
        (clip) =>
          clip.type === "SHAPE_CLIP" &&
          clip.startOffSet < limit.start + limit.duration &&
          clip.startOffSet + clip.duration >= limit.start
      )
    )
    .flat(1);

  timeTracker.start();
  await Promise.all(
    shapeClips.map(async (clip) => {
      const path = getShapeAssetPath(clip.id);

      if (clip.shapeInfo && !fs.existsSync(path)) {
        const buffer = Buffer.from(
          clip.shapeInfo.shapeMediaUrl.split("base64,")[1],
          "base64url"
        );
        await imageResize(buffer, path, {
          height: clip.coordinates.height,
          width: clip.coordinates.width,
        });
      }

      assets.push(path);
    })
  );
  if (global.stats) global.stats.processShape = timeTracker.now();
  timeTracker.log("Shape clips extracted");

  const imageClips = config.tracks
    .map((track) =>
      track.clips.filter(
        (clip) =>
          clip.type === "IMAGE_CLIP" &&
          clip.startOffSet < limit.start + limit.duration &&
          clip.startOffSet + clip.duration >= limit.start
      )
    )
    .flat(1);

  timeTracker.start();
  await Promise.all(
    imageClips.map(async (clip) => {
      const path = getImageAssetPath(clip.id);

      if (!fs.existsSync(path)) {
        await imageResize(clip.sourceUrl!, path, {
          height: clip.coordinates.height,
          width: clip.coordinates.width,
        });
      }

      assets.push(path);
    })
  );
  if (global.stats) global.stats.processImage = timeTracker.now();
  timeTracker.log("Image clips extracted");

  const textClips = config.tracks
    .map((track) =>
      track.clips.filter(
        (clip) =>
          clip.type === "TEXT_CLIP" &&
          clip.startOffSet < limit.start + limit.duration &&
          clip.startOffSet + clip.duration >= limit.start
      )
    )
    .flat(1);

  textClips.map((clip) => {
    const path = getTextAssetPath(clip.id);
    assets.push(path);
  });

  timeTracker.start();

  await PIXI.Assets.init({
    skipDetections: true,
  });

  await PIXI.Assets.load(assets);

  if (global.stats) global.stats.createCache = timeTracker.now();
  timeTracker.log("Assets loaded in pixi cache");

  return {
    reset: async (unloadData: string[]) => {
      timeTracker.start();
      await PIXI.Assets.unload(assets);
      await PIXI.Assets.unload(unloadData);
      PIXI.Assets.reset();
      if (global.stats) global.stats.removeCache = timeTracker.now();
      timeTracker.log("Assets unloaded from pixi cache");
    },
  };
}
