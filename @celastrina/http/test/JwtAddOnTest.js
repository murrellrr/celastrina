const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPParameter, HeaderParameter, JwtAddOn} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockIssuer} = require("./IssuerTest");
const assert = require("assert");


describe("JwtAddOn", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _mtoken = new HeaderParameter();
            assert.deepStrictEqual(_config._config[JwtAddOn.CONFIG_JWT_ISSUERS], [], "Expected empty array.");
            assert.deepStrictEqual(_config._config[JwtAddOn.CONFIG_JWT_TOKEN_PARAMETER], _mtoken, "Expected HeaderParameter.");
            assert.strictEqual(_config._config[JwtAddOn.CONFIG_JWT_TOKEN_NAME], "authorization", "Expected 'authorization'.");
            assert.strictEqual(_config._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME], "Bearer", "Expected 'Bearer'.");
            assert.strictEqual(_config._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME_REMOVE], true, "Expected true.");
        });
    });
    describe("Accessors", () => {
        it("Gets issuers", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.deepStrictEqual(_jwtconfig.issuers, [], "Expected empty array.");
        });
        it("Gets parameter", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _param = new HeaderParameter();
            assert.deepStrictEqual(_jwtconfig.parameter, _param, "Expected JwtHeaderToken.");
        });
        it("Gets token", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.deepStrictEqual(_jwtconfig.token, "authorization", "Expected 'authorization'.");
        });
        it("Gets scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.scheme, "Bearer", "Expected 'Bearer'.");
        });
        it("Gets remove scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.removeScheme, true, "Expected true.");
        });
        it("Sets issuers", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _issuer = new MockIssuer();
            assert.strictEqual(_jwtconfig.setIssuers([_issuer]) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.issuers, [_issuer], "Expected MockBaseIssuer.");
            _jwtconfig.issuers = [];
            assert.deepStrictEqual(_jwtconfig.issuers, [], "Expected Empty Array.");
        });
        it("Adds issuer", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _issuer = new MockIssuer();
            assert.strictEqual(_jwtconfig.addIssuer(_issuer) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.issuers, [_issuer], "Expected MockBaseIssuer.");
        });
        it("Sets parameter", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _token = new HeaderParameter();
            assert.strictEqual(_jwtconfig.setParameter(_token) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.parameter, _token, "Expected HeaderParameter.");
        });
        it("Sets token", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.setToken("value") instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.token, "value", "Expected 'value'.");
        });
        it("Sets scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.setScheme("Cert ") instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.scheme, "Cert ", "Expected 'Cert '.");
        });
        it("Sets remove scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.setRemoveScheme(true) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.strictEqual(_jwtconfig.removeScheme, true, "Expected true.");
            _jwtconfig.setRemoveScheme(false);
            assert.strictEqual(_jwtconfig.removeScheme, false, "Expected false.");
        });
    });
});
