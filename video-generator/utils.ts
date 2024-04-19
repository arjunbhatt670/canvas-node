import { exec } from "child_process";

import {
  shapeAssetsPath,
  textAssetsPath,
  tmpDir,
  videoFramesPath,
} from "#root/path";
import video2Frame from "#root/utilities/video2Frame";

const extractVideoClipFrames = async (
  clip: DataClip,
  options: {
    frameRate: number;
    frameOutputPath: string;
    limit: {
      start: number;
      duration: number;
    };
  }
) => {
  const { frameOutputPath, frameRate, limit } = options;

  const { count, startFrame } = getVideoClipFrameEndPoints(
    clip,
    limit,
    frameRate
  );

  return video2Frame(clip.sourceUrl, frameOutputPath, {
    startTime:
      ((clip.trimOffset || 0) + Math.max(limit.start - clip.startOffSet, 0)) /
      1000,
    frameRate,
    height: clip.coordinates.height,
    width: clip.coordinates.width,
    frameCount: count,
    frameCountStart: startFrame,
  });
};

function getVisibleObjects(config: Media, timeInstance: number): DataClip[] {
  return config.tracks
    .map((track) =>
      track.clips.sort((clip1, clip2) => clip1.startOffSet - clip2.startOffSet)
    )
    .flat(1)
    .filter(
      (clip) =>
        clip.type !== "AUDIO_CLIP" &&
        clip.startOffSet <= timeInstance &&
        timeInstance < clip.startOffSet + clip.duration
    );
}

const getShapeAssetPath = (id: string) => `${shapeAssetsPath}/${id}.png`;
const getTextAssetPath = (id: string) => `${textAssetsPath}/${id}.png`;

const getVideoClipFramePath = ({
  frame,
  format,
  clipName,
  dir,
}: {
  frame?: number | string;
  format: string;
  clipName: string;
  dir: string;
}) => {
  return `${dir}/${clipName}_frame${frame ?? "%d"}.${format}`;
};

const getVideoClipFrameEndPoints = (
  clip: DataClip,
  limit: { start: number; duration: number },
  frameRate: number
) => {
  return {
    startFrame:
      1 +
      Math.round(
        (Math.max(limit.start - clip.startOffSet, 0) * frameRate) / 1000
      ),
    count: Math.ceil(
      ((Math.min(
        clip.startOffSet + clip.duration,
        limit.start + limit.duration
      ) -
        Math.max(limit.start, clip.startOffSet)) *
        frameRate) /
        1000
    ),
  };
};

const cleanAllAssets = () => {
  exec(`rm -rf ${videoFramesPath}/*`);
  exec(`rm -rf ${textAssetsPath}/*`);
  exec(`rm -rf ${shapeAssetsPath}/*`);
  exec(`rm -rf ${tmpDir}/pixiFrames/*`);
};

export {
  extractVideoClipFrames,
  getVisibleObjects,
  getShapeAssetPath,
  getTextAssetPath,
  getVideoClipFramePath,
  cleanAllAssets,
  getVideoClipFrameEndPoints,
};
