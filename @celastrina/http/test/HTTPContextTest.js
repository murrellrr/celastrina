const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPContext, Cookie} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockHTTPContext extends HTTPContext {
    constructor(context = new MockAzureFunctionContext(), config = new Configuration("MockHTTPContext")) {
        super(context, config);
        this.initializeExecuted = false;
    }
    async initialize() {
        await super.initialize();
        this.initializeExecuted = true;
    }
    reset() {
        this.initializeExecuted = false;
    }
}

describe("HTTPContext", () => {
    describe("constructor(context = new MockAzureFunctionContext(), config = new Configuration(\"MockHTTPContext\"))", () => {
        let mctx = new MockAzureFunctionContext();
        let mcfg = new Configuration("MockHTTPContext");
        it("Creates successfully", () => {
            let _context = new HTTPContext(mctx, mcfg);
            assert.notStrictEqual(_context, null, "Context null.");
            assert.notStrictEqual(typeof _context, "undefined", "Context undefined.");
            assert.strictEqual(_context._session, null, "Session not null.");
            assert.deepStrictEqual(_context._cookies, {}, "Cookies not empty object.");
        });
        it("Sets default response", () => {
            let _context = new HTTPContext(mctx, mcfg);
            assert.deepStrictEqual(mctx.res.status, 200, "Expected status 200.");
            assert.deepStrictEqual(mctx.res.headers, {"Content-Type": "text/html; charset=ISO-8859-1"}, "Expected Content Type Header.");
            assert.deepStrictEqual(mctx.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body>200, Success</body></html>", "Expected default HTML body.");
        });
    });
    describe("getter/setters", () => {
        let mctx = new MockAzureFunctionContext();
        let mcfg = new Configuration("MockHTTPContext");
        mctx.req.method = "POST";
        mctx.req.originalUrl = "https://www.celastrinajs.com";
        mctx.req.params = {test: "test"};
        mctx.req.query = {param1: "test123"};
        mctx.req.rawBody = "{\"key1\": \"value1\"}";
        mctx.req.headers["header1"] = "testRequest123";
        mctx.req.body = {key1: "value1"};
        mctx.bindingData.status = {key: "value"};
        mctx.res.headers["header1"] = "testResponse123";
        mctx.res.headers["header2"] = "testResponse123";
        mctx.res.headers["header4"] = "testResponse789";
        mctx.res.body = {key2: "value2"};
        let _context = new HTTPContext(mctx, mcfg);
        it("Gets Cookies", () => {
            assert.deepStrictEqual(_context.cookies, {}, "Session not empty object.");
        });
        it("Gets method", () => {
            assert.deepStrictEqual(_context.method, "post", "Expected method 'post'.");
        });
        it("Gets URL", () => {
            assert.deepStrictEqual(_context.url, "https://www.celastrinajs.com", "Expected method 'https://www.celastrinajs.com'.");
        });
        it("Gets Request", () => {
            assert.deepStrictEqual(_context.request, mctx.req, "Expected context request.");
        });
        it("Gets Response", () => {
            assert.deepStrictEqual(_context.response, mctx.res, "Expected context response.");
        });
        it("Gets Params", () => {
            assert.deepStrictEqual(_context.params, mctx.req.params, "Expected context params.");
        });
        it("Gets Query", () => {
            assert.deepStrictEqual(_context.query, mctx.req.query, "Expected context query.");
        });
        it("Gets Raw Body", () => {
            assert.deepStrictEqual(_context.raw, mctx.req.rawBody, "Expected context raw body.");
        });
        it("Gets Request Body", () => {
            assert.deepStrictEqual(_context.requestBody, mctx.req.body, "Expected context request body.");
        });
        it("Gets Response Body", () => {
            assert.deepStrictEqual(_context.responseBody, mctx.res.body, "Expected context response body.");
        });
        it("Gets Session", () => {
            assert.strictEqual(_context.session, null, "Expected null.");
        });
        it("Gets Query", () => {
            assert.strictEqual(_context.getQuery("param1"), "test123", "Expected 'test123'.");
        });
        it("Gets Query default", () => {
            assert.strictEqual(_context.getQuery("param100", "test456"), "test456", "Expected 'test456'.");
        });
        it("Gets Query null", () => {
            assert.strictEqual(_context.getQuery("param100"), null, "Expected null.");
        });
        it("Gets Request Header", () => {
            assert.strictEqual(_context.getRequestHeader("header1"), "testRequest123", "Expected 'testRequest123'.");
        });
        it("Gets Request Header default", () => {
            assert.strictEqual(_context.getRequestHeader("header100", "testHeadr456"), "testHeadr456", "Expected 'testHeadr456'.");
        });
        it("Gets Request Header null", () => {
            assert.strictEqual(_context.getRequestHeader("header100"), null, "Expected null.");
        });
        it("Gets Response Header", () => {
            assert.strictEqual(_context.getResponseHeader("header1"), "testResponse123", "Expected 'testResponse123'.");
        });
        it("Gets Response Header default", () => {
            assert.strictEqual(_context.getResponseHeader("header100", "testHeadr456"), "testHeadr456", "Expected 'testHeadr456'.");
        });
        it("Gets Response Header null", () => {
            assert.strictEqual(_context.getResponseHeader("header100"), null, "Expected null.");
        });
        it("Gets URI Binding", () => {
            assert.deepStrictEqual(_context.getURIBinding("status"), {key: "value"}, "Expected {key: 'value'}.");
        });
        it("S/Gets Cookie", () => {
            let _cookie = new Cookie("newCookie", "test123");
            _context.setCookie(_cookie);
            assert.deepStrictEqual(_context.getCookie("newCookie"), _cookie, "Expected cookie.");
        });
    });
    describe("Request/Response functions", () => {
        let _context = new MockHTTPContext();
        it("Sets an existing response header", () => {
            _context.setResponseHeader("header2", "testHeadr456");
            assert.strictEqual(_context.getResponseHeader("header2"), "testHeadr456", "Expected 'testHeadr456'.");
        });
        it("Sets a new response header", () => {
            _context.setResponseHeader("header3", "testHeadr789");
            assert.strictEqual(_context.getResponseHeader("header3"), "testHeadr789", "Expected 'testHeadr789'.");
        });
        it("Deletes a response header", () => {
            _context.deleteResponseHeader("header4");
            assert.strictEqual(_context.getResponseHeader("header4"), null, "Expected null.");
        });
    });
    describe("Sending", () => {
        let _context = new MockHTTPContext();
        it("Sends default 204 response", () => {
            _context.send();
            assert.strictEqual(_context.azureFunctionContext.res.status, 204, "Expected status code 204.");
            assert.strictEqual(_context.azureFunctionContext.res.body, null, "Expected null body.");
        });
        it("Sends response+200", () => {
            let _response = {code: 1234};
            _context.send(_response, 200);
            assert.strictEqual(_context.azureFunctionContext.res.status, 200, "Expected status code 200.");
            assert.strictEqual(_context.azureFunctionContext.res.body, _response, "Expected _response body.");
        });
        it("Sends response default 200", () => {
            let _response = {code: 1234};
            _context.send(_response);
            assert.strictEqual(_context.azureFunctionContext.res.status, 200, "Expected status code 200.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, _response, "Expected _response body.");
        });
        it("Sends validation error", () => {
            let _response = CelastrinaValidationError.newValidationError("Invalid Message", "test.message");
            _context.sendValidationError(_response);
            assert.strictEqual(_context.azureFunctionContext.res.status, 400, "Expected status code 200.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, _response, "Expected _response body.");
        });
    });
});

module.exports = {
    MockHTTPContext: MockHTTPContext
};