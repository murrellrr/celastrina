const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration, Permission, MatchAny, MatchAll, MatchNone} = require("../../core/Core");
const {MatchAlways, Cookie, CookieParameter, Session, SessionManager, SecureSessionManager, AESSessionManager,
       SessionRoleFactory, HTTPConfiguration, LocalJwtIssuer, HTTPContext, JSONHTTPFunction, JwtConfiguration} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockHTTPParameter} = require("./HTTPParameterMock");
const assert = require("assert");
const crypto = require("crypto");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {AES256Algorithm} = require("@celastrina/core");
const fs = require("fs");
const cookie = require("cookie");
const {MockMicrosoftOpenIDIDPServer} = require("./AzureOpenIDIPDMock");

class MockJSONHTTPFunction extends JSONHTTPFunction {
    constructor(config) {
        super(config);
    }
    async createContext(azcontext, config) {
        azcontext._createContextInvoked = true;
        return super.createContext(azcontext, config);
    }
    async createSentry(azcontext, config) {
        azcontext._createSentryInvoked = true;
        return super.createSentry(azcontext, config);
    }
    async monitor(context) {
        context.azureFunctionContext._monitorInvoked = false;
        return super.monitor(context);
    }
    async exception(context, exception) {
        context.azureFunctionContext._exceptionInvoked = true;
        return super.exception(context, exception);
    }
    async unhandledRequestMethod(context) {
        context.azureFunctionContext._unhandledRequestMethodInvoked = true;
        return super.unhandledRequestMethod(context);
    }
    async process(context) {
        context.azureFunctionContext._processInvoked = true;
        return super.process(context);
    }
    async initialize(context) {
        context.azureFunctionContext._initializeInvoked = true;
        return super.initialize(context);
    }
    /**
     * @param {JSONHTTPContext} context
     * @return {Promise<void>}
     */
    async _get(context) {
        context.azureFunctionContext._getInvoked = true;
        let smocka = await context.session.getProperty("mockA");
        let smockb = await context.session.getProperty("mockB");
        switch(await context.properties.getProperty("celastrinajs_mock_action", "default")) {
            case "session_new":
                context.log("session_new GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                await context.session.setProperty("mockA", "valueA");
                await context.session.setProperty("mockB", "valueB");
                smocka = await context.session.getProperty("mockA");
                smockb = await context.session.getProperty("mockB");
                context.send({mockA: smocka, mockB: smockb});
                context.done();
                break;
            case "session_test":
                context.log("session_test GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                smocka = await context.session.getProperty("mockA");
                smockb = await context.session.getProperty("mockB");
                context.send({mockA: smocka, mockB: smockb});
                context.done();
                break;
            case "session_subject":
                context.log("session_subject GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                smocka = await context.session.getProperty("mockA");
                smockb = await context.session.getProperty("mockB");
                let subject = context.subject.id;
                context.send({subject: subject, mockA: smocka, mockB: smockb});
                context.done();
                break;
            case "default":
                context.log("default GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                context.done();
                break;
            default:
                context.log("switch() default: GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                context.done();
        }
    }
    async _put(context) {
        context.azureFunctionContext._putInvoked = true;
        context.done();
    }
    async _post(context) {
        context.azureFunctionContext._postInvoked = true;
        context.done();
    }
    async _delete(context) {
        context.azureFunctionContext._deleteInvoked = true;
        context.done();
    }
    async _head(context) {
        context.azureFunctionContext._headInvoked = true;
        context.done();
    }
    async _options(context) {
        context.azureFunctionContext._optionInvoked = true;
        context.done();
    }
    async _patch(context) {
        context.azureFunctionContext._patchInvoked = true;
        context.done();
    }
    async _connect(context) {
        context.azureFunctionContext._connectInvoked = true;
        context.done();
    }
    async _trace(context) {
        context.azureFunctionContext._traceInvoked = true;
        context.done();``
    }
}

describe("JSONHTTPFunction", () => {
    let _mockenccookie = null;
    let _mockenccookieroles = null;
    before(async () => {
        let _encookie = JSON.stringify({mockA: "valueA", mockB: "valueB"});
        let _encookieroles = JSON.stringify({mockA: "valueA", mockB: "valueB", roles: ["mock_admin_role"]});
        let _encrypt = AES256Algorithm.create({
            key: "c2f9dab0ceae47d99c7bf4537fbb0c3a",
            iv: "1234567890123456"
        });
        await _encrypt.initialize();

        let _cipher = await _encrypt.createCipher();
        _mockenccookie = _cipher.update(_encookie, "utf8", "base64");
        _mockenccookie += _cipher.final("base64");

        _cipher = await _encrypt.createCipher();
        _mockenccookieroles = _cipher.update(_encookieroles, "utf8", "base64");
        _mockenccookieroles += _cipher.final("base64");
    });
    describe("#execute(azcontext)", () => {
        it("should responed with default payload", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.body, {code: 200, message: "Success! Welcome to celastrinajs.", name: "HTTPFunctionTest"}, "Expected default JSON.");
        });
        it("should responed read existing session", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.body, {mockA: "valueA", mockB: "valueB"}, "Expected default JSON.");
        });
        it("should fail with 403", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 403, "Expected 403.");
            assert.deepStrictEqual(_azctx.res.body, {name:"CelastrinaError", message: "Forbidden.", tag: null, cause: null, code: 403, drop: false}, "Expected 403 JSON.");
        });
        it("should fail with 501, CUSTOM not supported", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()))
                               .addPermission(new Permission("custom", null, new MatchAlways()));
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "custom";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 501, "Expected 501.");
            assert.deepStrictEqual(_azctx.res.body, {name:"CelastrinaError", message: "HTTP Method 'custom' not supported.", tag: null, cause: null, code: 501, drop: false}, "Expected 501 JSON.");
        });
        it("should succeed with GET permission", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "GET";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.body, {mockA: "valueA", mockB: "valueB"}, "Expected default HTML.");
        });
        it("should fail POST with GET permission", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "post";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 403, "Expected 401.");
            assert.deepStrictEqual(_azctx.res.body, {name:"CelastrinaError", message: "Forbidden.", tag: null, cause: null, code: 403, drop: false}, "Expected 403 HTML.");
        });
        it("should set cookie with new session", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new HTTPConfiguration("JSONHTTPFunctionTest");
            let _pm     = new MockPropertyManager();
            _pm.mockProperty("celastrinajs_mock_action", "session_new");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.setAuthorizationOptimistic(true);
            let _function = new MockJSONHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.cookies.length, 1, "Expected session cookie");
            assert.deepStrictEqual(_azctx.res.body, {mockA: "valueA", mockB: "valueB"}, "Expected default HTML.");
        });
    });
    describe("#execute(azcontext) with JWT header", () => {
        it("should pass jwt and load session", async () => {
            let _azctx      = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _pm         = new MockPropertyManager();
            let _config     = new JwtConfiguration("JSONHTTPFunctionTest");

            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            _config.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud]));
            let _function = new MockJSONHTTPFunction(_config);

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.body, {mockA: "valueA", mockB: "valueB", subject: _response.sub}, "Expected default HTML.");
        });
        it("should fail jwt, decode issues", async () => {
            let _azctx      = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _pm         = new MockPropertyManager();
            let _config     = new JwtConfiguration("JSONHTTPFunctionTest");

            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers, true);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            _config.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud]));
            let _function = new MockJSONHTTPFunction(_config);

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 401, "Expected 401.");
            assert.deepStrictEqual(_azctx.res.body, {name:"CelastrinaError", message: "Not Authorized.", tag: null, cause: null, code: 401, drop: false}, "Expected default HTML.");
        });
        it("should fail jwt, issuer", async () => {
            let _azctx      = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _pm         = new MockPropertyManager();
            let _config     = new JwtConfiguration("JSONHTTPFunctionTest");

            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            _config.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud], true));
            let _function = new MockJSONHTTPFunction(_config);

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 401, "Expected 401.");
            assert.deepStrictEqual(_azctx.res.body, {name:"CelastrinaError", message: "Not Authorized.", tag: null, cause: null, code: 401, drop: false}, "Expected default HTML.");
        });
    });
    describe("#execute(azcontext) with JWT header and session roles", () => {
        it("should pass jwt and load session", async () => {
            let _azctx      = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _pm         = new MockPropertyManager();
            let _config     = new JwtConfiguration("JSONHTTPFunctionTest");

            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", ["mock_user_role", "mock_admin_role"], new MatchAll()));
            _config.setValue(JwtConfiguration.CONFIG_AUTHORIATION_ROLE_FACTORY, new SessionRoleFactory());
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookieroles + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            _config.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud]));
            let _function = new MockJSONHTTPFunction(_config);

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.body, {mockA: "valueA", mockB: "valueB", subject: _response.sub}, "Expected default HTML.");
        });
        it("should fail not authorized", async () => {
            let _azctx      = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _pm         = new MockPropertyManager();
            let _config     = new JwtConfiguration("JSONHTTPFunctionTest");

            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", ["mock_user_role", "mock_admin_role", "foozled_role"], new MatchAll()));
            _config.setValue(JwtConfiguration.CONFIG_AUTHORIATION_ROLE_FACTORY, new SessionRoleFactory());
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookieroles + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            _config.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud]));
            let _function = new MockJSONHTTPFunction(_config);

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 403, "Expected 403.");
            assert.deepStrictEqual(_azctx.res.body, {name:"CelastrinaError", message: "Forbidden.", tag: null, cause: null, code: 403, drop: false}, "Expected default HTML.");
        });
        it("should load from config, pass jwt OpenID and load session", async () => {
            let _azctx      = new MockAzureFunctionContext();
            let _mockopenid = new MockMicrosoftOpenIDIDPServer("1234567890");
            let _pm         = new MockPropertyManager();
            let _config     = new JwtConfiguration("JSONHTTPFunctionTest", "jwt_config");

            _pm.mockProperty("jwt_config", fs.readFileSync("./test/config-good-all.json").toString());
            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);

            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookieroles + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers, false, "mock_subject", "celastrinajs_mock_aud");
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";

            let _function = new MockJSONHTTPFunction(_config);
            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.deepStrictEqual(_azctx.res.body, {mockA: "valueA", mockB: "valueB", subject: _response.sub}, "Expected default JSON.");
        });
    });
});
