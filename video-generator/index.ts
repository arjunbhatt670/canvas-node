import { Readable } from "stream";
import { exec } from "child_process";
import fs from "fs";

import frame2Video from "#root/utilities/frame2Video.js";
import { Url, print, TimeTracker } from "#root/utilities/grains.js";
import getConfig from "#root/utilities/getConfig.js";
import Puppeteer from "#root/puppeteer/index.js";
import { tmpDir, finalsPath, rootPath } from "#root/path.js";

import PIXI from "./pixi-node";
import { extractVideoFrames } from "./utils";
import { loop } from "./frameLoop";
import { imgType } from "./config.js";

export default async function core() {
  const tempPaths = [];
  const timeTracker = new TimeTracker();
  const totalTimeTracker = new TimeTracker();

  const { downloadedData: config } = await getConfig();

  const videoFramesTempPath = await extractVideoFrames(config, imgType);

  tempPaths.push(videoFramesTempPath);

  totalTimeTracker.start();

  timeTracker.start();
  const puppeteer = new Puppeteer();
  const page = await puppeteer.init();
  timeTracker.log("\n\nPuppeteer loaded");

  const shapeClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "SHAPE_CLIP"))
    .flat(1)
    .filter(Boolean);

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
    .map((track) => track.clips.filter((clip) => clip.type === "IMAGE_CLIP"))
    .flat(1)
    .filter(Boolean);

  timeTracker.start();
  imageClips.map((clip) => {
    const path = `${tmpDir}/${clip.id}.${Url(clip.sourceUrl).getExt()}`;
    tempPaths.push(path);
    fs.copyFileSync(clip.sourceUrl, path);
  });
  timeTracker.log("Images extracted to file system");

  const textClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "TEXT_CLIP"))
    .flat(1)
    .filter(Boolean);

  if (textClips.length) {
    timeTracker.start();
    await page.addStyleTag({
      url: `http://localhost:5173/roboto.css`,
    });
    await page.addStyleTag({
      path: `${rootPath}/utilities/reset.css`,
    });
    await page.addScriptTag({
      path: `${rootPath}/utilities/html2Image.js`,
    });
    timeTracker.log("Text clip dependencies loaded");
  }

  timeTracker.start();
  await Promise.all(
    textClips.map(async (clip) => {
      const dataUrl = await page.evaluate(
        function (htmlString, w, h) {
          document.body.innerHTML = htmlString;

          return window.html2Image.toPng(document.body, {
            width: w,
            height: h,
            quality: 1,
          });
        },
        clip.htmlContent!,
        clip.coordinates.width,
        clip.coordinates.height
      );

      const path = `${tmpDir}/${clip.id}.png`;
      tempPaths.push(path);
      fs.writeFileSync(
        path,
        Buffer.from(dataUrl.split("base64,")[1], "base64url")
      );
    })
  );
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

  const inputStream = new Readable({
    read: () => {},
  });
  const loopTimeTracker = new TimeTracker();
  const ffmpegTimeTracker = new TimeTracker();
  const finalVideoPath = process.env.OUTPUT ?? `${finalsPath}/pixi_shape.mp4`;

  ffmpegTimeTracker.start();
  frame2Video(
    inputStream,
    config.videoProperties.frameRate,
    finalVideoPath
  ).then(() => {
    ffmpegTimeTracker.log("[ffmpeg] Final video generated");
    totalTimeTracker.log("Total Time");
  });

  ffmpegTimeTracker.pause();
  loopTimeTracker.start();
  const time = await loop(config, inputStream, app);

  ffmpegTimeTracker.resume();
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
  await puppeteer.exit();
  PIXI.Assets.reset();

  return finalVideoPath;
}
