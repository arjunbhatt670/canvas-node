import cluster from 'cluster';

import streamAndSaveVideo from 'generators/video/streamAndSaveVideo.js';

// types
import { type VideoGenerationConfig } from 'types/index.js';

const handleIncomingMessage = async (message: {
  data?: {
    segment: VideoGenerationConfig['segments'][number];
    videoGenerationConfig: VideoGenerationConfig;
  };
}) => {
  if (message.data) {
    const { segment, videoGenerationConfig } = message.data;

    await streamAndSaveVideo(videoGenerationConfig, segment);

    process.disconnect();
  }
};

/** Represents a single cluster */
export async function handleNewCluster() {
  if (!cluster.isPrimary) {
    process.on('message', handleIncomingMessage);

    process.send?.({ ready: true });
  }
}
