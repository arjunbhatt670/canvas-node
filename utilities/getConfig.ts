import { downloadMedia, TimeTracker } from "./grains";

const apiURL = "http://localhost:5173";

export default async function getConfig() {
  const data = await fetch(`${apiURL}/config.json`).then((value) =>
    value.json()
  );

  const timeTracker = new TimeTracker();
  timeTracker.start();
  const downloadedData = await downloadMedia(data);
  timeTracker.log("Fetched media assets");

  return { data, downloadedData };
}
