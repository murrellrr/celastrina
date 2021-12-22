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
const {CelastrinaError, CelastrinaValidationError, Configuration, CelastrinaEvent, AddOnManager} = require("@celastrina/core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockContext} = require("../../core/test/ContextTest");
const assert = require("assert");
const moment = require("moment");
const {TickEvent, TimerFunction, TimerAddOn, TimerConfigParser} = require("../Timer");

describe("TimerConfigParser", () => {
	describe("#parse(_Object)", () => {
		it("should parse timer properties.", async () => {
			let _parser = new TimerConfigParser();
			let _azcontext = new MockAzureFunctionContext();
			let _config = {};
			let _addon = new TimerAddOn();
			let _addOnManager = new AddOnManager();
			_addOnManager.add(_addon);
			_parser.initialize(_azcontext, _config, _addOnManager);
			let _Object = {rejectOnPastDue: true, abortOnReject: true};
			_Object["_content"] = {type: "application/vnd.celastrinajs.config+json;Timer"};
			await _parser.parse(_Object);
			assert.strictEqual(_addon.abortOnReject, true, "Expected true.");
			assert.strictEqual(_addon.rejectOnPastDue, true, "Expected true.");
		});
	});
});
