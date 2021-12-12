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
       Asserter, Authenticator} = require("../Core");
const {MockContext} = require("./ContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const assert = require("assert");

describe("Authenticator", () => {
       describe("constructor(name, required, link)", () => {
              it("should set name and required state", () => {
                     let _auth = new Authenticator("name1", true);
                     assert.strictEqual(_auth.name, "name1", "Expected 'name1'.");
                     assert.strictEqual(_auth.required, true, "Expected true.");
                     assert.strictEqual(_auth._link, null, "Expected link to be null.");
              });
              it("should set all defaults", () => {
                     let _auth = new Authenticator();
                     assert.strictEqual(_auth.name, "Authenticator", "Expected 'Authenticator'.");
                     assert.strictEqual(_auth.required, false, "Expected false.");
                     assert.strictEqual(_auth._link, null, "Expected link to be null.");
              });
              it("should add link", () => {
                     let _auth1 = new Authenticator("auth1");
                     let _auth2 = new Authenticator("auth2", false, _auth1);
                     assert.strictEqual(_auth2._link == null, false, "Expected link to be not null.");
                     assert.deepStrictEqual(_auth2._link, _auth1, "Expected _auth1.");
              });
       });
       describe("#addLink(link)", () => {
              it("should add links", () => {
                     let _auth1 = new Authenticator("auth1");
                     let _auth2 = new Authenticator("auth2");
                     let _auth3 = new Authenticator("auth3");
                     _auth3.addLink(_auth2);
                     _auth3.addLink(_auth1);
                     assert.deepStrictEqual(_auth3._link, _auth2, "Expected _auth2.");
                     assert.deepStrictEqual(_auth3._link._link, _auth1, "Expected _auth1.");
              });
       });
});

