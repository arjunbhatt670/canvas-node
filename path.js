const { resolve } = require('path');

const rootPath = resolve('./');

module.exports = {
    rootPath,
    tmpDir: `${rootPath}/intermediates`
};