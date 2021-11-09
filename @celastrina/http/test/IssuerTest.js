const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {JwtSubject, Issuer} = require("../HTTP");
const {mockJwtToken, decodeMockJwtToken} = require("./JwtSubjectTest");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock")
const assert = require("assert");
const moment = require("moment");
const {Subject} = require("@celastrina/core");

class MockIssuer extends Issuer {
    constructor(issuer = "issuer.celastrina.js", audiences = ["celastrina.js"],
                assignments = ["role1"],
                validateNonce = false) {
        super(issuer, audiences, assignments, validateNonce);
        this.isGetKeyInvoked = false;
        this.isGetNonceInvoked = false;
    }
    async getKey(context, subject) {
        this.isGetKeyInvoked = true;
        return "celastrina.js";
    }
    async getNonce(context, subject) {
        this.isGetNonceInvoked = true;
        return "nonce";
    }
    reset() {
        this.isGetKeyInvoked = false;
        this.isGetNonceInvoked = false;
    }
}

describe("Issuer", () => {
    describe("#constructor(issuer, audiences = null, assignments = null, validateNonce = false)", () => {
        it("It sets all private members", () => {
            let _issuer = new MockIssuer("issuer.celastrina.js", ["celastrina.js"], ["role1"], true);
            assert.deepStrictEqual(_issuer._issuer, "issuer.celastrina.js", "Expected 'issuer.celastrina.js'.");
            assert.deepStrictEqual(_issuer._audiences, ["celastrina.js"], "Expected ['celastrina.js'].");
            assert.deepStrictEqual(_issuer._roles, ["role1"], "Expected ['role1'].");
            assert.deepStrictEqual(_issuer._validateNonce, true, "Expected true.");
        });
    });
    describe("#getKey(context, subject)", () => {
        it("Throws not implemented error", () => {
            let err = CelastrinaError.newError("Not Implemented", 501);
            let _issuer = new Issuer("issuer.celastrina.js");
            assert.rejects(() => {_issuer.getKey(null, null);}, err, "Should throw not implemented.");
        });
    });
    describe("#getKey(context, subject)", () => {
        it("Throws not implemented error", async () => {
            let err = CelastrinaError.newError("Not Implemented", 501);
            let _issuer = new Issuer("issuer.celastrina.js");
            let _actual = await _issuer.getNonce(null, null);
            assert.deepStrictEqual(_actual, null, "Expected null.");
        });
    });
    describe("#verify(context, _subject) ", () => {
        let _issuer = new MockIssuer("issuer.celastrina.js", ["celastrina.js", "IssuerTest.js"], ["role1"]);
        let _azcontext = new MockAzureFunctionContext();
        let _iat = moment();
        _iat.set("milliseconds", 0);
        let _exp = moment(_iat);
        _exp.add(1, "minute");

        let _context = new MockHTTPContext(_azcontext, {});
        it("should return true", async () => {
            let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "celastrina.js", iss: "issuer.celastrina.js"}
            let _token = mockJwtToken(_pld, _iat, _exp);
            let _subject = new Subject("1234567890");
            let _jwtsub = JwtSubject.decodeSync(_subject, _token);
            let _assertion = {assignments: ["role1"], verified: true};
            assert.deepStrictEqual(await _issuer.verify(_context, _jwtsub), _assertion, "Expected verified _assertion.");
            assert.strictEqual(_issuer.isGetKeyInvoked, true, "Expected getKey to be invoked.");
            assert.strictEqual(_issuer.isGetNonceInvoked, false, "Expected getNonce to NOT be invoked.");
        });
        it("should return true, different aud", async () => {
            let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "IssuerTest.js", iss: "issuer.celastrina.js"}
            let _token = mockJwtToken(_pld, _iat, _exp);
            let _subject = new Subject("1234567890");
            let _jwtsub = JwtSubject.decodeSync(_subject, _token);
            let _assertion = {assignments: ["role1"], verified: true};
            assert.deepStrictEqual(await _issuer.verify(_context, _jwtsub), _assertion, "Expected verified _assertion.");
            assert.strictEqual(_issuer.isGetKeyInvoked, true, "Expected getKey to be invoked.");
            assert.strictEqual(_issuer.isGetNonceInvoked, false, "Expected getNonce to NOT be invoked.");
        });
        it("should return false, bad issuer", async () => {
            let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "celastrina.js", iss: "issuer.celastrina.js.fail"}
            let _token = mockJwtToken(_pld, _iat, _exp);
            let _subject = new Subject("1234567890");
            let _jwtsub = JwtSubject.decodeSync(_subject, _token);
            let _assertion = {verified: false};
            assert.deepStrictEqual(await _issuer.verify(_context, _jwtsub), _assertion, "Expected verified _assertion.");
            assert.strictEqual(_issuer.isGetKeyInvoked, true, "Expected getKey to be invoked.");
            assert.strictEqual(_issuer.isGetNonceInvoked, false, "Expected getNonce to NOT be invoked.");
        });
        it("should return false, bad aud", async () => {
            let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "celastrina.js_foozled", iss: "issuer.celastrina.js.fail"}
            let _token = mockJwtToken(_pld, _iat, _exp);
            let _subject = new Subject("1234567890");
            let _jwtsub = JwtSubject.decodeSync(_subject, _token);
            let _assertion = {verified: false};
            assert.deepStrictEqual(await _issuer.verify(_context, _jwtsub), _assertion, "Expected verified _assertion.");
            assert.strictEqual(_issuer.isGetKeyInvoked, true, "Expected getKey to be invoked.");
            assert.strictEqual(_issuer.isGetNonceInvoked, false, "Expected getNonce to NOT be invoked.");
        });
        it("should return true with nonce", async () => {
            let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "celastrina.js", iss: "issuer.celastrina.js"}
            let _token = mockJwtToken(_pld, _iat, _exp);
            let _subject = new Subject("1234567890");
            let _jwtsub = JwtSubject.decodeSync(_subject, _token);
            _issuer.validateNonce = true;
            let _assertion = {assignments: ["role1"], verified: true};
            assert.deepStrictEqual(await _issuer.verify(_context, _jwtsub), _assertion, "Expected verified _assertion.");
            assert.strictEqual(_issuer.isGetKeyInvoked, true, "Expected getKey to be invoked.");
            assert.strictEqual(_issuer.isGetNonceInvoked, true, "Expected getNonce to be invoked.");
        });
        it("should return true with nonce and diffferent aud", async () => {
            let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "IssuerTest.js", iss: "issuer.celastrina.js"}
            let _token = mockJwtToken(_pld, _iat, _exp);
            let _subject = new Subject("1234567890");
            let _jwtsub = JwtSubject.decodeSync(_subject, _token);
            _issuer.validateNonce = true;
            let _assertion = {assignments: ["role1"], verified: true};
            assert.deepStrictEqual(await _issuer.verify(_context, _jwtsub), _assertion, "Expected verified _assertion.");
            assert.strictEqual(_issuer.isGetKeyInvoked, true, "Expected getKey to be invoked.");
            assert.strictEqual(_issuer.isGetNonceInvoked, true, "Expected getNonce to be invoked.");
        });
    });
});

module.exports = {
    MockIssuer: MockIssuer
};
