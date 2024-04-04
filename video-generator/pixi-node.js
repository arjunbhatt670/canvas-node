const { Image, ImageData } = require('canvas');
const Worker = require('worker_threads');

global.Worker = Worker.Worker;
global.Image = Image;
global.ImageData = ImageData

module.exports = require('@pixi/node');