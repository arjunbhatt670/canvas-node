const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static')
const puppeteer = require('puppeteer');
const { PuppeteerMassScreenshots } = require('../utils');

const frameCapture = async () => {
    console.log('starting');
    const time = 30;
    const frameRate = 30;

    console.log('Requested video time', time, 'seconds');
    console.log('Using frame rate', frameRate, 'fps');

    const browser = await puppeteer.launch({
        dumpio: true,
    });
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/');

    const recorder = new PuppeteerMassScreenshots();
    await recorder.init(page); // path.resolve(process.cwd(), './intermediates')

    // await page.setViewport({
    //     width: 1200,
    //     height: 720,
    // })

    const startTime = Date.now();

    await recorder.start();
    const frames = await page.evaluate(async function () {
        return await this.startDrawing(30);
    })
    await recorder.stop();

    console.log('Processed', frames, 'frames.');
    console.log("Screencast data extract time spent - ", Date.now() - startTime, 'ms')

    const inputStream = await recorder.getData();

    const command = ffmpeg(); // path.resolve(process.cwd(), './intermediates/%*.jpg')
    command.setFfmpegPath(ffmpegPath);
    let ffmpegStartTime;

    await new Promise((res, rej) => command
        .input(inputStream)
        .inputOptions([`-framerate ${frameRate}`])
        .output('output.mp4')
        .outputOptions([`-framerate ${frameRate}`])
        .setDuration(time)
        .on('start', () => {
            ffmpegStartTime = Date.now();
        })
        .on('end', (args) => {
            console.log('Ffmpeg Screencast data to video conversion time spent: ', Date.now() - ffmpegStartTime, 'ms');
            res(args);
        })
        .on('error', (error) => {
            console.log('error', error)
            rej(error)
        })
        .run());


    command.input('output.mp4').ffprobe(function (err, metadata) {
        console.log('Duration of video', metadata.format.duration, 'seconds');
    });


    await browser.close()
}


frameCapture()

