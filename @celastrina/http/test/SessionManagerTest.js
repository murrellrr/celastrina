const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {Cookie, CookieParameter, Session, SessionManager, SecureSessionManager, AESSessionManager, JwtConfiguration,
       LocalJwtIssuer} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockHTTPParameter} = require("./HTTPParameterMock");
const assert = require("assert");
const crypto = require("crypto");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {AES256Algorithm} = require("@celastrina/core");
const cookie = require("cookie");

class MockSessionManager extends SessionManager {
    constructor(parameter = new CookieParameter(), name = "celastrinajs_session",
                createNew = true) {
        super(parameter, name, createNew);
        this.initializeInvoked = false;
        this.getSessionInvoked = false;
        this.loadSessionInvoked = false;
        this._loadSessionInvoked = false;
        this._saveSessionInvoked = false;
        this.saveSessionInvoked = false;
        this.newSessionInvoked = false;
    }
    reset() {
        this.initializeInvoked = false;
        this.getSessionInvoked = false;
        this.loadSessionInvoked = false;
        this._loadSessionInvoked = false;
        this._saveSessionInvoked = false;
        this.saveSessionInvoked = false;
        this.newSessionInvoked = false;
    }
    async newSession() {
        this.newSessionInvoked = true;
        return super.newSession();
    }
    async initialize(context) {
        await super.initialize(context);
        this.initializeInvoked = true;
    }
    async loadSession(context) {
        this.loadSessionInvoked = true;
        return super.loadSession(context);
    }
    _loadSession(session, context) {
        this._loadSessionInvoked = true;
        return super._loadSession(session, context);
    }
    async saveSession(session = null, context) {
        this.saveSessionInvoked = true;
        await super.saveSession(session, context);
    }
    _saveSession(session, context) {
        this._saveSessionInvoked = true;
        return super._saveSession(session, context);
    }
}

