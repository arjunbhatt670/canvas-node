import canvasModule from 'canvas';
import { Request, fetch, Response } from 'cross-fetch';
import fs from 'fs';
import { WebGLRenderingContext } from 'gl';
import { settings, utils } from '@pixi/core';
export { settings } from '@pixi/core';
import { NodeCanvasElement } from './NodeCanvasElement.mjs';
import { DOMParser } from '@xmldom/xmldom';

const NodeAdapter = {
  /**
   * Creates a canvas element of the given size.
   * This canvas is created using the node-canvas package and uses the gl package to create a webgl context.
   * @param width - width of the canvas
   * @param height - height of the canvas
   */
  createCanvas: (width, height) => new NodeCanvasElement(width, height),
  getCanvasRenderingContext2D: () => canvasModule.CanvasRenderingContext2D,
  /** Returns a WebGL rendering context using the gl package. */
  getWebGLRenderingContext: () => WebGLRenderingContext,
  /** Returns the fake user agent string of `node` */
  getNavigator: () => ({ userAgent: "node" }),
  /** Returns the path from which the process is being run */
  getBaseUrl: () => process.cwd(),
  getFontFaceSet: () => null,
  fetch: (url, options) => {
    const request = new Request(url, options);
    if (utils.path.isUrl(request.url)) {
      return fetch(url, request);
    }
    return new Promise((resolve, reject) => {
      const rawPath = typeof url === "string" ? url : decodeURI(request.url);
      const filePath = utils.path.normalize(rawPath);
      if (!fs.existsSync(filePath)) {
        reject(`File not found: ${filePath}`);
      }
      const readStream = fs.createReadStream(filePath);
      readStream.on("open", () => {
        resolve(new Response(readStream, {
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
    const parser = new DOMParser();
    return parser.parseFromString(xml, "text/xml");
  }
};
settings.ADAPTER = NodeAdapter;

export { NodeAdapter };
//# sourceMappingURL=adapter.mjs.map
