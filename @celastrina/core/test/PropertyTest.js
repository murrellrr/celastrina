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

const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {CelastrinaError, CelastrinaValidationError, PropertyHandler, Property} = require("../Core");
const assert = require("assert");

describe("PropertyHandler", () => {
    describe("#async initialize(context, config)", () => {
        it("should log a message and reject the promise with CelastrinaError.", () => {
            let handler = new PropertyHandler();
            let context = new MockAzureFunctionContext();
            let config  = {};
            assert.rejects(handler.initialize(context, config));
            assert.strictEqual(context.log.message, "[PropertyHandler.initialize(context)]: Not Implemented.");
        });
    });
    describe("#async getProperty(key, defaultValue = null)", () => {
        it("should log a message and reject the promise with CelastrinaError.", () => {
            let handler = new PropertyHandler();
            let context = new MockAzureFunctionContext();
            let config  = {};
            assert.rejects(handler.getProperty("key"));
        });
    });
});

class MockPropertyHandler extends PropertyHandler {
    constructor() {
        super();
        this._env = {};
        this._env["name"] = "value";
    }

    async initialize(context, config) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            resolve(this._env[key]);
        });
    }
}

class MockProperty extends Property {
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
        this.resolveInvoked = false;
    }

    async resolve(value) {
        return new Promise((resolve, reject) => {
            this.resolveInvoked = true;
            resolve(value);
        });
    }
}

describe("Property", ()=> {
    describe("#constructor(name, defaultValue = null)", ()=> {
        it("should set key and defaultValue if one is specified.", () => {
            let property = new MockProperty("name", "value");
            assert.strictEqual(property.name, "name");
            assert.strictEqual(property.defaultValue, "value");
        });
    });
    describe("#load(handler)", () => {
        it("should invoke resolve with name 'key' on load.", () => {
            let property = new MockProperty("name", "value");
            let handler  = new MockPropertyHandler();
            property.load(handler)
                .then((value) => {
                    assert.strictEqual(property.resolveInvoked, true, "Expected resolved to be invoked.");
                    assert.strictEqual(value, "value");
                })
                .catch((exception) => {
                    assert.fail(exception, "Unhandled exception from Promise.");
                });
        });
    });
});
