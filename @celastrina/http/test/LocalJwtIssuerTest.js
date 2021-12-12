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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {LocalJwtIssuer, HTTPContext, Cookie, JwtSubject, JwtAddOn, JwtSentry} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");
const jwt = require("jsonwebtoken");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {Subject} = require("../../core");

describe("LocalJwtIssuer", () => {
    describe("#constructor(issuer, keyProperty, audiences = null, assignments = null, validateNonce = false)", () => {
        it("Constructs defaults", () => {
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop");
            assert.strictEqual(_localjwt._issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_localjwt._key, "celastrinajsmocktoken_prop", "Expected 'celastrinajsmocktoken_prop'.");
            assert.strictEqual(_localjwt._audiences, null, "Expected null.");
            assert.strictEqual(_localjwt._roles, null, "Expected null.");
            assert.strictEqual(_localjwt._validateNonce, false, "Expected false.");
        });
        it("Constructs values", () => {
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken_prop", ["a"], ["b"], true);
            assert.strictEqual(_localjwt._issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_localjwt._key, "celastrinajsmocktoken_prop", "Expected 'celastrinajsmocktoken_prop'.");
            assert.deepStrictEqual(_localjwt._audiences, ["a"], "Expected ['a'].");
            assert.deepStrictEqual(_localjwt._roles, ["b"], "Expected ['b'].");
            assert.strictEqual(_localjwt._validateNonce, true, "Expected true.");
        });
    });
    describe("#verify(context, _subject)", () => {
        it("Verifies valid token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azcontext  = new MockAzureFunctionContext();
            _azcontext.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _mocktoken);
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);

            let _assertion = {assignments: ["mock_user_role"], verified: true};
            assert.deepStrictEqual(await _localjwt.verify(_context, _jwtsubject), _assertion, "Expected true.");
        });
        it("Does not verifies invalid issuer", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock/invalid", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azcontext  = new MockAzureFunctionContext();
            _azcontext.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _mocktoken);
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);

            let _assertion = {verified: false};
            assert.deepStrictEqual(await _localjwt.verify(_context, _jwtsubject), _assertion, "Expected false.");
        });
        it("Does not verifies invalid audience", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7_INVALID"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azcontext  = new MockAzureFunctionContext();
            _azcontext.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _mocktoken);
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);

            let _assertion = {verified: false};
            assert.deepStrictEqual(await _localjwt.verify(_context, _jwtsubject), _assertion, "Expected false.");
        });
        it("Does not verifies invalid token", async () => {
            let _mockpayload = {iss: "@celastrinajs/issuer/mock", aud: "aefff932-5d4e-4216-a117-0d42e47b06b7"};
            let _mocktoken = jwt.sign(_mockpayload, "celastrinajsmocktoken");
            let _azcontext  = new MockAzureFunctionContext();
            _azcontext.req.headers["authorization"] = "Bearer " + _mocktoken;
            /**@type{Configuration}*/let _config = new Configuration("JwtSentryTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn("JwtSentryTest");
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let _subject = new Subject("1234567890");
            let _jwtsubject = await JwtSubject.decode(_subject, _mocktoken + "_INVALID");
            let _localjwt = new LocalJwtIssuer("@celastrinajs/issuer/mock", "celastrinajsmocktoken", ["aefff932-5d4e-4216-a117-0d42e47b06b7"], ["mock_user_role"]);

            let _assertion = {verified: false};
            assert.deepStrictEqual(await _localjwt.verify(_context, _jwtsubject), _assertion, "Expected false.");
        });
    });
});
