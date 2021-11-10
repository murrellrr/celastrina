const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {QueryParameter} = require("../HTTP");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const {Configuration} = require("@celastrina/core");

describe("QueryParameter", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new QueryParameter();
            assert.deepStrictEqual(_fetch._type, "query", "Sets type to 'query'");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        it("Rertieve the header specified", async () => {
            let _fetch = new QueryParameter();
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.query["X-Test-Header"] = "This is a test; utf-8";
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let query = await _fetch.getParameter(_context, "X-Test-Header");
            assert.deepStrictEqual(query, "This is a test; utf-8", "Expected query 'This is a test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let _fetch = new QueryParameter();
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.query["X-Test-Header"] = "This is a test; utf-8";
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let query = await _fetch.getParameter(_context, "X-Test-Header2", "This is a test 2; utf-8");
            assert.deepStrictEqual(query, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
