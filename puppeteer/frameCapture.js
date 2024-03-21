/* global window */

const { PassThrough } = require("stream");
const { exec } = require('child_process');
const fs = require('fs')


const Puppeteer = require(".");
const frame2Video = require("../frame2Video");
const { getConfig } = require("../service");
const { extractVideoFrames } = require("../pixiUtils");
const { finalsPath, rootPath } = require("../path");

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
    let time = {
        draw: 0,
        extract: 0,
        total: Date.now(),
        communication: 0,
    };

    while (currentFrame <= totalFrames) {
        const communicationStart = Date.now();
        const { url, time: { drawTime, extractTime, communicationTime, communicationEnd } } = await page.evaluate(
            function (currentFrame, communicationStart) {
                let communicationTime = (Date.now() - communicationStart);
                return new Promise((resolve) => {
                    let drawTime = Date.now();
                    document.addEventListener('canvas-seeked', function seeked() {
                        drawTime = Date.now() - drawTime;
                        let extractTime = Date.now();

                        const dataUrl = window.pixiApp.view.toDataURL('image/jpeg', 1);

                        extractTime = Date.now() - extractTime;

                        const communicationEnd = Date.now();
                        resolve({ url: dataUrl, time: { drawTime, extractTime, communicationTime, communicationEnd } });

                        document.removeEventListener('canvas-seeked', seeked);
                    });

                    window.onFrameChange(currentFrame);
                })
            },
            currentFrame, communicationStart
        );

        time.draw += drawTime;
        time.extract += extractTime;
        time.communication += communicationTime + (Date.now() - communicationEnd);

        // fs.writeFileSync(`${rootPath}/puppeteerFrames/frame_${currentFrame}.jpeg`, url.split(';base64,').pop(), {
        //     encoding: 'base64'
        // })

        const bufferCreationStart = Date.now();
        const buffer = Buffer.from(url
            // .split('base64,')[1]
            , "base64");
        time.extract += (Date.now() - bufferCreationStart);

        inputStream.write(buffer);
        currentFrame++;
    }

    time.total = Date.now() - time.total;

    await puppeteer.exit();

    console.log('Processed', totalFrames, 'frames.');
    console.log("Canvas drawing took", time.total, 'ms', `(Drawing - ${time.draw} ms)`, `(Extract - ${time.extract} ms)`, `(Communication - ${time.communication} ms)`);

    inputStream.end();

    const finalVideoPath = `${finalsPath}/output_pup_60s.mp4`;

    frame2Video(inputStream, config.videoProperties.frameRate, finalVideoPath);

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();
