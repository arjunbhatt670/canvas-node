import { Readable } from "stream";
import { exec } from "child_process";

import Puppeteer from ".";
import getConfig from "#root/utilities/getConfig";
import {
  extractVideoClipFrames,
  getVideoClipFramePath,
} from "#root/video-generator/utils";
import { videoFramesPath } from "#root/path";
import { getMediaMetaData, print, TimeTracker } from "../utilities/grains";
import frame2VideoSpawn from "#root/utilities/frame2VideoSpawn";

const createVideoPuppeteer = async (finalVideoPath: string) => {
  const tempPaths = [];
  const timeTracker = new TimeTracker();
  const totalTimeTracker = new TimeTracker();

  const { data: rawConfig, downloadedData: config } = await getConfig("data60");

  totalTimeTracker.start();

  const videoClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "VIDEO_CLIP"))
    .flat(1);

  timeTracker.start();
  await Promise.all(
    videoClips.map((clip) => {
      const frameOutputPath = getVideoClipFramePath({
        dir: videoFramesPath,
        format: "png",
        clipName: clip.id,
      });

      return extractVideoClipFrames(clip, {
        frameOutputPath,
        frameRate: config.videoProperties.frameRate,
        limit: {
          duration: config.videoProperties.duration,
          start: 0,
        },
      });
    })
  ).catch((reason) => print(reason));

  timeTracker.log("Frames extracted from videos");
  tempPaths.push(
    getVideoClipFramePath({
      dir: videoFramesPath,
      format: "png",
      clipName: "**",
      frame: "**",
    })
  );

  timeTracker.start();
  const puppeteer = new Puppeteer();
  const page = await puppeteer.init();
  await page.goto("http://localhost:3000/", {
    waitUntil: "domcontentloaded",
  });

  timeTracker.log("[Puppeteer] Page loaded");

  timeTracker.start();
  /** wait for page to be ready to use react */
  await page.evaluate(function () {
    window.isHeadLess = true;
    return new Promise((resolve) =>
      document.addEventListener("app-mounted", resolve)
    );
  });

  timeTracker.log("React initialization completed");

  timeTracker.start();
  /** Pass the media config to the application using window object  */
  await page.evaluate(function (payload) {
    window.onPayload(payload);

    return new Promise((resolve) =>
      document.addEventListener("assets-loaded", resolve)
    );
  }, rawConfig);

  timeTracker.log("[Puppeteer] Initial assets loaded");

  const totalFrames =
    (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;
  let currentFrame = 1;
  const inputStream = new Readable({
    read: () => {},
  });
  const loopTimeTracker = new TimeTracker();
  const evalTracker = new TimeTracker();
  const time = {
    draw: 0,
    extract: 0,
    communication: 0,
  };

  const ffmpegTimeTracker = new TimeTracker();
  ffmpegTimeTracker.start();
  frame2VideoSpawn(
    inputStream,
    config.videoProperties.frameRate,
    finalVideoPath
  )
    .then(() => {
      ffmpegTimeTracker.log("[ffmpeg] Final video generated");
      totalTimeTracker.log("Total Time");
      getMediaMetaData(finalVideoPath).then((meta) => console.log(meta));
    })
    .catch((reason) => print(reason));

  ffmpegTimeTracker.pause();
  loopTimeTracker.start();
  while (currentFrame <= totalFrames + 1) {
    evalTracker.start();
    const {
      url,
      time: { drawTime, extractTime, evalTime },
    } = await page.evaluate<
      [number],
      (currentFrame: number) => Promise<{
        url: string | null;
        time: { drawTime: number; extractTime: number; evalTime: number };
      }>
    >(function (currentFrame) {
      const evalStart = performance.now();
      return new Promise((resolve) => {
        let drawTime = performance.now();
        document.addEventListener("canvas-seeked", function seeked() {
          drawTime = performance.now() - drawTime;
          let extractTime = performance.now();
          if (currentFrame === 1) {
            extractTime = performance.now() - extractTime;
            resolve({
              url: null,
              time: {
                drawTime,
                extractTime,
                evalTime: performance.now() - evalStart,
              },
            });
            document.removeEventListener("canvas-seeked", seeked);
          }

          const dataUrl = window.pixiApp.view.toDataURL("image/jpeg", 1);

          extractTime = performance.now() - extractTime;

          resolve({
            url: dataUrl,
            time: {
              drawTime,
              extractTime,
              evalTime: performance.now() - evalStart,
            },
          });

          document.removeEventListener("canvas-seeked", seeked);
        });

        window.onFrameChange(currentFrame);
      });
    }, currentFrame);

    time.draw += drawTime;
    time.extract += extractTime;
    time.communication += evalTracker.now() - evalTime;

    if (!url) {
      currentFrame++;
      continue;
    }

    // fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
    //     encoding: 'base64'
    // })

    timeTracker.start();
    const buffer = Buffer.from(
      url,
      // .split('base64,')[1]
      "base64"
    );
    inputStream.push(buffer); // 0.15ms
    time.extract += timeTracker.now();

    currentFrame++;
  }

  ffmpegTimeTracker.resume();
  print(`Processed ${totalFrames} frames.`);
  print(
    `Frames iteration took ${loopTimeTracker.now()} ms. (Drawing - ${
      time.draw
    } ms) (Extract - ${time.extract} ms) (Communication - ${
      time.communication
    } ms)`
  );

  inputStream.push(null);
  await puppeteer.exit();

  /** Remove temp files */
  tempPaths.forEach((path) => {
    exec(`rm -rf ${path}`);
  });
};

export default createVideoPuppeteer;
