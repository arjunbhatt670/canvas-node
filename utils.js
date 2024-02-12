const fs = require('fs');
const https = require('https');
const { join } = require('path');
const { Page } = require('puppeteer');
const { PassThrough } = require('stream');
const emptyFunction = async () => { };
const defaultAfterWritingNewFile = async (filename) => console.log(`${filename} was written`);

async function downloadVideo(url, dest) {
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


module.exports = {
  downloadVideo,
  getFilesCountIn,
  PuppeteerMassScreenshots
}
