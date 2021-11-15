const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {OpenIDJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtAddOn, JwtSentry, HTTPAddOn} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {MockMicrosoftOpenIDIDPServer} = require("./AzureOpenIDIPDMock");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const {Subject} = require("@celastrina/core");

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
            let _azcontext  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azcontext.bindings.req.headers);
            /**@type{Configuration}*/let _config = new Configuration("OpenIDJwtIssuerTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();

            await _mockopenid.start();
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud]);
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _response.access_token);
            let _assertion = {assignments: ["mock_user_role"], verified: true};
            assert.deepStrictEqual(await _openidjwt.verify(_context, _jwtsubject), _assertion, "Expected _assertion.");
            await _mockopenid.stop();
        });
        it("Verifies valid token, x5c", async () => {
            let _azcontext  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azcontext.bindings.req.headers);
            /**@type{Configuration}*/let _config = new Configuration("OpenIDJwtIssuerTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();

            await _mockopenid.start(true);
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud]);
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _response.access_token);
            let _assertion = {assignments: ["mock_user_role"], verified: true};
            assert.deepStrictEqual(await _openidjwt.verify(_context, _jwtsubject), _assertion, "Expected _assertion.");
            await _mockopenid.stop();
        });
        it("Does not verify invalid issuer", async () => {
            let _azcontext  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azcontext.bindings.req.headers);
            /**@type{Configuration}*/let _config = new Configuration("OpenIDJwtIssuerTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();

            await _mockopenid.start(true);
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud], true);
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _response.access_token);
            let _assertion = {verified: false};
            assert.deepStrictEqual(await _openidjwt.verify(_context, _jwtsubject), _assertion, "Expected _assertion.");
            await _mockopenid.stop();
        });
        it("Does not verify invalid audience", async () => {
            let _azcontext  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azcontext.bindings.req.headers);
            /**@type{Configuration}*/let _config = new Configuration("OpenIDJwtIssuerTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();

            await _mockopenid.start(true);
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud + "_foozled"]);
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _response.access_token);
            let _assertion = {verified: false};
            assert.deepStrictEqual(await _openidjwt.verify(_context, _jwtsubject), _assertion, "Expected _assertion.");
            await _mockopenid.stop();
        });
        it("Does not verify invalid token", async () => {
            let _azcontext  = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _response = await _mockopenid.setHeader(_azcontext.bindings.req.headers);
            /**@type{Configuration}*/let _config = new Configuration("OpenIDJwtIssuerTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_jwtconfig).addOn(_httpconfig);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();

            await _mockopenid.start(true);
            let _openidjwt = await _mockopenid.createOpenIDIssuer([_response.aud]);
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _response.access_token + "_foozled");
            let _assertion = {verified: false};
            assert.deepStrictEqual(await _openidjwt.verify(_context, _jwtsubject), _assertion, "Expected _assertion.");
            await _mockopenid.stop();
        });
    });
});
