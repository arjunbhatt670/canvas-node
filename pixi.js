const { Readable } = require('stream');
const { exec } = require('child_process');
const fs = require('fs');
const { JSDOM } = require('jsdom');

const PIXI = require('./pixi-node');
const frame2Video = require('./frame2Video');
const { getFramePath, Url, print, TimeTracker, asyncIterable } = require('./utils');
const { tmpDir, finalsPath } = require('./path');
const { getVisibleObjects, extractVideoFrames } = require('./pixiUtils');
const { getConfig } = require('./service');

(async () => {
    const tempPaths = [];
    const imgType = 'png';
    const timeTracker = new TimeTracker();
    const totalTimeTracker = new TimeTracker();

    const { downloadedData: config } = await getConfig();

    const videoFramesTempPath = await extractVideoFrames(config, imgType);

    tempPaths.push(videoFramesTempPath);

    totalTimeTracker.start();

    const shapeClips = config.tracks.map((track) => track.clips.map((clip) => clip.type === 'SHAPE_CLIP' ? clip : null)).flat(1).filter(Boolean);

    timeTracker.start();
    shapeClips.map((clip) => {
        const path = `${tmpDir}/${clip.id}.png`;
        tempPaths.push(path);
        fs.writeFileSync(path, Buffer.from(clip.shapeInfo.shapeMediaUrl.split('base64,')[1], 'base64url'))
    })
    timeTracker.log('Shapes extracted to file system');

    const imageClips = config.tracks.map((track) => track.clips.map((clip) => clip.type === 'IMAGE_CLIP' ? clip : null)).flat(1).filter(Boolean);

    timeTracker.start();
    imageClips.map((clip) => {
        const path = `${tmpDir}/${clip.id}.${Url(clip.sourceUrl).getExt()}`;
        tempPaths.push(path);
        fs.copyFileSync(clip.sourceUrl, path);
    })
    timeTracker.log('Images extracted to file system');


    const totalFrames = (config.videoProperties.duration * config.videoProperties.frameRate) / 1000;

    timeTracker.start();
    const app = new PIXI.Application({
        width: config.videoProperties.width,
        height: config.videoProperties.height,
        hello: true,
        antialias: true
    });
    timeTracker.log('Pixi Application initialized');

    app.renderer.background.color = '#ffffff';

    await PIXI.Assets.init({
        basePath: tmpDir,
        skipDetections: true
    });

    timeTracker.start();
    await PIXI.Assets.load(fs.readdirSync(tmpDir));
    timeTracker.log('Assets loaded in pixi cache');

    const inputStream = new Readable({
        read: () => { }
    });
    const statics = new Map();
    const loopTimeTracker = new TimeTracker();
    let time = {
        draw: 0,
        extract: 0,
    };

    const ffmpegTimeTracker = new TimeTracker();
    ffmpegTimeTracker.start();
    frame2Video(inputStream, config.videoProperties.frameRate, process.env.OUTPUT ?? `${finalsPath}/output_pixi_60s.mp4`).then(() => {
        ffmpegTimeTracker.log('[ffmpeg] Final video generated');
        totalTimeTracker.log('Total Time');
    });

    ffmpegTimeTracker.pause();
    loopTimeTracker.start();
    for await (const currentFrame of asyncIterable(totalFrames)) {
        timeTracker.start();
        const currentTime = ((currentFrame - 1) * 1000) / config.videoProperties.frameRate;
        const visibleClipsInFrame = getVisibleObjects(config, currentTime);

        const container = new PIXI.Container();
        app.stage = container;

        for (let clipIndex = 0; clipIndex < visibleClipsInFrame.length; clipIndex++) { // 5ms
            const clip = visibleClipsInFrame[clipIndex];
            const clipStartFrame = Math.round((clip.startOffSet * config.videoProperties.frameRate) / 1000);

            switch (clip.type) {
                case 'VIDEO_CLIP': {
                    try {
                        const videoFramePath = getFramePath({
                            frame: currentFrame - clipStartFrame,
                            format: imgType,
                            frameName: clip.id
                        });

                        const img = await PIXI.Assets.get(videoFramePath);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        container.addChild(sprite);
                    } catch (_err) {
                        /**  */
                    }

                    break;
                }

                case 'SHAPE_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {
                        const img = await PIXI.Assets.load(`${clip.id}.png`);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        statics.set(clip, sprite);
                        container.addChild(sprite);
                    }

                    break;
                }

                case 'IMAGE_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {
                        const img = await PIXI.Assets.load(`${clip.id}.${Url(clip.sourceUrl).getExt()}`);

                        const sprite = PIXI.Sprite.from(img);
                        sprite.x = clip.coordinates.x;
                        sprite.y = clip.coordinates.y;
                        sprite.width = clip.coordinates.width;
                        sprite.height = clip.coordinates.height;

                        statics.set(clip, sprite);
                        container.addChild(sprite);
                    }

                    break;
                }

                case 'TEXT_CLIP': {
                    if (statics.has(clip)) {
                        container.addChild(statics.get(clip));
                    } else {

                        const dom = new JSDOM(clip.htmlContent);
                        const elem = dom.window.document.body.getElementsByTagName('p')[0];
                        const textContent = elem.innerHTML;

                        const text = new PIXI.Text(textContent)

                        text.x = clip.coordinates.x;
                        text.y = clip.coordinates.y;
                        // text.width = clip.coordinates.width;
                        // text.height = clip.coordinates.height;

                        statics.set(clip, text);
                        container.addChild(text);
                    }

                    break;
                }
            }
        }

        app.render();

        time.draw += timeTracker.now();


        timeTracker.start();
        const baseData = app.view.toDataURL('image/jpeg', 1);  // 5ms
        const bufferData = Buffer.from(baseData
            // .split('base64,')[1]
            , 'base64');

        await new Promise((resolve) => {
            setTimeout(() => {
                inputStream.push(bufferData);
                resolve();
            })
        })

        time.extract += timeTracker.now();

        // fs.writeFileSync(`${rootPath}/pixiFrames/frame_${currentFrame}.jpeg`, baseData.split(';base64,').pop(), {
        //     encoding: 'base64'
        // })

    }

    inputStream.push(null);
    app.destroy();

    ffmpegTimeTracker.resume();
    print(`Processed ${totalFrames} frames.`);
    print(`Frames iteration took ${loopTimeTracker.now()} ms. (Drawing - ${time.draw} ms) (Extract - ${time.extract} ms)`);

    /** Remove temp files */
    tempPaths.forEach((path) => {
        exec(`rm -rf ${path}`);
    })
})();