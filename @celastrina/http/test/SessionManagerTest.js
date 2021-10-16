const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {Cookie, Session, SessionManager, SecureSessionManager, AESSessionManager, JwtConfiguration, LocalJwtIssuer} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");
const crypto = require("crypto");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {AES256Algorithm} = require("@celastrina/core");
const cookie = require("cookie");


class MockSessionManager extends SessionManager {
    constructor() {
        super();
    }
}

// describe("SessionManager", () => {
//     describe("", () => {
//
//     });
// });
// describe("SecureSessionManager", () => {
//     describe("", () => {
//
//     });
// });
describe("AESSessionManager", () => {
    describe("#loadSession(context)", () => {
        it("Decrypts valid cookie", async () =>{
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

            let _sm = new AESSessionManager({key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"});
            await _sm.initialize(_mctx);
            await _sm.loadSession(_mctx);
            /**@type{Session}*/let _session = _sm.session;

            assert.strictEqual(_session instanceof Session, true, "Expected instance of Session.");
            assert.strictEqual(_session.isNew, false, "Expected false.");
            assert.strictEqual(_session.doWriteSession, false, "Expectde false.");
            assert.deepStrictEqual(await _session.getProperty("keyA"), "valueA", "Expected 'valueA'.");
            assert.deepStrictEqual(await _session.getProperty("keyB"), "valueB", "Expected 'valueB'.");
        });
    });
});


module.exports = {
    MockSessionManager: MockSessionManager
};
