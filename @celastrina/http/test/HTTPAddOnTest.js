const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPAddOn, JwtAddOn} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockSessionManager} = require("./SessionManagerTest");
const assert = require("assert");

describe("HTTPAddOn", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            assert.strictEqual(_httpconfig.sessionManager, null, "Expected null.");
        });
    });
    describe("Accessors", () => {
        it("Sets session manager", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            let _sm = new MockSessionManager();
            _httpconfig.setSessionManager(_sm);
            assert.deepStrictEqual(_httpconfig.sessionManager, _sm, "Expected _sm.");
        });
        it("Sets session manager", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            _httpconfig.setSessionManager();
            assert.deepStrictEqual(_httpconfig.sessionManager, null, "Expected null.");
        });
        it("Set session manager returns HTTPAddOn", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            assert.deepStrictEqual(_httpconfig.setSessionManager() instanceof HTTPAddOn, true, "Expected 'HTTPAddOn'.");
        });
    });
});

