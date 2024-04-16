import mergeVideos from "./mergeVideos";

if (!process.env.OUTPUT) {
  throw new ReferenceError("Please provide OUTPUT env variable");
}

mergeVideos(process.env.OUTPUT);
