import ffmpeg, { type FfprobeData } from 'fluent-ffmpeg';

import { ffprobePath } from 'localPath.js';

export default async function metaOf(filePath: string) {
  ffmpeg.setFfprobePath(ffprobePath);

  return new Promise<FfprobeData>((res, rej) =>
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (!err) {
        res(meta);
      } else {
        rej(err);
      }
    }),
  );
}
