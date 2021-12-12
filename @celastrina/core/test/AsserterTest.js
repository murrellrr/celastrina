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
const {CelastrinaError, CelastrinaValidationError, Configuration, Permission, PermissionManager, Subject,
       Asserter} = require("../Core");
const {MockContext} = require("./ContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const assert = require("assert");

describe("Asserter", () => {
    describe("#constructor(context, subject, sentry)", () => {
        let _azctx = new MockAzureFunctionContext();
        let _config = new Configuration("mock_configuration");
        let _context = new MockContext(_azctx);
        let _subject = new Subject("1234567890");
        let _permissions = new PermissionManager();

        it("Creates a valid Asserter", () => {
            let _asserter = new Asserter(_context, _subject, _permissions, true);
            assert.deepStrictEqual(_asserter.context, _context, "Expected context.");
            assert.deepStrictEqual(_asserter.subject, _subject, "Expected subject.");
            assert.deepStrictEqual(_asserter.permissions, _permissions, "Expected permissions.");
            assert.strictEqual(_asserter.optimistic, true, "Expected true.");
        });
        it("Creates a valid Asserter with defaults", () => {
            let _asserter = new Asserter(_context, _subject, _permissions);
            assert.deepStrictEqual(_asserter.context, _context, "Expected context.");
            assert.deepStrictEqual(_asserter.subject, _subject, "Expected subject.");
            assert.deepStrictEqual(_asserter.permissions, _permissions, "Expected permissions.");
            assert.strictEqual(_asserter.optimistic, false, "Expected false.");
        });
        it("should fail for invalid context", () => {
            let _error = CelastrinaValidationError.newValidationError("Argument 'context' is required.", "Asserter.context");
            assert.throws(() => {
                new Asserter(null, _subject, _permissions, true);
            }, _error, "Expected error for null context.");
        });
        it("should fail for invalid subject", () => {
            let _error = CelastrinaValidationError.newValidationError("Argument 'subject' is required.", "Asserter.subject");
            assert.throws(() => {
                new Asserter(_context, null, _permissions, true);
            }, _error, "Expected error for null subject.");
        });
        it("should fail for invalid permission", () => {
            let _error = CelastrinaValidationError.newValidationError("Argument 'permissions' is required.", "Asserter.permissions");
            assert.throws(() => {
                new Asserter(_context, _subject, null, true);
            }, _error, "Expected error for null permission.");
        });
        describe("ASSERTS", () => {
            describe("#assert(name, result, remarks)", () => {
                it("should add valid assertion", () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    _asserter.assert("test", true, null, "No Remarks.");
                    let _asrt = {res: true, rmks: "No Remarks."};
                    assert.strictEqual(_asserter._assertions.hasOwnProperty("test"), true, "Expected property 'test'.");
                    assert.deepStrictEqual(_asserter._assertions.test, _asrt, "Expected property _asrt.");
                });
                it("should trim spaces", () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    _asserter.assert(" test ", true, "No Remarks.");
                    let _asrt = {res: true, rmks: "No Remarks."};
                    assert.strictEqual(_asserter._assertions.hasOwnProperty("test"), true, "Expected property 'test'.");
                });
                it("should fail with null name ", () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    let _error = CelastrinaValidationError.newValidationError("Argument 'name' is required.", "Asserter.name");
                    assert.throws(() => {
                        _asserter.assert(null, true, null, "No Remarks.");
                    }, _error, "Expected error.");
                });
                it("should fail with empty name ", () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    let _error = CelastrinaValidationError.newValidationError("Argument 'name' is required.", "Asserter.name");
                    assert.throws(() => {
                        _asserter.assert("", true, "No Remarks.");
                    }, _error, "Expected error.");
                });
                it("should fail with all space name ", () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    let _error = CelastrinaValidationError.newValidationError("Argument 'name' is required.", "Asserter.name");
                    assert.throws(() => {
                        _asserter.assert("         ", true, null, "No Remarks.");
                    }, _error, "Expected error.");
                });
            });
            describe("#getAssertion(name)", () => {
                it("should get assertion by name.", async () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    _asserter.assert("test", true, null, "No Remarks.");
                    let _asrt = {res: true, rmks: "No Remarks."};
                    assert.deepStrictEqual(await _asserter.getAssertion("test"), _asrt, "Expected property _asrt.");
                });
            });
            describe("#hasAffirmativeAssertion()", () => {
                it("returns false if empty", async () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    assert.strictEqual(await _asserter.hasAffirmativeAssertion(), false, "Expected false.");
                });
                it("returns false if none", async () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    _asserter.assert("test", false, null, "No Remarks.");
                    _asserter.assert("test1", false, null, "No Remarks.");
                    _asserter.assert("test2", false, null, "No Remarks.");
                    assert.strictEqual(await _asserter.hasAffirmativeAssertion(), false, "Expected false.");
                });
                it("returns true if one", async () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    _asserter.assert("test", false, null, "No Remarks.");
                    _asserter.assert("test1", false, null, "No Remarks.");
                    _asserter.assert("test2", true, null, "No Remarks.");
                    assert.strictEqual(await _asserter.hasAffirmativeAssertion(), true, "Expected true.");
                });
                it("returns true if more then one", async () => {
                    let _asserter = new Asserter(_context, _subject, _permissions, true);
                    _asserter.assert("test", true, null, "No Remarks.");
                    _asserter.assert("test1", true, null, "No Remarks.");
                    _asserter.assert("test2", true, null, "No Remarks.");
                    assert.strictEqual(await _asserter.hasAffirmativeAssertion(), true, "Expected true.");
                });
            });
            describe("#assign(subject)", () => {
                it("assigns a set of roles", async () => {
                    let _lsubject = new Subject("1234567890");
                    let _asserter = new Asserter(_context, _lsubject, _permissions, true);
                    _asserter.assert("test", true, ["role1", "role2"]);
                    _asserter.assert("test1", true, ["role2", "role3"]);
                    _asserter.assert("test2", true, ["role3", "role4"]);
                    await _asserter.assign(_lsubject);
                    let _set = new Set(["role1", "role2", "role3", "role4"]);
                    assert.deepStrictEqual(_lsubject.roles, _set, "Expected ['role1', 'role2', 'role3', 'role4'].");
                });
            });
        });
    });
});
