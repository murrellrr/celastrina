const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL} = require("../../core/Core");
const {BodyParameter} = require("../HTTP");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const {Configuration} = require("@celastrina/core");

describe("BodyParameter", () => {
    describe("#constructor()", () => {
        it("Sets the default type", () => {
            let _fetch = new BodyParameter();
            assert.deepStrictEqual(_fetch._type, "body", "Sets type to 'query'");
        });
    });
    describe("#get(context, key, defaultValue = null)", async () => {
        it("Rertieve the body specified", async () => {
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
            let _fetch = new BodyParameter();
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let body = await _fetch.getParameter(_context, "xCelastringjsValue");
            assert.deepStrictEqual(body, "This is a test; utf-8", "Expected body 'This is a test; utf-8'.");
        });
        it("Rertieve the nested body specified", async () => {
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
            let _fetch = new BodyParameter();
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let body = await _fetch.getParameter(_context, "xCelastringjsSettings.xCelastringjsSession.value");
            assert.deepStrictEqual(body, "This is a deep test; utf-8", "Expected body 'This is a deep test; utf-8'.");
        });
        it("Rertieve the default", async () => {
            let _azcontext = new MockAzureFunctionContext();
            _azcontext.bindings.req.body = {xCelastringjsValue: "This is a test; utf-8", xCelastringjsSettings: {xCelastringjsSession: {value: "This is a deep test; utf-8"}}};
            let _fetch = new BodyParameter();
            let _config = new Configuration("BodyParameter");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            let body = await _fetch.getParameter(_context, "xCelastringjsValue2", "This is a test 2; utf-8");
            assert.deepStrictEqual(body, "This is a test 2; utf-8", "Expected default 'This is a test 2; utf-8'.");
        });
    });
});
