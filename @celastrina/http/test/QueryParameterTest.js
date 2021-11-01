const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {QueryParameter} = require("../HTTP");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

describe("QueryParameter", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new QueryParameter();
            assert.deepStrictEqual(_fetch._type, "query", "Sets type to 'query'");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        let _fetch = new QueryParameter();
        let _context = new MockHTTPContext();
        _context._azfunccontext.req.query["X-Test-Header"] = "This is a test; utf-8";
        it("Rertieve the header specified", async () => {
            let query = await _fetch.getParameter(_context, "X-Test-Header");
            assert.deepStrictEqual(query, "This is a test; utf-8", "Expected query 'This is a test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let query = await _fetch.getParameter(_context, "X-Test-Header2", "This is a test 2; utf-8");
            assert.deepStrictEqual(query, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
