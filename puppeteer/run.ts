import createVideoPuppeteer from "./frameCapture";

if (!process.env.OUTPUT) {
  throw new ReferenceError("Please provide OUTPUT env variable");
}

createVideoPuppeteer(process.env.OUTPUT);
