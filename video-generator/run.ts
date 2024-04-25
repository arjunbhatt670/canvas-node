import fs from "fs";

import Puppeteer from "#root/puppeteer/index";
import getConfig from "#root/utilities/getConfig";
import createVideo from "./createVideo";
import { shapeAssetsPath, textAssetsPath, videoFramesPath } from "#root/path";
import { TimeTracker, handleProcessExit } from "#root/utilities/grains";
import { cleanAllAssets } from "./utils";

(async () => {
  if (!process.env.OUTPUT) {
    throw new ReferenceError("Please provide OUTPUT env variable");
  }

  handleProcessExit(() => {
    cleanAllAssets();
  });

  const { downloadedData: config } = await getConfig("data60");

  const timeTracker = new TimeTracker();

  timeTracker.start();
  const puppeteer = new Puppeteer();
  const page = await puppeteer.init();
  timeTracker.log("\n\nPuppeteer loaded");

  !fs.existsSync(`${shapeAssetsPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${shapeAssetsPath}/${config.videoProperties.id}`);
  !fs.existsSync(`${textAssetsPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${textAssetsPath}/${config.videoProperties.id}`);
  !fs.existsSync(`${videoFramesPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${videoFramesPath}/${config.videoProperties.id}`);

  await createVideo(process.env.OUTPUT, config, page);

  puppeteer.exit();
})();
