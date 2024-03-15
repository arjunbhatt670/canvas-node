const { PassThrough } = require("stream");
const { exec } = require('child_process');


const Puppeteer = require(".");
const frame2Video = require("../frame2Video");
const { getConfig } = require("../service");
const { extractVideoFrames } = require("../pixiUtils");

(async () => {
    const tempPaths = [];

    const config = await getConfig();

    const videoFramesTempPath = await extractVideoFrames(config, 'png');

    tempPaths.push(videoFramesTempPath);

    const puppeteerLoadStart = Date.now();
    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();


    await page.goto("http://localhost:3000/");

    console.log('Time taken by puppeteer to load page', Date.now() - puppeteerLoadStart, 'ms')

    const inputStream = new PassThrough();

    const assetsLoadStart = Date.now();

    await page.evaluate(function () {
        return new Promise((resolve) => {
            document.addEventListener('assets-loaded', function loaded() {
                resolve();
                document.removeEventListener('assets-loaded', loaded);
            })
        });
    });

    console.log('Time taken by puppeteer to load initial assets required - ', Date.now() - assetsLoadStart, 'ms')

    const startTime = Date.now();
    /** @type {HTMLInputElement} */
    const inputElement = await page.$('#currentTimeInput');
    const canvas = await page.$("canvas");

    const duration = await page.evaluate((inputElement) => +inputElement.getAttribute('data-duration'), inputElement);
    const frameRate = await page.evaluate((inputElement) => +inputElement.getAttribute('data-frame-rate'), inputElement);
    const totalFrames = (duration * frameRate) / 1000;


    let currentFrame = 1;

    while (currentFrame <= totalFrames) {
        const url = await page.evaluate(
            function (currentFrame, canvas) {
                return new Promise((resolve) => {
                    // eslint-disable-next-line no-undef
                    window.onFrameChange(currentFrame);

                    document.addEventListener('canvas-seeked', function seeked() {
                        const dataUrl = canvas.toDataURL('image/jpeg', 1);
                        resolve(dataUrl);
                        document.removeEventListener('canvas-seeked', seeked);
                    })
                })
            },
            currentFrame, canvas
        );

        // fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
        //     encoding: 'base64'
        // })

        inputStream.write(Buffer.from(url
            // .split('base64,')[1]
            , "base64"));
        currentFrame++;
    }

    await puppeteer.exit();

    console.log('Processed', totalFrames, 'frames.');
    console.log("Drawing took", Date.now() - startTime, 'ms')

    inputStream.end();

    frame2Video(inputStream, frameRate, 'output3.mp4');

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();
