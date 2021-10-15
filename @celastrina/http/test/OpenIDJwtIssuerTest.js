const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {OpenIDJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtConfiguration, JwtSentry} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const axios  = require("axios");
const MockAdapter = require("axios-mock-adapter");

describe("OpenIDJwtIssuer", () => {
    let mock = null;
    let token = null;

    before(() => {
        mock = new MockAdapter(axios);
        let privateKey = fs.readFileSync("./test/private.pem");
        let jwk_token = JSON.parse(fs.readFileSync("./test/jkw.json").toString());
        let jwkx5c_token = JSON.parse(fs.readFileSync("./test/jkwx5c.json").toString());
        token = jwt.sign({sub: "0bcadc72-e895-4219-b352-d754459f53f3", iat: 946684800, exmp: 4070908800, nbf: 946684800,
                                 iss: "https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0",
                                 aud: "05f3520b-4cd1-472a-92e2-a3acd538e7ae"}, privateKey,
                          {algorithm: "RS256", header: {kid: "l3sQ-50cCH4xBVZLHTGwnSR7680"}});
        mock.onGet("https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration").reply((config) => {
            return [200, {issuer: "https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0", jwks_uri: "https://login.microsoftonline.com/common/discovery/v2.0/keys"}];
        });
        mock.onGet("https://login.microsoftonline.com/common/v2.0/x5c/.well-known/openid-configuration").reply((config) => {
            return [200, {issuer: "https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0", jwks_uri: "https://login.microsoftonline.com/common/discovery/v2.0/x5c/keys"}];
        });
        mock.onGet("https://login.microsoftonline.com/common/discovery/v2.0/keys").reply((config) => {
            return [200, {keys: [jwk_token]}];
        });
        mock.onGet("https://login.microsoftonline.com/common/discovery/v2.0/x5c/keys").reply((config) => {
            return [200, {keys: [jwkx5c_token]}];
        });
    });
    after(() => {
        mock.restore();
        mock = null;
    });
    describe("#constructor(issuer, keyProperty, audiences = null, assignments = null, validateNonce = false)", () => {
        it("Constructs defaults", () => {
            let _openidjwt = new OpenIDJwtIssuer("@celastrinajs/issuer/mock", "https://mockhost:9999/mock/v2.0/.well-known/openid-configuration");
            assert.strictEqual(_openidjwt._issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_openidjwt._configUrl, "https://mockhost:9999/mock/v2.0/.well-known/openid-configuration", "Expected 'https://mockhost:9999/mock/v2.0/.well-known/openid-configuration'.");
            assert.strictEqual(_openidjwt._audiences, null, "Expected null.");
            assert.strictEqual(_openidjwt._roles, null, "Expected null.");
            assert.strictEqual(_openidjwt._validateNonce, false, "Expected false.");
        });
        it("Constructs values", () => {
            let _openidjwt = new OpenIDJwtIssuer("@celastrinajs/issuer/mock", "https://mockhost:9999/mock/v2.0/.well-known/openid-configuration", ["a"], ["b"], true);
            assert.strictEqual(_openidjwt._issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_openidjwt._configUrl, "https://mockhost:9999/mock/v2.0/.well-known/openid-configuration", "Expected 'https://mockhost:9999/mock/v2.0/.well-known/openid-configuration'.");
            assert.deepStrictEqual(_openidjwt._audiences, ["a"], "Expected ['a'].");
            assert.deepStrictEqual(_openidjwt._roles, ["b"], "Expected ['b'].");
            assert.strictEqual(_openidjwt._validateNonce, true, "Expected true.");
        });
    });
    describe("#verify(context, _subject)", () => {
        it("Verifies valid token, non x5c", async () => {
            let _mocktoken = token;
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = new OpenIDJwtIssuer("https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0", "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration", ["05f3520b-4cd1-472a-92e2-a3acd538e7ae"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), true, "Expected true.");
        });
        it("Verifies valid token, x5c", async () => {
            let _mocktoken = token;
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = new OpenIDJwtIssuer("https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0", "https://login.microsoftonline.com/common/v2.0/x5c/.well-known/openid-configuration", ["05f3520b-4cd1-472a-92e2-a3acd538e7ae"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), true, "Expected true.");
        });
        it("Does not verify invalid issuer", async () => {
            let _mocktoken = token;
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken + "_invalid";
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = new OpenIDJwtIssuer("https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df_invalid/v2.0", "https://login.microsoftonline.com/common/v2.0/x5c/.well-known/openid-configuration", ["05f3520b-4cd1-472a-92e2-a3acd538e7ae"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), false, "Expected false.");
        });
        it("Does not verify invalid audience", async () => {
            let _mocktoken = token;
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken + "_invalid";
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = new OpenIDJwtIssuer("https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0", "https://login.microsoftonline.com/common/v2.0/x5c/.well-known/openid-configuration", ["05f3520b-4cd1-472a-92e2-a3acd538e7ae_invalid"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), false, "Expected false.");
        });
        it("Does not verify invalid token", async () => {
            let _mocktoken = token;
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken + "_invalid";
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = new OpenIDJwtIssuer("https://login.microsoftonline.com/7354014b-4eb7-48c6-ba0c-420dbde2c8df/v2.0", "https://login.microsoftonline.com/common/v2.0/x5c/.well-known/openid-configuration", ["05f3520b-4cd1-472a-92e2-a3acd538e7ae"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            _subject._token = _mocktoken + "_invalid";
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), false, "Expected false.");
        });
    });
});
