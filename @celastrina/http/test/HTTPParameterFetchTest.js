const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {HTTPParameterFetch} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockHTTPParameterFetch extends HTTPParameterFetch {
    constructor(type = "HTTPParameterFetch") {
        super(type);
        this.isFetchInvoked = false;
    }

    async fetch(context, key, defaultValue) {
        this.isFetchInvoked = true;
        return Promise.resolve("");
    }

    reset() {
        this.isFetchInvoked = false;
    }
}

describe("HTTPParameterFetch", () => {
    describe("#constructor(type)", () => {
        it("Sets the default type", () => {
            let _fetch = new HTTPParameterFetch();
            assert.deepStrictEqual(_fetch._type, "HTTPParameterFetch", "Sets type to 'HTTPParameterFetch'");
        });
        it("Sets the type", () => {
            let _fetch = new HTTPParameterFetch("TEST_TYPE");
            assert.deepStrictEqual(_fetch._type, "TEST_TYPE", "Sets type to 'TEST_TYPE'");
        });
        it("Sets the type via getter", () => {
            let _fetch = new HTTPParameterFetch("TEST_TYPE");
            assert.deepStrictEqual(_fetch.type, "TEST_TYPE", "Sets type to 'TEST_TYPE'");
        });
    });
    describe("#fetch(context, key, defaultValue = null)", () => {
        let _fetch = new HTTPParameterFetch();
        it("Throws a not implemented", () => {
            let err = CelastrinaError.newError("Not Implemented.", 501);
            assert.rejects(() => {
                _fetch.fetch(null, "");
            }, err, "Should reject with Not Implemented.");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        it("Throws a not implemented", () => {
            let _fetch = new HTTPParameterFetch();
            let err = CelastrinaError.newError("Not Implemented.", 501);
            assert.rejects(() => {
                _fetch.get(null, "");
            }, err, "Should reject with Not Implemented.");
        });
        it("Invokes fetch when Get is called.", async () => {
            let _fetch = new MockHTTPParameterFetch();
            await _fetch.get(null, "");
            assert.strictEqual(_fetch.isFetchInvoked, true, "Expected fetch to be invoked by get call.");
        });
    });
});
