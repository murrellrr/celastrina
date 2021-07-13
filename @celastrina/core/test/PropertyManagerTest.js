const {CelastrinaError, LOG_LEVEL, PropertyManager, CachePropertyManager, AppSettingsPropertyManager} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockResourceAuthorization} = require("./ResourceAuthorizationTest");
const assert = require("assert");

"use strict";

process.env["mock_env_var_one"]   = "mock_env_val_one";
process.env["mock_env_var_two"]   = 42;
process.env["mock_env_var_three"] = true;
process.env["mock_env_var_four"]  = "{\"key\": \"mock_key\", \"value\": \"mock_value\"}";

class MockPropertyManager extends PropertyManager {
    constructor() {
        super();
        this._properties = {};
        this.initialized = false;
        this.readied = false;
    }
    get name() {return "MockPropertyManager";}
    async initialize(azcontext, config) {
        this.initialized = true;
    }
    async ready(azcontext, config) {
        this.readied = true;
    }
    mockProperty(key, value) {
        this._properties[key] = value;
    }
    async _getProperty(key) {
        return this._properties[key];
    }
}

describe("PropertyManager", () => {
    describe("#getProperty(key, defaultValue = null)", () => {
        it("Rejects with Not Implemented exception.", () => {
            let _pm = new PropertyManager();
            let _err = new CelastrinaError("Not Implemented.");
            assert.rejects(_pm.getProperty("key"), _err);
        });
    });
});
describe("AppSettingsPropertyManager", () => {
    let _pm = new AppSettingsPropertyManager();
    describe("#get name()", () => {
        it("returns 'AppSettingsPropertyManager'", () => {
            assert.strictEqual(_pm.name, "AppSettingsPropertyManager");
        });
    });
    describe("#initialize(azcontext, config)", () => {
        let _azcontext = new MockAzureFunctionContext();
        it("Does not reject", () => {
            assert.doesNotReject(_pm.initialize(_azcontext, {}));
        });
    });
    describe("#ready(azcontext, config)", () => {
        let _azcontext = new MockAzureFunctionContext();
        it("Does not reject", () => {
            assert.doesNotReject(_pm.ready(_azcontext, {}));
        });
    });
    describe("#getProperty(key, defaultValue = null)", () => {
        it("Gets property.", async () => {
            assert.strictEqual(await _pm.getProperty("mock_env_var_one"), "mock_env_val_one");
        });
        it("Gets string.", async () => {
            assert.strictEqual(await _pm.getStringProperty("mock_env_var_one"), "mock_env_val_one");
        });
        it("Gets number.", async () => {
            assert.strictEqual(await _pm.getNumberProperty("mock_env_var_two"), 42);
        });
        it("Gets boolean.", async () => {
            assert.strictEqual(await _pm.getBooleanProperty("mock_env_var_three"), true);
        });
        it("Gets object from JSON.", async () => {
            assert.deepStrictEqual(await _pm.getObjectFromJSONProperty("mock_env_var_four"), {key: "mock_key", value: "mock_value"});
        });
        it("Gets string default.", async () => {
            assert.strictEqual(await _pm.getStringProperty("mock_env_var_six", "mock_env_val_one"), "mock_env_val_one");
        });
        it("Gets number default.", async () => {
            assert.strictEqual(await _pm.getNumberProperty("mock_env_var_six", 24), 24);
        });
        it("Gets boolean default.", async () => {
            assert.strictEqual(await _pm.getBooleanProperty("mock_env_var_six", true), true);
        });
        it("Gets object from JSON default.", async () => {
            assert.deepStrictEqual(await _pm.getObjectFromJSONProperty("mock_env_var_six", {key: "mock_key", value: "mock_value"}),
                                    {key: "mock_key", value: "mock_value"});
        });
    });
});

module.exports = {
    MockPropertyManager: MockPropertyManager
};
