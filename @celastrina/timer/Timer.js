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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, JsonProperty, Configuration,
       BaseContext, BaseFunction} = require("@celastrina/core");

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
 * @type {BaseFunction}
 */
class TimerContext extends BaseContext {
       /**
        * @param {_AzureTimerContext} azcontext
        * @param {Configuration} config
        */
       constructor(azcontext, config) {
              super(azcontext, config);
              let tick = azcontext.bindings.tick;
              /**@type{moment.Moment}*/this._lastRun = moment(tick.scheduleStatus.last);
              /**@type{moment.Moment}*/this._lastUpdated = moment(tick.scheduleStatus.lastUpdated);
              /**@type{moment.Moment}*/this._nextRun = moment(tick.scheduleStatus.next);
              /**@type{boolean}*/this._isPastDue = tick.isPastDue;
       }
       /**@returns{boolean}*/get isPastDue() {return this._isPastDue;}
       /**@returns{moment.Moment}*/get lastRun() {return this._lastRun;}
       /**@returns{moment.Moment}*/get lastUpdated() {return this._lastUpdated;}
       /**@returns{moment.Moment}*/get nextRun() {return this._nextRun;}
}
/**
 * @type {BaseFunction}
 * @abstract
 */
class TimerFunction extends BaseFunction {
       /**@param{Configuration}configuration*/
       constructor(configuration) {super(configuration);}
       /**
        * @param {_AzureFunctionContext | _AzureTimerContext} context
        * @param {Configuration} config
        * @returns {Promise<BaseContext & HTTPContext>}
        */
       async createContext(context, config) {
              return new Promise((resolve, reject) => {
                     try {
                            resolve(new TimerContext(context, config));
                     }
                     catch(exception) {
                            reject(exception);
                     }
              });
       }
       /**
        * @param {TimerContext} context
        * @returns {Promise<void>}
        * @private
        */
       async _tick(context) {
              return new Promise((resolve, reject) => {
                     context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "Timer._tick(context)");
                     reject(CelastrinaError.newError("Not Implemented.", 501));
              });
       }
       /**
        * @param {BaseContext | TimerContext} context
        * @returns {Promise<void>}
        */
       async process(context) {
              return new Promise((resolve, reject) => {
                     this._tick(context)
                         .then(() => {
                                resolve();
                         })
                         .catch((exception) => {
                                reject(exception);
                         });
              });
       }
}

module.exports = {
       TimerContext: TimerContext, TimerFunction: TimerFunction
};
