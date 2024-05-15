import cluster from 'cluster';

import { startClusteringProcess } from '../clustering/parent.js';
import { handleNewCluster } from '../clustering/child.js';
import streamAndSaveVideo from 'generators/video/streamAndSaveVideo.js';

// types
import { type VideoGenerationConfig } from 'types/index.js';
import { getVideoWithoutAudioPath } from 'generators/utils.js';

const handleIncomingMessage = async (message: {
  data?: { videoGenerationConfig: VideoGenerationConfig };
}) => {
  if (message.data) {
    const { videoGenerationConfig } = message.data;
    const { canCluster, template, tmpDirPath } = videoGenerationConfig;

    if (canCluster) {
      await startClusteringProcess(videoGenerationConfig);
    } else {
      await streamAndSaveVideo(videoGenerationConfig, {
        start: 0,
        duration: template.videoProperties.duration,
        path: getVideoWithoutAudioPath(tmpDirPath),
      });
    }

    process.disconnect();
  }
};

(async () => {
  if (cluster.isPrimary) {
    process.on('message', handleIncomingMessage);

    process.send?.({ ready: true });
  } else {
    await handleNewCluster();
  }
})();
