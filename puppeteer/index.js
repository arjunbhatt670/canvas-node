const puppeteer = require("puppeteer");

module.exports = function Puppeteer() {
    /** @type {puppeteer.Browser} */
    this.browser;

    this.init = async () => {
        this.browser = await puppeteer.launch({
            dumpio: true,
            args: ['--enable-chrome-browser-cloud-management']
        });
        const page = await this.browser.newPage();
        page
            .on('console', message =>
                console.log(`${message.type().substr(0, 3).toUpperCase()} ${message.text()}`))

        return page;
    }

    this.exit = async () => {
        await this.browser.close()
    }
}