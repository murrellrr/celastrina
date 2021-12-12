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
const {CelastrinaError, MatchAny, MatchNone, Subject, Permission} = require("../Core");
const assert = require("assert");

describe("Permission", () => {
    describe("#constructor(action, roles = [], match = new MatchAny())", () => {
        it("Sets action, and lower case", () => {
            let _permission = new Permission("MOCK_ACTION");
            assert.strictEqual(_permission.action, "mock_action");
        });
        it("Sets roles", () => {
            let _permission = new Permission("mock_action",["role1"]);
            assert.strictEqual(_permission._roles.has("role1"), true);
        });
        it("Sets ValueMatch", () => {
            let _permission = new Permission("mock_action", ["role1"], new MatchNone());
            assert.strictEqual(_permission._match instanceof MatchNone, true);
        });
        it("Defaults ValueMatch to MatchAny", () => {
            let _permission = new Permission("mock_action");
            assert.strictEqual(_permission._match instanceof MatchAny, true);
        });
        it("Defaults roles to empty array", () => {
            let _permission = new Permission("mock_action");
            assert.strictEqual(_permission._roles.size, 0);
        });
    });
    describe("roles", () => {
        describe("#get roles()", () => {
            it("returns roles set in constructor", () => {
                let _roles = new Set(["role1", "role2"]);
                let _permission = new Permission("mock_action", _roles);
                assert.deepStrictEqual(_permission.roles, _roles);
            });
        });
        describe("#addRole(role)", () => {
            let _permission = new Permission("mock_action");
            it("returns Permission to allow role chaining", () => {
                assert.strictEqual(_permission.addRole("role2") instanceof Permission, true);
            });
            it("Adds role to permission", () => {
                _permission.addRole("role1");
                assert.strictEqual(_permission._roles.has("role1"), true);
            });
        });
        describe("#addRoles(roles)", () => {
            let _permission = new Permission("mock_action");
            it("returns Permission to allow role chaining", () => {
                assert.strictEqual(_permission.addRoles(["role1","role2"]) instanceof Permission, true);
            });
            it("Adds role to permission", () => {
                _permission.addRoles(["role3", "role4"]);
                assert.strictEqual(_permission._roles.has("role3"), true);
                assert.strictEqual(_permission._roles.has("role4"), true);
            });
        });
    });
    describe("#authorize(subject)", () => {
        let _permission = new Permission("mock_action", new Set(["role1","role2"]));
        it("Matching roles, any", async () => {
            let _subject = new Subject("mock_user", new Set(["role2","role3"]));
            assert.strictEqual(await _permission.authorize(_subject), true);
        });
        it("Matching roles, none", async () => {
            let _subject = new Subject("mock_user", new Set(["role3","role4"]));
            assert.strictEqual(await _permission.authorize(_subject), false);
        });
    });
});
