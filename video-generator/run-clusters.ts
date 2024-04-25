import cluster from "cluster";
import fs from "fs";

import Puppeteer from "#root/puppeteer/index";
import {
  shapeAssetsPath,
  textAssetsPath,
  videoFramesPath,
  videoSegmentsPath,
} from "#root/path";
import getConfig from "#root/utilities/getConfig";
import makeClusters from "./makeClusters";
import primaryCluster from "./primaryCluster";
import { TimeTracker, handleProcessExit } from "#root/utilities/grains";
import { cleanAllAssets } from "./utils";

(async () => {
  if (cluster.isPrimary) {
    if (!process.env.OUTPUT) {
      throw new ReferenceError("Please provide OUTPUT env variable");
    }

    const { downloadedData: config } = await getConfig("data60");

    handleProcessExit(() => {
      cleanAllAssets();
    });

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
    !fs.existsSync(`${videoSegmentsPath}/${config.videoProperties.id}`) &&
      fs.mkdirSync(`${videoSegmentsPath}/${config.videoProperties.id}`);

    await primaryCluster(config, process.env.OUTPUT, page);

    puppeteer.exit();
  } else {
    makeClusters();
  }
})();
