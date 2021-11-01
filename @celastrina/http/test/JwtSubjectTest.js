const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {JwtSubject} = require("../HTTP");
const assert = require("assert");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const sinon = require("sinon");

/**
 * @param {Object} [payload={}]
 * @param {(null|moment.Moment)} [backdateiat=null]
 * @param {(null|moment.Moment)} [backdateexp=null]
 * @return {*}
 */
function mockJwtToken(payload = {}, backdateiat = null, backdateexp = null) {
    let _now = moment();
    _now.set("milliseconds", 0);
    (backdateiat != null) ? payload.iat = backdateiat.unix() : payload.iat = _now.unix();
    _now.add(30, "minutes");
    (backdateexp != null) ? payload.exp = backdateexp.unix() : payload.exp = _now.unix();
    let _token = jwt.sign(payload, "celastrina.js");
    console.log("Token Created: " + _token);
    return _token;
}

/**
 * @param {string} _token
 * @return {{payload: *, signature: *, header: *}|*}
 */
function decodeMockJwtToken(_token) {
    return jwt.decode(_token, {complete: true});
}

describe("JwtSubject", () => {
    let _clock = null;
    before(() => {
        _clock = sinon.useFakeTimers(moment().toDate());
    });
    after(() => {
        _clock.restore();
    });
    describe("#constructor(header, payload, signature, token = null, roles = [])", () => {
        let _iat = moment();
        _iat.set("milliseconds", 0);
        let _exp = moment(_iat);
        _exp.add(1, "minute");
        let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "tester", iss: "JwtSubjectTest.celastrnig.js"}
        let _token = mockJwtToken(_pld, _iat, _exp);
        /**@type{{payload: *, signature: *, header: *}}*/let _jwt = decodeMockJwtToken(_token);
        it("it successfully create JwtSubject", () => {
            let _subject = new JwtSubject(_jwt.header, _jwt.payload, _jwt.signature, _token);
            assert.deepStrictEqual(_subject._header, _jwt.header, "Headers should be equal.");
            assert.deepStrictEqual(_subject._payload, _jwt.payload, "Payload should be equal.");
            assert.deepStrictEqual(_subject._signature, _jwt.signature, "Signature should be equal.");
            assert.deepStrictEqual(_subject._token, _token, "Headers should be equal.");
            assert.deepStrictEqual(_subject._issued.unix(), _iat.unix(), "Issued at should be equal.");
            assert.deepStrictEqual(_subject._expires.unix(), _exp.unix(), "Expires should be equal.");
        });
        it("it sets all getters.", () => {
            let _subject = new JwtSubject(_jwt.header, _jwt.payload, _jwt.signature, _token);
            assert.deepStrictEqual(_subject.header, _jwt.header, "Headers should be equal.");
            assert.deepStrictEqual(_subject.payload, _jwt.payload, "Payload should be equal.");
            assert.deepStrictEqual(_subject.signature, _jwt.signature, "Signature should be equal.");
            assert.deepStrictEqual(_subject.token, _token, "Headers should be equal.");
            assert.deepStrictEqual(_subject.issued.unix(), _iat.unix(), "Issued at should be equal.");
            assert.deepStrictEqual(_subject.expires.unix(), _exp.unix(), "Expires should be equal.");
            assert.deepStrictEqual(_subject.nonce, _pld.nonce, "Nonce should be equal.");
            assert.deepStrictEqual(_subject.id, _pld.sub, "Subject should be equal.");
            assert.deepStrictEqual(_subject.audience, _pld.aud, "Audience should be equal.");
            assert.deepStrictEqual(_subject.issuer, _pld.iss, "Issuer should be equal.");
        });
    });
    describe("#isExpired()", () => {
        let _iat = moment();
        _iat.set("milliseconds", 0);
        let _exp = moment(_iat);
        _exp.add(1, "minute");
        let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "tester", iss: "JwtSubjectTest.celastrnig.js"}
        let _token = mockJwtToken(_pld, _iat, _exp);
        /**@type{{payload: *, signature: *, header: *}}*/let _jwt = decodeMockJwtToken(_token);
        let _subject = new JwtSubject(_jwt.header, _jwt.payload, _jwt.signature, _token);
        it("is false when date is before exp date", () => {
            assert.deepStrictEqual(_subject.isExpired(), false, "Expected not expired.");
        });
        it("is true when date is past exp date", () => {
            _clock.tick(120000);
            assert.deepStrictEqual(_subject.isExpired(), true, "Expected expired.");
        });
    });
    describe("#setAuthorizationHeader(headers, name = \"Authorization\", scheme = \"Bearer \")", () => {
        let _iat = moment();
        _iat.set("milliseconds", 0);
        let _exp = moment(_iat);
        _exp.add(1, "minute");
        let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "tester", iss: "JwtSubjectTest.celastrnig.js"}
        let _token = mockJwtToken(_pld, _iat, _exp);
        /**@type{{payload: *, signature: *, header: *}}*/let _jwt = decodeMockJwtToken(_token);
        let _subject = new JwtSubject(_jwt.header, _jwt.payload, _jwt.signature, _token);
        it("should set Authorization: Bearer {token}", () => {
            let _headers = {};
            let _expected = {Authorization: "Bearer " + _token};
            _subject.setAuthorizationHeader(_headers);
            assert.deepStrictEqual(_headers, _expected, "Expected Authorization: " + _token + ".");
        });
    });
    describe("Claims and headers", () => {
        let _iat = moment();
        _iat.set("milliseconds", 0);
        let _exp = moment(_iat);
        _exp.add(1, "minute");
        let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "tester", iss: "JwtSubjectTest.celastrnig.js"}
        let _token = mockJwtToken(_pld, _iat, _exp);
        /**@type{{payload: *, signature: *, header: *}}*/let _jwt = decodeMockJwtToken(_token);
        let _subject = new JwtSubject(_jwt.header, _jwt.payload, _jwt.signature, _token);
        describe("#getClaim(name, defaultValue = null)", () => {
            it("It gets name claim", async () => {
                let _name = await _subject.getClaim("name");
                assert.deepStrictEqual(_name, "JwtSubjectTest", "Expected name 'JwtSubjectTest'.");
            });
            it("It returns default when not found", async () => {
                let _value = await _subject.getClaim("not_found", "default");
                assert.deepStrictEqual(_value, "default", "Expected 'default'.");
            });
            it("It returns null when not found and no default", async () => {
                let _value = await _subject.getClaim("not_found");
                assert.deepStrictEqual(_value, null, "Expected null.");
            });
            it("It gets name header", async () => {
                let _alg = await _subject.getHeader("alg");
                assert.deepStrictEqual(_alg, "HS256", "Expected name 'HS256'.");
            });
            it("It returns default when not found", async () => {
                let _value = await _subject.getHeader("not_found", "default");
                assert.deepStrictEqual(_value, "default", "Expected 'default'.");
            });
            it("It returns null when not found and no default", async () => {
                let _value = await _subject.getHeader("not_found");
                assert.deepStrictEqual(_value, null, "Expected null.");
            });
        });
    });
    describe("JwtSubject#decode(token)", () => {
        let _iat = moment();
        _iat.set("milliseconds", 0);
        let _exp = moment(_iat);
        _exp.add(1, "minute");
        let _pld = {name: "JwtSubjectTest", nonce: "nonce", sub: "mocha", aud: "tester", iss: "JwtSubjectTest.celastrnig.js"}
        let _token = mockJwtToken(_pld, _iat, _exp);
        let _jwt  = decodeMockJwtToken(_token);
        it("Creates JwtSubject from token", async () => {
            let _subject = await JwtSubject.decode(_token);
            assert.deepStrictEqual(_subject.header, _jwt.header, "Headers should be equal.");
            assert.deepStrictEqual(_subject.payload, _jwt.payload, "Payload should be equal.");
            assert.deepStrictEqual(_subject.signature, _jwt.signature, "Signature should be equal.");
            assert.deepStrictEqual(_subject.token, _token, "Headers should be equal.");
            assert.deepStrictEqual(_subject.issued.unix(), _iat.unix(), "Issued at should be equal.");
            assert.deepStrictEqual(_subject.expires.unix(), _exp.unix(), "Expires should be equal.");
            assert.deepStrictEqual(_subject.nonce, _pld.nonce, "Nonce should be equal.");
            assert.deepStrictEqual(_subject.id, _pld.sub, "Subject should be equal.");
            assert.deepStrictEqual(_subject.audience, _pld.aud, "Audience should be equal.");
            assert.deepStrictEqual(_subject.issuer, _pld.iss, "Issuer should be equal.");
        });
        it("Failes token null.", () => {
            assert.rejects(() => {JwtSubject.decode(null)}, "Should throw exception.");
        });
        it("Failes token empty.", () => {
            assert.rejects(() => {JwtSubject.decode("")}, "Should throw exception.");
        });
        it("Failes token spaces only.", () => {
            assert.rejects(() => {JwtSubject.decode("       ")}, "Should throw exception.");
        });
    });
});

module.exports = {
    mockJwtToken: mockJwtToken,
    decodeMockJwtToken: decodeMockJwtToken
};
