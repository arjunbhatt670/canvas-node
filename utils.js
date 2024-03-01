const fs = require('fs');
const https = require('https');
const { join } = require('path');
const { Page } = require('puppeteer');
const { PassThrough } = require('stream');

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
    /** @type {Page} */
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

const asyncIterable = (times) => ({
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      next() {
        const done = i === times;
        const value = done ? undefined : i++;
        return Promise.resolve({ value, done });
      },
      return() {
        // This will be reached if the consumer called 'break' or 'return' early in the loop.
        return { done: true };
      },
    };
  },
});

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

module.exports = {
  downloadResource,
  getFilesCountIn,
  PuppeteerMassScreenshots,
  asyncIterable
}