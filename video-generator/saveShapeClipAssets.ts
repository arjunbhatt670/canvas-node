import fs from "fs";

import { TimeTracker } from "#root/utilities/grains";
import { getShapeAssetPath } from "./utils";

export default async function saveShapeClipAssets(
  config: Media,
  limit: { start: number; duration: number }
) {
  const timeTracker = new TimeTracker();

  const shapeClips = config.tracks
    .map((track) =>
      track.clips.filter(
        (clip) =>
          clip.type === "SHAPE_CLIP" &&
          clip.startOffSet < limit.start + limit.duration &&
          clip.startOffSet + clip.duration >= limit.start
      )
    )
    .flat(1);

  timeTracker.start();
  await Promise.all(
    shapeClips.map(async (clip) => {
      const path = getShapeAssetPath(clip.id);

      if (clip.shapeInfo && !fs.existsSync(path)) {
        const buffer = Buffer.from(
          clip.shapeInfo.shapeMediaUrl.split("base64,")[1],
          "base64url"
        );
        fs.writeFileSync(path, buffer);
      }
    })
  );

  if (global.stats) global.stats.processShape = timeTracker.now();
  timeTracker.log("Shape clips extracted");
}
