// @ts-nocheck
import fs from "fs";
import https from "https";
import { join } from "path";
import { PassThrough } from "stream";
import crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { execSync } from "child_process";

import { assetsPath } from "#root/path";

async function downloadResource(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      response.pipe(file);
      file.on("finish", () => {
        file.close(() => resolve());
      });
    });
    request.on("error", (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

const getFilesCountIn = (dir) => {
  fs.readdir(dir, (error, files) => {
    if (error) {
      console.log(error);
    } else {
      console.log(`files count in ${dir}`, files.length);
    }
  });
};

class PuppeteerMassScreenshots {
  async init(page, outputFolder, options = {}) {
    const emptyFunction = async () => {};
    const defaultAfterWritingNewFile = async (filename) =>
      console.log(`${filename} was written`);
    const runOptions = {
      beforeWritingImageFile: emptyFunction,
      afterWritingImageFile: defaultAfterWritingNewFile,
      beforeAck: emptyFunction,
      afterAck: emptyFunction,
      ...options,
    };
    this.page = page;
    this.outputFolder = outputFolder;
    this.client = await this.page.target().createCDPSession();
    this.canScreenshot = true;
    this.inputStream = new PassThrough();
    this.client.on("Page.screencastFrame", async (frameObject) => {
      if (this.canScreenshot) {
        await runOptions.beforeWritingImageFile();
        this.inputStream.write(Buffer.from(frameObject.data, "base64"));
        try {
          await runOptions.beforeAck();
          await this.client.send("Page.screencastFrameAck", {
            sessionId: frameObject.sessionId,
          });
          await runOptions.afterAck();
        } catch (e) {
          this.canScreenshot = false;
        }
      }
    });
  }

  async writeImageFilename(data) {
    const filename = join(this.outputFolder, Date.now().toString() + ".jpg");
    await fs.promises.writeFile(filename, data, "base64");
    return filename;
  }

  async start(options = {}) {
    const startOptions = {
      format: "jpeg",
      quality: 100,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1,
      ...options,
    };
    return this.client.send("Page.startScreencast", startOptions);
  }

  async stop() {
    return this.client.send("Page.stopScreencast");
  }

  async getData() {
    return await new Promise((res) =>
      setTimeout(() => {
        this.inputStream.end();
        res(this.inputStream);
      }, 1000)
    );
  }
}

const asyncIterable = (times, isMacro) => ({
  [Symbol.asyncIterator]() {
    let i = 1;
    return {
      next() {
        const done = i > times;
        const value = done ? undefined : i++;
        return isMacro
          ? new Promise((resolve) => {
              setTimeout(() => {
                resolve({ value, done });
              });
            })
          : Promise.resolve({ value, done });
      },
      return() {
        // This will be reached if the consumer called 'break' or 'return' early in the loop.
        return Promise.resolve({ value: i, done: true });
      },
    };
  },
});

const hashString = async (str) => {
  // Use SHA-256 hashing algorithm
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

async function downloadMedia(
  jsonData: Media,
  deepClone = true,
  noCache = false
): Promise<Media> {
  const data = deepClone ? structuredClone(jsonData) : jsonData;
  for (const track of data.tracks) {
    for (const clip of track.clips) {
      if (clip.sourceUrl) {
        const fileName = `${clip.id}.${Url(clip.sourceUrl).getExt()}`; // Change file extension based on resource type
        const filePath = `${assetsPath}/${fileName}`;
        if (!fs.existsSync(filePath) || noCache) {
          await downloadResource(clip.sourceUrl, filePath);
        }
        clip.sourceUrl = filePath;
      }
    }
  }

  return data;
}

function getStreams(media: string): Promise<ffmpeg.FfprobeStream[]> {
  return new Promise((res, rej) =>
    ffmpeg.ffprobe(media, (err, data) => {
      if (!err) {
        res(data.streams);
      } else {
        rej(err);
      }
    })
  );
}

const Url = (url) => ({
  getExt: () => /[^.]+$/.exec(url)[0],
  getFile: () => url.split("/").pop(),
});

class TimeTracker {
  constructor() {
    this.timeSpent = 0;
    this.intermediatory = 0;
    this.isPaused = false;
    this.isStarted = false;
  }

  stampNow() {
    return Math.ceil(performance.now());
  }

  start() {
    this.intermediatory = this.stampNow();
    this.timeSpent = 0;
    this.isPaused = false;
    this.isStarted = true;
  }

  pause() {
    if (this.isStarted && !this.isPaused) {
      this.isPaused = true;
      this.timeSpent += this.stampNow() - this.intermediatory;
    }
  }

  resume() {
    if (this.isPaused && this.isStarted) {
      this.isPaused = false;
      this.intermediatory = this.stampNow();
    }
  }

  finish() {
    if (this.isStarted) {
      this.isStarted = false;
    }
  }

  now() {
    if (!this.isStarted) return 0;

    if (this.isPaused) {
      return this.timeSpent;
    }

    this.timeSpent = this.timeSpent + (this.stampNow() - this.intermediatory);
    this.intermediatory = this.stampNow();

    return this.timeSpent;
  }

  log(msg) {
    const time = this.now();
    print(`${msg} - [${time} ms]`);
  }
}

Function.prototype.myCall = function (obj, ...args) {
  const sym = Symbol();
  const obj2 = obj;
  obj2[sym] = this;
  obj2[sym](...args);
  delete obj2[sym];
};

Function.prototype.myApply = function (obj, args) {
  const sym = Symbol();
  obj[sym] = this;
  obj[sym](...args);
  delete obj[sym];
};

Function.prototype.myBind = function (obj, ...args) {
  return (...inArgs) => {
    const sym = Symbol();
    obj[sym] = this;
    obj[sym](...args, ...inArgs);
    delete obj[sym];
  };
};

Array.prototype.myMap = function (callback) {
  return this.reduce((acc, currentValue, index) => {
    acc.push(callback(currentValue, index));
    return acc;
  }, []);
};

Array.prototype.myReduceM = function (callback, initialValue) {
  let acc = initialValue;
  this.map((value, index) => {
    acc = callback(acc, value, index);
  });
  return acc;
};

Array.prototype.myReduceF = function (callback, initialValue) {
  let acc = initialValue;
  this.forEach((value, index) => {
    acc = callback(acc, value, index);
  });
  return acc;
};

Array.prototype.myForEach = function (callback) {
  this.map((value, index) => {
    callback(value, index);
  });
};

const print = (...value) =>
  process.stdout.write(
    `[${process.env.start || "master"}] ${value.join(" ")}\n`
  );

const getMediaMetaData = (path: string) =>
  new Promise((res) => {
    ffmpeg.ffprobe(path, function (err, metadata) {
      res(metadata.format);
    });
  });

const writeFileIntoText = (fromDir: string, textFilePath: string) => {
  const files = execSync(`ls ${fromDir}/* | sort -V`)
    .toString()
    .trim()
    .split("\n");

  const stream = fs.createWriteStream(textFilePath);
  files.forEach((file) => {
    stream.write(`file '${file}'\n`);
  });
  stream.end();

  print(`${textFilePath} has been generated successfully.`);
};

const handleProcessExit = (cb: Function) => {
  // process.stdin.resume(); // so the program will not close instantly

  function exitHandler(options, exitCode) {
    cb(options, exitCode);
    if (options.cleanup) print("clean");
    if (exitCode || exitCode === 0) print(exitCode);
    if (options.exit) process.exit();
  }

  // do something when app is closing
  process.on("exit", exitHandler.bind(null, { cleanup: true }));

  // catches ctrl+c event
  process.on("SIGINT", exitHandler.bind(null, { exit: true }));

  // catches "kill pid" (for example: nodemon restart)
  process.on("SIGUSR1", exitHandler.bind(null, { exit: true }));
  process.on("SIGUSR2", exitHandler.bind(null, { exit: true }));

  // catches uncaught exceptions
  process.on("uncaughtException", exitHandler.bind(null, { exit: true }));
};

export {
  downloadResource,
  getFilesCountIn,
  PuppeteerMassScreenshots,
  asyncIterable,
  hashString,
  downloadMedia,
  Url,
  getStreams,
  print,
  TimeTracker,
  getMediaMetaData,
  writeFileIntoText,
  handleProcessExit,
};
