import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import { type Page } from "puppeteer";
import fs from "fs";

import {
  shapeAssetsPath,
  textAssetsPath,
  videoFramesPath,
  videoSegmentsPath,
} from "#root/path";
import Puppeteer from "#root/puppeteer/index";
import { TimeTracker } from "#root/utilities/grains";
import getDynamicConfig from "#root/benchmarks/basis";
import {
  Row,
  createStatsMeta,
  getRowStatsObject,
  saveToCsv,
} from "#root/benchmarks/index";
import { finalsPath } from "#root/path";
import { downloadMedia, handleProcessExit } from "#root/utilities/grains";
import createVideo from "./createVideo";
import { cleanAllAssets, getFinalVideoPath } from "./utils";
import spawnCluster from "./spawnCluster";

const handleRow = async (row: Row, page: Page) => {
  const config = await downloadMedia(getDynamicConfig(row));
  const outputPath = getFinalVideoPath(config.videoProperties.id, finalsPath);

  global.stats = {
    pixiInit: 0,
    puppeteerInit: 0,
    processVideo: 0,
    processText: 0,
    processImage: 0,
    processShape: 0,
    createCache: 0,
    drawCanvas: 0,
    extractCanvas: 0,
    streamed: 0,
    ffmpeg: 0,
    removeCache: 0,
    fileSystemCleanup: 0,
    total: 0,
  };

  !fs.existsSync(`${shapeAssetsPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${shapeAssetsPath}/${config.videoProperties.id}`);
  !fs.existsSync(`${textAssetsPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${textAssetsPath}/${config.videoProperties.id}`);
  !fs.existsSync(`${videoFramesPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${videoFramesPath}/${config.videoProperties.id}`);
  process.env.THREAD_TYPE !== "single" &&
    !fs.existsSync(`${videoSegmentsPath}/${config.videoProperties.id}`) &&
    fs.mkdirSync(`${videoSegmentsPath}/${config.videoProperties.id}`);

  if (process.env.THREAD_TYPE === "single") {
    await createVideo(outputPath, config, page);
  } else {
    global.stats.mergeVideos = 0;
    await spawnCluster(config, outputPath, page);
  }

  const updatedRow = {
    ...row,
    ...getRowStatsObject(global.stats),

    "Output path": outputPath,
    config: JSON.stringify(config),
  };
  saveToCsv(updatedRow);
};

(async () => {
  const rows = createStatsMeta(
    [60000],
    [30],
    [
      [640, 360],
      [854, 480],
      [1280, 720],
    ]
  );

  const timeTracker = new TimeTracker();
  timeTracker.start();
  const puppeteer = new Puppeteer();
  const page = await puppeteer.init();
  if (global.stats) global.stats.puppeteerInit = timeTracker.now();
  timeTracker.log("\n\nPuppeteer loaded");

  const q: queueAsPromised<{ row: Row; page: Page }, void> = fastq.promise(
    ({ row, page }) => handleRow(row, page),
    3
  );

  const tasks: Promise<void>[] = [];

  handleProcessExit(() => {
    cleanAllAssets();
  });

  rows.forEach((row) => {
    tasks.push(q.push({ row, page }));
  });

  for (let task of tasks) {
    try {
      await task;
    } catch (error) {
      console.warn(error);
    }
  }

  puppeteer.exit();
})();
