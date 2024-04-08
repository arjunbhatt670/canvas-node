import express from "express";
import http from "http";
import fs from "fs";

import { getFramePath } from "../utilities/grains";
import { tmpDir } from "../path";
import { extractVideoFrames } from "../video-generator/utils";
import getConfig from "../utilities/getConfig";
import core from "../video-generator";

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
  const { downloadedData } = await getConfig();

  await extractVideoFrames(downloadedData, "png");

  res.json({
    ok: true,
  });
});

app.get("/video", express.json(), async (req, res) => {
  const videoPath = await core();
  console.log(videoPath);
  const stream = fs.createReadStream(videoPath);

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", 'filename="video.mp4"');

  stream.pipe(res);
});

server.listen(port, () => {
  console.log(`Binded Port : ${port}`);
});
