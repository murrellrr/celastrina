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

/**
 * @author Robert R Murrell
 * @copyright Robert R Murrell
 * @license MIT
 */

"use strict";

class MockAzureFunctionContext {
    constructor() {
        this.doneInvoked = false;
        this.donecontents = null;
        this.bindings     = {
                             tick: {
                                 schedule: {adjustForDST: true},
                                 scheduleStatus: {
                                     last: "",
                                     lastUpdated: "",
                                     next: ""
                                 },
                                 isPastDue: false
                             },
                             message: {},
                             req: {
                                originalUrl: "http://original-azure-function-url",
                                method: "GET",
                                query: {},
                                headers: {
                                    "authorization": "Bearer mock_bearer_token",
                                    "connection": "Keep-Alive",
                                    "accept": "application/json",
                                    "host": "original-azure-function-url",
                                    "origin": "https://functions.azure.com",
                                },
                                params: {},
                                body: {},
                                rawBody: {}
                             },
                             res: {
                                 headers: {
                                     "Content-Type": "application/json"
                                 },
                                 body: {},
                                 rawBody: {},
                                 status: 500,
                                 cookies: null
                             },
                             mockBindingTwo: {key: "mock_key", value: "mock_value"}};
        this.bindingData  = {invocationId: "mock_invocation_id"};
        this.invocationId = this.bindingData.invocationId;
        this.traceContext = {traceparent: "mock_trace_id"};
        this.log = {
            message: null,
            invoked: null,
            reset() {this.message = null; this.invoked = null;},
            error(message) {this.message = message; this.invoked = "error";console.log("+++++[celastrinajs.mocha.azcontext.mock.logging][error]" + message);},
            warn(message) {this.message = message; this.invoked = "warn";console.log("+++++[celastrinajs.mocha.azcontext.mock.logging][warn]" + message);},
            info(message) {this.message = message; this.invoked = "info";console.log("+++++[celastrinajs.mocha.azcontext.mock.logging][info]" + message);},
            verbose(message) {this.message = message; this.invoked = "verbose";console.log("+++++[celastrinajs.mocha.azcontext.mock.logging][verbose]" + message);},
        }
    }
    get tick() {return this.bindings.tick;}
    set tick(tick) {this.bindings.tick = tick;}
    get req() {return this.bindings.req;}
    set req(req) {this.bindings.req = req;}
    get res() {return this.bindings.res;}
    set res(res) {this.bindings.res = res;}
    done(something) {
        this.doneInvoked = true;
        this.donecontents = something;
    }
}

module.exports = {
    MockAzureFunctionContext: MockAzureFunctionContext
};
