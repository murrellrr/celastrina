const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {HTTPParameter} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockHTTPParameter extends HTTPParameter {
    constructor(type = "HTTPParameter") {
        super(type);
        this.isGetInvoked = false;
    }
    _getParameter(context, key) {
        this.isGetInvoked = true;
        return "";
    }
    reset() {
        this.isGetInvoked = false;
    }
}

describe("HTTPParameter", () => {
    describe("#constructor(type)", () => {
        it("Sets the default type", () => {
            let _fetch = new HTTPParameter();
            assert.deepStrictEqual(_fetch._type, "HTTPParameterFetch", "Sets type to 'HTTPParameterFetch'");
        });
        it("Sets the type", () => {
            let _fetch = new HTTPParameter("TEST_TYPE");
            assert.deepStrictEqual(_fetch._type, "TEST_TYPE", "Sets type to 'TEST_TYPE'");
        });
        it("Sets the type via getter", () => {
            let _fetch = new HTTPParameter("TEST_TYPE");
            assert.deepStrictEqual(_fetch.type, "TEST_TYPE", "Sets type to 'TEST_TYPE'");
        });
    });
    describe("#_getParameter(context, key, defaultValue = null)", () => {
        let _fetch = new HTTPParameter();
        it("Throws a not implemented", () => {
            let err = CelastrinaError.newError("Not Implemented.", 501);
            assert.rejects(() => {
                _fetch._getParameter(null, "");
            }, err, "Should reject with Not Implemented.");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        it("Throws a not implemented", () => {
            let _fetch = new HTTPParameter();
            let err = CelastrinaError.newError("Not Implemented.", 501);
            assert.rejects(() => {
                _fetch.getParameter(null, "");
            }, err, "Should reject with Not Implemented.");
        });
        it("Invokes fetch when Get is called.", async () => {
            let _fetch = new MockHTTPParameter();
            await _fetch.getParameter(null, "");
            assert.strictEqual(_fetch.isGetInvoked, true, "Expected fetch to be invoked by get call.");
        });
    });
});
