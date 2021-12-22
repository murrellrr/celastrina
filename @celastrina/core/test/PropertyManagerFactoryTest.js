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
const {instanceOfCelastringType, CelastrinaError, LOG_LEVEL, Configuration, PropertyManager, CachedPropertyManager,
	   PropertyManagerFactory} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const assert = require("assert");

class MockPropertyManagerFactory extends PropertyManagerFactory {
	static PROP_USE_MOCK_CONFIG = "celastrinajs.core.property.config";
	/**@param{(null|string)}[name=null]*/
	constructor(name = MockPropertyManagerFactory.PROP_USE_MOCK_CONFIG) {
		super(name);
		this.createPropertyManagerInvoked = false;
		this.hasSampleProperty = false;
	}
	reset() {
		this.createPropertyManagerInvoked = false;
		this.hasSampleProperty = false;
	}
	/**
	 * @abstract
	 * @return {PropertyManager}
	 * @private
	 */
	_createPropertyManager(source) {
		this.hasSampleProperty = source.hasOwnProperty("sample");
		this.createPropertyManagerInvoked = true;
		return new MockPropertyManager();
	}
	/**@type{string}*/getName() {return "MockPropertyManagerFactory";}
}

describe("PropertyManagerFactory", () => {
	describe("#getName()", () => {
		it("should return name", () => {
			let _factory = new MockPropertyManagerFactory();
			assert.strictEqual(_factory.getName(), "MockPropertyManagerFactory", "Expected 'MockPropertyManagerFactory'.");
		});
	});
	describe("#createPropertyManager()", () => {
		it("should create without cache", () => {
			process.env["celastrinajs.core.property.config"] = "{\"sample\": \"value\"}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), false, "Expected false.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			delete process.env["celastrinajs.core.property.config"];
		});
		it("should create with cache", () => {
			process.env["celastrinajs.core.property.config"] = "{\"sample\": \"value\", \"cache\": {\"active\": true}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			delete process.env["celastrinajs.core.property.config"];
		});
		it("should create with cache ttl", () => {
			process.env["celastrinajs.core.property.config"] = "{\"sample\": \"value\", \"cache\": {\"active\": true, \"ttl\": 10}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			assert.strictEqual(_pm.defaultTimeout, 10, "Expected 10.");
			delete process.env["celastrinajs.core.property.config"];
		});
		it("should create with cache unit", () => {
			process.env["celastrinajs.core.property.config"] = "{\"sample\": \"value\", \"cache\": {\"active\": true, \"unit\": \"hours\"}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			assert.strictEqual(_pm.defaultUnit, "hours", "Expected 'hours'.");
			delete process.env["celastrinajs.core.property.config"];
		});
		it("should create with cache ttl and unit", () => {
			process.env["celastrinajs.core.property.config"] = "{\"sample\": \"value\", \"cache\": {\"active\": true, \"ttl\":10, \"unit\": \"seconds\"}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			assert.strictEqual(_pm.defaultTimeout, 10, "Expected 10.");
			assert.strictEqual(_pm.defaultUnit, "seconds", "Expected 'seconds'.");
			delete process.env["celastrinajs.core.property.config"];
		});
		it("should load controls, one expires override", async () => {
			process.env["celastrinajs.core.property.config"] =
				"{\"sample\": \"value\", \"cache\": {\"active\": true, \"controls\": [{\"key\": \"mock_prop_one\", \"ttl\": 30, \"unit\": \"seconds\"}]}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			assert.strictEqual(_pm.defaultTimeout, 5, "Expected 5.");
			assert.strictEqual(_pm.defaultUnit, "minutes", "Expected 'minutes'.");
			/**@type{CacheProperty}*/let _cache = await _pm.getCacheInfo("mock_prop_one");
			assert.deepStrictEqual((typeof _cache !== "undefined" && _cache != null), true, "Expected cache object.");
			assert.deepStrictEqual(_cache.time, 30, "Expected 30.");
			assert.deepStrictEqual(_cache.unit, "seconds", "Expected 'seconds''.");

			delete process.env["celastrinajs.core.property.config"];
		});
		it("should load controls, one no-cache", async () => {
			process.env["celastrinajs.core.property.config"] =
				"{\"sample\": \"value\", \"cache\": {\"active\": true, \"controls\": [{\"key\": \"mock_prop_two\", \"noCache\": true}]}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			assert.strictEqual(_pm.defaultTimeout, 5, "Expected 5.");
			assert.strictEqual(_pm.defaultUnit, "minutes", "Expected 'minutes'.");
			/**@type{CacheProperty}*/let _cache = await _pm.getCacheInfo("mock_prop_two");
			assert.deepStrictEqual((typeof _cache !== "undefined" && _cache != null), true, "Expected cache object.");
			assert.deepStrictEqual(_cache.cache, false, "Expected false.");
			delete process.env["celastrinajs.core.property.config"];
		});
		it("should load controls, one no-expire", async () => {
			process.env["celastrinajs.core.property.config"] =
				"{\"sample\": \"value\", \"cache\": {\"active\": true, \"controls\": [{\"key\": \"mock_prop_three\", \"noExpire\": true}]}}";
			let _factory = new MockPropertyManagerFactory();
			/**@type{MockPropertyManager}*/let _pm = /**@type{MockPropertyManager}*/_factory.createPropertyManager();
			assert.strictEqual(instanceOfCelastringType(CachedPropertyManager, _pm), true, "Expected true.");
			assert.strictEqual(_factory.createPropertyManagerInvoked, true, "Expected true.");
			assert.strictEqual(_factory.hasSampleProperty, true, "Expected true.");
			assert.strictEqual(_pm.defaultTimeout, 5, "Expected 5.");
			assert.strictEqual(_pm.defaultUnit, "minutes", "Expected 'minutes'.");
			/**@type{CacheProperty}*/let _cache = await _pm.getCacheInfo("mock_prop_three");
			assert.deepStrictEqual((typeof _cache !== "undefined" && _cache != null), true, "Expected cache object.");
			assert.deepStrictEqual(_cache.cache, true, "Expected true.");
			assert.deepStrictEqual(_cache.expires == null, true, "Expected true.");
			assert.deepStrictEqual(_cache.lastUpdated == null, true, "Expected true.");
			assert.deepStrictEqual(_cache.isExpired, true, "Expected true."); // need to make sure it loads the first time.
			delete process.env["celastrinajs.core.property.config"];
		});
	});
});

module.exports = {
	MockPropertyManagerFactory: MockPropertyManagerFactory
};
