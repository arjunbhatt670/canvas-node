import { resolve, isAbsolute } from 'path';
import ffmpegStaticPath from 'ffmpeg-static';
import { path as ffprobeStaticPath } from 'ffprobe-static';

export const finalsPath = resolve('out');
export const ffmpegPath = isAbsolute(process.env.FFMPEG_PATH)
  ? process.env.FFMPEG_PATH
  : (ffmpegStaticPath as unknown as string);
export const ffprobePath = isAbsolute(process.env.FFPROBE_PATH)
  ? process.env.FFPROBE_PATH
  : (ffprobeStaticPath as unknown as string);
export const spawnProcessPath = resolve(
  'build/generators/video/parallelization/spawning/process.js',
);
