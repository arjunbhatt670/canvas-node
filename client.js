import "./index.css";


startButton.onclick = async () => {
    document.recordForPuppeteer = recordForPuppeteer;

    const blob = await recordCanvas(2000);
    myVideo.src = URL.createObjectURL(blob);
};

async function recordForPuppeteer(time) {
    const blob = await recordCanvas(time);
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

function recordCanvas(time) {
    return new Promise((res) => {
        const recordedChunks = [];

        const canvas = document.getElementById("canvas");
        canvas.width = 1200;
        canvas.height = 720;

        const stream = canvas.captureStream(30);

        const mediaRecorder = new window.MediaRecorder(stream, {
            mimeType: "video/webm; codecs=vp9",
        });

        mediaRecorder.ondataavailable = function (e) {
            recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = function () {
            var blob = new Blob(recordedChunks, {
                type: "video/webm",
            });
            res(blob);
        };

        let cx = canvas.getContext("2d");
        let frame = 0;
        const startTime = Date.now()

        const goXWise = () => {
            if (Date.now() - startTime > time) {
                mediaRecorder.stop();
                return;
            }
            cx.clearRect(0, 0, canvas.width, canvas.height);
            cx.fillStyle = "red";
            cx.fillRect(frame % canvas.width, 0, 50, 50);
            frame++;

            requestAnimationFrame(goXWise);
        };

        mediaRecorder.start(1000);
        goXWise();
    });
}
