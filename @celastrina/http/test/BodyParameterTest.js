const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {BodyParameter} = require("../HTTP");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

describe("BodyParameter", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new BodyParameter();
            assert.deepStrictEqual(_fetch._type, "body", "Sets type to 'query'");
        });
    });
    describe("#get(context, key, defaultValue = null)", () => {
        let _fetch = new BodyParameter();
        let _context = new MockHTTPContext();
        _context._azfunccontext.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
        it("Rertieve the body specified", async () => {
            let body = await _fetch.getParameter(_context, "xCelastringjsValue");
            assert.deepStrictEqual(body, "This is a test; utf-8", "Expected body 'This is a test; utf-8'.");
        });
        it("Rertieve the nested body specified", async () => {
            let body = await _fetch.getParameter(_context, "xCelastringjsSettings.xCelastringjsSession.value");
            assert.deepStrictEqual(body, "This is a deep test; utf-8", "Expected body 'This is a deep test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let body = await _fetch.getParameter(_context, "xCelastringjsValue2", "This is a test 2; utf-8");
            assert.deepStrictEqual(body, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
