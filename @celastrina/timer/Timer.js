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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration, Context, BaseFunction,
	   CelastrinaEvent, AddOn} = require("@celastrina/core");
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
 * TickEvent
 * @author Robert R Murrell
 */
class TickEvent extends CelastrinaEvent {
	constructor(context, source = null, data = null, time = moment(), rejected = false,
	            cause = null) {
		super(context, source, data, time, rejected, cause);
	}
	/**@returns{boolean}*/get isPastDue() {return this._context.azureFunctionContext.bindings.tick.isPastDue;}
	/**@returns{moment.Moment}*/get lastRun() {return moment(this._context.azureFunctionContext.bindings.tick.schedule.scheduleStatus.last)}
	/**@returns{moment.Moment}*/get lastUpdated() {return moment(this._context.azureFunctionContext.bindings.tick.schedule.scheduleStatus.lastUpdated);}
	/**@returns{moment.Moment}*/get nextRun() {return moment(this._context.azureFunctionContext.bindings.tick.schedule.scheduleStatus.next);}
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
	 * @param {TickEvent} event
	 * @returns {Promise<void>}
	 * @abstract
	 */
	async onTick(event) {throw CelastrinaError.newError("Not Implemented.", 501);}
	/**
	 * @param {TickEvent} event
	 * @returns {Promise<void>}
	 */
	async onReject(event) {};
	/**
	 * @param {Context} context
	 * @returns {Promise<void>}
	 */
	async process(context) {
		/**@type{TimerAddOn}*/let _addon = /**@type{TimerAddOn}*/context.config.getAddOn(TimerAddOn);
		let _tick = new TickEvent(context, this);
		if(_tick.isPastDue && _addon.rejectOnPastDue)
			await this.onReject(_tick);
		else {
			await this.onTick(_tick);
			if(_tick.isRejected) {
				context.log("", LOG_LEVEL.ERROR, "TimerFunction.process(context)");
				await this.onReject(_tick);
			}
		}
	}
}
/**
 * TimerAddOn
 * @author Robert R Murrell
 */
class TimerAddOn extends AddOn {
	/**@return{string}*/static get addOnName() {return "celastrinajs.timer.addon.timer";}
	constructor(rejectOnPastDue = false) {
		super();
		/**@type{boolean}*/this._rejectOnPastDue = rejectOnPastDue;
	}
	/**@return{boolean}*/get rejectOnPastDue() {return this._rejectOnPastDue;}
	/**@param{boolean}rejectOnPastDue*/set rejectOnPastDue(rejectOnPastDue) {this._rejectOnPastDue = rejectOnPastDue;}
	/**
	 * @param {boolean} rejectOnPastDue
	 * @return {TimerAddOn}
	 */
	setRejectOnPastDue(rejectOnPastDue) {
		this._rejectOnPastDue = rejectOnPastDue;
		return this;
	}
}
module.exports = {
	TickEvent: TickEvent,
	TimerAddOn: TimerAddOn,
	TimerFunction: TimerFunction
};
