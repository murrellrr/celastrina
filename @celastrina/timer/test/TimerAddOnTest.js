const {CelastrinaError, CelastrinaValidationError, Configuration, CelastrinaEvent} = require("@celastrina/core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockContext} = require("../../core/test/ContextTest");
const assert = require("assert");
const moment = require("moment");
const {TickEvent, TimerFunction, TimerAddOn} = require("../Timer");

describe("TimerAddOn", () => {
	describe("#constructor(rejectOnPastDue, abortOnReject)", () => {
		it("Should set defaults", () => {
			let _addon = new TimerAddOn();
			assert.strictEqual(_addon.rejectOnPastDue, false, "Expected false");
			assert.strictEqual(_addon.abortOnReject, false, "Expected false");
		});
		it("Should set reject", () => {
			let _addon = new TimerAddOn(true);
			assert.strictEqual(_addon.rejectOnPastDue, true, "Expected true.");
			assert.strictEqual(_addon.abortOnReject, false, "Expected false.");
		});
		it("Should set abort", () => {
			let _addon = new TimerAddOn(false, true);
			assert.strictEqual(_addon.rejectOnPastDue, false, "Expected false.");
			assert.strictEqual(_addon.abortOnReject, true, "Expected true.");
		});
		it("Should set reject and abort", () => {
			let _addon = new TimerAddOn(true, true);
			assert.strictEqual(_addon.rejectOnPastDue, true, "Expected true.");
			assert.strictEqual(_addon.abortOnReject, true, "Expected true.");
		});
	});
	describe("Get/Set", () => {
		it("Should set abort", () => {
			let _addon = new TimerAddOn();
			_addon.abortOnReject = true;
			assert.strictEqual(_addon.abortOnReject, true, "Expected true.");
			_addon.abortOnReject = false;
			assert.strictEqual(_addon.abortOnReject, false, "Expected false.");
			assert.deepStrictEqual(_addon.setAbortOnReject(true), _addon, "Expected _addon.");
			assert.strictEqual(_addon.abortOnReject, true, "Expected true.");
		});
		it("Should set reject", () => {
			let _addon = new TimerAddOn();
			_addon.rejectOnPastDue = true;
			assert.strictEqual(_addon.rejectOnPastDue, true, "Expected true.");
			_addon.rejectOnPastDue = false;
			assert.strictEqual(_addon.rejectOnPastDue, false, "Expected false.");
			assert.deepStrictEqual(_addon.setRejectOnPastDue(true), _addon, "Expected _addon.");
			assert.strictEqual(_addon.rejectOnPastDue, true, "Expected true.");
		});
	});
	describe("#initialize(azcontext, config)", () => {
		describe("Optimistic AuthZ", () => {
			it("should set optimistic auth to true", async () => {
				let _axcontext = new MockAzureFunctionContext();
				let _config = {};
				let _addon = new TimerAddOn();
				await _addon.initialize(_axcontext, _config);
				assert.strictEqual(_config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC], true, "Expected true.");
			});
		});
	});
});
