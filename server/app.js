const express = require('express');
const http = require("http");
const { json } = require("body-parser");
const app = express()
const port = 3000
const server = http.Server(app);
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { PassThrough } = require("stream");


app.post('/save', upload.any(), async (req, res) => {
    console.log(req.files);

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
})

server.listen(port, () => {
    console.log(`Binded Port : ${port}`);
});