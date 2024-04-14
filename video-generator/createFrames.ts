import { exec } from "child_process";
import fs from "fs";
import { type Readable } from "stream";

import { print, TimeTracker, getFramePath } from "#root/utilities/grains";
import { tmpDir } from "#root/path";

import PIXI from "./pixi-node";
import { loop } from "./frameLoop";
import { imgType } from "./config.js";

export default async function createFrames(
  config: Media,
  frameStream: Readable,
  limit: {
    start: number;
    duration: number;
  }
) {
  const timeTracker = new TimeTracker();

  timeTracker.start();
  timeTracker.log(`Created temporary directory ${tmpDir}`);

  const tempPaths: string[] = [];

  const videoClips = config.tracks
    .map((track) =>
      track.clips.filter(
        (clip) =>
          clip.type === "VIDEO_CLIP" &&
          clip.startOffSet < limit.start + limit.duration &&
          clip.startOffSet + clip.duration >= limit.start
      )
    )
    .flat(1);

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

  timeTracker.start();
  const app = new PIXI.Application({
    width: config.videoProperties.width,
    height: config.videoProperties.height,
    hello: true,
    antialias: true,
    clearBeforeRender: true,
  });
  timeTracker.log("Pixi Application initialized");

  app.renderer.background.color = "#ffffff";

  await PIXI.Assets.init({
    skipDetections: true,
    preferences: {
      preferCreateImageBitmap: true,
    },
  });

  const assets: string[] = [];

  timeTracker.start();
  shapeClips.map((clip) => {
    const path = `${tmpDir}/${clip.id}.png`;
    clip.shapeInfo &&
      fs.writeFileSync(
        path,
        Buffer.from(
          clip.shapeInfo.shapeMediaUrl.split("base64,")[1],
          "base64url"
        )
      );
    tempPaths.push(path);
    assets.push(path);
  });
  timeTracker.log("Shapes extracted to file system");

  imageClips.map((clip) => {
    assets.push(clip.sourceUrl);
  });

  textClips.map((clip) => {
    const path = `${tmpDir}/${clip.id}.png`;
    assets.push(path);
  });

  videoClips.map((clip) => {
    const start =
      1 +
      Math.round(
        (Math.max(limit.start - clip.startOffSet, 0) *
          config.videoProperties.frameRate) /
          1000
      );
    const end = Math.ceil(
      ((Math.min(
        clip.startOffSet + clip.duration,
        limit.start + limit.duration
      ) -
        Math.max(limit.start, clip.startOffSet)) *
        config.videoProperties.frameRate) /
        1000
    );

    let frame = start;
    while (frame < start + end) {
      assets.push(
        getFramePath({
          frame,
          format: imgType,
          dir: tmpDir,
          frameName: clip.id,
        })
      );
      frame++;
    }
  });

  timeTracker.start();
  await PIXI.Assets.load(assets);
  timeTracker.log("Assets loaded in pixi cache");

  const loopTimeTracker = new TimeTracker();

  loopTimeTracker.start();
  const time = await loop(config, frameStream, app, limit);

  print(
    `Frames iteration took ${loopTimeTracker.now()} ms. (Drawing - ${
      time.draw
    } ms) (Extract - ${time.extract} ms) (Streamed - ${time.streamed} ms)`
  );

  /** Remove temp files */
  tempPaths.forEach((path) => {
    exec(`rm -rf ${path}`);
  });

  app.destroy(true, {
    children: true,
    baseTexture: true,
    texture: true,
  });
  await PIXI.Assets.unload(assets);
  PIXI.Assets.reset();
}
