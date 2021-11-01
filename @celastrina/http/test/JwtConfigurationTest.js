const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPParameter, HeaderParameter, JwtConfiguration} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockBaseIssuer} = require("./BaseIssuerTest");
const assert = require("assert");


describe("JwtConfiguration", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _config = new JwtConfiguration("JwtConfigurationTest");
            let _mtoken = new HeaderParameter();
            assert.deepStrictEqual(_config._config[JwtConfiguration.CONFIG_JWT_ISSUERS], [], "Expected empty array.");
            assert.deepStrictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_PARAMETER], _mtoken, "Expected HeaderParameter.");
            assert.strictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_NAME], "authorization", "Expected 'authorization'.");
            assert.strictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME], "Bearer", "Expected 'Bearer'.");
            assert.strictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME_REMOVE], true, "Expected true.");
        });
    });
    describe("Accessors", () => {
        let _config = new JwtConfiguration("JwtConfigurationTest");
        let _mtoken = new HeaderParameter();
        it("Gets issuers", () => {
            assert.deepStrictEqual(_config.issuers, [], "Expected empty array.");
        });
        it("Gets parameter", () => {
            assert.deepStrictEqual(_config.parameter, _mtoken, "Expected JwtHeaderToken.");
        });
        it("Gets token", () => {
            assert.deepStrictEqual(_config.token, "authorization", "Expected 'authorization'.");
        });
        it("Gets scheme", () => {
            assert.strictEqual(_config.scheme, "Bearer", "Expected 'Bearer'.");
        });
        it("Gets remove scheme", () => {
            assert.strictEqual(_config.removeScheme, true, "Expected true.");
        });
        it("Sets issuers", () => {
            let _issuer = new MockBaseIssuer();
            assert.strictEqual(_config.setIssuers([_issuer]) instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.issuers, [_issuer], "Expected MockBaseIssuer.");
            _config.issuers = [];
            assert.deepStrictEqual(_config.issuers, [], "Expected Empty Array.");
        });
        it("Adds issuer", () => {
            let _issuer = new MockBaseIssuer();
            assert.strictEqual(_config.addIssuer(_issuer) instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.issuers, [_issuer], "Expected MockBaseIssuer.");
        });
        it("Sets parameter", () => {
            let _token = new HeaderParameter();
            assert.strictEqual(_config.setParameter(_token) instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.parameter, _token, "Expected HeaderParameter.");
        });
        it("Sets token", () => {
            assert.strictEqual(_config.setToken("value") instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.token, "value", "Expected 'value'.");
        });
        it("Sets scheme", () => {
            assert.strictEqual(_config.setScheme("Cert ") instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.scheme, "Cert ", "Expected 'Cert '.");
        });
        it("Sets remove scheme", () => {
            assert.strictEqual(_config.setRemoveScheme(true) instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.strictEqual(_config.removeScheme, true, "Expected true.");
            _config.setRemoveScheme(false);
            assert.strictEqual(_config.removeScheme, false, "Expected false.");
        });
    });
});
