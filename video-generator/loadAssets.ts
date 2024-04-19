import fs from "fs";

import { TimeTracker } from "#root/utilities/grains";

import PIXI from "./pixi-node";
import { getShapeAssetPath, getTextAssetPath } from "./utils";

export default async function loadAssets(
  config: Media,
  limit: {
    start: number;
    duration: number;
  }
) {
  const timeTracker = new TimeTracker();
  const assets: string[] = [];

  // videoClips.map((clip) => {
  //   const { count, startFrame } = getVideoClipFrameEndPoints(
  //     clip,
  //     limit,
  //     config.videoProperties.frameRate
  //   );

  //   let frame = startFrame;
  //   while (frame < startFrame + count) {
  //     //assets.push(
  //     // getVideoClipFramePath({
  //     //   frame,
  //     //   format: imgType,
  //     //   dir: videoFramesPath,
  //     //   clipName: clip.id,
  //     // })
  //     // );
  //     frame++;
  //   }
  // });

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
  shapeClips.map((clip) => {
    const path = getShapeAssetPath(clip.id);
    clip.shapeInfo &&
      !fs.existsSync(path) &&
      fs.writeFileSync(
        path,
        Buffer.from(
          clip.shapeInfo.shapeMediaUrl.split("base64,")[1],
          "base64url"
        )
      );
    assets.push(path);
  });
  timeTracker.log("Shapes extracted to file system");

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

  imageClips.map((clip) => {
    assets.push(clip.sourceUrl);
  });

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
  // const app = new PIXI.Application({
  //   width: config.videoProperties.width,
  //   height: config.videoProperties.height,
  //   hello: true,
  //   antialias: true,
  //   clearBeforeRender: true,
  // });
  timeTracker.log("Pixi Application initialized");

  await PIXI.Assets.init({
    skipDetections: true,
  });

  timeTracker.start();
  await PIXI.Assets.load(assets);
  timeTracker.log("Assets loaded in pixi cache");

  // app.destroy(true, {
  //   children: true,
  //   baseTexture: true,
  //   texture: true,
  // });
  // await PIXI.Assets.unload(assets);
  // PIXI.Assets.reset();
}
