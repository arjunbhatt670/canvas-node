import { exec } from "child_process";

import { tmpDir } from "#root/path";
import { TimeTracker, getFramePath } from "#root/utilities/grains";
import { imgType } from "./config";
import { extractVideoClipFrames } from "./utils";

export default async function saveVideoClipFrames(
  config: Media,
  limit: { start: number; duration: number }
) {
  const timeTracker = new TimeTracker();

  const videoClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "VIDEO_CLIP"))
    .flat(1);

  timeTracker.start();
  await Promise.all(
    videoClips.map((clip) => {
      const frameOutputPath = getFramePath({
        dir: tmpDir,
        format: imgType,
        frameName: clip.id,
      });
      return extractVideoClipFrames(clip, {
        frameOutputPath,
        frameRate: config.videoProperties.frameRate,
        limit,
      });
    })
  );

  timeTracker.log("Frames extracted from videos");

  return {
    clean: () => {
      const videoFramesTempPath = getFramePath({
        dir: tmpDir,
        format: imgType,
        frameName: "**",
        frame: "**",
      });
      exec(`rm -rf ${videoFramesTempPath}`);
    },
  };
}
