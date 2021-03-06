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
const {CelastrinaError, CelastrinaValidationError, StringProperty, Configuration, ModuleContext, FunctionRoleContext,
       ResourceAuthorizationConfiguration, ResourceAuthorizationContext} = require("../Core");
const assert = require("assert");

describe("Configuration", () => {
    describe("#async initialize(context)", () => {
        it("should initialize successfully with a name and loaded=true.", () => {
            let configuration = new Configuration("test_name");
            let context = new MockAzureFunctionContext();
            assert.doesNotReject(configuration.initialize(context))
                .then(() => {
                    // mock what the base function will do.
                    return assert.doesNotReject(configuration.bootstrapped());
                })
                .then(() => {
                    assert.strictEqual(configuration.name, "test_name");
                    assert.strictEqual(configuration.loaded, true);
                })
                .catch((exception) => {
                    assert.fail(exception);
                });
        });
        it("should fail with null name.", () => {
            try {
                let configuration = new Configuration(null);
                assert.fail("Should not have passed constructor with null name.");
            }
            catch(/**@type{CelastrinaError}*/exception) {
                assert.strictEqual((exception instanceof CelastrinaError), true);
            }
        });
        it("should fail with empty name.", () => {
            try {
                let configuration = new Configuration("");
                assert.fail("Should not have passed constructor with null name.");
            }
            catch(/**@type{CelastrinaError}*/exception) {
                assert.strictEqual((exception instanceof CelastrinaError), true);
            }
        });
        it("should fail with non-string name.", () => {
            try {
                let configuration = new Configuration(12345);
                assert.fail("Should not have passed constructor with null name.");
            }
            catch(/**@type{CelastrinaError}*/exception) {
                assert.strictEqual((exception instanceof CelastrinaError), true);
            }
        });
        it("should NOT fail with StringProperty name.", () => {
            let configuration = new Configuration(new StringProperty("name", "test_name"));
            let context = new MockAzureFunctionContext();
            assert.doesNotReject(configuration.initialize(context))
                .then(() => {
                    // mock what the base function will do.
                    return assert.doesNotReject(configuration.bootstrapped());
                })
                .then(() => {
                    assert.strictEqual(configuration.name, "test_name");
                    assert.strictEqual(configuration.loaded, true);
                })
                .catch((exception) => {
                    assert.fail(exception);
                });
        });
        it("should have ModuleContext after init.", () => {
            let configuration = new Configuration("test_name");
            let context = new MockAzureFunctionContext();
            assert.doesNotReject(configuration.initialize(context))
                .then(() => {
                    // mock what the base function will do.
                    return assert.doesNotReject(configuration.bootstrapped());
                })
                .then(() => {
                    assert.notStrictEqual(configuration.getValue(ModuleContext.CONFIG_MODULE_CONTEXT), null);
                })
                .catch((exception) => {
                    assert.fail(exception);
                });
        });
        it("should have FunctionRoleContext after init.", () => {
            let configuration = new Configuration("test_name");
            let context = new MockAzureFunctionContext();
            assert.doesNotReject(configuration.initialize(context))
                .then(() => {
                    // mock what the base function will do.
                    return assert.doesNotReject(configuration.bootstrapped());
                })
                .then(() => {
                    assert.notStrictEqual(configuration.getValue(FunctionRoleContext.CONFIG_ROLE_CONTEXT), null);
                })
                .catch((exception) => {
                    assert.fail(exception);
                });
        });
        it("should have ResourceAuthorizationContext after init.", () => {
            let configuration = new Configuration("test_name");
            let context = new MockAzureFunctionContext();
            assert.doesNotReject(configuration.initialize(context))
                .then(() => {
                    // mock what the base function will do.
                    return assert.doesNotReject(configuration.bootstrapped());
                })
                .then(() => {
                    assert.notStrictEqual(configuration.getValue(ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT), null);
                })
                .catch((exception) => {
                    assert.fail(exception);
                });
        });
    });
});
