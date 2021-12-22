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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, instanceOfCelastringType, AddOnManager,
       Configuration} = require("@celastrina/core");
const {HMAC, HMACConfigurationParser, HMACAddOn, HTTPAddOn} = require("../HTTP");
const assert = require("assert");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");

describe("HMACConfigurationParserTest", () => {
    describe("#_create(_Object)", () => {
        it("should set HMAC in config", async () => {
            let _azcontext = new MockAzureFunctionContext();
            let _hmac = new HMAC("1234567890123456");
            let _object = {
                _content: {type: "application/vnd.celastrinajs.config+json;HMAC"},
                hmac: _hmac
            };
            let _config = {};
            let _addOnManager = new AddOnManager();
            _addOnManager.add(new HTTPAddOn());
            _addOnManager.add(new HMACAddOn());
            let _parser = new HMACConfigurationParser();
            await _parser.initialize(_azcontext, _config, _addOnManager);
            await _parser.parse(_object);
            assert.deepStrictEqual(_addOnManager.get(HMACAddOn).hmac, _hmac, "Expected _hmac.");
        });
    });
});
