import { exec } from "child_process";
import fs from "fs";
import { type Readable } from "stream";

import { Url, print, TimeTracker, getFramePath } from "#root/utilities/grains";
import { tmpDir as staticDir } from "#root/path";

import PIXI from "./pixi-node";
import { extractVideoClipFrames } from "./utils";
import { loop } from "./frameLoop";
import { imgType } from "./config.js";

const createTmpDir = (staticDir: string, variable: string | number) => {
  const dir = `${staticDir}/${variable}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  return dir;
};

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
  const tmpDir = createTmpDir(staticDir, limit.start);
  timeTracker.log(`Created temporary directory ${tmpDir}`);

  const tempPaths = [tmpDir];

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
  timeTracker.start();
  await Promise.all(
    videoClips.map((clip) => {
      const frameOutputPath = getFramePath({
        dir: tmpDir,
        format: imgType,
        frameName: clip.id,
      });
      return extractVideoClipFrames(clip, {
        frameOutputPath,
        frameRate: config.videoProperties.frameRate,
        limit,
      });
    })
  );
  const videoFramesTempPath = getFramePath({
    dir: tmpDir,
    format: imgType,
    frameName: "**",
    frame: "**",
  });

  tempPaths.push(videoFramesTempPath);
  timeTracker.log("Frames extracted from videos");

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
    const path = `${tmpDir}/${clip.id}.png`;
    tempPaths.push(path);
    clip.shapeInfo &&
      fs.writeFileSync(
        path,
        Buffer.from(
          clip.shapeInfo.shapeMediaUrl.split("base64,")[1],
          "base64url"
        )
      );
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

  timeTracker.start();
  imageClips.map((clip) => {
    const path = `${tmpDir}/${clip.id}.${Url(clip.sourceUrl).getExt()}`;
    tempPaths.push(path);
    fs.copyFileSync(clip.sourceUrl, path);
  });
  timeTracker.log("Images extracted to file system");

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
  textClips.map((clip) => {
    const path = `${tmpDir}/${clip.id}.png`;
    tempPaths.push(path);
    fs.copyFileSync(`${staticDir}/${clip.id}.png`, path);
  });
  timeTracker.log("Text snapshots extracted to file system");

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
    basePath: tmpDir,
    skipDetections: true,
    preferences: {
      preferCreateImageBitmap: true,
    },
  });

  timeTracker.start();
  const tempAssets = fs.readdirSync(tmpDir);
  await PIXI.Assets.load(tempAssets);
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
  await PIXI.Assets.unload(tempAssets);
  PIXI.Assets.reset();
}
