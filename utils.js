const fs = require('fs');
const https = require('https');
const { join } = require('path');
const { PassThrough } = require('stream');
const crypto = require('crypto');
const ffmpeg = require("fluent-ffmpeg");
const { assetsPath } = require('./path');

async function downloadResource(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve());
      });
    });
    request.on('error', (err) => {
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
}

class PuppeteerMassScreenshots {
  async init(
    page,
    outputFolder,
    options = {}
  ) {
    const emptyFunction = async () => { };
    const defaultAfterWritingNewFile = async (filename) => console.log(`${filename} was written`);
    const runOptions = {
      beforeWritingImageFile: emptyFunction,
      afterWritingImageFile: defaultAfterWritingNewFile,
      beforeAck: emptyFunction,
      afterAck: emptyFunction,
      ...options
    }
    this.page = page;
    this.outputFolder = outputFolder;
    this.client = await this.page.target().createCDPSession();
    this.canScreenshot = true;
    this.inputStream = new PassThrough();
    this.client.on('Page.screencastFrame', async (frameObject) => {
      if (this.canScreenshot) {
        await runOptions.beforeWritingImageFile();
        this.inputStream.write(Buffer.from(frameObject.data, 'base64'))
        try {
          await runOptions.beforeAck();
          await this.client.send('Page.screencastFrameAck', { sessionId: frameObject.sessionId });
          await runOptions.afterAck();
        } catch (e) {
          this.canScreenshot = false;
        }
      }
    });
  }

  async writeImageFilename(data) {
    const filename = join(this.outputFolder, Date.now().toString() + '.jpg');
    await fs.promises.writeFile(filename, data, 'base64');
    return filename;
  }

  async start(options = {}) {
    const startOptions = {
      format: 'jpeg',
      quality: 100,
      maxWidth: 1920,
      maxHeight: 1080,
      everyNthFrame: 1,
      ...options
    };
    return this.client.send('Page.startScreencast', startOptions);
  }

  async stop() {
    return this.client.send('Page.stopScreencast');
  }

  async getData() {
    return await new Promise((res) => setTimeout(() => {
      this.inputStream.end();
      res(this.inputStream)
    }, 1000))
  }
}

const asyncIterable = (times, isMacro) => ({
  [Symbol.asyncIterator]() {
    let i = 1;
    return {
      next() {
        const done = i > times;
        const value = done ? undefined : i++;
        return isMacro ?
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({ value, done });
            })
          }) : Promise.resolve({ value, done });
      },
      return() {
        // This will be reached if the consumer called 'break' or 'return' early in the loop.
        return { done: true };
      },
    };
  },
});

const hashString = async (str) => {
  // Use SHA-256 hashing algorithm
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {Media} jsonData 
 * @returns {Promise<Media>}
 */
async function downloadMedia(jsonData, deepClone = true, noCache = false) {
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

/**
 * @param {string} media
 * @returns {Promise<ffmpeg.FfprobeStream[]>}
 */
function getStreams(media) {
  return new Promise((res, rej) =>
    ffmpeg.ffprobe(media, (err, data) => {
      if (!err) {
        res(data.streams)
      } else {
        rej(err)
      }
    }
    )
  )
}

function getFramePath({ frame = '%d', format, dir, frameName }) {
  return [dir, `${frameName}_frame%d.${format}`].filter(Boolean).join('/').replace('%d', frame)
}

const Url = (url) => ({
  getExt: () => /[^.]+$/.exec(url)[0],
  getFile: () => url.split('/').pop()
})

function TimeTracker() {
  this.timeSpent = 0;
  this.intermediatory = 0;
  this.isPaused = false;
  this.isStarted = false;

  this.start = () => {
    this.intermediatory = Date.now();
    this.timeSpent = 0;
    this.isPaused = false;
    this.isStarted = true;
  }

  this.pause = () => {
    if (this.isStarted && !this.isPaused) {
      this.isPaused = true;
      this.timeSpent += (Date.now() - this.intermediatory);
    }
  }

  this.resume = () => {
    if (this.isPaused && this.isStarted) {
      this.isPaused = false;
      this.intermediatory = Date.now();
    }
  }

  this.finish = () => {
    if (this.isStarted) {
      this.isStarted = false;
    }
  }

  this.now = () => {
    if (!this.isStarted) return 0;

    if (this.isPaused) {
      return this.timeSpent;
    }

    this.timeSpent = this.timeSpent + (Date.now() - this.intermediatory);
    this.intermediatory = Date.now();

    return this.timeSpent;
  }

  this.log = (msg) => {
    const time = this.now();
    print(`${msg} - [${time} ms]`)
  }
}

Function.prototype.myCall = function (obj, ...args) {
  const sym = Symbol();
  const obj2 = obj;
  obj2[sym] = this;
  obj2[sym](...args);
  delete obj2[sym];
}

Function.prototype.myApply = function (obj, args) {
  const sym = Symbol();
  obj[sym] = this;
  obj[sym](...args);
  delete obj[sym]
}

Function.prototype.myBind = function (obj, ...args) {
  return (...inArgs) => {
    const sym = Symbol();
    obj[sym] = this;
    obj[sym](...args, ...inArgs);
    delete obj[sym]
  };
}

Array.prototype.myMap = function (callback) {
  return this.reduce((acc, currentValue, index) => {
    acc.push(callback(currentValue, index));
    return acc;
  }, [])
}

Array.prototype.myReduceM = function (callback, initialValue) {
  let acc = initialValue;
  this.map((value, index) => {
    acc = callback(acc, value, index);
  });
  return acc;
}

Array.prototype.myReduceF = function (callback, initialValue) {
  let acc = initialValue;
  this.forEach((value, index) => {
    acc = callback(acc, value, index);
  });
  return acc;
}

Array.prototype.myForEach = function (callback) {
  this.map((value, index) => {
    callback(value, index);
  })
}


const print = (value) => process.stdout.write(value + '\n')

module.exports = {
  downloadResource,
  getFilesCountIn,
  PuppeteerMassScreenshots,
  asyncIterable,
  hashString,
  downloadMedia,
  getFramePath,
  Url,
  getStreams,
  print,
  TimeTracker
}