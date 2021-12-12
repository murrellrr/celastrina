/*
 * Copyright (c) 2020, Robert R Murrell.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration, Permission, MatchAny, MatchAll, MatchNone} = require("../../core/Core");
const {MatchAlways, Cookie, CookieParameter, Session, SessionManager, SecureSessionManager, AESSessionManager,
       SessionRoleFactory, LocalJwtIssuer, HTTPContext, HTTPFunction, JwtConfiguration, HTTPAddOn, JwtAddOn
} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockHTTPParameter} = require("./HTTPParameterMock");
const assert = require("assert");
const crypto = require("crypto");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {AES256Algorithm} = require("@celastrina/core");

const cookie = require("cookie");
const {MockMicrosoftOpenIDIDPServer} = require("./AzureOpenIDIPDMock");

class MockHTTPFunction extends HTTPFunction {
    constructor(config) {
        super(config);
        this._invokedDummyFunction = false;
        this._monitorInvoked = false;
        this._exceptionInvoked = false;
        this._unhandledRequestMethodInvoked = false;
        this._processInvoked = false;
        this._initializeInvoked = false
        this._getInvoked = false;
        this._putInvoked = false;
        this._postInvoked = false;
        this._deleteInvoked = false;
        this._headInvoked = false;
        this._optionInvoked = false;
        this._patchInvoked = false;
        this._connectInvoked = false;
        this._traceInvoked = false;
    }
    dummyFunction(context) {
        this._invokedDummyFunction = true;
    }
    async createContext(config) {
        config.context._createContextInvoked = true;
        return super.createContext(config);
    }
    async load(context) {
        this.dummyFunction(context);
    }
    async save(context) {
        this.dummyFunction(context);
    }
    async terminate(context) {
        await super.terminate(context);
        this.dummyFunction(context);
    }
    async monitor(context) {
        this.dummyFunction(context);
        this._monitorInvoked = false;
        return super.monitor(context);
    }
    async exception(context, exception) {
        this.dummyFunction(context);
        this._exceptionInvoked = true;
        return super.exception(context, exception);
    }
    async unhandledRequestMethod(context) {
        this.dummyFunction(context);
        this._unhandledRequestMethodInvoked = true;
        return super.unhandledRequestMethod(context);
    }
    async process(context) {
        this.dummyFunction(context);
        this._processInvoked = true;
        return super.process(context);
    }
    async initialize(context) {
        this.dummyFunction(context);
        this._initializeInvoked = true;
        return super.initialize(context);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _get(context) {
        this.dummyFunction(context);
        this._getInvoked = true;
        let smocka;
        let smockb;
        switch(await context.properties.getProperty("celastrinajs_mock_action", "default")) {
            case "session_new":
                context.log("session_new GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                await context.session.setProperty("mockA", "valueA");
                await context.session.setProperty("mockB", "valueB");
                smocka = await context.session.getProperty("mockA");
                smockb = await context.session.getProperty("mockB");
                context.send("<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>mockA=" + smocka + "<br />mockB=" + smockb + "</p></body></html>");
                context.done();
                break;
            case "session_test":
                context.log("session_test GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                smocka = await context.session.getProperty("mockA");
                smockb = await context.session.getProperty("mockB");
                context.send("<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>mockA=" + smocka + "<br />mockB=" + smockb + "</p></body></html>");
                context.done();
                break;
            case "session_subject":
                context.log("session_subject GET test case executed.", LOG_LEVEL.INFO, "MockHTTPFunction._get(context)");
                smocka = await context.session.getProperty("mockA");
                smockb = await context.session.getProperty("mockB");
                let subject = context.subject.id;
                context.send("<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>subject=" + subject + "<br />mockA=" + smocka + "<br />mockB=" + smockb + "</p></body></html>");
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
        this.dummyFunction(context);
        this._putInvoked = true;
        context.done();
    }
    async _post(context) {
        this.dummyFunction(context);
        this._postInvoked = true;
        context.done();
    }
    async _delete(context) {
        this.dummyFunction(context);
        this._deleteInvoked = true;
        context.done();
    }
    async _head(context) {
        this.dummyFunction(context);
        this._headInvoked = true;
        context.done();
    }
    async _options(context) {
        this.dummyFunction(context);
        this._optionInvoked = true;
        context.done();
    }
    async _patch(context) {
        this.dummyFunction(context);
        this._patchInvoked = true;
        context.done();
    }
    async _connect(context) {
        this.dummyFunction(context);
        this._connectInvoked = true;
        context.done();
    }
    async _trace(context) {
        this.dummyFunction(context);
        this._traceInvoked = true;
        context.done();
    }
}

describe("HTTPFunction", () => {
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
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig);
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
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
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body>200, Success</body></html>", "Expected default HTML.");
        });
        it("should responed read existing session", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
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
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>mockA=valueA<br />mockB=valueB</p></body></html>", "Expected default HTML.");
        });
        it("should fail with 403", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_httpconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
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
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><header>403 - Forbidden</header><main><p><h2>Forbidden.</h2></main><footer>celastrinajs</footer></body></html>", "Expected 403 HTML.");
        });
        it("should fail with 501, CUSTOM not supported", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()))
                               .addPermission(new Permission("custom", null, new MatchAlways()));
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
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
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><header>501 - Internal Server Error</header><main><p><h2>HTTP Method 'custom' not supported.</h2></main><footer>celastrinajs</footer></body></html>", "Expected 501 HTML.");
        });
        it("should succeed with GET permission", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
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
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>mockA=valueA<br />mockB=valueB</p></body></html>", "Expected default HTML.");
        });
        it("should fail POST with GET permission", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.permissions.addPermission(new Permission("get", null, new MatchAlways()));
            _config.addOn(_httpconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                                                                 new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            _azctx.req.method = "post";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";
            await _function.execute(_azctx);
            assert.strictEqual(_azctx.res.status, 403, "Expected 403.");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><header>403 - Forbidden</header><main><p><h2>Forbidden.</h2></main><footer>celastrinajs</footer></body></html>", "Expected 403 HTML.");
        });
        it("should set cookie with new session", async () => {
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_test");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
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
            assert.deepStrictEqual(_azctx.res.cookies.length, 1, "Expected session cookie");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>mockA=valueA<br />mockB=valueB</p></body></html>", "Expected default HTML.");
        });
    });
    describe("#execute(azcontext) with JWT header", () => {
        it("should pass jwt and load session", async () => {
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _jwtconfig = new JwtAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig).addOn(_jwtconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>subject=" + _response.sub + "<br />mockA=valueA<br />mockB=valueB</p></body></html>", "Expected default HTML.");
        });
        it("should fail jwt, decode issues", async () => {
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _jwtconfig = new JwtAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_httpconfig).addOn(_jwtconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers, true);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 401, "Expected 401.");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><header>401 - Not Authorized</header><main><p><h2>Not Authorized.</h2></main><footer>celastrinajs</footer></body></html>", "Expected default HTML.");
        });
        it("should fail jwt, issuer", async () => {
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _jwtconfig = new JwtAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_httpconfig).addOn(_jwtconfig);
            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            let _function = new MockHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers, true);
            _jwtconfig.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud], true));
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 401, "Expected 401.");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><header>401 - Not Authorized</header><main><p><h2>Not Authorized.</h2></main><footer>celastrinajs</footer></body></html>", "Expected default HTML.");
        });
    });
    describe("#execute(azcontext) with JWT header and session roles", () => {
        it("should pass jwt and load session", async () => {
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _jwtconfig = new JwtAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setAuthorizationOptimistic(true);
            _config.addOn(_httpconfig).addOn(_jwtconfig);
            _config.setValue(Configuration.CONFIG_ROLE_FACTORY, new SessionRoleFactory());
            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", ["mock_user_role", "mock_admin_role"], new MatchAll()));
            let _function = new MockHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 200, "Expected 200.");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><p>subject=" + _response.sub + "<br />mockA=valueA<br />mockB=valueB</p></body></html>", "Expected default HTML.");
        });
        it("should fail not authorized", async () => {
            let _mockopenid = new MockMicrosoftOpenIDIDPServer();
            let _azctx  = new MockAzureFunctionContext();
            let _config = new Configuration("HTTPFunctionTest");
            let _httpconfig = new HTTPAddOn();
            let _jwtconfig = new JwtAddOn();
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.addOn(_httpconfig).addOn(_jwtconfig);
            _config.setValue(Configuration.CONFIG_ROLE_FACTORY, new SessionRoleFactory());
            _pm.mockProperty("celastrinajs_mock_action", "session_subject");
            _httpconfig.setSessionManager(new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter()));
            _config.permissions.addPermission(new Permission("get", ["mock_user_role", "mock_admin_role"], new MatchAll()));
            let _function = new MockHTTPFunction(_config);
            _azctx.req.headers["host"] = "celastrinajs.com";
            _azctx.req.headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
            _azctx.req.headers["accept"] = "*/*";
            _azctx.req.headers["Accept-Encoding"] = "gzip, deflate, br";
            _azctx.req.headers["connection"] = "keep-alive";
            _azctx.req.headers["cookie"] = " celastrinajs_session=" + _mockenccookie + "; ";
            let _response = await _mockopenid.setHeader(_azctx.req.headers);
            _jwtconfig.addIssuer(await _mockopenid.createOpenIDIssuer([_response.aud]));
            _azctx.req.method = "get";
            _azctx.req.originalUrl = "https://api.celastrinajs.com";

            await _mockopenid.start();
            await _function.execute(_azctx);
            await _mockopenid.stop();

            assert.strictEqual(_azctx.res.status, 403, "Expected 403.");
            assert.strictEqual(_azctx.res.body, "<html lang=\"en\"><head><title>HTTPFunctionTest</title></head><body><header>403 - Forbidden</header><main><p><h2>Forbidden.</h2></main><footer>celastrinajs</footer></body></html>", "Expected default HTML.");
        });
    });
});
