const express = require('express');
const http = require("http");
const app = express()
const port = 8000;
const server = http.Server(app);
const { Readable } = require('node:stream');
const video2Frame = require('../video2Frame');
const { getFramePath } = require('../utils');
const fs = require('fs');
const path = require('path');
const { tmpDir } = require('../path');
const { extractVideoFrames } = require('../pixiUtils');

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
        var headers = {};
        // headers["Access-Control-Allow-Origin"] = req.headers.origin;
        headers["Access-Control-Allow-Origin"] = "*";
        headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
        headers["Access-Control-Allow-Credentials"] = false;
        headers["Access-Control-Max-Age"] = '86400'; // 24 hours
        res.writeHead(200, headers);
        res.end();
    } else {
        next();
    }
});

app.post('/generate-video-frames', express.json(), async (req, res) => {
    const { videoUrl, duration, startTime, frameRate, width, height } = req.body;

    const fetchResponse = await fetch(videoUrl);

    fetchResponse.body.getReader()


    const videoStream = (await fetch(videoUrl)).body;

    console.log('videoStream', videoStream)

    const myReader = new Readable().wrap(videoStream);

    // console.log('videoStream', await videoStream.getReader().read())

    await video2Frame(myReader, '', {
        duration, startTime, frameRate, width, height
    })



    // const command = ffmpeg();
    // command.setFfmpegPath(ffmpegPath);

    // const inputStream = new PassThrough();
    // inputStream.write(req.file.buffer);
    // inputStream.end()

    // await new Promise((res, rej) =>
    //     command
    //         .input(inputStream)
    //         .fpsInput(60)
    //         .output("output.mp4")
    //         .fpsOutput(60)
    //         // .setDuration(time)
    //         .on("end", (args) => {
    //             console.log("video generated");
    //             res(args);
    //         })
    //         .on("error", (error) => {
    //             rej(error);
    //         })
    //         .run()
    // );
    res.json({
        ok: true
    })
});

app.get('/video-frame', express.json(), async (req, res) => {
    const { videoId, frameNum } = req.query;

    // const framePath = await new Promise((resolve) => {
    //     const interval = setInterval(() => {
    //         const fp = getFramePath({
    //             dir: tmpDir,
    //             format: 'png',
    //             frameName: videoId,
    //             frame: frameNum
    //         });

    //         if (fs.existsSync(fp)) {
    //             clearInterval(interval);
    //             resolve(fp);
    //         }
    //     }, 500);
    // });

    res.sendFile(getFramePath({
        dir: tmpDir,
        format: 'png',
        frameName: videoId,
        frame: frameNum
    }));
})

app.post('/extract-video-frames', express.json(), async (req, res) => {
    const { config } = req.body;

    await extractVideoFrames(config);

    res.json({
        ok: true
    })
})


server.listen(port, () => {
    console.log(`Binded Port : ${port}`);
});