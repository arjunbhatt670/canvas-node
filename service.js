const { downloadMedia, TimeTracker } = require("./utils");

const apiURL = "http://localhost:5173";

module.exports.getConfig = async function getConfig() {

    const data = await fetch(`${apiURL}/data60.json`)
        .then((value) => value.json())

    const timeTracker = new TimeTracker();
    timeTracker.start();
    const downloadedData = await downloadMedia(data);
    timeTracker.log('Fetched media assets');

    return { data, downloadedData };
}