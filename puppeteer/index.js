const puppeteer = require("puppeteer");

module.exports = function Puppeteer() {
    /** @type {puppeteer.Browser} */
    this.browser;

    this.init = async () => {
        this.browser = await puppeteer.launch({
            dumpio: true,
            args: ['--enable-chrome-browser-cloud-management', '--disable-web-security',]
        });
        const page = await this.browser.newPage();
        page
            .on('console', message => {
                const type = message.type();
                if (['log', 'info', 'error'].includes(type)) {
                    console.log(`${type.substring(0, 3).toUpperCase()} ${message.text()}`);
                }
            })

        return page;
    }

    this.exit = async () => {
        await this.browser.close()
    }
}