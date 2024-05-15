import { print } from './general.js';

export default class TimeTracker {
  _totalTimeSpent: number;
  _pastTimeStamp: number;
  _isPaused: boolean;
  _isStarted: boolean;

  constructor() {
    this._totalTimeSpent = 0;
    this._pastTimeStamp = 0;
    this._isPaused = false;
    this._isStarted = false;
  }

  stampNow() {
    return Math.ceil(performance.now());
  }

  start() {
    this._pastTimeStamp = this.stampNow();
    this._totalTimeSpent = 0;
    this._isPaused = false;
    this._isStarted = true;
  }

  pause() {
    if (this._isStarted && !this._isPaused) {
      this._isPaused = true;
      this._totalTimeSpent += this.stampNow() - this._pastTimeStamp;
    }
  }

  resume() {
    if (this._isPaused && this._isStarted) {
      this._isPaused = false;
      this._pastTimeStamp = this.stampNow();
    }
  }

  finish() {
    if (this._isStarted) {
      this._isStarted = false;
    }
  }

  now() {
    if (!this._isStarted) return 0;

    if (this._isPaused) {
      return this._totalTimeSpent;
    }

    this._totalTimeSpent =
      this._totalTimeSpent + (this.stampNow() - this._pastTimeStamp);
    this._pastTimeStamp = this.stampNow();

    return this._totalTimeSpent;
  }

  log(message: string) {
    const time = this.now();
    print(`${message} - [${time} ms]`);
  }
}
