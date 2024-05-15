import tmp from 'tmp';
import os from 'os';
import { execSync } from 'child_process';
import fs from 'fs';

import { cleanupDirectory } from 'utilities/general.js';
import { PROCESS_FLAGS, VIDEO_GENERATION_CONFIG } from 'constants/index.js';
import { ClipType } from 'constants/videoTemplate.js';
import { finalsPath } from 'localPath.js';

// types
import type { VideoClip, VideoTemplate } from 'types/videoTemplate.js';
import type { VideoGenerationConfig } from 'types/index.js';

const {
  INTERMEDIATE_FRAME_FORMAT,
  OUTPUT_VIDEO_FORMAT,
  MINIMUM_VIDEO_SEGMENT_SIZE_IN_SECONDS,
  OUTPUT_AUDIO_FORMAT,
} = VIDEO_GENERATION_CONFIG;

function getVisibleClips(template: VideoTemplate, timeMoment: number) {
  return template.tracks
    .map((track) =>
      track.clips.sort((clip1, clip2) => clip1.startOffSet - clip2.startOffSet),
    )
    .flat(1)
    .filter(
      (clip) =>
        clip.type !== ClipType.AUDIO_CLIP &&
        clip.startOffSet <= timeMoment &&
        timeMoment < clip.startOffSet + clip.duration,
    );
}

const getVideoClipFramePath = ({
  frame,
  clipName,
  dir,
}: {
  frame?: number | string;
  clipName: string;
  dir: string;
}) => {
  return `${dir}/video_frame${frame ?? '%d'}_${clipName}.${INTERMEDIATE_FRAME_FORMAT}`;
};

const getVideoSegmentPath = (name: string, dir: string) =>
  `${dir}/segment_${name}.${OUTPUT_VIDEO_FORMAT}`;

const getVideoSegmentsTextFilePath = (dir: string) =>
  `${dir}/video_segments_locations.txt`;

const getVideoWithoutAudioPath = (dir: string) =>
  `${dir}/video_without_audio.${OUTPUT_VIDEO_FORMAT}`;

const getAudioTrackPath = (name: string, dir: string) =>
  `${dir}/audio_track_${name}.${OUTPUT_AUDIO_FORMAT}`;

const getFinalAudioPath = (dir: string) =>
  `${dir}/only_audio.${OUTPUT_AUDIO_FORMAT}`;

const getFinalVideoPath = (name: string) =>
  `${finalsPath}/${name}.${OUTPUT_VIDEO_FORMAT}`;

/**
 * Retrieves the frame endpoints for a specified portion of a video clip.
 */
const getVideoClipFrameEndPoints = (options: {
  videoClip: VideoClip;
  limit: { start: number; duration: number };
  frameRate: number;
}) => {
  const { videoClip, frameRate, limit } = options;

  return {
    startFrame:
      1 +
      Math.round(
        (Math.max(limit.start - videoClip.startOffSet, 0) * frameRate) / 1000,
      ),
    frameCount: Math.ceil(
      ((Math.min(
        videoClip.startOffSet + videoClip.duration,
        limit.start + limit.duration,
      ) -
        Math.max(limit.start, videoClip.startOffSet)) *
        frameRate) /
        1000,
    ),
    startTime:
      ((videoClip.trimOffset || 0) +
        Math.max(limit.start - videoClip.startOffSet, 0)) /
      1000,
  };
};

const isClusteringPossible = (template: VideoTemplate) =>
  template.videoProperties.duration >=
  MINIMUM_VIDEO_SEGMENT_SIZE_IN_SECONDS * 1000;

const createTemporaryDirs = (templates: VideoTemplate[]) => {
  /** Root temporary directory for all the templates */
  const rootTmpDir = tmp.dirSync({
    prefix: process.env.TEMP_DIR_PREFIX,
  });

  return {
    temporaryDirs: templates.map((template) => {
      const templateTmpDir = tmp.dirSync({
        name: template.variationId,
        dir: rootTmpDir.name,
      });

      return templateTmpDir.name;
    }),
    cleanupCallback: () => cleanupDirectory(rootTmpDir.name),
  };
};

/**
 * Generates an array of video segments based on a given video template.
 * @param {VideoTemplate} template - The video template object containing video properties.
 * @returns An array of video segments with start time and duration.
 */
