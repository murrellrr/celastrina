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
const {CelastrinaError, CelastrinaValidationError, Cryptography} = require("@celastrina/core");
const {SessionManager, AESSessionManager, AESSessionManagerParser, CookieParameter, HeaderParameter, QueryParameter,
       BodyParameter} = require("../HTTP");
const assert = require("assert");

describe("AESSessionManagerParser", () => {
    describe("#_create(_AESSessionManager)", () => {
        it("creates valid SessionManager using CookieParamter", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                                      parameter: "cookie",
                                      name: "celastrinajs_session",
                                      options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                                      createNew:  true};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof CookieParameter, true, "Expected CookieParameter.");
            assert.strictEqual(_sm.name, "celastrinajs_session", "Expected 'celastrinajs_session'.");
            assert.strictEqual(_sm.createNew, true, "Expected createNew true.");
        });
        it("creates valid SessionManager using HeaderParameter", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                parameter: "header",
                name: "celastrinajs_session",
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                createNew:  true};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof HeaderParameter, true, "Expected HeaderParameter.");
        });
        it("creates valid SessionManager using QueryParameter", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                parameter: "query",
                name: "celastrinajs_session",
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                createNew:  true};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof QueryParameter, true, "Expected QueryParameter.");
        });
        it("creates valid SessionManager using BodyParameter", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                parameter: "body",
                name: "celastrinajs_session",
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                createNew:  true};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof BodyParameter, true, "Expected BodyParameter.");
        });
        it("fails missing iv", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                parameter: "cookie",
                name: "celastrinajs_session",
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a"},
                createNew:  true};
            try {
                /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
                assert.fail("Expected to fail for no IV.");
            }
            catch(exception) {
                assert.strictEqual(exception.code, 400, "Expected code 400.");
                assert.strictEqual(exception.tag, "AESSessionManager.options.iv", "Expected 'AESSessionManager.options.iv' for tag.");
            }
        });
        it("fails missing key", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                parameter: "cookie",
                name: "celastrinajs_session",
                options: {iv: "1234567890123456"},
                createNew:  true};
            try {
                /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
                assert.fail("Expected to fail for no key.");
            }
            catch(exception) {
                assert.strictEqual(exception.code, 400, "Expected code 400.");
                assert.strictEqual(exception.tag, "AESSessionManager.options.key", "Expected 'AESSessionManager.options.key' for tag.");
            }
        });
        it("defaults to CookieParamter", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                name: "celastrinajs_session",
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                createNew:  true};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof CookieParameter, true, "Expected CookieParameter.");
        });
        it("defaults to CookieParamter and 'celastrinajs_session'", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"},
                createNew:  true};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof CookieParameter, true, "Expected CookieParameter.");
            assert.strictEqual(_sm.name, "celastrinajs_session", "Expected 'celastrinajs_session'.");
        });
        it("defaults to CookieParamter and 'celastrinajs_session' and createNew true", async () => {
            let _parser = new AESSessionManagerParser();
            let _AESSessionManager = {_content: {type: "application/vnd.celastrinajs.attribute+json;AESSessionManager"},
                options: {key: "c2f9dab0ceae47d99c7bf4537fbb0c3a", iv: "1234567890123456"}};
            /**@type{SessionManager}*/let _sm = await _parser._create(_AESSessionManager);
            assert.strictEqual(_sm.parameter instanceof CookieParameter, true, "Expected CookieParameter.");
            assert.strictEqual(_sm.name, "celastrinajs_session", "Expected 'celastrinajs_session'.");
            assert.strictEqual(_sm.createNew, true, "Expected createNew true.");
        });
    });
});
