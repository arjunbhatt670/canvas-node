const fs = require('fs');
const path = require('path');
const https = require('https');

function downloadUrl(url, outputDir) {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(`Failed to download URL: ${url}`);
                return;
            }
            const fileName = path.basename(new URL(url).pathname);
            const filePath = path.join(outputDir, fileName);
            const fileStream = fs.createWriteStream(filePath);
            response.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve(filePath);
            });
        }).on('error', (err) => {
            reject(`Error downloading URL: ${url} - ${err}`);
        });
    });
}

async function processCss(cssObj, outputDir) {
    let updatedCss = cssObj;
    const urlRegex = /url\(['"]?([^'"\)]+)['"]?\)/g;
    const urls = Array.from(updatedCss.matchAll(urlRegex), match => match[1]);
    for (const url of urls) {
        if (url.startsWith('http')) {
            try {
                const filePath = await downloadUrl(url, outputDir);
                updatedCss = updatedCss.replace(url, filePath);
            } catch (err) {
                console.error(err);
            }
        }
    }
    return updatedCss;
}

// Example usage:
const cssObj = ``;

const outputDir = "downloaded_resources";
processCss(cssObj, outputDir)
    .then(updatedCss => {
        console.log(updatedCss);
    })
    .catch(err => {
        console.error(err);
    });
