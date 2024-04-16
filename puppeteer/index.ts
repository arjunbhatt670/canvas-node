import puppeteer, { type Browser } from "puppeteer";

export default class Puppeteer {
  browser: Browser | undefined;

  async init() {
    this.browser = await puppeteer.launch({
      dumpio: true,
      args: [
        "--enable-chrome-browser-cloud-management",
        "--disable-web-security",
      ],
      debuggingPort: 9119,
      devtools: false,
    });
    const page = await this.browser.newPage();
    page.on("console", (message) => {
      const type = message.type();
      if (["log", "info", "error"].includes(type)) {
        console.log(`${type.substring(0, 3).toUpperCase()} ${message.text()}`);
      }
    });

    return page;
  }

  async exit() {
    await this.browser?.close();
  }
}
