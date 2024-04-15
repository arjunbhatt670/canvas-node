import createVideo from "./createVideo";

if (!process.env.OUTPUT) {
  throw new ReferenceError("Please provide OUTPUT env variable");
}

createVideo(process.env.OUTPUT);
