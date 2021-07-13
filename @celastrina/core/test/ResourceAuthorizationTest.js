const {CelastrinaError, ResourceAuthorization} = require("../Core");
const assert = require("assert");
const moment = require("moment");

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
    primeToken(resource, expired = false) {
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
        it("should return ID.", () => {
            assert.strictEqual(_rac.id, "mock-authorization");
        });
    });
    describe("#getToken(resource)", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        it("should return token mock-token-resource-one.", async () => {
            assert.strictEqual(await _rac.getToken("resource-one"), "mock-token-resource-one");
            assert.strictEqual(_rac.resolved, true, "_resolve was invoked.");
        });
    });
    describe("#getToken(resource), expired.", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        _rac.primeToken("mock-token-resource-two", true);
        it("should return token mock-token-resource-two.", async () => {
            assert.strictEqual(await _rac.getToken("resource-two"), "mock-token-resource-two");
            assert.strictEqual(_rac.resolved, true, "_resolve was invoked.");
        });
    });
    describe("#getToken(resource), from cache.", () => {
        let _rac = new MockResourceAuthorization("mock-authorization");
        _rac.primeToken("resource-two");
        it("should return token mock-token-resource-two.", async () => {
            assert.strictEqual(await _rac.getToken("resource-two"), "mock-token-resource-two");
            assert.strictEqual(_rac.resolved, false, "_resolve was not invoked.");
        });
    });
});

module.exports = {
    MockResourceAuthorization: MockResourceAuthorization
};
