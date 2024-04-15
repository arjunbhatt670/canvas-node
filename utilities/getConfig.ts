import { downloadMedia, TimeTracker } from "./grains";

const apiURL = "http://localhost:5173";

export default async function getConfig() {
  const timeTracker = new TimeTracker();
  timeTracker.start();
  const data = await fetch(`${apiURL}/shape_video.json`).then((value) =>
    value.json()
  );

  const downloadedData = await downloadMedia(data);
  timeTracker.log("Fetched media assets");

  return { data, downloadedData };
}
