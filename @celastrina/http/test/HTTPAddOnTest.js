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
const {HTTPAddOn, JwtAddOn} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockSessionManager} = require("./SessionManagerTest");
const assert = require("assert");

describe("HTTPAddOn", () => {
    describe("#constructor(name)", () => {
        it("Sets defaults", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            assert.strictEqual(_httpconfig.sessionManager, null, "Expected null.");
        });
    });
    describe("Accessors", () => {
        it("Sets session manager", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            let _sm = new MockSessionManager();
            _httpconfig.setSessionManager(_sm);
            assert.deepStrictEqual(_httpconfig.sessionManager, _sm, "Expected _sm.");
        });
        it("Sets session manager", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            _httpconfig.setSessionManager();
            assert.deepStrictEqual(_httpconfig.sessionManager, null, "Expected null.");
        });
        it("Set session manager returns HTTPAddOn", () => {
            let _config    = new Configuration("HTTPConfigurationTest");
            /**@type{HTTPAddOn}*/let _httpconfig = new HTTPAddOn();
            _config.addOn(_httpconfig);
            assert.deepStrictEqual(_httpconfig.setSessionManager() instanceof HTTPAddOn, true, "Expected 'HTTPAddOn'.");
        });
    });
});

