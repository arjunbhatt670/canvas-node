const { downloadMedia } = require("./utils");

module.exports.getConfig = async function getConfig() {

    const mediaData = await fetch("http://localhost:5173/data60.json")
        .then((value) => value.json())

    const assetsDownloadStart = Date.now();
    const config = await downloadMedia(mediaData, true);
    console.log('Fetching media assets took', Date.now() - assetsDownloadStart, 'ms');

    return config;
}