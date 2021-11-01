const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {OpenIDJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtConfiguration, JwtSentry} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {MockMicrosoftOpenIDIDPServer} = require("./AzureOpenIDIPDMock");
const assert = require("assert");
const jwt = require("jsonwebtoken");

describe("OpenIDJwtIssuer", () => {
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
            let _azctx  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azctx.req.headers);

            await _mockopenid.start();
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_response.access_token);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), true, "Expected true.");
            await _mockopenid.stop();
        });
        it("Verifies valid token, x5c", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azctx.req.headers);

            await _mockopenid.start(true);
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_response.access_token);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), true, "Expected true.");
            await _mockopenid.stop();
        });
        it("Does not verify invalid issuer", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azctx.req.headers);

            await _mockopenid.start(true);
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud], true);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_response.access_token);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), false, "Expected false.");
            await _mockopenid.stop();
        });
        it("Does not verify invalid audience", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azctx.req.headers);

            await _mockopenid.start(true);
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud + "_foozled"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_response.access_token);
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), false, "Expected false.");
            await _mockopenid.stop();
        });
        it("Does not verify invalid token", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azctx.req.headers, true);

            await _mockopenid.start(true);
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("OpenIDJwtIssuerTest");
            let _openidjwt = new OpenIDJwtIssuer(_response.iss, _mockopenid.configPath, [_response.aud], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_response.access_token);
            _subject._token = _response + "_foozled";
            assert.strictEqual(await _openidjwt.verify(_mctx, _subject), false, "Expected false.");
            await _mockopenid.stop();
        });
    });
});
