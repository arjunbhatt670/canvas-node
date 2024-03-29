const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static')
const { PassThrough } = require('stream');
const puppeteer = require('puppeteer');

const frameCapture = async () => {
    console.log('starting');

    const browser = await puppeteer.launch({
        dumpio: true
    });
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/');



    const crop = await page.evaluate(async function () {
        return getCanvasPosition(11, 30);
    });

    const recorder = await page.screencast({
        path: 'recording.webm', ffmpegPath, crop
    });

    await page.evaluate(async function () {
        return await startDrawing(5);
    });

    await recorder.stop();





    const inputStream = new PassThrough();

    inputStream.end();

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);

    await new Promise((res, rej) => command.input('recording.webm')
        .output('output.mp4')
        .on('end', (args) => {
            console.log('video generated');
            res(args);
        })
        .on('error', (error) => {
            rej(error)
        })
        .run());


    command.input('output.mp4').ffprobe(function (err, metadata) {
        console.log('Duration of video', metadata.format.duration, 'seconds');
    });


    await browser.close()
    console.log("end");
}


frameCapture()