describe("SessionManager", () => {
    describe("#constructor(parameter, name, createNew)", () => {
        it("creates defaults", () => {
            let _mockparam = new MockHTTPParameter();
            let _session = new SessionManager(_mockparam);
            assert.deepStrictEqual(_session._parameter, _mockparam, "Expected _mockparam.");
            assert.strictEqual(_session._name, "celastrinajs_session", "Expected 'celastrinajs_session'.");
            assert.strictEqual(_session._createNew, true, "Expected true.");
        });
        it("sets values", () => {
            let _mockparam = new MockHTTPParameter();
            let _session = new SessionManager(_mockparam, "mock_session", false);
            assert.deepStrictEqual(_session._parameter, _mockparam, "Expected MockHTTPParameter.");
            assert.strictEqual(_session._name, "mock_session", "Expected 'mock_session'.");
            assert.strictEqual(_session._createNew, false, "Expected false.");
        });
        it("fails on null name", () => {
            let _mockparam = new MockHTTPParameter();
            let _ex = CelastrinaValidationError.newValidationError("Argument 'name' cannot be null or empty.", "name")
            assert.throws(() => {
                let _sm = new MockSessionManager(_mockparam, null, false);
            }, _ex, "Expected validation exception.");
        });
        it("fails on empty name", () => {
            let _mockparam = new MockHTTPParameter();
            let _ex = CelastrinaValidationError.newValidationError("Argument 'name' cannot be null or empty.", "name")
            assert.throws(() => {
                let _sm = new MockSessionManager(_mockparam, "", false);
            }, _ex, "Expected validation exception.");
        });
        it("fails on 0 length name", () => {
            let _mockparam = new MockHTTPParameter();
            let _ex = CelastrinaValidationError.newValidationError("Argument 'name' cannot be null or empty.", "name")
            assert.throws(() => {
                let _sm = new MockSessionManager(_mockparam, "     ", false);
            }, _ex, "Expected validation exception.");
        });
    });
    describe("Accessors", () => {
        let _azctx = new MockAzureFunctionContext();
        /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
        let _pm = new MockPropertyManager();
        _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
        let _mctx = new MockHTTPContext(_azctx, _config);
        it("returns existing session", async () => {
            let _mockparam = new MockHTTPParameter();
            _mockparam.stageParameter("mock_session", "{\"mockA\": \"valueA\", \"mockB\": \"valueB\"}");
            let _sm = new MockSessionManager(_mockparam, "mock_session", false);
            let _session = await _sm.loadSession(_mctx);
            assert.strictEqual(_session instanceof Session, true, "Expecte true, not null instance of Session.");
            assert.strictEqual(_session.isNew, false, "Expecte false, not new.");
            assert.strictEqual(_session.doWriteSession, false, "Expecte false, not new, do not write.");
            assert.strictEqual(await _session.getProperty("mockA"), "valueA", "Expecte 'valueA'.");
            assert.strictEqual(await _session.getProperty("mockB"), "valueB", "Expecte 'valueB'.");
        });
        it("returns null session", async () => {
            let _mockparam = new MockHTTPParameter();
            let _sm = new MockSessionManager(_mockparam, "mock_session", false);
            let _session = await _sm.loadSession(_mctx);
            assert.strictEqual(_session, null, "Expecte null.");
        });
    });
    describe("loadSession(context)", () => {
        let _azctx = new MockAzureFunctionContext();
        /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
        let _pm = new MockPropertyManager();
        _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
        let _mctx = new MockHTTPContext(_azctx, _config);
        it("loads existing session", async () => {
            let _mockparam = new MockHTTPParameter();
            _mockparam.stageParameter("mock_session", "{\"mockA\": \"valueA\", \"mockB\": \"valueB\"}");
            let _sm = new MockSessionManager(_mockparam, "mock_session", false);
            let _session = await _sm.loadSession(_mctx);
            assert.strictEqual(_session instanceof Session, true, "Expecte true, not null instance of Session.");
            assert.strictEqual(_session.isNew, false, "Expecte false, not new.");
            assert.strictEqual(_session.doWriteSession, false, "Expecte false, not new, do not write.");
            assert.strictEqual(await _session.getProperty("mockA"), "valueA", "Expecte 'valueA'.");
            assert.strictEqual(await _session.getProperty("mockB"), "valueB", "Expecte 'valueB'.");
            assert.strictEqual(_sm.loadSessionInvoked, true, "Expected true, load invoked.");
            assert.strictEqual(_sm._loadSessionInvoked, true, "Expected true, _load invoked.");
            assert.strictEqual(_sm.saveSessionInvoked, false, "Expected false, save not invoked.");
            assert.strictEqual(_sm._saveSessionInvoked, false, "Expected false, _save not invoked.");
        });
        it("loads new session", async () => {
            let _mockparam = new MockHTTPParameter();
            let _sm = new MockSessionManager(_mockparam, "mock_session", true);
            let _session = await _sm.loadSession(_mctx);
            assert.strictEqual(_session instanceof Session, true, "Expecte true, not null instance of Session.");
            assert.strictEqual(_session.isNew, true, "Expecte true, new.");
            assert.strictEqual(_session.doWriteSession, true, "Expecte true, new, do write.");
            assert.strictEqual(_sm.loadSessionInvoked, true, "Expected true, load invoked.");
            assert.strictEqual(_sm.newSessionInvoked, true, "Expected true, new invoked.");
            assert.strictEqual(_sm._loadSessionInvoked, false, "Expected false, _load not invoked.");
            assert.strictEqual(_sm.saveSessionInvoked, false, "Expected false, save not invoked.");
            assert.strictEqual(_sm._saveSessionInvoked, false, "Expected false, _save not invoked.");
        });
        it("loads null session", async () => {
            let _mockparam = new MockHTTPParameter();
            let _sm = new MockSessionManager(_mockparam, "mock_session", false);
            let _session = await _sm.loadSession(_mctx);
            assert.strictEqual(_session, null, "Expecte null.");
            assert.strictEqual(_sm.loadSessionInvoked, true, "Expected true, load invoked.");
            assert.strictEqual(_sm.newSessionInvoked, false, "Expected false, new not invoked.");
            assert.strictEqual(_sm._loadSessionInvoked, false, "Expected false, _load not invoked.");
            assert.strictEqual(_sm.saveSessionInvoked, false, "Expected false, save not invoked.");
            assert.strictEqual(_sm._saveSessionInvoked, false, "Expected false, _save not invoked.");
        });
    });
});
describe("SecureSessionManager", () => {
    describe("#constructor(algorithm, parameter, name, createNew)", () => {
        it("fails on null parameter", () => {
            let _ex = CelastrinaValidationError.newValidationError("Argument 'parameter' cannot be null.", "parameter")
            assert.throws(() => {
                let _sm = new MockSessionManager(null, "mock_session", false);
            }, _ex, "Expected validation exception.");
        });
    });
});
describe("AESSessionManager", () => {
    let _mockparam = new MockHTTPParameter();
    describe("#constructor(options, parameter, name, createNew)", () => {
        it("Should fail with bad iv", () => {
            let _error = CelastrinaValidationError.newValidationError("Argement 'iv' cannot be undefined, null or zero length.", "options.iv");
            assert.throws(() => {
                let _sm = new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a"}, _mockparam);
            }, _error,"Expected exception.");
        });
        it("Should fail with bad secret", () => {
            let _error = CelastrinaValidationError.newValidationError("Argement 'key' cannot be undefined, null or zero length.", "options.key");
            assert.throws(() => {
                let _sm = new AESSessionManager({iv: "1234567890123456"}, _mockparam);
            }, _error,"Expected exception.");
        });
        it("Should not fail", () => {
            assert.doesNotThrow(() => {
                let _sm = new AESSessionManager({
                    key: "c2f9dab0ceae47d99c7bf4537fbb0c3a",
                    iv: "1234567890123456"
                }, _mockparam);
            }, "No exception.");
        });
    });
    describe("#loadSession(context)", () => {
        it("Should read parameter and decrypt cookie", async () =>{
            let _encookie = JSON.stringify({keyA: "valueA", keyB: "valueB"});
            let _encrypt = AES256Algorithm.create({
                key: "c2f9dab0ceae47d99c7bf4537fbb0c3a",
                iv: "1234567890123456"
            });
            await _encrypt.initialize();
            let _cipher = await _encrypt.createCipher();
            let _decipher = await _encrypt.createDecipher();
            _encookie = _cipher.update(_encookie, "utf8", "base64");
            _encookie += _cipher.final("base64");
            let _azctx = new MockAzureFunctionContext();
            _azctx.req.headers["cookie"] = "test=abc; celastrinajs_session=" + _encookie;
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            let _mctx = new MockHTTPContext(_azctx, _config);
            await _mctx._parseCookies();
            let _sm = new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter());
            await _sm.initialize(_mctx);
            /**@type{Session}*/let _session = await _sm.loadSession(_mctx);
            assert.strictEqual(_session instanceof Session, true, "Expected instance of Session.");
            assert.strictEqual(_session.isNew, false, "Expected false.");
            assert.strictEqual(_session.doWriteSession, false, "Expectde false.");
            assert.deepStrictEqual(await _session.getProperty("keyA"), "valueA", "Expected 'valueA'.");
            assert.deepStrictEqual(await _session.getProperty("keyB"), "valueB", "Expected 'valueB'.");
        });
    });
    describe("#saveSession(session = null, context)", () => {
        it("Should encrypt session and set parameter", async () => {
            let _azctx = new MockAzureFunctionContext();
            /**@type{JwtConfiguration}*/let _config = new JwtConfiguration("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            let _mctx = new MockHTTPContext(_azctx, _config);
            await _mctx._parseCookies();
            let _sm = new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}, new CookieParameter());
            await _sm.initialize(_mctx);
            /**@type{Session}*/let _session = await _sm.newSession();
            await _session.setProperty("keyA", "valueA");
            await _session.setProperty("keyB", "valueB");
            await _sm.saveSession(_session, _mctx);
            assert.strictEqual(_session instanceof Session, true, "Expected instance of Session.");
            assert.strictEqual(_session.isNew, true, "Expected true.");
            assert.strictEqual(_session.doWriteSession, true, "Expectde true.");
            assert.strictEqual(_mctx.getCookie("celastrinajs_session") == null, false, "Expected false.");
        });
    });
});

module.exports = {
    MockSessionManager: MockSessionManager
};
