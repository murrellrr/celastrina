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

const {CelastrinaError, CelastrinaValidationError} = require("@celastrina/core");
const {Header, Message} = require("../Message");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

const MessageSameple = "{\"_header\":{\"_resource\":\"robert\",\"_action\":\"update\",\"_source\":\"https://function.com\",\"_published\":\"2021-03-06T21:57:20.176Z\",\"_messageId\":\"b78b5241-99ac-4565-936d-494803fa3f33\",\"_traceId\":\"f33f107d-ec63-4a45-8ba4-1fa7328f9c9d\",\"_environment\":2,\"_expires\":\"2022-03-06T21:57:20.176Z\",\"_object\":{\"_mime\":\"application/json; com.celastrinajs.message.header\"}},\"_payload\":{\"test\":\"value\"},\"_object\":{\"_mime\":\"application/json; com.celastrinajs.message\"}}";

describe("Message", () => {
    describe("#unmarshall", () => {
        it("should unmarshall to Message successfully with valid JSON.", () => {
            Message.unmarshall(MessageSameple)
                .then((message) => {
                    //
                })
                .catch((exception) => {
                    assert.fail(exception);
                });
        });
    });
});
