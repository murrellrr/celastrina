const {CelastrinaError, LOG_LEVEL, ContentLoader, ConfigurationLoader} = require("../Core");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const fs = require("fs");

describe("ConfigurationLoader", () => {
    describe("#constructor(property)", () => {
        it("Should succeed with valid property", () => {
            let _loader = new ConfigurationLoader("mock_property");
            assert.strictEqual(_loader._property, "mock_property", "Set property");
            assert.strictEqual(_loader._loader instanceof ContentLoader, true, "loader is ContentLoader.");
        });
        it("Should fail with null", () => {
            let _err = new CelastrinaError("[ConfigurationLoader]: Argument 'property' is required.", 400);
            assert.throws(() => {let _loader = new ConfigurationLoader(null);}, _err);
        });
        it("Should fail with 0 length string", () => {
            let _err = new CelastrinaError("[ConfigurationLoader]: Argument 'property' is required.", 400);
            assert.throws(() => {let _loader = new ConfigurationLoader("");}, _err);
        });
        it("Should fail with empty string", () => {
            let _err = new CelastrinaError("[ConfigurationLoader]: Argument 'property' is required.", 400);
            assert.throws(() => {let _loader = new ConfigurationLoader("          ");}, _err);
        });
        it("Should trim string", () => {
            let _loader = new ConfigurationLoader("     mock_property     ");
            assert.strictEqual(_loader._property, "mock_property", "Trim property");
        });
        it("Should fail when spaces are in the middle of string", () => {
            let _err = new CelastrinaError("[ConfigurationLoader]: Argument 'property' is required.", 400);
            assert.throws(() => {let _loader = new ConfigurationLoader("mock _ property");}, _err);
        });
    });
    describe("#load(pm, config)", () => {
        let _loader = new ConfigurationLoader("mock_property");
        let _pm = new MockPropertyManager();
        _pm.mockProperty("mock_property", fs.readFileSync("./test/configuration.json", "utf8"));
        let _config = {};
        let _azcontext = new MockAzureFunctionContext();
        it("Loads config file to config object", async () => {
            let _err = new CelastrinaError("[ConfigurationLoader]: Invalid property 'mock_property'.", 400);
            await assert.doesNotReject(_loader.load(_pm, _azcontext, _config));
        });
    });
});
