import express from 'express';
import tmp from 'tmp';
import 'dotenv/config';

import { attachExitHandlersToProcess } from 'utilities/processExitHandlers.js';
import { cleanupDirectory, print } from 'utilities/general.js';
import { DEFAULT_PORT } from 'constants/index.js';
import videoRoutes from './routes/video.js';

(async () => {
  const app = express();
  const port = process.env.PORT || DEFAULT_PORT;

  app.use(express.json());

  app.use(videoRoutes);

  /** Always do a complete cleanup of temporary directories
   * that may remain after an unintended shutdown of server  */
  await cleanupDirectory(`${tmp.tmpdir}/${process.env.TEMP_DIR_PREFIX}*`);
  print('Clean up done');

  const server = app.listen(port, () => {
    console.log(`Server started at Port : ${port}`);
  });

  attachExitHandlersToProcess(server);
})();
