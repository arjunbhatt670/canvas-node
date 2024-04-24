import fs from "fs";

import { TimeTracker, print } from "#root/utilities/grains";
import { imgType } from "./config";
import { extractVideoClipFrames, getVideoClipFramePath } from "./utils";
import { videoFramesPath } from "#root/path";

export default async function saveVideoClipFrames(
  config: Media,
  limit: { start: number; duration: number }
) {
  const timeTracker = new TimeTracker();

  const videoClips = config.tracks
    .map((track) =>
      track.clips.filter(
        (clip) =>
          clip.type === "VIDEO_CLIP" &&
          clip.startOffSet < limit.start + limit.duration &&
          clip.startOffSet + clip.duration >= limit.start
      )
    )
    .flat(1);

  timeTracker.start();
  await Promise.all(
    videoClips.map((clip) => {
      const frameOutputPath = getVideoClipFramePath({
        dir: `${videoFramesPath}/${config.videoProperties.id}`,
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

  if (global.stats) global.stats.processVideo = timeTracker.now();
  timeTracker.log("Frames extracted from videos");

  return videoClips;
}
