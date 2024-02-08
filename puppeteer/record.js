const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static')
const { PassThrough } = require('stream');
const puppeteer = require('puppeteer');


const record = async () => {
    console.log('starting');

    const browser = await puppeteer.launch({
        dumpio: true
    });
    const page = await browser.newPage();

    await page.goto('http://localhost:5173/');

    await page.click('#recordButtonPuppeteer');
    const dataURL = await page.evaluate(async function () {
        return await document.recordForPuppeteer(11000); //30200
    })

    const buffer = Buffer.from(dataURL.replace('data:video/webm;base64,', ''), 'base64');

    const inputStream = new PassThrough();
    inputStream.write(buffer);
    inputStream.end();

    const command = ffmpeg();
    command.setFfmpegPath(ffmpegPath);

    await new Promise((res, rej) => command.outputOptions([
        '-c:v libx264',     // Use H.264 codec
        '-preset veryfast', // Preset for fast encoding
        '-crf 23',          // Constant rate factor for video quality
        `-r ${30}`,            // Frame rate
        `-t ${10}`,
        '-pix_fmt yuv420p', // Pixel format
        // '-c:a aac',
        // '-vf scale=1280:-2' // Scale width to 1280 pixels while preserving aspect ratio (change if needed)
    ]).input(inputStream)
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

record()

