import express from "express";
import http from "http";
import { exec } from "child_process";

import { finalsPath, rootPath, videoFramesPath } from "#root/path";
import {
  extractVideoClipFrames,
  getVideoClipFramePath,
} from "#root/video-generator/utils";
import getConfig from "../utilities/getConfig";

import createVideoPuppeteer from "#root/puppeteer/frameCapture";
import createVideo from "#root/video-generator/createVideo";

const app = express();
const port = 8000;
const server = new http.Server(app);

app.use(express.static("public"));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  if (req.method === "OPTIONS") {
    const headers = {
      //   "Access-Control-Allow-Origin": req.headers.origin,
      "access-control-allow-methods": "POST, GET, PUT, DELETE, OPTIONS",
      "access-control-allow-credentials": "false",
      "access-control-max-age": "86400", // 24 hours
    };

    res.writeHead(200, headers);
    res.end();
  } else {
    next();
  }
});

app.get("/video-frame", express.json(), async (req, res) => {
  const { videoId, frameNum } = req.query;

  res.sendFile(
    getVideoClipFramePath({
      dir: videoFramesPath,
      format: "png",
      clipName: videoId as string,
      frame: Number(frameNum),
    })
  );
});

app.get("/config", (req, res) => {
  const { fileName } = req.query;
  res.sendFile(`${rootPath}/api/${fileName}.json`);
});

app.get("/extract-video-frames", express.json(), async (req, res) => {
  const { downloadedData: config } = await getConfig("data-pup");

  console.log(
    getVideoClipFramePath({
      dir: videoFramesPath,
      format: "png",
      clipName: "**",
      frame: "**",
    })
  );

  await new Promise<void>((resolve, reject) => {
    exec(`rm -rf ${videoFramesPath}/*`, (err) => {
      console.log(err);
      err ? reject() : resolve();
    });
  });

  const videoClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "VIDEO_CLIP"))
    .flat(1)
    .filter(Boolean);

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
          start: 0,
          duration: config.videoProperties.duration,
        },
      });
    })
  );

  res.json({
    ok: true,
  });
});

app.get("/video-puppeteer", express.json(), async (req, res) => {
  const path = `${finalsPath}/output_pup_server.mp4`;
  await createVideoPuppeteer(path);
  res.json({ ok: true });
});

app.get("/video", express.json(), async (req, res) => {
  const path = `${finalsPath}/output_pixi_server.mp4`;
  await createVideo(path);
  res.json({ ok: true });
});

server.listen(port, () => {
  console.log(`Binded Port : ${port}`);
});
