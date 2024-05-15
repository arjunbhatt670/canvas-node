import { Router } from 'express';
import { basename } from 'path';
import fs from 'fs';

import { finalsPath } from 'localPath.js';
import metaOf from 'utilities/ffmpeg/meta.js';
import { getFinalVideoPath } from 'generators/utils.js';
import createVideoInit from 'generators/createVideoInit.js';
import { saveToCsv } from 'utilities/general.js';

// types
import { VideoTemplate } from 'types/videoTemplate.js';

const router = Router();

router.post('/create-video', async (req, res) => {
  const { videoTemplate } = req.body;

  try {
    const videoStream = await createVideoInit({
      templates: videoTemplate as VideoTemplate,
      isClusterFlagPresent: true,
    });

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'filename="video.mp4"');

    videoStream.pipe(res);
  } catch (error) {
    res.status(500).send({
      error: (error as Error).message,
    });
  }
});

router.post('/create-videos', async (req, res) => {
  const { videoTemplates } = req.body;

  try {
    const videoStreams = await createVideoInit({
      templates: videoTemplates as VideoTemplate[],
      isClusterFlagPresent: true,
    });

    // TODO - handling multiple videos generated over network
    const videosWithLocalPaths = await Promise.all(
      videoStreams.map(async (video, index) => {
        const videoOutputPath = getFinalVideoPath(
          videoTemplates[index].variationName,
        );

        return new Promise<string>((resolve) =>
          video.pipe(fs.createWriteStream(videoOutputPath)).on('finish', () => {
            if (process.env.DEBUG_MODE === 'true') {
              metaOf(videoOutputPath).then((meta) => {
                console.log('Final video meta information', meta.format);
                saveToCsv({
                  obj: meta.format as Record<string, string>,
                  pathToCsv: `${finalsPath}/benchmark_network.csv`,
                });
                resolve(`http://localhost:8626/${basename(videoOutputPath)}`); // Custom implementation for testing
              });
            }
          }),
        );
      }),
    );

    res.json(videosWithLocalPaths);
  } catch (error) {
    res.status(500).send({
      error: (error as Error).message,
    });
  }
});

export default router;
