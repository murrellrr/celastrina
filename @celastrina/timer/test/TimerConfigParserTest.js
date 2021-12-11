const {CelastrinaError, CelastrinaValidationError, Configuration, CelastrinaEvent} = require("@celastrina/core");
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
			_config[TimerAddOn.addOnName] = _addon;
			_parser.initialize(_azcontext, _config);
			let _Object = {rejectOnPastDue: true, abortOnReject: true};
			_Object["_content"] = {type: "application/vnd.celastrinajs.config+json;Timer"};
			await _parser.parse(_Object);
			assert.strictEqual(_addon.abortOnReject, true, "Expected true.");
			assert.strictEqual(_addon.rejectOnPastDue, true, "Expected true.");
		});
	});
});
