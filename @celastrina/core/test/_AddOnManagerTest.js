const {CelastrinaError, AddOn, Configuration, _AddOnManager} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockResourceManager} = require("./ResourceAuthorizationTest");
const assert = require("assert");
const {MockAddOn} = require("./ConfigurationTest");

class AddOnMockOne extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockOne";}
	constructor(dependencies = []) {
		super(dependencies);
	}
}
class AddOnMockTwo extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockTwo";}
	constructor(dependencies = [AddOnMockOne.addOnName]) {
		super(dependencies);
	}
}
class AddOnMockThree extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockThree";}
	constructor(dependencies = [AddOnMockOne.addOnName]) {
		super(dependencies);
	}
}
class AddOnMockFour extends MockAddOn {
	/**@type{string}*/static get addOnName() {return "AddOnMockFour";}
	constructor(dependencies = [AddOnMockOne.addOnName, AddOnMockThree.addOnName]) {
		super(dependencies);
	}
}

describe("_AddOnManager", () => {
	describe("#add(addon)", () => {
		it("should resolve addon to target without dependencies immediately", () => {
			let _admanager = new _AddOnManager();
			let _addon = new AddOnMockOne();
			_admanager.add(_addon);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
		});
		it("should resolve dependent to target", () => {
			let _admanager = new _AddOnManager();
			let _addon = new AddOnMockOne();
			let _addon2 = new AddOnMockTwo();
			_admanager.add(_addon);
			_admanager.add(_addon2);
			assert.deepStrictEqual(_admanager._target[0], _addon, "Expected _addon.");
			assert.deepStrictEqual(_admanager._target[1], _addon2, "Expected _addon2.");
		});
		it("should resolve _addon/_addon2, but unresolve _addon3 dependent to target", () => {
			let _admanager = new _AddOnManager();
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
			let _admanager = new _AddOnManager();
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
			let _admanager = new _AddOnManager();
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
			let _admanager = new _AddOnManager();
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
});
