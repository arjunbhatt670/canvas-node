import "./index.css";

/**
 * @type {HTMLCanvasElement}
 */
const canvas = document.getElementById("canvas");
canvas.width = 500;
canvas.height = 400;

recordButton.onclick = async () => {
    const blob = await recordCanvas(100, 30);
    myVideo.src = URL.createObjectURL(blob);
};

recordButtonPuppeteer.onclick = () => {
    document.recordForPuppeteer = recordForPuppeteer;
};

frameCaptureButtonPuppeteer.onclick = () => {
    document.frameCaptureForPuppeteer = captureFramesFromCanvas;
};

screencastButtonPuppeteer.onclick = () => {
    document.getCanvasPosition = () => {
        const rect = canvas.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height,
            x: rect.x,
            y: rect.y
        }

    }

    document.startDrawing = startDrawing
}

async function recordForPuppeteer(time, frameRate) {
    const blob = await recordCanvas(time, frameRate);
    return await getDataURL(blob);
}

function getDataURL(blob) {
    return new Promise(async (res, rej) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = () => res(reader.result);
        reader.onerror = () => rej("Error occurred while reading binary string");
    });
}

function startDrawing(time) {


    let cx = canvas.getContext("2d");

    return new Promise((res) => {
        let frame = 0;
        const startTime = Date.now();

        const goXWise = () => {
            if (Date.now() - startTime > time) {
                res();
                return;
            }
            cx.clearRect(0, 0, canvas.width, canvas.height);
            cx.fillStyle = "red";
            cx.fillRect(frame % canvas.width, 0, 50, 50);
            frame++;

            requestAnimationFrame(goXWise);
        };

        goXWise();
    });
}

function startDrawingFrameWise(time, frameRate = 30) {
    const cx = canvas.getContext("2d");
    const frames = time * frameRate;

    return new Promise(async (res) => {
        let frame = 0;
        const data = []

        const goXWise = () => {
            cx.clearRect(0, 0, canvas.width, canvas.height);
            cx.fillStyle = "red";
            cx.fillRect(frame % canvas.width, 0, 50, 50);
        };

        while (frame < frames) {
            goXWise();
            frame++;
            /** @type {Blob} */
            const blob = await new Promise((res) => canvas.toBlob((blob) => res(blob)));
            data.push(blob);
        }

        // const video = document.createElement('video');
        // video.src = 'inputVideo.mp4';
        // video.play();

        // await new Promise((res) => {
        //     video.addEventListener("play", () => {
        //         function step() {
        //             console.log('frame', frame)
        //             if (frame >= frames) {
        //                 video.remove()
        //                 res()
        //                 return;
        //             }
        //             cx.drawImage(video, canvas.width - 100, canvas.height - 100, 100, 100);
        //             frame++;
        //             canvas.toBlob((blob) => data.push(blob))
        //             requestAnimationFrame(step);
        //         }
        //         requestAnimationFrame(step);
        //     })
        // });

        res(data);
    });
}

function recordCanvas(time, frameRate = 30) {
    return new Promise(async (res) => {
        const recordedChunks = [];

        const stream = canvas.captureStream(frameRate);

        const mediaRecorder = new window.MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp9",
        });

        mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
        mediaRecorder.onstop = () => {
            var blob = new Blob(recordedChunks, {
                type: "video/webm",
            });
            res(blob);
        };

        mediaRecorder.start(1000);
        await startDrawing(time);
        mediaRecorder.stop();
    });
}

async function captureFramesFromCanvas(time, frameRate) {
    /** @type {Blob[]} */
    const blobs = await startDrawingFrameWise(time, frameRate);

    const dataUrls = await Promise.all(blobs.map((blob) => getDataURL(blob)));

    return dataUrls;

}
