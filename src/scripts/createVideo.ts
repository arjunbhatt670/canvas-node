import fs from 'fs';
import 'dotenv/config';

import metaOf from 'utilities/ffmpeg/meta.js';
import createVideoInit from 'generators/createVideoInit.js';
import { helpFlagCheck } from 'generators/utils.js';
import { PROCESS_FLAGS } from 'constants/index.js';

// types
import { type VideoTemplate } from 'types/videoTemplate.js';

helpFlagCheck();

(async () => {
  if (!process.env.OUTPUT) {
    throw new ReferenceError('Please provide OUTPUT env variable');
  }

  if (!process.env.TEMPLATE_PATH) {
    throw new ReferenceError('Please provide TEMPLATE_PATH env variable');
  }

  const videoTemplate = JSON.parse(
    fs.readFileSync(process.env.TEMPLATE_PATH, {
      encoding: 'utf-8',
    }),
  ) as VideoTemplate;
  const finalVideoPath = process.env.OUTPUT;

  const videoStream = await createVideoInit({
    templates: videoTemplate,
    isClusterFlagPresent: process.argv.includes(PROCESS_FLAGS.CLUSTER),
  });

  videoStream.pipe(fs.createWriteStream(finalVideoPath)).on('finish', () => {
    if (process.env.DEBUG_MODE === 'true') {
      metaOf(finalVideoPath).then((meta) =>
        console.log('Final video meta information', meta.format),
      );
    }
  });
})();
