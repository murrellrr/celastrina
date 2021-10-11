const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {LocalJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtConfiguration, JwtSentry} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");


describe("JwtSentry", () => {
    describe("#authenticate(context)", () => {

        it("authenticates a valid user", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            _config.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _jwts = new JwtSentry();
            /**@type{JwtSubject}*/let result = await _jwts.authenticate(_mctx);
            assert.strictEqual(result.issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(result.audience, "aefff932-5d4e-4216-a117-0d42e47b06b7", "Expected 'aefff932-5d4e-4216-a117-0d42e47b06b7'.");
            assert.deepStrictEqual(result.roles, ["mock_user_role"], "Expected ['mock_user_role']");
        });
        it("fails an invalid user due to bad token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken + "_invalid_stuffs";
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            _config.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _jwts = new JwtSentry();
            try {
                /**@type{JwtSubject}*/let result = await _jwts.authenticate(_mctx);
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
        it("fails an invalid user due to bad issuer", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock/fail", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            _config.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _jwts = new JwtSentry();
            try {
                /**@type{JwtSubject}*/let result = await _jwts.authenticate(_mctx);
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
        it("fails an invalid user due to bad audience", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7_fail"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _pm.mockProperty("celastrinajsmocktoken_prop", "celastrinajsmocktoken");
            _config.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            let _mctx = new MockHTTPContext(_azctx, _config);
            let _jwts = new JwtSentry();
            try {
                /**@type{JwtSubject}*/let result = await _jwts.authenticate(_mctx);
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
    });
});

