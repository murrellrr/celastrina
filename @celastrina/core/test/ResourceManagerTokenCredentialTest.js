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
const {CelastrinaError, ResourceAuthorization, ManagedIdentityResource, ResourceManagerTokenCredential, ResourceManager, Configuration} = require("../Core");
const assert = require("assert");
const moment = require("moment");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockResourceAuthorization} = require("./ResourceAuthorizationTest");

describe("ResourceManagerTokenCredential", () => {
	describe("#constructor(ra)", () => {
		it("should create a TokenCredential with a ResourceAuthorization", () => {
			let _ra = new MockResourceAuthorization();
			let _tc = new ResourceManagerTokenCredential(_ra);
			assert.deepStrictEqual(_tc.resourceAuthorization, _ra, "Expected _ra.");
		});
		it("get an access token from scopes", async () => {
			let _ra = new MockResourceAuthorization();
			let _tc = new ResourceManagerTokenCredential(_ra);
			let _at = await _tc.getToken(["fake_scope"]);
			assert.deepStrictEqual(_at.token, "mock-token-fake_scope", "Expected 'mock-token-fake_scope'.");
		});
		it("get an access token", async () => {
			let _ra = new MockResourceAuthorization();
			let _tc = new ResourceManagerTokenCredential(_ra);
			let _at = await _tc.getToken("fake_scope");
			assert.deepStrictEqual(_at.token, "mock-token-fake_scope", "Expected 'mock-token-fake_scope'.");
		});
		it("failes to get token from empty array", async () => {
			let _ra = new MockResourceAuthorization();
			let _tc = new ResourceManagerTokenCredential(_ra);
			await assert.rejects(() => {
				return _tc.getToken([]);
			});
		});
		it("failes to get token from empty string", async () => {
			let _ra = new MockResourceAuthorization();
			let _tc = new ResourceManagerTokenCredential(_ra);
			await assert.rejects(() => {
				return _tc.getToken("");
			});
		});
		it("failes to get token from empty space string", async () => {
			let _ra = new MockResourceAuthorization();
			let _tc = new ResourceManagerTokenCredential(_ra);
			await assert.rejects(() => {
				return _tc.getToken("                              ");
			});
		});
	});
});
