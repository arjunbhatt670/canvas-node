/* eslint-disable no-undef */
const { JSDOM } = require('jsdom');

const jsDom = new JSDOM();
global.document = jsDom.window.document;
global.window = jsDom.window;

global.Node = window.Node;
global.navigator = window.navigator;