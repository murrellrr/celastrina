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

const {CelastrinaError, CelastrinaValidationError, Configuration} = require("@celastrina/core");
const {HTTPCloudEventFunction, CloudEventListener, HTTPCloudEventAddOn} = require("../Message");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const {MockHTTPContext} = require("../../http/test/HTTPContextTest");
const {HTTPAddOn} = require("@celastrina/http");

class MockCloudEventAzureFunctionContext extends MockAzureFunctionContext {
    constructor() {
        super();
    }
    set body(message) {
        let _contentType = "application/cloudevents+json; charset=utf-8";
        if(Array.isArray(message)) _contentType = "application/cloudevents-batch+json; charset=utf-8";
        this.bindings.req.body = message;
        this.bindings.req.rawBody = JSON.stringify(message);
        this.bindings.req.headers["content-type"] = _contentType;
        this.bindings.req.method = "post";
    }
}
class MockCloudEventListener extends CloudEventListener {
    constructor() {
        super();
        this.onEventInvoked = false;
        this.onEventCount = 0;
    }
    reset() {
        this.onEventInvoked = false;
        this.onEventCount = 0;
    }
    async onEvent(event) {
        this.onEventInvoked = true;
        ++this.onEventCount;
    }
}

describe("HTTPCloudEventFunction", () => {
    describe("Individual Event", () => {
        let _azcontext = null;
        let _config = null;
        let _function = null;
        let _eventConfig = null;
        before(() => {
            _azcontext = new MockCloudEventAzureFunctionContext();
            _config = new Configuration("HTTPCloudEventFunctionTest");
            let _httpConfig = new HTTPAddOn()
            _eventConfig = new HTTPCloudEventAddOn();
            _config.addOn(_httpConfig)
                   .addOn(_eventConfig);
            _config.setAuthorizationOptimistic(true);
            _eventConfig.listener = new MockCloudEventListener();
            _function = new HTTPCloudEventFunction(_config);
        });

        it("Shoult trigger the event listener onEvent", async () => {
            // specversion : "1.0",
            // type: "com.example.someevent",
            _azcontext.body = {


                source : "/mycontext",
                id: "A234-1234-1234",
                time: "2018-04-05T17:31:00Z",
                datacontenttype: "text/plain",
                data: "This is a test"
            };
            await _function.execute(_azcontext);
            assert.strictEqual(_eventConfig.listener.onEventInvoked, true, "Expected true.");
        });
    });
});

module.exports = {
    MockCloudEventListener: MockCloudEventListener
};
