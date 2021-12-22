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
	   CelastrinaEvent, AddOn, ConfigParser, instanceOfCelastringType
} = require("@celastrina/core");
/**
 * TickEvent
 * @author Robert R Murrell
 */
class TickEvent extends CelastrinaEvent {
	/**@return{string}*/static get celastrinaType() {return "celastrinajs.timer.TickEvent";}
	/**
	 * @param {Context} context
	 * @param {*} [source=null]
	 * @param {boolean} [rejected=false]
	 * @param {*} [cause=null]
	 * @param {*} [data=null]
	 * @param {moment.Moment} [time=moment()]
	 */
	constructor(context, source = null, rejected = false, cause = null, data = null,
	            time = moment()) {
		super(context, source, data, time, rejected, cause);
	}
	/**@returns{boolean}*/get isPastDue() {return this._context.azureFunctionContext.bindings.tick.isPastDue;}
	/**@returns{moment.Moment}*/get lastRun() {return moment(this._context.azureFunctionContext.bindings.tick.scheduleStatus.last)}
	/**@returns{moment.Moment}*/get lastUpdated() {return moment(this._context.azureFunctionContext.bindings.tick.scheduleStatus.lastUpdated);}
	/**@returns{moment.Moment}*/get nextRun() {return moment(this._context.azureFunctionContext.bindings.tick.scheduleStatus.next);}
}
/**
 * TimerFunction
 * @author Robert R Murrell
 * @abstract
 */
class TimerFunction extends BaseFunction {
	/**@return{string}*/static get celastrinaType() {return "celastrinajs.timer.TimerFunction";}
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
	async onReject(event) {} // Override to do something
	/**
	 * @param {TickEvent} event
	 * @returns {Promise<void>}
	 */
	async onAbort(event) {} // Override to do something
	async exception(context, exception) {
		/**@type{null|Error|CelastrinaError|*}*/let ex = exception;
		if(instanceOfCelastringType(/**@type{Class}*/CelastrinaValidationError, ex))
			context.done(ex);
		else if(instanceOfCelastringType(/**@type{Class}*/CelastrinaError, ex))
			context.done(ex);
		else if(ex instanceof Error) {
			ex = CelastrinaError.wrapError(ex);
			context.done(ex);
		}
		else if(typeof ex === "undefined" || ex == null) {
			ex = CelastrinaError.newError("Unhandled server error.");
			context.done(ex);
		}
		else {
			ex = CelastrinaError.wrapError(ex);
			context.done(ex);
		}
		context.log("Request failed to process. \r\n (MESSAGE: " + ex.message + ") \r\n (STACK: " + ex.stack + ")" +
			" \r\n (CAUSE: " + ex.cause + ")", LOG_LEVEL.ERROR, "Timer.exception(context, exception)");
	}
	/**
	 * @param {Context} context
	 * @returns {Promise<void>}
	 */
	async process(context) {
		try {
			/**@type{TimerAddOn}*/let _addon = /**@type{TimerAddOn}*/await context.config.getAddOn(TimerAddOn);
			let _tick = new TickEvent(context, this);
			if(_tick.isPastDue && _addon.rejectOnPastDue) {
				context.log("Tick is past due and rejectOnPastDue is true, rejecting.", LOG_LEVEL.ERROR, "TimerFunction.process(context)");
				_tick.reject(CelastrinaError.newError("Timer past due."));
				await this.onReject(_tick);
				if(_addon.abortOnReject) {
					if(_tick.cause == null) _tick.reject(CelastrinaError.newError("Internal Server Error."));
					throw _tick.cause;
				}
			}
			else {
				await this.onTick(_tick);
				if(_tick.isRejected) {
					context.log("Tick event rejected by onTick, rejecting.", LOG_LEVEL.ERROR, "TimerFunction.process(context)");
					await this.onReject(_tick);
					if(_addon.abortOnReject) {
						if(_tick.cause == null) _tick.reject(CelastrinaError.newError("Internal Server Error."));
						throw _tick.cause;
					}
				}
			}
		}
		catch(exception) {
			let _abort = new TickEvent(context, this, true, exception);
			await this.onAbort(_abort);
			throw exception;
		}
	}
}
/**
 * TimerConfigParser
 * @author Robert R Murrell
 */
class TimerConfigParser extends ConfigParser {
	/**@return{string}*/static get celastrinaType() {return "celastrinajs.timer.TimerConfigParser";}
	constructor(link = null, version = "1.0.0") {
		super("Timer", link, version);
	}
	async _create(_Object) {
		/**@type{TimerAddOn}*/let _addon = /**@type{TimerAddOn}*/this._addons.get(TimerAddOn);
		if(instanceOfCelastringType(TimerAddOn, _addon)) {
			if(_Object.hasOwnProperty("rejectOnPastDue") && (typeof _Object.rejectOnPastDue === "boolean"))
				_addon.rejectOnPastDue = _Object.rejectOnPastDue;
			if(_Object.hasOwnProperty("abortOnReject") && (typeof _Object.abortOnReject === "boolean"))
				_addon.abortOnReject = _Object.abortOnReject;
		}
		else
			throw CelastrinaError.newError("Missing required Add-On '" + TimerAddOn.name + "'.");
	}
}
/**
 * TimerAddOn
 * @author Robert R Murrell
 */
class TimerAddOn extends AddOn {
	/**@return{string}*/static get celastrinaType() {return "celastrinajs.timer.TimerAddOn";}
	/**@return{string}*/static get addOnName() {return "celastrinajs.timer.addon.timer";}
	/**
	 * @param {boolean} rejectOnPastDue
	 * @param {boolean} abortOnReject
	 * @param {Array<string>} [dependencies=[]]
	 */
	constructor(rejectOnPastDue = false, abortOnReject = false, dependencies = []) {
		super(dependencies);
		/**@type{boolean}*/this._rejectOnPastDue = rejectOnPastDue;
		/**@type{boolean}*/this._abortOnReject = abortOnReject;
	}
	/**@return{TimerConfigParser}*/getConfigParser() {
		return new TimerConfigParser();
	}
	/**
	 * @param {Object} azcontext
	 * @param {Object} config
	 * @return {Promise<void>}
	 */
	async initialize(azcontext, config) {
		config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = true; // Set optimistic to true so timer works.
	}
	/**@return{boolean}*/get rejectOnPastDue() {return this._rejectOnPastDue;}
	/**@param{boolean}rejectOnPastDue*/set rejectOnPastDue(rejectOnPastDue) {this._rejectOnPastDue = rejectOnPastDue;}
	/**@return{boolean}*/get abortOnReject() {return this._abortOnReject;}
	/**@param{boolean}abortOnReject*/set abortOnReject(abortOnReject) {this._abortOnReject = abortOnReject;}
	/**
	 * @param {boolean} rejectOnPastDue
	 * @return {TimerAddOn}
	 */
	setRejectOnPastDue(rejectOnPastDue) {
		this._rejectOnPastDue = rejectOnPastDue;
		return this;
	}
	/**
	 * @param {boolean} abortOnReject
	 * @return {TimerAddOn}
	 */
	setAbortOnReject(abortOnReject) {
		this._abortOnReject = abortOnReject;
		return this;
	}
}
module.exports = {
	TickEvent: TickEvent,
	TimerConfigParser: TimerConfigParser,
	TimerAddOn: TimerAddOn,
	TimerFunction: TimerFunction
};
