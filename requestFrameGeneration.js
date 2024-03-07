const { downloadMedia } = require("./utils");

(async () => {

    const mediaData = await fetch("http://localhost:5173/data60.json")
        .then((value) => value.json())

    const assetsDownloadStart = Date.now();
    const config = await downloadMedia(mediaData, true);
    console.log('Media assets download time', Date.now() - assetsDownloadStart, 'ms');

    let frameExtractionStart = Date.now();
    await fetch('http://localhost:8000/extract-video-frames', {
        method: 'POST',
        body: JSON.stringify({
            config
        }),
        headers: {
            "Content-Type": "application/json",
        },
    });

    console.log('Frame extraction time', Date.now() - frameExtractionStart, 'ms');
})();