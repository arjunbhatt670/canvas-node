import { csv2json, json2csv } from "json-2-csv";
import fs from "fs";
import { rootPath } from "../path";

// [10000, 30000, 60000, 120000]
// [30, 60]
// [[426, 240],[640, 360],[854, 480],[1280, 720],[1920, 1080],[2560, 1440],[3840, 2160]]

const timeL = [10000, 30000, 60000, 120000];
const fpsL = [30, 60];
const resL: Array<[number, number]> = [
  [426, 240],
  [640, 360],
  [854, 480],
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
];

export type Row = {
  time: number;
  fps: number;
  resolution: [number, number];
  [key: string]: any;
};

export const getRowStatsObject = (stats: Stats) => ({
  "Puppeteer initialization and load time": stats.puppeteerInit,
  "Video clips Processing time (Video frames extraction)": stats.processVideo,
  "Text clips Processing time (render on browser and extract image out of html)":
    stats.processText,
  "Image clips Processing (resize images for canvas)": stats.processImage,
  "Shape clips Processing (extract image out of data urls)": stats.processShape,
  "Preloading assets (except video assets) to pixi cache": stats.createCache,
  "Pixi Application initialization": stats.pixiInit,
  "Drawing time": stats.drawCanvas,
  "Pixi stage to Data URL image extraction": stats.extractCanvas,
  "Wait time for next read in stream": stats.streamed,
  "Ffmpeg extra time": stats.ffmpeg,
  "Removing assets from pixi cache": stats.removeCache,
  "File System cleanup": stats.fileSystemCleanup,
  ...(stats.mergeVideos !== undefined
    ? { "Merging video segments": stats.mergeVideos }
    : {}),
  "Total time (ms)": stats.total,
});

export const createStatsMeta = (
  timeList = timeL,
  fpsList = fpsL,
  resList = resL
) => {
  const rows: Row[] = [];

  for (const time of timeList) {
    for (const fps of fpsList) {
      for (const res of resList) {
        rows.push({
          time,
          fps,
          resolution: res,
        });
      }
    }
  }

  return rows;
};

export const saveToCsv = (row: Row, replace?: boolean) => {
  const benchmarksPath = `${rootPath}/benchmarks/benchmark.csv`;
  const existing = !replace && fs.existsSync(benchmarksPath);
  const csv = json2csv([row], {
    prependHeader: existing ? false : true,
    expandNestedObjects: false,
  });

  existing
    ? fs.appendFileSync(benchmarksPath, "\r\n" + csv)
    : fs.writeFileSync(benchmarksPath, csv);
};

// let converter = require('json-2-csv');
// const fs = require('fs')
// const csv = converter.json2csv(rows);

// console.log(csv)s
// fs.writeFileSync('abc.csv', csv)
