const {CelastrinaError, LOG_LEVEL, PropertyManager, CachedProperty, AppSettingsPropertyManager,
       CachedPropertyManager} = require("../Core");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const sinon = require("sinon");

class MockObject {
    constructor(key, value) {
        this._key = key;
        this._value = value;
    }
}
function createMockObject(_Object) {
    return new MockObject(_Object.key, _Object.value);
}

describe("CachePropertyManager", () => {
    let _clock = null;
    before(() => {
        _clock = sinon.useFakeTimers();
    });
    after(() => {
        sinon.clock.reset();
    });
    describe("#onstructor(manager, defaultTime, defaultUnit, overrides)", () => {
        it("Should default all the parameters", () => {
            let _cpm = new CachedPropertyManager();
            assert.strictEqual(_cpm._manager instanceof AppSettingsPropertyManager, true, "PropertyManager is AppSettingsPropertManager.");
            assert.deepStrictEqual(_cpm._cache, {}, "Cache Overrides.");
            assert.strictEqual(_cpm._defaultTime, 300, "Default timeout.");
            assert.strictEqual(_cpm._defaultUnit, "s", "Default time unit.");
        });
        it("Should set the PM and default the rest of the parameters", () => {
            let _pm = new MockPropertyManager();
            let _cpm = new CachedPropertyManager(_pm);
            assert.strictEqual(_cpm._manager, _pm, "PropertyManager.");
            assert.strictEqual(_cpm._defaultTime, 300, "Default timeout.");
            assert.strictEqual(_cpm._defaultUnit, "s", "Default time unit.");
        });
        it("Should set the PM and timeout, default the rest of the parameters", () => {
            let _pm = new MockPropertyManager();
            let _cpm = new CachedPropertyManager(_pm, 500);
            assert.strictEqual(_cpm._manager, _pm, "PropertyManager.");
            assert.strictEqual(_cpm._defaultTime, 500, "Default timeout.");
            assert.strictEqual(_cpm._defaultUnit, "s", "Default time unit.");
        });
        it("Should set the PM, timeout and unit, default the rest of the parameters", () => {
            let _pm = new MockPropertyManager();
            let _cpm = new CachedPropertyManager(_pm, 500, "m");
            assert.strictEqual(_cpm._manager, _pm, "PropertyManager.");
            assert.strictEqual(_cpm._defaultTime, 500, "Default timeout.");
            assert.strictEqual(_cpm._defaultUnit, "m", "Default time unit.");
        });
        it("Should set the PM, timeout and unit, default the rest of the parameters", () => {
            let _pm = new MockPropertyManager();
            let _cpm = new CachedPropertyManager(_pm, 500, "m");
            assert.strictEqual(_cpm._manager, _pm, "PropertyManager.");
            assert.strictEqual(_cpm._defaultTime, 500, "Default timeout.");
            assert.strictEqual(_cpm._defaultUnit, "m", "Default time unit.");
        });
    });
    describe("#getProperty(key, defaultValue)", () => {
        it("Should Cache Property", async () => {
            let _pm = new MockPropertyManager();
            _pm.mockProperty("mock_property", "mock_value");
            let _cpm = new CachedPropertyManager(_pm);
            let _value = await _cpm.getProperty("mock_property");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "mock_property", "Last key looked up was 'mock_property'.");
            assert.strictEqual(_value, "mock_value", "Value is 'mock_value'.");
            _pm.reset();
            _value = await _cpm.getProperty("mock_property");
            assert.strictEqual(_pm.getPropertyInvoked, false, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.strictEqual(_value, "mock_value", "Value is 'mock_value' from cache.");
            let _cache = await _cpm.getCacheInfo("mock_property");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
        it("Should refresh after expire", async () => {
            let _pm = new MockPropertyManager();
            _pm.mockProperty("mock_property", "mock_value");
            let _cpm = new CachedPropertyManager(_pm, 1);
            let _value = await _cpm.getProperty("mock_property");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "mock_property", "Last key looked up was 'mock_property'.");
            assert.strictEqual(_value, "mock_value", "Value is 'mock_value'.");
            _pm.reset();
            _clock.tick(3000);
            _value = await _cpm.getProperty("mock_property");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "mock_property", "Last key looked up should be 'mock_property'.");
            assert.strictEqual(_value, "mock_value", "Value is 'mock_value' from cache.");
            let _cache = await _cpm.getCacheInfo("mock_property");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
});

describe("CachePropertyManager:Accessors", () => {
    let _pm = new MockPropertyManager();
    _pm.mockProperty("getProperty", "value");
    _pm.mockProperty("getRegExpProperty", "/^Test/g");
    _pm.mockProperty("getBooleanProperty", "true");
    _pm.mockProperty("getNumberProperty", "42");
    _pm.mockProperty("getDateProperty", "1995-12-17T03:24:00");
    _pm.mockProperty("getObject", "{\"key\": \"mock_key\", \"value\": \"mock_value\"}");
    let _cpm = new CachedPropertyManager(_pm);
    describe("#getProperty(key, defaultValue)", () => {
        it("Should get cached regex from string", async () => {
            _pm.reset();
            let _value = await _cpm.getProperty("getProperty");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "getProperty", "Last key looked up was 'getProperty'.");
            assert.deepStrictEqual(_value, "value", "Value is 'value'.");
            _pm.reset();
            _value = await _cpm.getRegExp("getProperty");
            assert.strictEqual(_pm.getPropertyInvoked, false, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.deepStrictEqual(_value, "value", "Value is 'value'.");
            let _cache = await _cpm.getCacheInfo("getProperty");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
    describe("#getRegExp(key, defaultValue)", () => {
        it("Should get cached regex from string", async () => {
            _pm.reset();
            let _value = await _cpm.getRegExp("getRegExpProperty");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "getRegExpProperty", "Last key looked up was 'getRegExpProperty'.");
            assert.deepStrictEqual(_value, new RegExp("/^Test/g"), "Value is RegExp.");
            _pm.reset();
            _value = await _cpm.getRegExp("getRegExpProperty");
            assert.strictEqual(_pm.getPropertyInvoked, false, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.strictEqual(_value instanceof RegExp, true, "Is RegExp type.");
            assert.deepStrictEqual(_value, new RegExp("/^Test/g"), "Value is RegEx from cahce.");
            let _cache = await _cpm.getCacheInfo("getRegExpProperty");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
    describe("#getBoolean(key, defaultValue)", () => {
        it("Should get cached boolean from string", async () => {
            _pm.reset();
            let _value = await _cpm.getBoolean("getBooleanProperty");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "getBooleanProperty", "Last key looked up was 'getBooleanProperty'.");
            assert.deepStrictEqual(_value, true, "Value is true.");
            _pm.reset();
            _value = await _cpm.getBoolean("getBooleanProperty");
            assert.strictEqual(_pm.getPropertyInvoked, false, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.strictEqual(typeof _value === "boolean", true, "Is boolean type.");
            assert.deepStrictEqual(_value, true, "Value is RegEx from cahce.");
            let _cache = await _cpm.getCacheInfo("getBooleanProperty");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
    describe("#getNumber(key, defaultValue)", () => {
        it("Should get cached number from string", async () => {
            _pm.reset();
            let _value = await _cpm.getNumber("getNumberProperty");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "getNumberProperty", "Last key looked up was 'getNumberProperty'.");
            assert.deepStrictEqual(_value, 42, "Value is 42.");
            _pm.reset();
            _value = await _cpm.getNumber("getNumberProperty");
            assert.strictEqual(_pm.getPropertyInvoked, false, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.strictEqual(typeof _value === "number", true, "Is number type.");
            assert.deepStrictEqual(_value, 42, "Value is 42 from cahce.");
            let _cache = await _cpm.getCacheInfo("getNumberProperty");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
    describe("#getDate(key, defaultValue)", () => {
        it("Should get cached Date from string", async () => {
            _pm.reset();
            let _value = await _cpm.getDate("getDateProperty");
            assert.strictEqual(_pm.getPropertyInvoked, true, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, "getDateProperty", "Last key looked up was 'getNumberProperty'.");
            assert.deepStrictEqual(_value, new Date("1995-12-17T03:24:00"), "Value is '1995-12-17T03:24:00'.");
            _pm.reset();
            _value = await _cpm.getDate("getDateProperty");
            assert.strictEqual(_pm.getPropertyInvoked, false, "_getProperty was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.strictEqual(_value instanceof Date, true, "Is Date type.");
            assert.deepStrictEqual(_value, new Date("1995-12-17T03:24:00"), "Value is '1995-12-17T03:24:00' from cahce.");
            let _cache = await _cpm.getCacheInfo("getDateProperty");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
    describe("#getObject(key, defaultValue)", () => {
        it("Should get cached Object from string", async () => {
            _pm.reset();
            let _value = await _cpm.getObject("getObject", null, createMockObject);
            assert.strictEqual(_pm.getPropertyInvoked, true, "getObject was invoked.");
            assert.strictEqual(_pm.lastKey, "getObject", "Last key looked up was 'getNumberProperty'.");
            assert.deepStrictEqual(_value, new MockObject("mock_key", "mock_value"), "Value is MockObject.");
            _pm.reset();
            _value = await _cpm.getObject("getObject", null, createMockObject);
            assert.strictEqual(_pm.getPropertyInvoked, false, "getObject was invoked.");
            assert.strictEqual(_pm.lastKey, null, "Last key looked up should be null.");
            assert.strictEqual(_value instanceof MockObject, true, "Is MockObject type.");
            assert.deepStrictEqual(_value, new MockObject("mock_key", "mock_value"), "Value is MockObject from cahce.");
            let _cache = await _cpm.getCacheInfo("getObject");
            assert.strictEqual(_cache instanceof CachedProperty, true, "Hash cached property.");
        });
    });
    describe("#getTypedProperty(key, typename, defaultValue, factory)", () => {
        it("Gets property", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getProperty", "property"), "value");
        });
        it("Gets property with string name", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getProperty", "string"), "value");
        });
        it("Gets number", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getNumberProperty", "number"), 42);
        });
        it("Gets boolean", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getBooleanProperty", "boolean"), true);
        });
        it("Gets RegExp", async () => {
            let _comp = new RegExp("/^Test/g");
            let _regexp = await _cpm.getTypedProperty("getRegExpProperty", "regexp");
            assert.strictEqual(_regexp instanceof RegExp, true, "Instance of RegExp");
            assert.deepStrictEqual(_regexp, _comp, "Same expression.");
        });
        it("Gets MockObject from JSON", async () => {
            let _object = await _cpm.getTypedProperty("getObject", "object", null, createMockObject);
            assert.deepStrictEqual(_object instanceof MockObject, true, "Instanceof MockObject");
            assert.deepStrictEqual(_object, new MockObject("mock_key", "mock_value"), "Mock object has correct values.");
        });
        it("Gets string default", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getProperty", "string", "mock_env_val_one"), "value");
        });
        it("Gets number default", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getNumberProperty", "number", 42), 42);
        });
        it("Gets boolean default", async () => {
            assert.strictEqual(await _cpm.getTypedProperty("getBooleanProperty", "boolean", true), true);
        });
        it("Gets RegExp default", async () => {
            let _comp = new RegExp("/^Test/g");
            let _regexp = await _pm.getTypedProperty("getRegExpProperty", "regexp", new RegExp("/^Test/g"));
            assert.strictEqual(_regexp instanceof RegExp, true, "Instance of RegExp");
            assert.deepStrictEqual(_regexp, _comp, "Same expression.");
        });
        it("Gets MockObject from JSON default", async () => {
            let _object = await _cpm.getTypedProperty("getObject", "object", {key: "mock_key", value: "mock_value"}, createMockObject);
            assert.deepStrictEqual(_object instanceof MockObject, true, "Instanceof MockObject");
            assert.deepStrictEqual(_object, new MockObject("mock_key", "mock_value"), "Mock object has correct values.");
        });
    });
});

