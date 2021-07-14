const {CelastrinaError, ConfigurationItem, Configuration, AppSettingsPropertyManager} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockAuthorizationManager} = require("./ResourceAuthorizationTest");
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
        it("must set name", () => {
            let _config = new Configuration("test");
            assert.strictEqual(_config.name, "test");
        });
        it("must throw error when name is null", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration(null);}, err);
        });
        it("must throw error when name is empty string", () => {
            let err = new CelastrinaError("Invalid configuration. Name cannot be undefined, null or 0 length.");
            assert.throws(() => {let _config = new Configuration("");}, err);
        });
        it("must throw error when name is not string", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration(42);}, err);
        });
        it("must throw error when name does not exist", () => {
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
            it("Must throw error if key is null", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue(null, "mock-value")}, err);
            });
            it("Must throw error if key is zero length", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue("", "mock-value")}, err);
            });
            it("Must throw error if key is undefined", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue(undefined, "mock-value")}, err);
            });
            it("Mest set value string at key", () => {
                _config.setValue("mock-key", "mock-value");
                assert.strictEqual(_config._config["mock-key"], "mock-value");
            });
            it("Mest set value number at key", () => {
                _config.setValue("mock-key", 42);
                assert.strictEqual(_config._config["mock-key"], 42);
            });
            it("Mest set value boolean at key", () => {
                _config.setValue("mock-key", true);
                assert.strictEqual(_config._config["mock-key"], true);
            });
            it("Mest set value Object at key", () => {
                let _test = {value: 123456789};
                _config.setValue("mock-key", _test);
                assert.strictEqual(_config._config["mock-key"], _test);
            });
        });
        describe("#getValue(key , defaultValue = null)", () => {
            let _config = new Configuration("test");
            it("must return null if key not found and defaultValue not set", () => {
                assert.strictEqual(_config.getValue("mock-key"), null);
            });
            it("must return defaultValue if key not found", () => {
                let _default = "default";
                assert.strictEqual(_config.getValue("mock-key", _default), _default);
            });
            it("must return string 'mock-value' if key not found", () => {
                _config.setValue("mock-key", "mock-value")
                assert.strictEqual(_config.getValue("mock-key"), "mock-value");
            });
            it("must return number '42' if key not found", () => {
                _config.setValue("mock-key", 42)
                assert.strictEqual(_config.getValue("mock-key"), 42);
            });
            it("must return boolean 'true' if key not found", () => {
                _config.setValue("mock-key", true)
                assert.strictEqual(_config.getValue("mock-key"), true);
            });
            it("must return object '{value: 123456789}' if key not found", () => {
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
        it("must set configiration value", () => {
            let _config = new Configuration("test");
            let _mock = new MockConfigurationItem();
            _config.setConfigurationItem(_mock);
            let _result = _config.getValue("mock-key");
            assert.strictEqual(_result, _mock);
            assert.strictEqual(_result.value, "mock-value");
        });
    });
    describe("#initialize(azcontext)", () => {
        let _azcontext = new MockAzureFunctionContext();
        it("Should initialize specified property and authorization managers", async () => {
            let _config = new Configuration("mock_configuration");
            let _pm = new MockPropertyManager();
            let _am = new MockAuthorizationManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setValue(Configuration.CONFIG_AUTHORIATION, _am);
            await _config.initialize(_azcontext);
            assert.strictEqual(_config.properties, _pm);
            assert.strictEqual(_config.authorizations, _am);
            assert.strictEqual(_config.loaded, false, "Should not be loaded yet.");
            assert.strictEqual(_pm.initialized, true, "PropertyManager Initialized.");
            assert.strictEqual(_pm.readied, true, "PropertyManager Readied.");
            assert.strictEqual(_am.initialized, true, "AuthorizationManager Initialized.");
            assert.strictEqual(_am.readied, true, "AuthorizationManager Readied.");
        });
        it("Should initialize default property and authorization managers", async () => {
            let _config = new Configuration("mock_configuration");
            await _config.initialize(_azcontext);
            assert.notStrictEqual(_config.properties, null, "PropertyManager should not be null.");
            assert.strictEqual(_config.properties instanceof AppSettingsPropertyManager, true, "PropertyManager should not be AppSettingsPropertyManager.");
            assert.notStrictEqual(_config.authorizations, null, "AuthorizationManager should not be null.");
            assert.strictEqual(_config.loaded, false, "Should not be loaded yet.");
        });
    });
});
