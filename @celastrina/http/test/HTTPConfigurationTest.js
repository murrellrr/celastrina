const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPConfiguration} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockSessionManager} = require("./SessionManagerTest");
const assert = require("assert");

describe("HTTPConfiguration", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _cfg = new HTTPConfiguration("HTTPConfigurationTest");
            assert.strictEqual(_cfg.sessionManager, null, "Expected null.");
            assert.strictEqual(_cfg.allowAnonymous, true, "Expected true.");
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
        it("Sets anon access", () => {
            _cfg.setAllowAnonymous(true);
            assert.deepStrictEqual(_cfg.allowAnonymous, true, "Expected true.");
        });
        it("Sets anon access default", () => {
            _cfg.setAllowAnonymous();
            assert.deepStrictEqual(_cfg.allowAnonymous, false, "Expected false.");
        });
        it("Set anon access returns HTTPConfiguration", () => {
            assert.deepStrictEqual(_cfg.setAllowAnonymous() instanceof HTTPConfiguration, true, "Expected 'HTTPConfiguration'.");
        });
    });
});

