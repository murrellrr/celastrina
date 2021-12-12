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
const {TickEvent} = require("../Timer");

class MockTickContext extends MockContext {
	constructor(config) {
		super(config);
	}
	/**
	 * @param {moment.Moment} [date=moment()]
	 * @param {number} [intervalMinutes=5]
	 * @return {moment.Moment}
	 */
	mockTick(date = moment(), intervalMinutes = 5) {
		date.set("milliseconds", 0);
		this._config.context.bindings.tick.scheduleStatus.last = moment(date).subtract(intervalMinutes, "minutes").format();
		this._config.context.bindings.tick.scheduleStatus.next = moment(date).add(intervalMinutes, "minutes").format();
		this._config.context.bindings.tick.scheduleStatus.lastUpdated = moment(date).subtract((intervalMinutes - 1), "minutes").format();
		return date;
	}
}

describe("TickEvent", () => {
	describe("Get tick attributes", () => {
		it("should access binding correctly", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _config = new Configuration("TickEventTest");
			await _config.initialize(_azcontext);
			let _context = new MockTickContext(_config);
			let _date = _context.mockTick();
			let _event = new TickEvent(_context);
			assert.strictEqual(_event.isPastDue, false, "Expected false.");
			assert.strictEqual(_event.lastUpdated.isSame(moment(_date).subtract(4, "minutes")), true, "Expected true.");
			assert.strictEqual(_event.lastRun.isSame(moment(_date).subtract(5, "minutes")), true, "Expected true.");
			assert.strictEqual(_event.nextRun.isSame(moment(_date).add(5, "minutes")), true, "Expected true.");
		});
	});
});

module.exports = {
	MockTickContext: MockTickContext
};
