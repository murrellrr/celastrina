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
const {HTTPParameter, HeaderParameter, JwtAddOn} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockIssuer} = require("./IssuerTest");
const assert = require("assert");


describe("JwtAddOn", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _mtoken = new HeaderParameter();

            assert.deepStrictEqual(_jwtconfig.issuers, [], "Expected empty array.");
            assert.deepStrictEqual(_jwtconfig.parameter, _mtoken, "Expected HeaderParameter.");
            assert.strictEqual(_jwtconfig.token, "authorization", "Expected 'authorization'.");
            assert.strictEqual(_jwtconfig.scheme, "Bearer", "Expected 'Bearer'.");
            assert.strictEqual(_jwtconfig.removeScheme, true, "Expected true.");
        });
    });
    describe("Accessors", () => {
        it("Gets issuers", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.deepStrictEqual(_jwtconfig.issuers, [], "Expected empty array.");
        });
        it("Gets parameter", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _param = new HeaderParameter();
            assert.deepStrictEqual(_jwtconfig.parameter, _param, "Expected JwtHeaderToken.");
        });
        it("Gets token", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.deepStrictEqual(_jwtconfig.token, "authorization", "Expected 'authorization'.");
        });
        it("Gets scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.scheme, "Bearer", "Expected 'Bearer'.");
        });
        it("Gets remove scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.removeScheme, true, "Expected true.");
        });
        it("Sets issuers", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _issuer = new MockIssuer();
            assert.strictEqual(_jwtconfig.setIssuers([_issuer]) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.issuers, [_issuer], "Expected MockBaseIssuer.");
            _jwtconfig.issuers = [];
            assert.deepStrictEqual(_jwtconfig.issuers, [], "Expected Empty Array.");
        });
        it("Adds issuer", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _issuer = new MockIssuer();
            assert.strictEqual(_jwtconfig.addIssuer(_issuer) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.issuers, [_issuer], "Expected MockBaseIssuer.");
        });
        it("Sets parameter", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            let _token = new HeaderParameter();
            assert.strictEqual(_jwtconfig.setParameter(_token) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.parameter, _token, "Expected HeaderParameter.");
        });
        it("Sets token", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.setToken("value") instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.token, "value", "Expected 'value'.");
        });
        it("Sets scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.setScheme("Cert ") instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.deepStrictEqual(_jwtconfig.scheme, "Cert ", "Expected 'Cert '.");
        });
        it("Sets remove scheme", () => {
            let _config    = new Configuration("JwtAddOnTest");
            /**@type{JwtAddOn}*/let _jwtconfig = new JwtAddOn();
            _config.addOn(_jwtconfig);
            assert.strictEqual(_jwtconfig.setRemoveScheme(true) instanceof JwtAddOn, true, "Expected JwtAddOn.");
            assert.strictEqual(_jwtconfig.removeScheme, true, "Expected true.");
            _jwtconfig.setRemoveScheme(false);
            assert.strictEqual(_jwtconfig.removeScheme, false, "Expected false.");
        });
    });
});
