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
const {CelastrinaError, AddOn, Configuration, LifeCycle, AddOnManager} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockResourceManager} = require("./ResourceAuthorizationTest");
const assert = require("assert");
const {MockAddOn} = require("./ConfigurationTest");
const {MockContext} = require("./ContextTest");

class AddOnMockOne extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockOne";}
	constructor() {
		super();
	}
}
class AddOnMockTwo extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockTwo";}
	constructor() {
		super([AddOnMockOne.addOnName], [LifeCycle.STATE.LOAD, LifeCycle.STATE.SAVE]);
		this.doLifeCycleInvoked = false;
		this.lifecyclesInvoked = [];
	}
	reset() {
		this.doLifeCycleInvoked = false;
		this.lifecyclesInvoked = [];
	}
	/**
	 * @param {LifeCycle} lifecycle
	 * @return {Promise<void>}
	 */
	async doLifeCycle(lifecycle) {
		this.lifecyclesInvoked.push(lifecycle.lifecycle);
		this.doLifeCycleInvoked = true;
	}
}
class AddOnMockThree extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockThree";}
	constructor() {
		super([AddOnMockOne.addOnName]);
	}
}
class AddOnMockFour extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockFour";}
	constructor() {
		super([AddOnMockOne.addOnName, AddOnMockThree.addOnName]);
	}
}

describe("AddOnManager", () => {
	describe("#add(addon)", () => {
		it("should resolve addon to target without dependencies immediately", () => {
			let _admanager = new AddOnManager();
			let _addon = new AddOnMockOne();
			_admanager.add(_addon);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
		});
		it("should resolve dependent to target", () => {
			let _admanager = new AddOnManager();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			_admanager.add(_addon);
			_admanager.add(_addon2);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._target[1], _addon2, "Expected _addon2.");
		});
		it("should resolve _addon/_addon2, but unresolve _addon3 dependent to target", () => {
			let _admanager = new AddOnManager();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			let _addon3 = new AddOnMockThree();
			_addon3.mockDependancy("AddOnMockFour");
			_admanager.add(_addon);
			_admanager.add(_addon2);
			_admanager.add(_addon3);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._target[1], _addon2, "Expected _addon2.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockThree"), true, "Expected true.");
		});
	});
	describe("#install(azcontext, parse, cfp, atp)", () => {
		it("should install add-ons.", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _admanager = new AddOnManager();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			let _addon3 = new AddOnMockThree();
			let _addon4 = new AddOnMockFour();
			_admanager.add(_addon2);
			_admanager.add(_addon4);
			_admanager.add(_addon3);
			_admanager.add(_addon);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockTwo"), true, "Expected true.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockThree"), true, "Expected true.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockFour"), true, "Expected true.");
			await _admanager.install(_azcontext);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._target[1], _addon2, "Expected _addon2.");
			assert.deepStrictEqual(_admanager._target[2], _addon3, "Expected _addon3.");
			assert.deepStrictEqual(_admanager._target[3], _addon4, "Expected _addon4.");
		});
		it("should fail install add-ons with four unresolved.", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _admanager = new AddOnManager();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			let _addon3 = new AddOnMockThree();
			let _addon4 = new AddOnMockFour();
			_addon4.mockDependancy("FakeDependent");
			_admanager.add(_addon2);
			_admanager.add(_addon4);
			_admanager.add(_addon3);
			_admanager.add(_addon);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockTwo"), true, "Expected true.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockThree"), true, "Expected true.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockFour"), true, "Expected true.");
			await assert.rejects(_admanager.install(_azcontext));
		});
		it("should initialize add-ons.", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _admanager = new AddOnManager();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			let _addon3 = new AddOnMockThree();
			let _addon4 = new AddOnMockFour();
			_admanager.add(_addon2);
			_admanager.add(_addon4);
			_admanager.add(_addon3);
			_admanager.add(_addon);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockTwo"), true, "Expected true.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockThree"), true, "Expected true.");
			assert.deepStrictEqual(_admanager._unresolved.has("AddOnMockFour"), true, "Expected true.");
			await _admanager.install(_azcontext);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._target[1], _addon2, "Expected _addon2.");
			assert.deepStrictEqual(_admanager._target[2], _addon3, "Expected _addon3.");
			assert.deepStrictEqual(_admanager._target[3], _addon4, "Expected _addon4.");
			await _admanager.initialize(_azcontext, {});
			assert.strictEqual(_addon.invokedInitialize, true, "Expected true.");
			assert.strictEqual(_addon2.invokedInitialize, true, "Expected true.");
			assert.strictEqual(_addon.invokedInitialize, true, "Expected true.");
			assert.strictEqual(_addon4.invokedInitialize, true, "Expected true.");
		});
	});
	describe("#doLifeCycle(lifecycle, source, context, exception)", () => {
		it("should do lifecycle on AddOn2", async () => {
			let _azcontext = new MockAzureFunctionContext();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			let _config = new Configuration("AddOnManagerTest");
			_config.addOn(_addon);
			_config.addOn(_addon2);
			await _config.initialize(_azcontext);
			await _config.ready();
			let _context = new MockContext(_config);

			await _config.addOns.doLifeCycle(LifeCycle.STATE.INITIALIZE, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.AUTHENTICATE, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.AUTHORIZE, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.VALIDATE, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.LOAD, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.PROCESS, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.SAVE, null, _context);
			await _config.addOns.doLifeCycle(LifeCycle.STATE.TERMINATE, null, _context);

			assert.strictEqual(_addon2.doLifeCycleInvoked, true, "Expected true.");
			assert.deepStrictEqual(_addon2.lifecyclesInvoked, [LifeCycle.STATE.LOAD, LifeCycle.STATE.SAVE], "Expected true.");
		});
	});
});
