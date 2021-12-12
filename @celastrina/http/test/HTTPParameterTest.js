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
const {HTTPParameter} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockHTTPParameter extends HTTPParameter {
    constructor(type = "HTTPParameter") {
        super(type);
        this.isGetInvoked = false;
    }
    _getParameter(context, key) {
        this.isGetInvoked = true;
        return "";
    }
    reset() {
        this.isGetInvoked = false;
    }
}

describe("HTTPParameter", () => {
    describe("#constructor(type)", () => {
        it("Sets the default type", () => {
            let _fetch = new HTTPParameter();
            assert.deepStrictEqual(_fetch._type, "HTTPParameter", "Sets type to 'HTTPParameter'");
        });
        it("Sets the type", () => {
            let _fetch = new HTTPParameter("TEST_TYPE");
            assert.deepStrictEqual(_fetch._type, "TEST_TYPE", "Sets type to 'TEST_TYPE'");
        });
        it("Sets the type via getter", () => {
            let _fetch = new HTTPParameter("TEST_TYPE");
            assert.deepStrictEqual(_fetch.type, "TEST_TYPE", "Sets type to 'TEST_TYPE'");
        });
    });
    describe("#_getParameter(context, key, defaultValue = null)", () => {
        let _fetch = new HTTPParameter();
        it("Throws a not implemented", () => {
            let err = CelastrinaError.newError("Not Implemented.", 501);
            assert.rejects(() => {
                _fetch._getParameter(null, "");
            }, err, "Should reject with Not Implemented.");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        it("Throws a not implemented", () => {
            let _fetch = new HTTPParameter();
            let err = CelastrinaError.newError("Not Implemented.", 501);
            assert.rejects(() => {
                _fetch.getParameter(null, "");
            }, err, "Should reject with Not Implemented.");
        });
        it("Invokes fetch when Get is called.", async () => {
            let _fetch = new MockHTTPParameter();
            await _fetch.getParameter(null, "");
            assert.strictEqual(_fetch.isGetInvoked, true, "Expected fetch to be invoked by get call.");
        });
    });
});
