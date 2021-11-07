const {CelastrinaError, LOG_LEVEL, Configuration, Sentry, Subject, Context} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockResourceAuthorization} = require("./ResourceAuthorizationTest");
const {MockPropertyManager} = require("./PropertyManagerTest");
const assert = require("assert");

class MockContext extends Context {
    constructor(azcontext, config) {
        super(config);
    }
    setMonitorMode() {this._monitor = true;}
}


describe("BaseContext", () => {
    describe("#constructor(azcontext, config)", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        it("sets azcontext and config", () => {
            let _context = new Context(_config);
            assert.strictEqual(_context._config, _config);
            assert.strictEqual(typeof _context._requestId, "string");
            assert.strictEqual(_context._monitor, false);
            assert.strictEqual(_context._action, "process");
        });
    });
    describe("#get name()", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context(_config);
        it("Has name 'mock_configuration'", () => {
            assert.strictEqual(_context.name, "mock_configuration");
        });
    });
    describe("#get config()", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context(_config);
        it("Has config", () => {
            assert.strictEqual(_context.config, _config);
        });
    });
    describe("#get action()", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context(_config);
        it("Has action 'process'", () => {
            assert.strictEqual(_context.action, "process");
        });
    });
    describe("#get azureFunctionContext()", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context( _config);
        it("Has azureFunctionContext.", () => {
            assert.strictEqual(_context.azureFunctionContext, _azcontext);
        });
    });
    describe("logging", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context( _config);
        describe("#log(message, level = LOG_LEVEL.INFO, subject = null)", () => {
            it("Default logs to info", () => {
                _azcontext.log.reset();
                _context.log("mock_message");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
            it("Logs WARN", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.WARN);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "warn");
            });
            it("Logs ERROR", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.ERROR);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "error");
            });
            it("Logs VERBOSE", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.VERBOSE);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "verbose");
            });
            it("Logs WARN", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.THREAT);
                assert.strictEqual(_azcontext.log.message, "[THREAT][mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "warn");
            });
            it("Logs VERBOSE from unknown", () => {
                _azcontext.log.reset();
                let __LEVEL = LOG_LEVEL;
                __LEVEL.UNKNOWN = 99;
                _context.log("mock_message", __LEVEL.UNKNOWN);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "verbose");
            });
            it("Logs INFO with Subject 'mock_subject'", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.INFO, "mock_subject");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_subject][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
        });
        describe("#logObjectAsJSON(object, level = LOG_LEVEL.INFO, subject = null)", () => {
            it("Stringifys object and forwards LEVEL and Subject", () => {
                _azcontext.log.reset();
                let _obj = {mock: "value"};
                _context.logObjectAsJSON(_obj, LOG_LEVEL.INFO, "mock_subject");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_subject][mock_invocation_id][" + _context.requestId + "]: {\"mock\":\"value\"}");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
        });
    });
    describe("subject", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context(_config);
        let _subject = new Subject("mock_subject");
        it("Sets subject passed in", () => {
            _context.subject = _subject;
            assert.strictEqual(_context.subject, _subject);
        });
    });
    describe("bindings", async () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        await _config.initialize(_azcontext);
        let _context = new Context(_config);
        describe("#setBinding(name, value = null)", () => {
            it("Sets binding by name using default value null", () => {
                _context.setBinding("mock_bindning-one");
                assert.strictEqual(_azcontext.bindings["mock_bindning-one"], null);
            });
            it("Sets binding by name", () => {
                _context.setBinding("mock_bindning-one", 42);
                assert.strictEqual(_azcontext.bindings["mock_bindning-one"], 42);
            });
        });
        describe("#getBinding(name, defaultValue = null)", () => {
            it("Gets binding set by Azure Function", () => {
                assert.deepStrictEqual(_context.getBinding("mockBindingTwo"), {key: "mock_key", value: "mock_value"});
            });
            it("Gets binding set by setter", () => {
                assert.deepStrictEqual(_context.getBinding("mock_bindning-one"), 42);
            });
            it("Returns binding if null or not defined", () => {
                assert.deepStrictEqual(_context.getBinding("mock_bindning-two", 42), 42);
            });
        });
        describe("#get properties()", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            it("Has properties from configuration", () => {
                assert.strictEqual(_context.properties, _pm);
            });
        });
        describe("#done(value = null)", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            it("Defaults done to null", () => {
                _context.done();
                assert.strictEqual(_context._result, null);
            });
            it("Sets results to done", () => {
                _context.done({test: "value"});
                assert.deepStrictEqual(_context._result, {test: "value"});
            });
            it("Results returns value from done", () => {
                _context.done({test: "value"});
                assert.deepStrictEqual(_context.result, {test: "value"});
            });
        });
        describe("#initialize()", () => {
            describe("Initializing trace ID if present.", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                it("has trace ID", () => {
                    _context.initialize();
                    assert.strictEqual(_context.traceId, _azcontext.traceContext.traceparent);
                });
            });
            describe("Initializing in monitor mode..", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                it("Monitor is true and response not null.", () => {
                    _context._monitor = true;
                    _context.initialize();
                    assert.strictEqual(_context.isMonitorInvocation, true);
                    assert.notStrictEqual(_context.monitorResponse, null);
                });
            });
        });
    });
});


module.exports = {
    MockContext: MockContext
};
