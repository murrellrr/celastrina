const {CelastrinaError, ResourceAuthorization, AuthorizationManager} = require("../Core");
const assert = require("assert");
const moment = require("moment");

class MockAuthorizationManager extends AuthorizationManager {
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
    async _resolve(resource) {
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
describe("AuthorizationManager", () => {
    describe("#addAuthorization(auth)", () => {
        let _am = new AuthorizationManager();
        it("Should set and return itself for chaining", async () => {
            let _auth = new MockResourceAuthorization("mock_authorization");
            let result = await _am.addAuthorization(_auth);
            assert.strictEqual(result, _am, "Result instance of AuthorizationManager.");
            assert.strictEqual(_am._authorizations[_auth.id], _auth, "Added auth.");
        });
    });
    describe("#getAuthorization(id = ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY)", () => {
        let _am = new AuthorizationManager();
        it("Should get an added authorization", async () => {
            let _auth = new MockResourceAuthorization("mock_authorization");
            await _am.addAuthorization(_auth);
            let _newauth = await _am.getAuthorization(_auth.id);
            assert.strictEqual(_newauth, _auth, "Response passed in ResourceAuthorization.");
        });
        it("Should reject with 401 on not found", () => {
            let _err = new CelastrinaError("Not Authorized.", 401);
            assert.rejects(_am.getAuthorization("does_not_exist"), _err, "Expected exception..");
        });
    });
});

module.exports = {
    MockResourceAuthorization: MockResourceAuthorization,
    MockAuthorizationManager: MockAuthorizationManager
};
