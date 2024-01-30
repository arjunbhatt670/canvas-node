'use strict';

var canvasModule = require('canvas');
var assets = require('@pixi/assets');
var core = require('@pixi/core');

const { registerFont } = canvasModule;
const validWeights = [
  "normal",
  "bold",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900"
];
const validFonts = [".woff", ".woff2", ".ttf", ".otf"];
const loadNodeFont = {
  extension: core.ExtensionType.LoadParser,
  test(url) {
    return validFonts.includes(core.utils.path.extname(url).toLowerCase());
  },
  async load(url, options) {
    const name = options.data?.family ?? assets.getFontFamilyName(url);
    const weights = options.data?.weights?.filter((weight) => validWeights.includes(weight)) ?? ["normal"];
    const data = options.data ?? {};
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      registerFont(url, {
        ...data,
        family: options.data?.family ?? name,
        weight
      });
    }
  }
};
core.extensions.add(loadNodeFont);

exports.loadNodeFont = loadNodeFont;
//# sourceMappingURL=loadNodeFont.js.map
