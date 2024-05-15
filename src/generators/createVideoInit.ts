import {
  createTemporaryDirs,
  createVideoGenerationConfig,
} from 'generators/utils.js';
import TimeTracker from 'utilities/TimeTracker.js';

//types
import type { PassThrough } from 'stream';
import type { VideoTemplate } from 'types/videoTemplate.js';
import createMultipleVideos from './createMultipleVideos.js';
import createSingleVideo from './createSingleVideo.js';
import { isStreamed } from 'utilities/general.js';

export default async function createVideoInit<
  T extends VideoTemplate[] | VideoTemplate,
>(options: {
  templates: T;
  isClusterFlagPresent?: boolean;
}): Promise<T extends VideoTemplate ? PassThrough : PassThrough[]>;
export default async function createVideoInit(options: {
  templates: VideoTemplate[] | VideoTemplate;
  isClusterFlagPresent?: boolean;
}): Promise<PassThrough | PassThrough[]> {
  const { templates, isClusterFlagPresent } = options;

  const timeTracker = new TimeTracker();

  timeTracker.start();
  const videoTemplates = [templates].flat(1);
  const { temporaryDirs, cleanupCallback } =
    createTemporaryDirs(videoTemplates);

  const videoGenerationConfigs = videoTemplates.map(
    (videoTemplate, templateIndex) =>
      createVideoGenerationConfig({
        videoTemplate,
        tmpDirPath: temporaryDirs[templateIndex],
        isClusteringEnabled: isClusterFlagPresent,
      }),
  );

  timeTracker.log('Video template(s) pre-processed');

  timeTracker.start();
  try {
    if (Array.isArray(templates)) {
      const videoStreams = await createMultipleVideos(videoGenerationConfigs);
      Promise.all(videoStreams.map(isStreamed)).finally(cleanupCallback);

      return videoStreams;
    } else {
      const videoStream = await createSingleVideo(videoGenerationConfigs[0]);
      isStreamed(videoStream).finally(cleanupCallback);

      return videoStream;
    }
  } catch (err) {
    cleanupCallback();
    throw err;
  } finally {
    timeTracker.log('Video(s) generated');
  }
}
