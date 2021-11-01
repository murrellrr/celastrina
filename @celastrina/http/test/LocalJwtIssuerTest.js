const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {LocalJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtConfiguration, JwtSentry} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");

describe("LocalJwtIssuer", () => {
    describe("#constructor(issuer, keyProperty, audiences = null, assignments = null, validateNonce = false)", () => {
        it("Constructs defaults", () => {
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop");
            assert.strictEqual(_localjwt._issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_localjwt._key, "celastrinajsmocktoken_prop", "Expected 'celastrinajsmocktoken_prop'.");
            assert.strictEqual(_localjwt._audiences, null, "Expected null.");
            assert.strictEqual(_localjwt._roles, null, "Expected null.");
            assert.strictEqual(_localjwt._validateNonce, false, "Expected false.");
        });
        it("Constructs values", () => {
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["a"], ["b"], true);
            assert.strictEqual(_localjwt._issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_localjwt._key, "celastrinajsmocktoken_prop", "Expected 'celastrinajsmocktoken_prop'.");
            assert.deepStrictEqual(_localjwt._audiences, ["a"], "Expected ['a'].");
            assert.deepStrictEqual(_localjwt._roles, ["b"], "Expected ['b'].");
            assert.strictEqual(_localjwt._validateNonce, true, "Expected true.");
        });
    });
    describe("#verify(context, _subject)", () => {
        it("Verifies valid token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _localjwt.verify(_mctx, _subject), true, "Expected true.");
        });
        it("Does not verifies invalid issuer", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock/invalid", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _localjwt.verify(_mctx, _subject), false, "Expected false.");
        });
        it("Does not verifies invalid audience", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7_INVALID"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            assert.strictEqual(await _localjwt.verify(_mctx, _subject), false, "Expected false.");
        });
        it("Does not verifies invalid token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7_INVALID"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _subject = await JwtSubject.decode(_mocktoken);
            // Gonne break the token
            _subject._token += "invalid";
            assert.strictEqual(await _localjwt.verify(_mctx, _subject), false, "Expected false.");
        });
    });
});
