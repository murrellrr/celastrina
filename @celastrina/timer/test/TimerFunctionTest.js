/*
 * Copyright (c) 2020, Robert R Murrell.
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
const {CelastrinaError, CelastrinaValidationError, Configuration, CelastrinaEvent} = require("@celastrina/core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockContext} = require("../../core/test/ContextTest");
const assert = require("assert");
const moment = require("moment");
const {TickEvent, TimerFunction, TimerAddOn} = require("../Timer");

class MockTimerFunction extends TimerFunction {
	constructor(config, reject = false) {
		super(config);
		this._reject = false;
		this.onTickInvoked = false;
		this.onRejectInvoked = false;
		this.onAbortInvoked = false;
	}
	reset() {
		this.onTickInvoked = false;
		this.onRejectInvoked = false;
		this.onAbortInvoked = false;
	}
	async onTick(event) {
		this.onTickInvoked = true;
		if(this._reject) event.reject("I was configured to reject in Mock.");
	}
	async onReject(event) {
		this.onRejectInvoked = true;
	}
	async onAbort(event) {
		this.onAbortInvoked = true;
	}
}

class MockConfiguration extends Configuration {
	constructor(name) {super(name);}

	async beforeInitialize(azcontext) {
		return super.beforeInitialize(azcontext);
	}

	async afterInitialize(azcontext, pm, rm) {
		return super.afterInitialize(azcontext, pm, rm);
	}
}

describe("TimerFunction", () => {
	describe("#onTick(event)", () => {
		it("should invoke onTick(event)", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _date = moment();
			_azcontext.bindings.tick.scheduleStatus.last = moment(_date).subtract(5, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.lastUpdated = moment(_date).subtract(4, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.next = moment(_date).add(5, "minutes").format();
			let _config = new MockConfiguration("TimerFunctionTest");
			let _addon = new TimerAddOn();
			_config.addOn(_addon);
			let _function = new MockTimerFunction(_config);
			await _function.execute(_azcontext);
			assert.strictEqual(_function.onTickInvoked, true, "Expected true.");
		});
		it("should not reject on past due", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _date = moment();
			_azcontext.bindings.tick.isPastDue = true;
			_azcontext.bindings.tick.scheduleStatus.last = moment(_date).subtract(5, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.lastUpdated = moment(_date).subtract(4, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.next = moment(_date).add(5, "minutes").format();
			let _config = new MockConfiguration("TimerFunctionTest");
			let _addon = new TimerAddOn();
			_config.addOn(_addon);
			let _function = new MockTimerFunction(_config);
			await _function.execute(_azcontext);
			assert.strictEqual(_function.onTickInvoked, true, "Expected true.");
			assert.strictEqual(_function.onRejectInvoked, false, "Expected false.");
			assert.strictEqual(_function.onAbortInvoked, false, "Expected false.");
		});
		it("should reject on past due", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _date = moment();
			_azcontext.bindings.tick.isPastDue = true;
			_azcontext.bindings.tick.scheduleStatus.last = moment(_date).subtract(5, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.lastUpdated = moment(_date).subtract(4, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.next = moment(_date).add(5, "minutes").format();
			let _config = new MockConfiguration("TimerFunctionTest");
			let _addon = new TimerAddOn();
			_addon.rejectOnPastDue = true;
			_config.addOn(_addon);
			let _function = new MockTimerFunction(_config);
			await _function.execute(_azcontext);
			assert.strictEqual(_function.onTickInvoked, false, "Expected false.");
			assert.strictEqual(_function.onRejectInvoked, true, "Expected true.");
			assert.strictEqual(_function.onAbortInvoked, false, "Expected false.");
		});
		it("should reject and abort on past due", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _date = moment();
			_azcontext.bindings.tick.isPastDue = true;
			_azcontext.bindings.tick.scheduleStatus.last = moment(_date).subtract(5, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.lastUpdated = moment(_date).subtract(4, "minutes").format();
			_azcontext.bindings.tick.scheduleStatus.next = moment(_date).add(5, "minutes").format();
			let _config = new MockConfiguration("TimerFunctionTest");
			let _addon = new TimerAddOn();
			_addon.rejectOnPastDue = true;
			_addon.abortOnReject = true;
			_config.addOn(_addon);
			let _function = new MockTimerFunction(_config);
			await _function.execute(_azcontext);
			assert.strictEqual(_function.onTickInvoked, false, "Expected false.");
			assert.strictEqual(_function.onRejectInvoked, true, "Expected true.");
			assert.strictEqual(_function.onAbortInvoked, true, "Expected true.");
		});
	});
});


module.exports = {
	MockTimerFunction: MockTimerFunction
};
