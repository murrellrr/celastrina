/*
 * Copyright (c) 2021, KRI, LLC.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
/**
 * @author Robert R Murrell
 * @copyright Robert R Murrell
 * @license MIT
 */
"use strict";
const moment = require("moment");
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration, Context, BaseFunction} = require("@celastrina/core");
/**
 * @typedef _AzureTimerScheduleStatus
 * @property {string} last
 * @property {string} lastUpdated
 * @property {string} next
 */
/**
 * @typedef _AzureTimerSchedule
 * @property {_AzureTimerScheduleStatus} scheduleStatus
 */
/**
 * @typedef {_AzureFunctionContext} _AzureTimerContext
 * @property {_AzureTimerSchedule} tick
 * @property {boolean} isPastDue
 */
/**
 * TimerContext
 * @author Robert R Murrell
 */
class TimerContext extends Context {
       /**
        * @param {Configuration} config
        */
       constructor(config) {
              super(config);
       }
       /**@returns{boolean}*/get isPastDue() {return this._config.context.isPastDue;}
       /**@returns{moment.Moment}*/get lastRun() {return moment(this._config.context.scheduleStatus.last)}
       /**@returns{moment.Moment}*/get lastUpdated() {return moment(this._config.context.scheduleStatus.lastUpdated);}
       /**@returns{moment.Moment}*/get nextRun() {return moment(this._config.context.scheduleStatus.next);}
}
/**
 * TimerFunction
 * @author Robert R Murrell
 * @abstract
 */
class TimerFunction extends BaseFunction {
       /**@param{Configuration}configuration*/
       constructor(configuration) {
              super(configuration);
       }
       /**
        * @param {Configuration} config
        * @returns {Promise<TimerContext>}
        */
       async createContext(config) {
              new TimerContext(config);
       }
       /**
        * @param {TimerContext} context
        * @returns {Promise<void>}
        * @private
        */
       async _tick(context) {
              context.log("Not implemented.", LOG_LEVEL.VERBOSE, "Timer._tick(context)");
              throw CelastrinaError.newError("Not Implemented.", 501);
       }
       /**
        * @param {Context|TimerContext} context
        * @returns {Promise<void>}
        */
       async process(context) {
              return this._tick(context);
       }
}
module.exports = {
       TimerContext: TimerContext,
       TimerFunction: TimerFunction
};
