import { spawn } from 'child_process';
import { type Readable } from 'stream';

import { ffmpegPath } from 'localPath.js';

export default function frame2Video(options: {
  frameInputStream: Readable;
  outputVideoPath: string;
  frameRate: number;
}) {
  const { frameInputStream, frameRate, outputVideoPath } = options;

  return new Promise<void>((resolve, reject) => {
    const inputOptions = ['-y', `-r`, `${frameRate}`];
    const outputOptions = [
      '-c:v', // Video codec
      'libx264', // Codec names e.g. libx264, h264_videotoolbox
      '-b:v', // Target bit rate for video (kilobits/s, megabits/s)
      '1200k', // Bit rate
      `-r`, // Set frame rate (Hz)
      `${frameRate}`, // frame rate value
      '-preset', // provides encoding speed to compression ratio
      'veryfast', // https://trac.ffmpeg.org/wiki/Encode/H.264#Preset
      '-pix_fmt', // Set pixel format
      'yuv420p', // yuv411p, yuv422p
      '-benchmark', // Show benchmarking information at the end of an encode
      // '-q:v 65', // Constant quality factor (for codec videotoolbox)
      '-crf', // Constant rate factor (for codec libx264)
      '18', // https://trac.ffmpeg.org/wiki/Encode/H.264#a1.ChooseaCRFvalue
    ];

    const ffmpegProcess = spawn(ffmpegPath, [
      ...inputOptions,
      '-i',
      '-',
      ...outputOptions,
      outputVideoPath,
    ])
      .on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Rejected with code ${code}`));
        }
      })
      .on('error', reject);

    ffmpegProcess.stdin.on('error', (err) => {
      reject(err);
    });

    frameInputStream.pipe(ffmpegProcess.stdin);
  });
}
