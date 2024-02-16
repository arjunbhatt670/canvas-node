const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static')
const Puppeteer = require(".");
const fs = require('fs')

const frameCapture = async () => {
    console.log('starting');
    const time = 30;
    const frameRate = 30;

    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();

    await page.goto('http://localhost:5173/');

    await page.setViewport({
        width: 1200,
        height: 720,
    })

    const crop = await page.evaluate(async function () {
        return this.getCanvasPosition();
    });

    const startTime = Date.now();

    const recorder = await page.screencast({
        path: 'recording.webm', ffmpegPath, crop

    });

    const frames = await page.evaluate(async function () {
        return await this.startDrawing(30.5);
    });

    console.log('frames', frames)

    await recorder.stop();

    console.log("Screencast data extract time spent - ", Date.now() - startTime, 'ms')

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);
    let ffmpegStartTime;

    await new Promise((res, rej) => command.input('recording.webm')
        .output('output.mp4')
        .fpsOutput(frameRate)
        .setDuration(time)
        .on('start', () => {
            ffmpegStartTime = Date.now();
        })
        .on('end', (args) => {
            console.log('Ffmpeg Screencast data to video conversion time spent: ', Date.now() - ffmpegStartTime, 'ms');
            res(args);
        })
        .on('error', (error) => {
            rej(error)
        })
        .run());


    fs.unlinkSync('recording.webm');


    command.input('output.mp4').ffprobe(function (err, metadata) {
        console.log('Duration of video', metadata.format.duration, 'seconds');
    });


    await puppeteer.exit()
    console.log("end");
}


frameCapture()

