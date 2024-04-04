import { Readable } from "stream";
import { exec } from "child_process";
import fs from "fs";

import frame2Video from "#root/frame2Video.js";
import { Url, print, TimeTracker } from "#root/utils.js";
import { getConfig } from "#root/service.js";
import Puppeteer from "#root/puppeteer/index.js";
import { tmpDir, finalsPath } from "#root/path.js";

import PIXI from "./pixi-node";
import { extractVideoFrames } from "./utils";
import { loop } from "./frameLoop";
import { imgType } from "./config.js";

const pixi = async () => {
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
    await page.addScriptTag({
      path: "./html2Image.js",
    });
    // await page.addStyleTag({
    //     url: 'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900&display=swap',
    // })
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
  });

  timeTracker.start();
  await PIXI.Assets.load(fs.readdirSync(tmpDir));
  timeTracker.log("Assets loaded in pixi cache");

  const inputStream = new Readable({
    read: () => {},
  });
  const loopTimeTracker = new TimeTracker();

  const ffmpegTimeTracker = new TimeTracker();
  ffmpegTimeTracker.start();
  frame2Video(
    inputStream,
    config.videoProperties.frameRate,
    process.env.OUTPUT ?? `${finalsPath}/pixi_shape.mp4`
  ).then(() => {
    ffmpegTimeTracker.log("[ffmpeg] Final video generated");
    totalTimeTracker.log("Total Time");
  });

  ffmpegTimeTracker.pause();
  loopTimeTracker.start();
  const time = await loop(config, inputStream, app);
  app.destroy();

  ffmpegTimeTracker.resume();
  print(
    `Frames iteration took ${loopTimeTracker.now()} ms. (Drawing - ${
      time.draw
    } ms) (Extract - ${time.extract} ms)`
  );

  await puppeteer.exit();

  /** Remove temp files */
  tempPaths.forEach((path) => {
    exec(`rm -rf ${path}`);
  });
};

pixi();

// const http = require("http");
// const express = require('express');
// const { imgType } = require('./pixi/config');
// const expressApp = express()
// const server = http.Server(expressApp);

// expressApp.get('/', async (req, res) => {
//     await pixi();

//     return res.json();
// })

// server.listen(9100, () => {
//     console.log(`Binded Port : ${9100}`);
// });
