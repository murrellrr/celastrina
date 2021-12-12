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
const {BodyParameter} = require("../HTTP");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const {Configuration} = require("@celastrina/core");

describe("BodyParameter", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new BodyParameter();
            assert.deepStrictEqual(_fetch._type, "body", "Sets type to 'query'");
        });
    });
    describe("#get(context, key, defaultValue = null)", async () => {
        it("Rertieve the body specified", async () => {
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
            let _fetch = new BodyParameter();
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let body = await _fetch.getParameter(_context, "xCelastringjsValue");
            assert.deepStrictEqual(body, "This is a test; utf-8", "Expected body 'This is a test; utf-8'.");
        });
        it("Rertieve the nested body specified", async () => {
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
            let _fetch = new BodyParameter();
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let body = await _fetch.getParameter(_context, "xCelastringjsSettings.xCelastringjsSession.value");
            assert.deepStrictEqual(body, "This is a deep test; utf-8", "Expected body 'This is a deep test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
            let _fetch = new BodyParameter();
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let body = await _fetch.getParameter(_context, "xCelastringjsValue2", "This is a test 2; utf-8");
            assert.deepStrictEqual(body, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