const getVideoSegments = (template: VideoTemplate) => {
  const segments: { start: number; duration: number }[] = [];
  const { duration } = template.videoProperties;
  const maximumSegments = os.cpus().length;
  const segmentSize = MINIMUM_VIDEO_SEGMENT_SIZE_IN_SECONDS;
  const durationInSecs = Math.floor(duration / 1000);
  const decimalDuration = Number((duration / 1000 - durationInSecs).toFixed(1));

  if (durationInSecs >= maximumSegments * segmentSize) {
    const noOfSegments = maximumSegments;
    const spread = Math.floor((durationInSecs % segmentSize) / noOfSegments);
    let spreadRem = (durationInSecs % segmentSize) % noOfSegments;
    let durationTillSegment = 0;

    for (let index = 0; index < noOfSegments; index++) {
      const segmentDuration =
        Math.floor(durationInSecs / maximumSegments) +
        spread +
        (spreadRem-- > 0 ? 1 : 0) +
        (index === noOfSegments - 1 ? decimalDuration : 0);
      segments.push({
        start: durationTillSegment * 1000,
        duration: segmentDuration * 1000,
      });

      durationTillSegment += segmentDuration;
    }
  } else if (durationInSecs >= segmentSize) {
    const noOfSegments = Math.floor(durationInSecs / segmentSize);
    const spread = Math.floor((durationInSecs % segmentSize) / noOfSegments);
    let spreadRem = (durationInSecs % segmentSize) % noOfSegments;
    let durationTillSegment = 0;

    for (
      let index = 0;
      index < Math.floor(durationInSecs / segmentSize);
      index++
    ) {
      const segmentDuration =
        segmentSize +
        spread +
        (spreadRem-- > 0 ? 1 : 0) +
        (index === noOfSegments - 1 ? decimalDuration : 0);
      segments.push({
        start: durationTillSegment * 1000,
        duration: segmentDuration * 1000,
      });

      durationTillSegment += segmentDuration;
    }
  } else {
    segments.push({
      start: 0,
      duration: (durationInSecs + decimalDuration) * 1000,
    });
  }

  return segments;
};

const helpFlagCheck = () => {
  if (process.argv.includes('--help')) {
    console.log(
      `Use '${PROCESS_FLAGS.CLUSTER}' flag to enable clustering in video generation. This fastens the video creation but uses more CPU.`,
    );
    process.exit();
  }
};

const createVideoGenerationConfig = (options: {
  videoTemplate: VideoTemplate;
  tmpDirPath: string;
  isClusteringEnabled?: boolean;
}): VideoGenerationConfig => {
  const { videoTemplate, tmpDirPath, isClusteringEnabled } = options;

  const segments = getVideoSegments(videoTemplate).map(
    (segment, segmentIndex) => ({
      ...segment,
      path: getVideoSegmentPath(segmentIndex.toString(), tmpDirPath),
    }),
  );

  return {
    template: videoTemplate,
    tmpDirPath,
    canCluster: isClusteringEnabled && isClusteringPossible(videoTemplate),
    finalAudioPath: getFinalAudioPath(tmpDirPath),
    videoWithoutAudioPath: getVideoWithoutAudioPath(tmpDirPath),
    segments,
  };
};

/**
 * Generates a text file containing paths to all video segments in the specified directory.
 * @param {Object} options - Options object.
 * @param {string} options.tmpDirPath - The path to the temporary directory where video segments are stored.
 * @returns {string} The path to the generated text file.
 */
const getVideoSegmentsTextFile = ({
  tmpDirPath,
}: {
  tmpDirPath: string;
}): string => {
  const textFilePath = getVideoSegmentsTextFilePath(tmpDirPath);
  /** wildcard path of all video segments */
  const wildcardPath = getVideoSegmentPath('*', tmpDirPath);

  const videoSegmentPaths = execSync(`ls ${wildcardPath} | sort -V`)
    .toString()
    .trim()
    .split('\n');

  const stream = fs.createWriteStream(textFilePath);
  videoSegmentPaths.forEach((segmentPath) => {
    stream.write(`file '${segmentPath}'\n`);
  });
  stream.end();

  return textFilePath;
};

export {
  getVisibleClips,
  getVideoClipFramePath,
  getVideoClipFrameEndPoints,
  getVideoSegmentPath,
  getVideoWithoutAudioPath,
  isClusteringPossible,
  createTemporaryDirs,
  getVideoSegments,
  helpFlagCheck,
  createVideoGenerationConfig,
  getVideoSegmentsTextFile,
  getAudioTrackPath,
  getFinalAudioPath,
  getFinalVideoPath,
};
