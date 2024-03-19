/* global window */

const { PassThrough } = require("stream");
const { exec } = require('child_process');


const Puppeteer = require(".");
const frame2Video = require("../frame2Video");
const { getConfig } = require("../service");
const { extractVideoFrames } = require("../pixiUtils");
const { finalsPath } = require("../path");

(async () => {
    const tempPaths = [];

    const { data: rawConfig, downloadedData: config } = await getConfig();
    const videoFramesTempPath = await extractVideoFrames(config, 'png');

    tempPaths.push(videoFramesTempPath);

    const puppeteerLoadStart = Date.now();

    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();
    await page.goto("http://localhost:3000/");

    console.log('Time taken by puppeteer to load page', Date.now() - puppeteerLoadStart, 'ms');

    const reactRunStart = Date.now();

    /** wait for page to be ready to use react */
    await page.evaluate(function () {
        window.isHeadLess = true;
        return new Promise((resolve) => document.addEventListener('app-mounted', resolve));
    });

    console.log('React init took', Date.now() - reactRunStart, 'ms');

    const assetsLoadStart = Date.now();

    /** Pass the media config to the application using window object  */
    await page.evaluate(function (payload) {
        window.onPayload(payload);

        return new Promise((resolve) => document.addEventListener('assets-loaded', resolve))
    }, rawConfig);

    console.log('Time taken by puppeteer to load initial assets required - ', Date.now() - assetsLoadStart, 'ms');


    const totalFrames = (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;
    let currentFrame = 1;
    const inputStream = new PassThrough();
    const startTime = Date.now();

    while (currentFrame <= totalFrames) {
        const url = await page.evaluate(
            function (currentFrame) {
                return new Promise((resolve) => {
                    window.onFrameChange(currentFrame);

                    document.addEventListener('canvas-seeked', function seeked() {
                        const dataUrl = window.pixiApp.view.toDataURL('image/jpeg', 1);
                        resolve(dataUrl);
                        document.removeEventListener('canvas-seeked', seeked);
                    })
                })
            },
            currentFrame
        );

        inputStream.write(Buffer.from(url
            // .split('base64,')[1]
            , "base64"));
        currentFrame++;
    }

    await puppeteer.exit();

    console.log('Processed', totalFrames, 'frames.');
    console.log("Drawing took", Date.now() - startTime, 'ms')

    inputStream.end();

    const finalVideoPath = `${finalsPath}/output_pup_30s.mp4`;

    frame2Video(inputStream, config.videoProperties.frameRate, finalVideoPath);

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();
