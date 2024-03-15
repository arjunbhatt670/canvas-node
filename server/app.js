const express = require('express');
const http = require("http");
const app = express()
const port = 8000;
const server = http.Server(app);
const { getFramePath } = require('../utils');
const { tmpDir } = require('../path');
const { extractVideoFrames } = require('../pixiUtils');

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
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

app.get('/video-frame', express.json(), async (req, res) => {
    const { videoId, frameNum } = req.query;

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