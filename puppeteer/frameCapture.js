/* global window */

const { Readable } = require("stream");
const { exec } = require('child_process');


const Puppeteer = require(".");
const frame2Video = require("../frame2Video");
const { getConfig } = require("../service");
const { extractVideoFrames } = require("../pixiUtils");
const { finalsPath } = require("../path");
const { print } = require("../utils");

(async () => {
    const tempPaths = [];

    const { data: rawConfig, downloadedData: config } = await getConfig();
    const videoFramesTempPath = await extractVideoFrames(config, 'png');

    tempPaths.push(videoFramesTempPath);

    const totalTimeStart = Date.now();
    const puppeteerLoadStart = Date.now();

    const puppeteer = new Puppeteer();
    const page = await puppeteer.init();
    await page.goto("http://localhost:3000/");

    console.log(`Time taken by puppeteer to load page ${Date.now() - puppeteerLoadStart} ms`);

    const reactRunStart = Date.now();

    /** wait for page to be ready to use react */
    await page.evaluate(function () {
        window.isHeadLess = true;
        return new Promise((resolve) => document.addEventListener('app-mounted', resolve));
    });

    console.log(`React init took ${Date.now() - reactRunStart} ms`);

    const assetsLoadStart = Date.now();

    /** Pass the media config to the application using window object  */
    await page.evaluate(function (payload) {
        window.onPayload(payload);

        return new Promise((resolve) => document.addEventListener('assets-loaded', resolve))
    }, rawConfig);

    print(`Time taken by puppeteer to load initial assets required - ${Date.now() - assetsLoadStart} ms`);


    const totalFrames = (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;
    let currentFrame = 1;
    const inputStream = new Readable({
        read: () => { }
    });
    let time = {
        draw: 0,
        extract: 0,
        total: Date.now(),
        communication: 0,
    };

    frame2Video(inputStream, config.videoProperties.frameRate, `${finalsPath}/output_pup_60s.mp4`).then(() => {
        print(`Total Time - ${Date.now() - totalTimeStart} ms`)
    });

    while (currentFrame <= totalFrames) {
        const communicationStart = Date.now();
        const { baseData, time: { drawTime, extractTime, communicationTime, communicationEnd } } = await page.evaluate(
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
                        resolve({ baseData: dataUrl, time: { drawTime, extractTime, communicationTime, communicationEnd } });

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
        const buffer = Buffer.from(baseData
            // .split('base64,')[1]
            , "base64");
        inputStream.push(buffer); // 0.15ms
        time.extract += (Date.now() - bufferCreationStart);

        currentFrame++;
    }

    time.total = Date.now() - time.total;
    print(`Processed ${totalFrames} frames.`);
    print(`Canvas drawing took ${time.total} ms. (Drawing - ${time.draw} ms) (Extract - ${time.extract} ms) (Communication - ${time.communication} ms)`);

    inputStream.push(null);
    await puppeteer.exit();

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();
