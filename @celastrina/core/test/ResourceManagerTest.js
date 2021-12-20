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
const {CelastrinaError, ResourceAuthorization, ManagedIdentityResource, ResourceManager, Configuration} = require("../Core");
const assert = require("assert");
const moment = require("moment");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");

describe("ResourceManager", () => {
    describe("#constructor()", () => {
        it("sets defaults", () => {
            let _rm = new ResourceManager();
            assert.deepStrictEqual(_rm._resources, {}, "Expected empty object.");
        });
    });
    describe("resources", () => {
        describe("#addResource(auth)", () => {
            it("adds resource authorization", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                assert.deepStrictEqual(await _rm.addResource(_auth), _rm, "Expected to chain ResourceManager");
                assert.deepStrictEqual(_rm._resources[ManagedIdentityResource.MANAGED_IDENTITY], _auth, "Expected to chain ResourceManager");
            });
        });
        describe("#getResource(id)", () => {
            it("gets resource authorization, no id", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getResource(), _auth, "Expected ManagedIdentityResource _auth.");
            });
            it("gets resource authorization, by id", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getResource(ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY), _auth, "Expected ManagedIdentityResource _auth.");
            });
            it("returns null if not found", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getResource("foozled"), null, "Expected null.");
            });
        });
        describe("#getToken(resource, id)", () => {
            it("it gets token", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                let exp = moment();
                exp.add(30, "minutes");
                _auth._tokens["mock_resource"] = {expires: exp, token: "test_token"};
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getToken("mock_resource"), "test_token", "Expected 'test_token'.");
            });
        });
        describe("#getTokenCredential(resource)", () => {
            it("it gets token", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                let exp = moment();
                exp.add(30, "minutes");
                _auth._tokens["mock_resource"] = {expires: exp, token: "test_token"};
                await _rm.addResource(_auth);
                let _tc = await _rm.getTokenCredential();
                let _token = await _tc.getToken("mock_resource");
                assert.deepStrictEqual(_token.token, "test_token", "Expected 'test_token'.");
            });
        });
        describe("#ready(azcontext, config)", () => {
            it("defaults the ManagedIdentityResource", async () => {
                process.env["IDENTITY_ENDPOINT"] = "test_end_point";
                let _azcontext = new MockAzureFunctionContext();
                let _config = new Configuration("ResourceManagerTest");
                await _config.initialize(_azcontext);
                await _config.ready();
                let _rm = _config.resources;
                let _auth = await _rm.getResource(ManagedIdentityResource.MANAGED_IDENTITY);
                assert.strictEqual(_auth != null, true, "Expected not null.");
            });
            it("does not default with no 'IDENTITY_ENDPOINT'", async () => {
                delete process.env["IDENTITY_ENDPOINT"];
                let _azcontext = new MockAzureFunctionContext();
                let _config = new Configuration("ResourceManagerTest");
                await _config.initialize(_azcontext);
                await _config.ready();
                let _rm = _config.resources;
                let _auth = await _rm.getResource(ManagedIdentityResource.MANAGED_IDENTITY);
                assert.strictEqual(_auth == null, true, "Expected null.");
            });
        });
    });
});
