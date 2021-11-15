const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration, AddOn} = require("../../core/Core");
const {LocalJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtAddOn, JwtAuthenticator, HTTPAddOn} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");

describe("JwtAuthenticator", () => {
    describe("#authenticate(context)", () => {
        it("authenticates a valid user", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7", exp: 1857350304};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtAuthenticator");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            _jwtconfig.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            await _config.initialize(_azctx);
            await _config.ready();
            let _context = new MockHTTPContext(_config);

            let _subject = new JwtSubject(await _config.sentry.authenticate(_context));
            assert.strictEqual(_subject.issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_subject.audience, "aefff932-5d4e-4216-a117-0d42e47b06b7", "Expected 'aefff932-5d4e-4216-a117-0d42e47b06b7'.");
            assert.deepStrictEqual(_subject.subject.roles, new Set(["mock_user_role"]), "Expected ['mock_user_role']");
        });
        it("fails an invalid user due to bad token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7", exp: 1857350304};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken + "_foozled";
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            _jwtconfig.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            await _config.initialize(_azctx);
            await _config.ready();
            let _context = new MockHTTPContext(_config);

            try {
                let _subject = new JwtSubject(await _config.sentry.authenticate(_context));
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
        it("fails an invalid user due to bad issuer", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock/foozled", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7", exp: 1857350304};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            _jwtconfig.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            await _config.initialize(_azctx);
            await _config.ready();
            let _context = new MockHTTPContext(_config);

            try {
                let _subject = new JwtSubject(await _config.sentry.authenticate(_context));
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
        it("fails an invalid user due to bad audience", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7_foozled", exp: 1857350304};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            _azctx.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            _jwtconfig.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            await _config.initialize(_azctx);
            await _config.ready();
            let _context = new MockHTTPContext(_config);

            try {
                let _subject = new JwtSubject(await _config.sentry.authenticate(_context));
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
        it("fails an invalid user due to no token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7", exp: 1857350304};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azctx  = new MockAzureFunctionContext();
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            _jwtconfig.addIssuer(new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]));
            await _config.initialize(_azctx);
            await _config.ready();
            let _context = new MockHTTPContext(_config);

            try {
                let _subject = new JwtSubject(await _config.sentry.authenticate(_context));
                assert.fail("Expected 401, not authorized CelastrinaException.");
            }
            catch(exception) {
                // do nothing
            }
        });
    });
});

