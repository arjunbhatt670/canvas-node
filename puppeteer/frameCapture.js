const { PassThrough } = require("stream");


const Puppeteer = require(".");
const { asyncIterable } = require("../utils");
const frame2Video = require("../frame2Video");
const mediaData = require('../api/data2.json');

(async () => {
    const time = mediaData.videoProperties.duration;
    const frameRate = mediaData.videoProperties.frameRate;
    const totalFrames = (time * frameRate) / 1000

    console.log("Duration of video", time, "ms");
    console.log("Using frame rate", frameRate, "fps");

    const puppeteerLoadStart = Date.now();
    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();


    await page.goto("http://localhost:3000/");

    console.log('Time taken by puppeteer to load page', Date.now() - puppeteerLoadStart, 'ms')

    const inputStream = new PassThrough();
    const startTime = Date.now();

    /** @type {HTMLInputElement} */
    const inputElement = await page.$('#currentTimeInput');
    const canvas = await page.$("canvas");

    for await (const frameNum of asyncIterable(totalFrames)) {
        const timeMoment = ((frameNum + 1) * 1000) / frameRate
        const url = await page.evaluate(
            function (time, inputElement, canvas) {
                return new Promise((resolve) => {
                    const event = new Event('change');
                    inputElement.value = time;

                    document.addEventListener('canvas-seeked', function seeked() {
                        const dataUrl = canvas.toDataURL('image/jpeg', 1);
                        resolve(dataUrl);
                        document.removeEventListener('canvas-seeked', seeked);
                    })
                    inputElement.dispatchEvent(event);
                })
            },
            timeMoment, inputElement, canvas
        );

        inputStream.write(Buffer.from(url, "base64"));
    }

    await puppeteer.exit();

    console.log('Processed', totalFrames, 'frames.');
    console.log("Frames extraction time spent - ", Date.now() - startTime, 'ms')

    inputStream.end();

    frame2Video(inputStream, frameRate, 'output.mp4');
})();
