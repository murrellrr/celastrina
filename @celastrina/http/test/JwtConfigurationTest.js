const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPParameter, JwtToken, JwtHeaderToken, JwtAnonymousTokenConfig, JwtConfiguration} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockBaseIssuer} = require("./BaseIssuerTest");
const {MockJwtToken} = require("./JwtTokenMock");
const assert = require("assert");

describe("JwtAnonymousTokenConfig", () => {
    describe("#constructor(issuer = \"@celastrinajs/http/anonymous\", audience = \"@celastrinajs/http/anonymous\", secret = \"@celastrinajs/http/anonymous\", expires = 300)", () => {
        it("Sets defaults", () => {
            let _tokencfg = new JwtAnonymousTokenConfig();
            assert.strictEqual(_tokencfg.iss, "@celastrinajs/http/anonymous", "Expected '@celastrinajs/http/anonymous'.");
            assert.strictEqual(_tokencfg.aud, "@celastrinajs/http/anonymous", "Expected '@celastrinajs/http/anonymous'.");
            assert.strictEqual(_tokencfg.exp, 300, "Expected 300.");
            assert.strictEqual(_tokencfg.secret, "@celastrinajs/http/anonymous", "Expected '@celastrinajs/http/anonymous'.");
        });
        it("Sets values", () => {
            let _tokencfg = new JwtAnonymousTokenConfig("test_vaue_1", "test_vaue_2", "test_vaue_3", 99);
            assert.strictEqual(_tokencfg.iss, "test_vaue_1", "Expected 'test_vaue_1'.");
            assert.strictEqual(_tokencfg.aud, "test_vaue_2", "Expected 'test_vaue_2'.");
            assert.strictEqual(_tokencfg.exp, 99, "Expected 99.");
            assert.strictEqual(_tokencfg.secret, "test_vaue_3", "Expected 'test_vaue_3'.");
        });
    });
});
describe("JwtConfiguration", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _config = new JwtConfiguration("JwtConfigurationTest");
            let _mtoken = new JwtHeaderToken();
            let _mock   = new JwtAnonymousTokenConfig("@celastrinajs/http/anonymous/JwtConfigurationTest",
                                                    "@celastrinajs/http/anonymous/JwtConfigurationTest",
                                                      "@celastrinajs/http/anonymous/JwtConfigurationTest", 300);
            assert.deepStrictEqual(_config._config[JwtConfiguration.CONFIG_JWT_ISSUERS], [], "Expected empty array.");
            assert.deepStrictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN], _mtoken, "Expected JwtHeaderToken.");
            assert.strictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME], "Bearer ", "Expected 'Bearer'.");
            assert.strictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME_REMOVE], true, "Expected true.");
            assert.strictEqual(_config._config[JwtConfiguration.CONFIG_HTTP_PERMISSIONS_ALLOW_ANONYMOUS], false, "Expected false.");
            assert.deepStrictEqual(_config._config[JwtConfiguration.CONFIG_JWT_TOKEN_ANON_CONFIG], _mock, "Expected _mock.");
        });
    });
    describe("Accessors", () => {
        let _config = new JwtConfiguration("JwtConfigurationTest");
        let _mtoken = new JwtHeaderToken();
        let _mock   = new JwtAnonymousTokenConfig("@celastrinajs/http/anonymous/JwtConfigurationTest",
                                                "@celastrinajs/http/anonymous/JwtConfigurationTest",
                                                  "@celastrinajs/http/anonymous/JwtConfigurationTest", 300);
        it("Gets issuers", () => {
            assert.deepStrictEqual(_config.issuers, [], "Expected empty array.");
        });
        it("Gets token", () => {
            assert.deepStrictEqual(_config.token, _mtoken, "Expected JwtHeaderToken.");
        });
        it("Gets scheme", () => {
            assert.strictEqual(_config.scheme, "Bearer ", "Expected 'Bearer'.");
        });
        it("Gets remove scheme", () => {
            assert.strictEqual(_config.removeScheme, true, "Expected true.");
        });
        it("Gets allow anonymous", () => {
            assert.strictEqual(_config.allowAnonymous, false, "Expected false.");
        });
        it("Gets anonymous config", () => {
            assert.deepStrictEqual(_config.anonymousConfig, _mock, "Expected _mock.");
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
        it("Sets token", () => {
            let _token = new MockJwtToken();
            assert.strictEqual(_config.setToken(_token) instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.token, _token, "Expected MockJwtToken.");
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
        it("Sets anon config", () => {
            let _mock = new JwtAnonymousTokenConfig("@celastrinajs/http/mock/JwtConfigurationTest",
                                                    "@celastrinajs/http/mock/JwtConfigurationTest",
                                                      "@celastrinajs/http/mock/JwtConfigurationTest", 300);
            assert.strictEqual(_config.setAnonymousConfig(_mock) instanceof JwtConfiguration, true, "Expected JwtConfiguration.");
            assert.deepStrictEqual(_config.anonymousConfig, _mock, "Expected _mock.");
        });
    });
});
