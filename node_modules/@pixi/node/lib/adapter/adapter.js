'use strict';

var canvasModule = require('canvas');
var crossFetch = require('cross-fetch');
var fs = require('fs');
var createGLContext = require('gl');
var core = require('@pixi/core');
var NodeCanvasElement = require('./NodeCanvasElement.js');
var xmldom = require('@xmldom/xmldom');

const NodeAdapter = {
  /**
   * Creates a canvas element of the given size.
   * This canvas is created using the node-canvas package and uses the gl package to create a webgl context.
   * @param width - width of the canvas
   * @param height - height of the canvas
   */
  createCanvas: (width, height) => new NodeCanvasElement.NodeCanvasElement(width, height),
  getCanvasRenderingContext2D: () => canvasModule.CanvasRenderingContext2D,
  /** Returns a WebGL rendering context using the gl package. */
  getWebGLRenderingContext: () => createGLContext.WebGLRenderingContext,
  /** Returns the fake user agent string of `node` */
  getNavigator: () => ({ userAgent: "node" }),
  /** Returns the path from which the process is being run */
  getBaseUrl: () => process.cwd(),
  getFontFaceSet: () => null,
  fetch: (url, options) => {
    const request = new crossFetch.Request(url, options);
    if (core.utils.path.isUrl(request.url)) {
      return crossFetch.fetch(url, request);
    }
    return new Promise((resolve, reject) => {
      const rawPath = typeof url === "string" ? url : decodeURI(request.url);
      const filePath = core.utils.path.normalize(rawPath);
      if (!fs.existsSync(filePath)) {
        reject(`File not found: ${filePath}`);
      }
      const readStream = fs.createReadStream(filePath);
      readStream.on("open", () => {
        resolve(new crossFetch.Response(readStream, {
          url: request.url,
          status: 200,
          statusText: "OK",
          size: fs.statSync(filePath).size,
          timeout: request.timeout
        }));
      });
    });
  },
  parseXML: (xml) => {
    const parser = new xmldom.DOMParser();
    return parser.parseFromString(xml, "text/xml");
  }
};
core.settings.ADAPTER = NodeAdapter;

Object.defineProperty(exports, 'settings', {
    enumerable: true,
    get: function () { return core.settings; }
});
exports.NodeAdapter = NodeAdapter;
//# sourceMappingURL=adapter.js.map
