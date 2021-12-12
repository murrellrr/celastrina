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
const {HTTPParameter} = require("../HTTP");
const {CelastrinaError} = require("../../core/Core");
class MockHTTPParameter extends HTTPParameter {
    constructor(type = "MockHTTPParameter", readOnly = true, value = {mock_key: "Mock Value"}) {
        super(type, readOnly);
        this.getParameterInvoked = false;
        this.setParameterInvoked = false;
        /**@type{Object}*/this.value = value;
    }
    reset() {
        this.getParameterInvoked = false;
        this.setParameterInvoked = false;
        this.value = {mock_key: "Mock Value"};
    }
    stageParameter(key, value) {
        this.value[key] = value;
        return this;
    }
    _getParameter(context, key) {
        this.getParameterInvoked = true;
        return this.value[key];
    }
    _setParameter(context, key, value = null) {
        this.getParameterInvoked = true;
        this.value[key] = value;
    }
}
module.exports = {
    MockHTTPParameter: MockHTTPParameter
};
