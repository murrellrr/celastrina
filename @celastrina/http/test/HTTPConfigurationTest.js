const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPConfiguration} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockSessionManager} = require("./SessionManagerTest");
const assert = require("assert");

describe("HTTPConfiguration", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _cfg = new HTTPConfiguration("HTTPConfigurationTest", "property");
            assert.strictEqual(_cfg.sessionManager, null, "Expected null.");
        });
    });
    describe("Accessors", () => {
        let _cfg = new HTTPConfiguration("HTTPConfigurationTest");
        it("Sets session manager", () => {
            let _sm = new MockSessionManager();
            _cfg.setSessionManager(_sm);
            assert.deepStrictEqual(_cfg.sessionManager, _sm, "Expected _sm.");
        });
        it("Sets session manager", () => {
            _cfg.setSessionManager();
            assert.deepStrictEqual(_cfg.sessionManager, null, "Expected null.");
        });
        it("Set session manager returns HTTPConfiguration", () => {
            assert.deepStrictEqual(_cfg.setSessionManager() instanceof HTTPConfiguration, true, "Expected 'HTTPConfiguration'.");
        });
    });
});

