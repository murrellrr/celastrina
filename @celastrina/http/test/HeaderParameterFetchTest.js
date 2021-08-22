const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {HeaderParameterFetch} = require("../index");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

describe("HeaderParameterFetch", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new HeaderParameterFetch();
            assert.deepStrictEqual(_fetch._type, "header", "Sets type to 'header'");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        let _fetch = new HeaderParameterFetch();
        let _context = new MockHTTPContext();
        _context._azfunccontext.req.headers["X-Test-Header"] = "This is a test; utf-8";
        it("Rertieve the header specified", async () => {
            let header = await _fetch.get(_context, "X-Test-Header");
            assert.deepStrictEqual(header, "This is a test; utf-8", "Expected header 'This is a test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let header = await _fetch.get(_context, "X-Test-Header2", "This is a test 2; utf-8");
            assert.deepStrictEqual(header, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
