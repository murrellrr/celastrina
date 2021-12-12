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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, instanceOfCelastringType} = require("@celastrina/core");
const {HMACParser, HeaderParameter, HTTPParameter} = require("../HTTP");
const assert = require("assert");

describe("HMACParserTest", () => {
    describe("#_create(_HMAC)", () => {
        it("should create hmac config with required field", async () => {
            let _object = {
                _content: {type: "application/vnd.celastrinajs.attribute+json;HMAC"},
                secret: "1234567890123456"
            };
            let _parser = new HMACParser();
            await assert.doesNotReject(() => {
                return _parser.parse(_object);
            });
        });
        it("should reject missing required secret", async () => {
            let _object = {
                _content: {type: "application/vnd.celastrinajs.attribute+json;HMAC"}
            };
            let _parser = new HMACParser();
            await assert.rejects(() => {
                return _parser.parse(_object);
            });
        });
        it("should create hmac config using defaults", async () => {
            let _object = {
                _content: {type: "application/vnd.celastrinajs.attribute+json;HMAC"},
                secret: "1234567890123456"
            };
            let _parser = new HMACParser();
            /**@type{HMAC}*/let _hmac = await _parser.parse(_object);
            assert.strictEqual(_hmac.name, "x-celastrinajs-hmac", "Expected 'x-celastrinajs-hmac'.");
            assert.strictEqual(_hmac.algorithm, "sha256", "Expected 'sha256'.");
            assert.strictEqual(_hmac.encoding, "hex", "Expected 'hex'.");
            assert.deepStrictEqual(instanceOfCelastringType(HTTPParameter, _hmac.parameter), true, "Expected true.");
            assert.deepStrictEqual(_hmac.assignments.size === 0, true, "Expected size 0.");
        });
        it("should create hmac config", async () => {
            let _param = new HeaderParameter();
            let _assignments = new Set(["a1", "a2", "a3"]);
            let _object = {
                _content: {type: "application/vnd.celastrinajs.attribute+json;HMAC"},
                name: "X-test-name",
                secret: "1234567890123456",
                encoding: "hex",
                parameter: _param,
                assignments: ["a1", "a2", "a3"]
            };
            let _parser = new HMACParser();
            /**@type{HMAC}*/let _hmac = await _parser.parse(_object);
            assert.strictEqual(_hmac.name, "X-test-name", "Expected 'X-test-name'.");
            assert.strictEqual(_hmac.algorithm, "sha256", "Expected 'sha256'.");
            assert.strictEqual(_hmac.encoding, "hex", "Expected 'hex'.");
            assert.deepStrictEqual(_hmac.parameter, _param, "Expected _param.");
            assert.deepStrictEqual(_hmac.assignments, _assignments, "Expected _assignments.");
        });
    });
});
