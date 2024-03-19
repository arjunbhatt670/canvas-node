const { downloadMedia } = require("./utils");

const apiURL = "http://localhost:5173";

module.exports.getConfig = async function getConfig() {

    const data = await fetch(`${apiURL}/data60.json`)
        .then((value) => value.json())

    const assetsDownloadStart = Date.now();
    const downloadedData = await downloadMedia(data);
    console.log('Fetching media assets took', Date.now() - assetsDownloadStart, 'ms');

    return { data, downloadedData };
}