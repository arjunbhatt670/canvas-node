import express from "express";
import http from "http";
import { Readable } from "stream";
import { performance } from "node:perf_hooks";

import { TimeTracker, getFramePath } from "../utilities/grains";
import { tmpDir } from "../path";
import { extractVideoClipFrames } from "../video-generator/utils";
import getConfig from "../utilities/getConfig";
import frame2Video from "#root/utilities/frame2Video";
import createFrames from "#root/video-generator/createFrames";

const app = express();
const port = 8000;
const server = new http.Server(app);

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
    getFramePath({
      dir: tmpDir,
      format: "png",
      frameName: videoId,
      frame: frameNum,
    })
  );
});

app.get("/extract-video-frames", express.json(), async (req, res) => {
  const { downloadedData: config } = await getConfig();

  const videoClips = config.tracks
    .map((track) => track.clips.filter((clip) => clip.type === "VIDEO_CLIP"))
    .flat(1)
    .filter(Boolean);

  await Promise.all(
    videoClips.map((clip) =>
      extractVideoClipFrames(clip, {
        frameImageType: "png",
        frameRate: config.videoProperties.frameRate,
        maxDuration: config.videoProperties.duration,
      })
    )
  );

  res.json({
    ok: true,
  });
});

app.get("/video", express.json(), async (req, res) => {
  const { downloadedData: config } = await getConfig();
  const totalTimeTracker = new TimeTracker();
  const frameStream = new Readable({
    read: () => {},
  });

  totalTimeTracker.start();

  frame2Video(frameStream, config.videoProperties.frameRate).then(
    (videoStream) => {
      videoStream.on("close", () => {
        totalTimeTracker.log("Total Time");
      });
      videoStream.pipe(res);
    }
  );

  createFrames(config, frameStream);

  res.setHeader("Accept-Ranges", "bytes");
  //   res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", 'filename="video.mp4"');
});

server.listen(port, () => {
  console.log(`Binded Port : ${port}`);
});
