// Parameters -
// [10000, 30000, 60000, 120000]
// [30, 60]
// [[426, 240],[640, 360],[854, 480],[1280, 720],[1920, 1080],[2560, 1440],[3840, 2160]]

import type { Row } from './types.js';

const timeList = [10000, 30000, 60000, 120000];
const fpsList = [30, 60];
const resList: Array<[number, number]> = [
  [426, 240],
  [640, 360],
  [854, 480],
  [1280, 720],
  [1920, 1080],
  [2560, 1440],
  [3840, 2160],
];

export const createStatsMeta = ({
  timeListParam = timeList,
  fpsListParam = fpsList,
  resListParam = resList,
}) => {
  const rows: Row[] = [];

  for (const time of timeListParam) {
    for (const fps of fpsListParam) {
      for (const res of resListParam) {
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
