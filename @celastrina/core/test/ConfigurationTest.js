const {CelastrinaError, ConfigurationItem, Configuration} = require("../Core");
const assert = require("assert");

class MockConfigurationItem extends ConfigurationItem {
    constructor() {
        super();
    }
    get key() {return "mock-key";}
    get value() {return "mock-value";}
}



describe("Configuration", () => {
    describe("#constructor(name)", () => {
        it("must set name.", () => {
            let _config = new Configuration("test");
            assert.strictEqual(_config.name, "test");
        });
        it("must throw error when name is null.", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration(null);}, err);
        });
        it("must throw error when name is empty string.", () => {
            let err = new CelastrinaError("Invalid configuration. Name cannot be undefined, null or 0 length.");
            assert.throws(() => {let _config = new Configuration("");}, err);
        });
        it("must throw error when name is not string.", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration(42);}, err);
        });
        it("must throw error when name does not exist.", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration();}, err);
        });
        it("Loaded must default false", () => {
            let _config = new Configuration("test");
            assert.strictEqual(_config.loaded, false);
        });
    });
    describe("values", () => {
        describe("#setValue(key , value)", () => {
            let _config = new Configuration("test");
            it("Must throw error if key is null.", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue(null, "mock-value")}, err);
            });
            it("Must throw error if key is zero length.", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue("", "mock-value")}, err);
            });
            it("Must throw error if key is undefined.", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue(undefined, "mock-value")}, err);
            });
            it("Mest set value string at key.", () => {
                _config.setValue("mock-key", "mock-value");
                assert.strictEqual(_config._config["mock-key"], "mock-value");
            });
            it("Mest set value number at key.", () => {
                _config.setValue("mock-key", 42);
                assert.strictEqual(_config._config["mock-key"], 42);
            });
            it("Mest set value boolean at key.", () => {
                _config.setValue("mock-key", true);
                assert.strictEqual(_config._config["mock-key"], true);
            });
            it("Mest set value Object at key.", () => {
                let _test = {value: 123456789};
                _config.setValue("mock-key", _test);
                assert.strictEqual(_config._config["mock-key"], _test);
            });
        });
        describe("#getValue(key , defaultValue = null)", () => {
            let _config = new Configuration("test");
            it("must return null if key not found and defaultValue not set.", () => {
                assert.strictEqual(_config.getValue("mock-key"), null);
            });
            it("must return defaultValue if key not found.", () => {
                let _default = "default";
                assert.strictEqual(_config.getValue("mock-key", _default), _default);
            });
            it("must return string 'mock-value' if key not found.", () => {
                _config.setValue("mock-key", "mock-value")
                assert.strictEqual(_config.getValue("mock-key"), "mock-value");
            });
            it("must return number '42' if key not found.", () => {
                _config.setValue("mock-key", 42)
                assert.strictEqual(_config.getValue("mock-key"), 42);
            });
            it("must return boolean 'true' if key not found.", () => {
                _config.setValue("mock-key", true)
                assert.strictEqual(_config.getValue("mock-key"), true);
            });
            it("must return object '{value: 123456789}' if key not found.", () => {
                let _test = {value: 123456789};
                _config.setValue("mock-key", _test)
                assert.strictEqual(_config.getValue("mock-key"), _test);
            });
        });
    });
    describe("permissions", () => {
        describe("addPermission(permission)", () => {
            //
        });
    });
    describe("#setConfigurationItem(config)", () => {
        it("must set configiration value.", () => {
            let _config = new Configuration("test");
            let _mock = new MockConfigurationItem()
            _config.setConfigurationItem(_mock);
            let _result = _config.getValue("mock-key")
            assert.strictEqual(_result, _mock);
            assert.strictEqual(_result.value, "mock-value");
        });
    });
});
