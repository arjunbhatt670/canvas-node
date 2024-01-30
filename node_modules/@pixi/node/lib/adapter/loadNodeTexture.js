'use strict';

var canvasModule = require('canvas');
var core = require('@pixi/core');
var NodeCanvasElement = require('./NodeCanvasElement.js');

const { loadImage } = canvasModule;
const validImages = [".jpg", ".png", ".jpeg", ".svg"];
const loadNodeTexture = {
  extension: core.ExtensionType.LoadParser,
  test(url) {
    return validImages.includes(core.utils.path.extname(url).toLowerCase());
  },
  async load(url, asset) {
    const data = await core.settings.ADAPTER.fetch(url);
    const image = await loadImage(Buffer.from(await data.arrayBuffer()));
    const canvas = new NodeCanvasElement.NodeCanvasElement(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx?.drawImage(image, 0, 0);
    const texture = core.Texture.from(canvas, {
      resolution: core.utils.getResolutionOfUrl(url),
      ...asset.data
    });
    return texture;
  },
  unload(texture) {
    texture.destroy(true);
  }
};
core.extensions.add(loadNodeTexture);

exports.loadNodeTexture = loadNodeTexture;
//# sourceMappingURL=loadNodeTexture.js.map
