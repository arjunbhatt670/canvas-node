/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById("canvas");
canvas.width = 1200;
canvas.height = 720;

/** @type {HTMLVideoElement} */
let video;
/** @type {CanvasRenderingContext2D} */
let cx;

document.querySelector("#recordButton").onclick = async () => {
    const { blob, createdFramesCount } = await recordCanvas(10, 30);
    console.log("createdFramesCount", createdFramesCount);
    myVideo.src = URL.createObjectURL(blob);
};

function getCanvasPosition() {
    const rect = canvas.getBoundingClientRect();
    return {
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y,
    };
}

async function recordForPuppeteer(time, frameRate) {
    const { blob, createdFramesCount } = await recordCanvas(time, frameRate);
    return { dataURL: await getDataURL(blob), createdFramesCount };
}

function getDataURL(blob) {
    return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => res(reader.result);
        reader.onerror = () => rej("Error occurred while reading binary string");
    });
}

async function startDrawing(time, isFramesRequest) {
    let cx = canvas.getContext("2d");

    let frame = 0;
    const frameData = [];
    const startTime = Date.now();

    await new Promise((res) => {
        const goXWise = () => {
            if (Date.now() - startTime > time * 200) {
                res();
                return;
            }
            cx.clearRect(0, 0, canvas.width, canvas.height);
            cx.fillStyle = "red";
            cx.fillRect(frame % canvas.width, 0, 50, 50);
            frame++;

            if (isFramesRequest) {
                frameData.push(canvas.toDataURL("base64"));
            }

            requestAnimationFrame(goXWise);
        };

        goXWise();
    });

    await new Promise((res) => {
        const video = document.createElement("video");
        video.src = "./assets/inputVideo.mp4";
        video.play();

        video.addEventListener("canplaythrough", () => {
            function step() {
                if (Date.now() - startTime > time * 1000 + 200) {
                    video.pause();
                    res();
                    return;
                }
                cx.drawImage(video, 0, 0, 416, 240);
                cx.fillStyle = "red";
                cx.fillRect(frame % canvas.width, 290, 50, 50);
                frame++;

                if (isFramesRequest) {
                    frameData.push(canvas.toDataURL("base64", 100));
                }

                requestAnimationFrame(step);
            }
            step();
        });

        video.addEventListener("ended", () => {
            video.pause();
            res();
        });
    });

    if (isFramesRequest) {
        return frameData;
    }

    return frame;
}

/** @param {HTMLVideoElement}  video */
const updateVideoCurrentTime = async (video, newTime) => {
    video.currentTime = newTime;
    let seek;
    await new Promise((res) => {
        seek = () => {
            res();
        }
        video.addEventListener('seeked', seek);
    });

    video.removeEventListener('seeked', seek);
};


async function captureFrameNumber(frameNumber, frameRate) {
    const timeFrame = frameNumber / frameRate;

    let time = Date.now();

    await updateVideoCurrentTime(video, timeFrame);

    console.log('seek time', Date.now() - time, 'ms');
    time = Date.now();

    cx.drawImage(video, 0, 0)

    cx.fillStyle = "red";
    cx.fillRect(frameNumber % canvas.width, 290, 50, 50);

    console.log('draw time', Date.now() - time, 'ms');

}

// function startDrawingFrameWise(time, frameRate = 30) {
//     const cx = canvas.getContext("2d");
//     const frames = time * frameRate;

//     return new Promise(async (res) => {
//         let frame = 0;
//         const data = [];

//         const goXWise = () => {
//             cx.clearRect(0, 0, canvas.width, canvas.height);
//             cx.fillStyle = "red";
//             cx.fillRect(frame % canvas.width, 0, 50, 50);
//         };

//         while (frame < frames) {
//             goXWise();
//             frame++;
//             /** @type {Blob} */
//             const blob = await new Promise((res) => canvas.toBlob((blob) => res(blob)));
//             data.push(blob);
//         }

//         // const video = document.createElement('video');
//         // video.src = 'inputVideo.mp4';
//         // video.play();

//         // await new Promise((res) => {
//         //     video.addEventListener("play", () => {
//         //         async function step() {
//         //             if (frame >= frames) {
//         //                 video.pause();
//         //                 video.remove()
//         //                 res()
//         //                 return;
//         //             }
//         //             cx.drawImage(video, 0, 0, canvas.width, canvas.height);
//         //             frame++;
//         //             data.push(await new Promise((res) => canvas.toBlob((blob) => res(blob))));
//         //             requestAnimationFrame(step);
//         //         }
//         //         requestAnimationFrame(step);
//         //     })
//         // });

//         res(data);
//     });
// }

function recordCanvas(time, frameRate = 30) {
    return new Promise((res) => {
        const recordedChunks = [];
        let createdFramesCount;

        const stream = canvas.captureStream(frameRate);

        const mediaRecorder = new window.MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp9",
        });

        mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => {
            var blob = new Blob(recordedChunks, {
                type: "video/webm",
            });
            res({ blob, createdFramesCount });
        };

        mediaRecorder.start(1000);
        startDrawing(time).then((framesCount) => {
            createdFramesCount = framesCount;
            mediaRecorder.stop();
        });
    });
}

async function captureFramesFromCanvas(time) {
    const dataUrls = await startDrawing(time, true);
    const formData = new FormData();
    formData.append('sample', new Blob(dataUrls));
    formData.append('source', 'client');
    await fetch('http://localhost:3000/save?a=1', {
        method: 'POST',
        body: formData,
        headers: {
            'Access-Control-Allow-Origin': '*',
            // 'Content-type': 'application/json'
        },
    })
    // return dataUrls
}


function initCanvas() {
    cx = canvas.getContext("2d");
    video = document.createElement("video");
    video.src = "./assets/horses.mp4";
    video.width = 416
    video.height = 240
}
