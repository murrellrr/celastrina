const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {HeaderParameter, BodyParameter} = require("../HTTP");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const {Configuration} = require("@celastrina/core");

describe("HeaderParameter", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new HeaderParameter();
            assert.deepStrictEqual(_fetch._type, "header", "Sets type to 'header'");
        });
    });
    describe("#get(context, key, defaultValue = null)", async () => {
        let _fetch = new HeaderParameter();
        let _azcontext = new MockAzureFunctionContext();
        _azcontext.bindings.req.headers["X-Test-Header"] = "This is a test; utf-8";
        let _config = new Configuration("BodyParameter");
        await _config.initialize(_azcontext);
        await _config.ready();
        let _context = new MockHTTPContext(_config);
        await _context.initialize();

        it("Rertieve the header specified", async () => {
            let header = await _fetch.getParameter(_context, "X-Test-Header");
            assert.deepStrictEqual(header, "This is a test; utf-8", "Expected header 'This is a test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let header = await _fetch.getParameter(_context, "X-Test-Header2", "This is a test 2; utf-8");
            assert.deepStrictEqual(header, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
