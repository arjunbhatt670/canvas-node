import fs from "fs";

import { TimeTracker, print } from "#root/utilities/grains";
import { imgType } from "./config";
import {
  extractVideoClipFrames,
  getVideoClipsFramesFolderPath,
  getVideoClipFramePath,
} from "./utils";

export default async function saveVideoClipFrames(
  config: Media,
  limit: { start: number; duration: number }
) {
  const timeTracker = new TimeTracker();

  const videoClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "VIDEO_CLIP"))
    .flat(1);

  const segmentFolder = getVideoClipsFramesFolderPath(limit.start);

  if (!fs.existsSync(segmentFolder)) {
    fs.mkdirSync(segmentFolder);
  }

  timeTracker.start();
  await Promise.all(
    videoClips.map((clip) => {
      const frameOutputPath = getVideoClipFramePath({
        dir: segmentFolder,
        format: imgType,
        clipName: clip.id,
      });

      return extractVideoClipFrames(clip, {
        frameOutputPath,
        frameRate: config.videoProperties.frameRate,
        limit,
      });
    })
  ).catch((reason) => print(reason));

  timeTracker.log("Frames extracted from videos");
}
