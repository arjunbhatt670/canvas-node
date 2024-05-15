import { spawn } from 'child_process';
import { createWriteStream } from 'fs';

import { ffmpegPath } from 'localPath.js';

export default function video2Frame(options: {
  inputVideoFilePath: string;
  outputFramesPath: string;
  startTime: number;
  frameRate: number;
  width: number;
  height: number;
  frameCount: number;
  frameCountStart: number;
}) {
  const {
    startTime = 0,
    frameRate,
    width,
    height,
    frameCount,
    frameCountStart,
    outputFramesPath,
    inputVideoFilePath,
  } = options;

  return new Promise<string>((resolve, reject) => {
    const inputOptions = ['-y', '-ss', `${startTime}`];
    const outputOptions = [
      '-r', // Set frame rate for video
      `${frameRate}`,
      '-vf', // Create the filtergraph
      `fps=${frameRate}`, // set frame rate for frames generation
      '-vf', // Create the filtergraph
      `scale=${width ?? -1}:${height ?? -1}`, // height and width of frame
      '-vframes', // Set the number of video frames to output
      `${frameCount}`,
      '-q:v', // Quality factor (lower is better)
      '1', // 1-100
      '-qmin', // Set min video quantizer scale
      '1', //jpeg
      '-start_number', // Set frame start count number
      `${frameCountStart ?? 1}`,
      '-benchmark', // Show benchmarking information at the end of an encode
    ];

    const ffmpegProcess = spawn(ffmpegPath, [
      ...inputOptions,
      '-i',
      inputVideoFilePath,
      ...outputOptions,
      outputFramesPath,
    ])
      .on('exit', (code) => {
        if (code === 0) {
          resolve(outputFramesPath);
        } else {
          reject(new Error(`Rejected with code ${code}`));
        }
      })
      .on('error', (err) => {
        reject(err);
      });

    ffmpegProcess.stdin.on('error', (err) => {
      reject(err);
    });

    ffmpegProcess.stderr.pipe(createWriteStream('ppp.log'));
  });
}
