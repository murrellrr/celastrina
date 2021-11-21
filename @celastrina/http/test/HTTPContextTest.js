const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPContext, Cookie} = require("../HTTP");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockHTTPContext extends HTTPContext {
    constructor(config = new Configuration("MockHTTPContext")) {
        super(config);
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
    let _azcontext = null;
    before(() => {
        _azcontext = new MockAzureFunctionContext();
        _azcontext.req.method = "POST";
        _azcontext.req.originalUrl = "https://www.celastrinajs.com";
        _azcontext.req.params = {test: "test"};
        _azcontext.req.query = {param1: "test123"};
        _azcontext.req.rawBody = "{\"key1\": \"value1\"}";
        _azcontext.req.headers["header1"] = "testRequest123";
        _azcontext.req.headers["content-type"] = "application/cloudevents+json; charset=utf-8";
        _azcontext.req.body = {key1: "value1"};
        _azcontext.bindingData.status = {key: "value"};
        _azcontext.res.headers["header1"] = "testResponse123";
        _azcontext.res.headers["header2"] = "testResponse123";
        _azcontext.res.headers["header4"] = "testResponse789";
        _azcontext.res.body = {key2: "value2"};
    });
    describe("constructor(config = new Configuration(\"MockHTTPContext\"))", () => {
        it("Creates successfully", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.notStrictEqual(_context, null, "Context null.");
            assert.notStrictEqual(typeof _context, "undefined", "Context undefined.");
            assert.strictEqual(_context._session, null, "Session not null.");
            assert.deepStrictEqual(_context._cookies, {}, "Cookies not empty object.");
        });
        it("Sets default response", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            await _context.initialize();
            assert.deepStrictEqual(_azcontext.res.status, 200, "Expected status 200.");
            assert.deepStrictEqual(_azcontext.res.headers["Content-Type"], "text/html; charset=ISO-8859-1", "Expected Content Type Header.");
            assert.deepStrictEqual(_azcontext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body>200, Success</body></html>", "Expected default HTML body.");
        });
    });
    describe("getter/setters", () => {
        it("Gets Cookies", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.cookies, {}, "Session not empty object.");
        });
        it("Gets method", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            await _context.initialize();
            assert.deepStrictEqual(_context.method, "post", "Expected method 'post'.");
        });
        it("Gets URL", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.url, "https://www.celastrinajs.com", "Expected method 'https://www.celastrinajs.com'.");
        });
        it("Gets Request", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.request, _azcontext.req, "Expected context request.");
        });
        it("Gets Response", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.response, _azcontext.res, "Expected context response.");
        });
        it("Gets Params", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.params, _azcontext.req.params, "Expected context params.");
        });
        it("Gets Query", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.query, _azcontext.req.query, "Expected context query.");
        });
        it("Gets Raw Body", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.raw, _azcontext.req.rawBody, "Expected context raw body.");
        });
        it("Gets Request Body", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.requestBody, _azcontext.req.body, "Expected context request body.");
        });
        it("Gets Response Body", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(_context.responseBody, _azcontext.res.body, "Expected context response body.");
        });
        it("Gets Session", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(_context.session, null, "Expected null.");
        });
        it("Gets Query", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getQuery("param1"), "test123", "Expected 'test123'.");
        });
        it("Gets Query default", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getQuery("param100", "test456"), "test456", "Expected 'test456'.");
        });
        it("Gets Query null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getQuery("param100"), null, "Expected null.");
        });
        it("Gets Request Header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getRequestHeader("header1"), "testRequest123", "Expected 'testRequest123'.");
        });
        it("Gets Request Header default", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getRequestHeader("header100", "testHeadr456"), "testHeadr456", "Expected 'testHeadr456'.");
        });
        it("Gets Request Header null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getRequestHeader("header100"), null, "Expected null.");
        });
        it("Gets Response Header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getResponseHeader("header1"), "testResponse123", "Expected 'testResponse123'.");
        });
        it("Gets Response Header default", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getResponseHeader("header100", "testHeadr456"), "testHeadr456", "Expected 'testHeadr456'.");
        });
        it("Gets Response Header null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.strictEqual(await _context.getResponseHeader("header100"), null, "Expected null.");
        });
        it("Gets URI Binding", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            assert.deepStrictEqual(await _context.getURIBinding("status"), {key: "value"}, "Expected {key: 'value'}.");
        });
        it("S/Gets Cookie", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new HTTPContext(_config);
            let _cookie = new Cookie("newCookie", "test123");
            await _context.setCookie(_cookie);
            assert.deepStrictEqual(await _context.getCookie("newCookie"), _cookie, "Expected cookie.");
        });
    });
    describe("Request/Response functions", () => {
        it("Sets an existing response header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.setResponseHeader("header2", "testHeadr456");
            assert.strictEqual(await _context.getResponseHeader("header2"), "testHeadr456", "Expected 'testHeadr456'.");
        });
        it("Sets a new response header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.setResponseHeader("header3", "testHeadr789");
            assert.strictEqual(await _context.getResponseHeader("header3"), "testHeadr789", "Expected 'testHeadr789'.");
        });
        it("Deletes a response header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.setResponseHeader("header4", "testHeadr789");
            await _context.deleteResponseHeader("header4");
            assert.strictEqual(await _context.getResponseHeader("header4"), null, "Expected null.");
        });
        it("Splits a response header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.setResponseHeader("content-type", "application/cloudevents+json; charset=utf-8");
            let _expected = ["application/cloudevents+json", "charset=utf-8"];
            assert.deepStrictEqual(await _context.splitResponseHeader("content-type"), _expected, "Expected ['application/cloudevents+json', 'charset=utf-8'].");
        });
        it("gets a request header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _expected = ["application/cloudevents+json", "charset=utf-8"];
            assert.deepStrictEqual(await _context.getRequestHeader("content-type"), "application/cloudevents+json; charset=utf-8", "Expected 'application/cloudevents+json; charset=utf-8'.");
        });
        it("request header does not contain", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            assert.strictEqual(await _context.requestHeaderContains("content-type-false", "application/cloudevents+json"), false, "Expected false.");
        });
        it("request header dcontains", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            assert.strictEqual(await _context.requestHeaderContains("content-type", "application/cloudevents\\+json"), true, "Expected true.");
            assert.strictEqual(await _context.requestHeaderContains("content-type", "application/cloudevents"), true, "Expected true.");
        });
        it("contains request header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            assert.strictEqual(await _context.containsRequestHeader("content-type"), true, "Expected true.");
        });
        it("does not contain request header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            assert.strictEqual(await _context.containsRequestHeader("sdgsdggsdagasdgsgds"), false, "Expected false.");
        });
        it("Splits a request header", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _expected = ["application/cloudevents+json", "charset=utf-8"];
            assert.deepStrictEqual(await _context.splitRequestHeader("content-type"), _expected, "Expected ['application/cloudevents+json', 'charset=utf-8'].");
        });
    });
    describe("Cookies", () => {
        let _azcontext = new MockAzureFunctionContext();
        _azcontext.req.method = "POST";
        _azcontext.req.originalUrl = "https://www.celastrinajs.com";
        _azcontext.req.params = {test: "test"};
        _azcontext.req.query = {param1: "test123"};
        _azcontext.req.rawBody = "{\"key1\": \"value1\"}";
        _azcontext.req.headers["header1"] = "testRequest123";
        _azcontext.req.body = {key1: "value1"};
        _azcontext.bindingData.status = {key: "value"};
        _azcontext.res.headers["header1"] = "testResponse123";
        _azcontext.res.headers["header2"] = "testResponse123";
        _azcontext.res.headers["header4"] = "testResponse789";
        _azcontext.res.body = {key2: "value2"};
        it("Sets cookie", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _cookie = new Cookie("cookie-name", "cookie-value");
            await _context.setCookie(_cookie);
            assert.deepStrictEqual(_context._cookies["cookie-name"], _cookie, "Expected cookie 'cookie-name'.");
        });
        it("Sets cookie", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _cookie = new Cookie("cookie-name", "cookie-value");
            await _context.setCookie(_cookie);
            assert.deepStrictEqual(await _context.getCookie("cookie-name"), _cookie, "Expected cookie 'cookie-name'.");
        });
    });
    describe("Sending", () => {
        let _azcontext = new MockAzureFunctionContext();
        _azcontext.req.method = "POST";
        _azcontext.req.originalUrl = "https://www.celastrinajs.com";
        _azcontext.req.params = {test: "test"};
        _azcontext.req.query = {param1: "test123"};
        _azcontext.req.rawBody = "{\"key1\": \"value1\"}";
        _azcontext.req.headers["header1"] = "testRequest123";
        _azcontext.req.body = {key1: "value1"};
        _azcontext.bindingData.status = {key: "value"};
        _azcontext.res.headers["header1"] = "testResponse123";
        _azcontext.res.headers["header2"] = "testResponse123";
        _azcontext.res.headers["header4"] = "testResponse789";
        _azcontext.res.body = {key2: "value2"};
        it("Sends default 204 response", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            _context.send();
            assert.strictEqual(_context.azureFunctionContext.res.status, 204, "Expected status code 204.");
            assert.strictEqual(_context.azureFunctionContext.res.body, null, "Expected null body.");
        });
        it("Sends response+200", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = {code: 1234};
            _context.send(_response, 200);
            assert.strictEqual(_context.azureFunctionContext.res.status, 200, "Expected status code 200.");
            assert.strictEqual(_context.azureFunctionContext.res.body, _response, "Expected _response body.");
        });
        it("Sends response default 200", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = {code: 1234};
            _context.send(_response);
            assert.strictEqual(_context.azureFunctionContext.res.status, 200, "Expected status code 200.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, _response, "Expected _response body.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.headers["X-celastrina-request-uuid"], _context.requestId, "Expected request header 'X-celastrina-request-uuid' to be set.");
        });
        it("Sends validation error", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaValidationError.newValidationError("Invalid Message", "test.message");
            _context.sendValidationError(_response);
            assert.strictEqual(_context.azureFunctionContext.res.status, 400, "Expected status code 400.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>400 - Bad Request</header><main><p><h2>Invalid Message</h2><br />test.message</p></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends validation error, null error", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaValidationError.newValidationError("bad request");
            _context.sendValidationError();
            assert.strictEqual(_context.azureFunctionContext.res.status, 400, "Expected status code 400.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>400 - Bad Request</header><main><p><h2>bad request</h2><br /></p></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends redirect, body null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            _context.sendRedirect("https://www.google.com");
            assert.strictEqual(_context.azureFunctionContext.res.status, 302, "Expected status code 302.");
            assert.deepStrictEqual(await _context.getResponseHeader("Location"), "https://www.google.com", "Expected location header 'https://www.google.com'.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>302 - Redirect</header><main><p><h2>https://www.google.com</h2></main><footer>celastrinajs</footer></body></html>", "Expected null body.");
        });
        it("Sends redirect", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            _context.sendRedirect("https://www.google.com", {code: 1234});
            assert.strictEqual(_context.azureFunctionContext.res.status, 302, "Expected status code 302.");
            assert.deepStrictEqual(await _context.getResponseHeader("Location"), "https://www.google.com", "Expected location header 'https://www.google.com'.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, {code: 1234}, "Expected {code: 1234} body.");
        });
        it("Sends redirect forward request body", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            _context.azureFunctionContext.req.body = {code: 1234};
            _context.sendRedirectForwardBody("https://www.google.com");
            assert.strictEqual(_context.azureFunctionContext.res.status, 302, "Expected status code 302.");
            assert.deepStrictEqual(await _context.getResponseHeader("Location"), "https://www.google.com", "Expected location header 'https://www.google.com'.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, {code: 1234}, "Expected {code: 1234} body.");
        });
        it("Sends server error, error null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaError.newError("Internal Server Error.");
            _context.sendServerError();
            assert.strictEqual(_context.azureFunctionContext.res.status, 500, "Expected status code 500.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>500 - Internal Server Error</header><main><p><h2>Internal Server Error.</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends server error, error not Celastrina", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaError.newError("New Error");
            _context.sendServerError(new Error("New Error"));
            assert.strictEqual(_context.azureFunctionContext.res.status, 500, "Expected status code 500.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>500 - Internal Server Error</header><main><p><h2>New Error</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends server error, error Celastrina", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaError.newError("New Error");
            _context.sendServerError(CelastrinaError.newError("New Error"));
            assert.strictEqual(_context.azureFunctionContext.res.status, 500, "Expected status code 500.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>500 - Internal Server Error</header><main><p><h2>New Error</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends not authorized error, error null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaError.newError("Not Authorized.", 401);
            _context.sendNotAuthorizedError();
            assert.strictEqual(_context.azureFunctionContext.res.status, 401, "Expected status code 401.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>401 - Not Authorized</header><main><p><h2>Not Authorized.</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends not authorized error, error not Celastrina", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            let _response = CelastrinaError.newError("New Error", 401);
            _context.sendNotAuthorizedError(new Error("New Error"));
            assert.strictEqual(_context.azureFunctionContext.res.status, 401, "Expected status code 401.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>401 - Not Authorized</header><main><p><h2>New Error</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends not authorized error, error Celastrina", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            _context.sendNotAuthorizedError(CelastrinaError.newError("New Error"));
            assert.strictEqual(_context.azureFunctionContext.res.status, 401, "Expected status code 401.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>401 - Not Authorized</header><main><p><h2>New Error</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends Forbidden error, error null", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            _context.sendForbiddenError();
            assert.strictEqual(_context.azureFunctionContext.res.status, 403, "Expected status code 403.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>403 - Forbidden</header><main><p><h2>Forbidden.</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends Forbidden error, error not Celastrina", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            _context.sendForbiddenError(new Error("New Error"));
            assert.strictEqual(_context.azureFunctionContext.res.status, 403, "Expected status code 403.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>403 - Forbidden</header><main><p><h2>New Error</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
        it("Sends Forbidden error, error Celastrina", async () => {
            let _config = new Configuration("MockHTTPContext");
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new MockHTTPContext(_config);
            await _context.initialize();
            _context.sendForbiddenError(CelastrinaError.newError("New Error"));
            assert.strictEqual(_context.azureFunctionContext.res.status, 403, "Expected status code 403.");
            assert.deepStrictEqual(_context.azureFunctionContext.res.body, "<html lang=\"en\"><head><title>MockHTTPContext</title></head><body><header>403 - Forbidden</header><main><p><h2>New Error</h2></main><footer>celastrinajs</footer></body></html>", "Expected _response body.");
        });
    });
});

module.exports = {
    MockHTTPContext: MockHTTPContext
};
