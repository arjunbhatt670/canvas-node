import { spawn } from 'child_process';
import { spawnProcessPath } from 'localPath.js';

// types
import { type VideoGenerationConfig } from 'types/index.js';

/** Spawns a new node process, creates video and save in `videoPath` */
export async function spawnNewVideoCreationProcess(
  videoGenerationConfig: VideoGenerationConfig,
) {
  return new Promise<void>((resolve, reject) => {
    const spawnProcess = spawn(`node ${spawnProcessPath}`, [], {
      shell: true,
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        CONCURRENCY: process.env.CONCURRENCY,
        FFMPEG_PATH: process.env.FFMPEG_PATH,
        FFPROBE_PATH: process.env.FFPROBE_PATH,
        HTTP_PORT: process.env.HTTP_PORT,
        TEMP_DIR_PREFIX: process.env.TEMP_DIR_PREFIX,
      },
    });

    spawnProcess.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Rejected with code ${code} and signal ${signal}`));
      }
    });

    spawnProcess.on('error', reject);

    spawnProcess.on('message', (message: { ready: boolean }) => {
      if (message.ready) {
        spawnProcess.send({
          data: { videoGenerationConfig },
        });
      }
    });
  });
}
