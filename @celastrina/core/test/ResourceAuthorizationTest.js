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
const {CelastrinaError, ResourceAuthorization, ManagedIdentityResource, ResourceManager} = require("../Core");
const assert = require("assert");
const moment = require("moment");
const {AzureManagedIdentityServerMock} = require("./AzureManagedIdentityServer");

class MockResourceManager extends ResourceManager {
    constructor() {
        super();
        this.initialized = false;
        this.readied = false;
    }
    async initialize(azcontext, config) {
        this.initialized = true;
    }
    async ready(azcontext, config) {
        this.readied = true;
    }
}

class MockResourceAuthorization extends ResourceAuthorization {
    constructor(id, skew = 0) {
        super(id, skew);
        this._resolved = false;
    }
    reset(clear = false) {
        this._resolved = false;
        if(clear) this._tokens = {};
    }
    get resolved() {return this._resolved;}
    expireToken(resource) {
        let _token = this._tokens[resource];
        if(typeof _token === "undefined" || _token == null)
            throw new Error("Token " + resource + " was undefined or null, test was silly and failed.");
        _token.expires.subtract(1, "hour");
    }
    mockToken(resource, expired = false) {
        let now = moment();
        (!expired)? now.add(1, "hour") : now.subtract(1, "hour");
        this._tokens[resource] = {resource: resource, token: "mock-token-" + resource, expires: now};
    }
    async _resolve(resource, options = {}) {
        let now = moment();
        now.add(1, "hour");
        this._resolved = true;
        return {resource: resource, token: "mock-token-" + resource, expires: now};
    }
}

describe("ResourceAuthorization", () => {
    describe("#constructor(id, skew = 0)", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        it("should return ID", () => {
            assert.strictEqual(_rac.id, "mock-authorization");
        });
    });
    describe("#getToken(resource)", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        it("should return token mock-token-resource-one", async () => {
            assert.strictEqual(await _rac.getToken("resource-one"), "mock-token-resource-one");
            assert.strictEqual(_rac.resolved, true, "_resolve was invoked.");
        });
    });
    describe("#getToken(resource), expired.", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        _rac.mockToken("mock-token-resource-two", true);
        it("should return token mock-token-resource-two", async () => {
            assert.strictEqual(await _rac.getToken("resource-two"), "mock-token-resource-two");
            assert.strictEqual(_rac.resolved, true, "_resolve was invoked.");
        });
    });
    describe("#getToken(resource), from cache", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        _rac.mockToken("resource-two");
        it("should return token mock-token-resource-two", async () => {
            assert.strictEqual(await _rac.getToken("resource-two"), "mock-token-resource-two");
            assert.strictEqual(_rac.resolved, false, "_resolve was not invoked.");
        });
    });
});
describe("ResourceManager", () => {
    describe("#addResource(auth)", () => {
        let _rm = new ResourceManager();
        it("Should set and return itself for chaining", async () => {
            let _auth = new MockResourceAuthorization("mock_authorization");
            let result = await _rm.addResource(_auth);
            assert.strictEqual(result, _rm, "Result instance of AuthorizationManager.");
            assert.strictEqual(_rm._resources[_auth.id], _auth, "Added auth.");
        });
    });
    describe("#getResource(id = ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY)", () => {
        let _rm = new ResourceManager();
        it("Should get an added authorization", async () => {
            let _auth = new MockResourceAuthorization("mock_authorization");
            await _rm.addResource(_auth);
            let _newauth = await _rm.getResource(_auth.id);
            assert.strictEqual(_newauth, _auth, "Response passed in ResourceAuthorization.");
        });
        it("Should reject with 401 on not found", () => {
            let _err = new CelastrinaError("Not Authorized.", 401);
            assert.rejects(_rm.getResource("does_not_exist"), _err, "Expected exception..");
        });
    });
});
describe("ManagedIdentityResource", () => {
    describe("#_resolve(resource, options = {})", () => {
        it("should strip default", async () => {
            let _mid = new ManagedIdentityResource();
            let _mock = new AzureManagedIdentityServerMock();
            await _mock.start();
            let _response = await _mid._resolve("https://demoresource.documents.azure.com/.default");
            await _mock.stop();
            assert.strictEqual(_response.token, "access_token_https://demoresource.documents.azure.com", "Expected ''.")
        });
    });
});
module.exports = {
    MockResourceAuthorization: MockResourceAuthorization,
    MockResourceManager: MockResourceManager
};
