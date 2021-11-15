const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, instanceOfCelastringType, Configuration} = require("@celastrina/core");
const {HMAC, HMACConfigurationParser, HMACAddOn} = require("../HTTP");
const assert = require("assert");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");

describe("HMACConfigurationParserTest", () => {
    describe("#_create(_Object)", () => {
        it("should set HMAC in config", async () => {
            let _azcontext = new MockAzureFunctionContext();
            let _config = new Configuration("HMACConfigurationParserTest");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _hmac = new HMAC("1234567890123456");
            let _object = {
                _content: {type: "application/vnd.celastrinajs.config+json;HMAC"},
                hmac: _hmac
            };
            let _parser = new HMACConfigurationParser();
            await _parser.initialize(_azcontext, _config._config);
            await _parser.parse(_object);
            assert.deepStrictEqual(_config.getValue(HMACAddOn.CONFIG_HMAC), _hmac, "Expected _hmac.")
        });
    });
});
