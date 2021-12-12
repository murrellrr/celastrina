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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {Cookie} = require("../HTTP");
const assert = require("assert");
const moment = require("moment");

describe("Cookie", () => {
    describe("#constructor(name, value = null, options = {})", () => {
        let err = CelastrinaValidationError.newValidationError("Invalid String. Attribute 'name' cannot be undefined, null, or zero length.", "cookie.name");
        it("Creates successfully with name", () => {
            let _cookie = new Cookie("COOKIE_1");
            assert.deepStrictEqual(_cookie._name, "COOKIE_1", "Name should be 'COOKIE_1'");
            assert.deepStrictEqual(_cookie._value, null, "Value should be null");
            assert.deepStrictEqual(_cookie._options, {}, "Options should be empty object");
            assert.deepStrictEqual(_cookie._dirty, false, "Dirty marker should be false");
        });
        it("Fails with null name", () => {
            assert.throws(() => {
                new Cookie(null);
            }, err, "Expacted null name to fail.");
        });
        it("Fails with empty name", () => {
            assert.throws(() => {
                new Cookie("");
            }, err, "Expected empty name to fail.");
        });
        it("Fails with all space '   ' name", () => {
            assert.throws(() => {
                new Cookie("    ");
            }, err, "Exected only space '   ' name to fail.");
        });
        it("Fails with {Object} name", () => {
            assert.throws(() => {
                new Cookie({});
            }, err, "Exected object name to fail.");
        });
        it("Sets value", () => {
            let _cookie = new Cookie("COOKIE_1", "VALUE_1");
            assert.deepStrictEqual(_cookie._name, "COOKIE_1", "Name should be 'COOKIE_1'.");
            assert.deepStrictEqual(_cookie._value, "VALUE_1", "Value should 'VALUE_1'.");
            assert.deepStrictEqual(_cookie._dirty, false, "Dirty marker should be false");
        });
        it("Sets options", () => {
            let _now = new Date();
            let _options = {
                maxAge: 3600,
                expires: _now,
                httpOnly: true,
                domain: "sample.domain",
                path: "/path",
                secure: true,
                sameSite: true
            };
            let _cookie = new Cookie("COOKIE_1", "VALUE_1", _options);
            assert.deepStrictEqual(_cookie._name, "COOKIE_1", "Name should be 'COOKIE_1'.");
            assert.deepStrictEqual(_cookie._value, "VALUE_1", "Value should 'VALUE_1'.");
            assert.deepStrictEqual(_cookie.maxAge, 3600, "Max age 3600.");
            assert.deepStrictEqual(_cookie.expires, _now, "Expires '" + _now + "'.");
            assert.deepStrictEqual(_cookie.httpOnly, true, "HTTP Only true.");
            assert.deepStrictEqual(_cookie.domain, "sample.domain", "Domain 'sample.domain'.");
            assert.deepStrictEqual(_cookie.path, "/path", "Path '/path'.");
            assert.deepStrictEqual(_cookie.secure, true, "Secure true.");
            assert.deepStrictEqual(_cookie.sameSite, true, "Same site true");
            assert.deepStrictEqual(_cookie._dirty, false, "Dirty marker should be false");
        });
    });
    describe("#value", () => {
        it("get/set value", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.value = "VALUE_1";
            assert.deepStrictEqual(_cookie.value, "VALUE_1", "Value should 'VALUE_1'.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#maxAge", () => {
        it("get/set maxAge", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.maxAge = 3600;
            assert.deepStrictEqual(_cookie.maxAge, 3600, "maxAge should 3600.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#expires", () => {
        let _now = new Date();
        it("get/set expires", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.expires = _now;
            assert.deepStrictEqual(_cookie.expires, _now, "maxAge should '" + _now + "'.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#httpOnly", () => {
        it("get/set expires", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.httpOnly = true;
            assert.deepStrictEqual(_cookie.httpOnly, true, "httpOnly should be true.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#domain", () => {
        it("get/set domain", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.domain = "sample.domain";
            assert.deepStrictEqual(_cookie.domain, "sample.domain", "domain should be 'sample.domain'.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#path", () => {
        it("get/set path", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.path = "/path";
            assert.deepStrictEqual(_cookie.path, "/path", "path should be '/path'.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#secure", () => {
        it("get/set secure", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.secure = true;
            assert.deepStrictEqual(_cookie.secure, true, "secure should be true.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#sameSite", () => {
        it("get/set sameSite", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.sameSite = true;
            assert.deepStrictEqual(_cookie.sameSite, true, "sameSite should be true.");
            assert.deepStrictEqual(_cookie._dirty, true, "_dirty should be true.");
        });
    });
    describe("#doSetCookie()", () => {
        it("Should be false", () => {
            let _cookie = new Cookie("COOKIE_1");
            assert.deepStrictEqual(_cookie.doSetCookie, false, "doSetCookie should return false.");
        });
        it("Should be true", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.value = "VALUE_1";
            assert.deepStrictEqual(_cookie.doSetCookie, true, "doSetCookie should return true.");
        });
    });
    describe("#parseValue()", () => {
        it("Should return empty string for null value", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.value = null;
            assert.deepStrictEqual(_cookie.parseValue, "", "parseValue should return empty string.");
        });
        it("Should return string it was set too, if not null", () => {
            let _cookie = new Cookie("COOKIE_1");
            _cookie.value = "VALUE_1";
            assert.deepStrictEqual(_cookie.parseValue, "VALUE_1", "parseValue should return 'VALUE_1'.");
        });
    });
    describe("#serialize()", () => {
        it("Should serialize name, value, options to standard", () => {
            let _now = new Date();
            let _result = "COOKIE_1=VALUE_1; Max-Age=3600; Domain=sample.domain; Path=/path; Expires=" + _now.toGMTString() + "; HttpOnly; Secure; SameSite=Strict";
            let _options = {
                maxAge: 3600,
                expires: _now,
                httpOnly: true,
                domain: "sample.domain",
                path: "/path",
                secure: true,
                sameSite: true
            };
            let _cookie = new Cookie("COOKIE_1", "VALUE_1", _options);
            assert.deepStrictEqual(_cookie.serialize(), _result, "parseValue should return empty string.");
        });
    });
    describe("#delete()", () => {
        it("Should serialize name, value, options to standard", () => {
            let _now = new Date();
            let _epoch = moment("1970-01-01T00:00:00Z").utc().toDate();
            let _result = "COOKIE_1=; Max-Age=3600; Domain=sample.domain; Path=/path; Expires=" + _epoch.toUTCString() + "; HttpOnly; Secure; SameSite=Strict";
            let _options = {
                maxAge: 3600,
                expires: _now,
                httpOnly: true,
                domain: "sample.domain",
                path: "/path",
                secure: true,
                sameSite: true
            };
            let _cookie = new Cookie("COOKIE_1", "VALUE_1", _options);
            _cookie.delete();
            assert.deepStrictEqual(_cookie.serialize(), _result, "parseValue should return empty string.");
        });
    });
    describe("Static Initializers", () => {
        describe("Cookie#newCookie(name, value = null, options = {})", () => {
            it("Creates new from static initializer", async () => {
                let _now = new Date();
                let _epoch = moment("1970-01-01T00:00:00Z").utc().toDate();
                let _result = "COOKIE_1=; Max-Age=3600; Domain=sample.domain; Path=/path; Expires=" + _epoch.toUTCString() + "; HttpOnly; Secure; SameSite=Strict";
                let _options = {
                    maxAge: 3600,
                    expires: _now,
                    httpOnly: true,
                    domain: "sample.domain",
                    path: "/path",
                    secure: true,
                    sameSite: true
                };
                let _cookie = await Cookie.newCookie("COOKIE_1", "VALUE_1", _options);
                assert.deepStrictEqual(_cookie._name, "COOKIE_1", "Name should be 'COOKIE_1'.");
                assert.deepStrictEqual(_cookie._value, "VALUE_1", "Value should 'VALUE_1'.");
                assert.deepStrictEqual(_cookie._options, _options, "Options should match.");
                assert.deepStrictEqual(_cookie._dirty, true, "Dirty marker should be false");
            });
        });
        describe("Cookie#loadCookie(name, value = null, options = {})", () => {
            it("Creates existing from static initializer", async () => {
                let _now = new Date();
                let _epoch = moment("1970-01-01T00:00:00Z").utc().toDate();
                let _result = "COOKIE_1=; Max-Age=3600; Domain=sample.domain; Path=/path; Expires=" + _epoch.toUTCString() + "; HttpOnly; Secure; SameSite=Strict";
                let _options = {
                    maxAge: 3600,
                    expires: _now,
                    httpOnly: true,
                    domain: "sample.domain",
                    path: "/path",
                    secure: true,
                    sameSite: true
                };
                let _cookie = await Cookie.loadCookie("COOKIE_1", "VALUE_1", _options);
                assert.deepStrictEqual(_cookie._name, "COOKIE_1", "Name should be 'COOKIE_1'.");
                assert.deepStrictEqual(_cookie._value, "VALUE_1", "Value should 'VALUE_1'.");
                assert.deepStrictEqual(_cookie._options, _options, "Options should match.");
                assert.deepStrictEqual(_cookie._dirty, false, "Dirty marker should be false");
            });
        });
        describe("Cookie#parseCookies(value,results = [])", () => {
            it("Creates existing from 'Cookie: X' string", async () => {
                let _expected = [new Cookie("COOKIE_3", "VALUE_3"),
                                 new Cookie("COOKIE_2", "VALUE_2"),
                                 new Cookie("COOKIE_1", "VALUE_1")];
                let _cookies = await Cookie.parseCookies("COOKIE_1=VALUE_1; COOKIE_2=VALUE_2;COOKIE_3=VALUE_3");
                assert.deepStrictEqual(_cookies, _expected, "Expected cookies to match.");
            });
        });
    });
});
