const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {JwtHeaderToken, HeaderParameter, HTTPConfiguration} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");

describe("JwtHeaderToken", () => {
    describe("#constructor(name = \"authorization\")", () => {
        it("Sets defautls", () => {
            let _token = new JwtHeaderToken();
            assert.strictEqual(_token._name, "authorization", "Expected 'Authorization'.");
            assert.strictEqual(_token._param instanceof HeaderParameter, true, "Expected 'authorization'.");
        });
        it("Returns name", () => {
            let _token = new JwtHeaderToken();
            assert.strictEqual(_token.name, "authorization", "Expected 'authorization'.");
        });
        it("Sets name", () => {
            let _token = new JwtHeaderToken("Custom Token");
            assert.strictEqual(_token.name, "Custom Token", "Expected 'Custom Token'.");
        });
    });
    describe("#async get(context, defaultValue = null)", () => {
        let _azcontext = new MockAzureFunctionContext();
        let _mcfg      = new HTTPConfiguration("JwtHeaderTokenTest");
        let _mctx      = new MockHTTPContext(_azcontext, _mcfg);
        let _token     = new JwtHeaderToken();
        _azcontext.req.headers["authorization"] = "Bearer _token_value_test";
        it("Gets token", async () => {
            let _token = new JwtHeaderToken();
            assert.strictEqual(await _token.get(_mctx), "Bearer _token_value_test", "Expected 'Bearer _token_value_test'.");
        });
    });
});
