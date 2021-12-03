const {CelastrinaError, LOG_LEVEL, Configuration, Sentry, Subject, Context} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockResourceAuthorization} = require("./ResourceAuthorizationTest");
const {MockPropertyManager} = require("./PropertyManagerTest");
const assert = require("assert");

class MockContext extends Context {
    constructor(config) {
        super(config);
    }
    setMonitorMode() {this._monitor = true;}
}

describe("BaseContext", () => {
    describe("#constructor(azcontext, config)", () => {
        it("sets azcontext and config", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            assert.strictEqual(_context._config, _config);
            assert.strictEqual(typeof _context._requestId, "string");
            assert.strictEqual(_context._monitor, false);
            assert.strictEqual(_context._action, "process");
        });
    });
    describe("#get name()",  () => {
        it("Has name 'mock_configuration'", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            assert.strictEqual(_context.name, "mock_configuration");
        });
    });
    describe("#get config()",  () => {
        it("Has config", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            assert.strictEqual(_context.config, _config);
        });
    });
    describe("#get action()", () => {
        it("Has action 'process'", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            assert.strictEqual(_context.action, "process");
        });
    });
    describe("#get azureFunctionContext()", () => {
        it("Has azureFunctionContext.", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context( _config);
            assert.strictEqual(_context.azureFunctionContext, _azcontext);
        });
    });
    describe("logging", () => {
        describe("#log(message, level = LOG_LEVEL.INFO, subject = null)", () => {
            it("Default logs to info", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                _context.log("mock_message");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
            it("Logs WARN", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.WARN);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "warn");
            });
            it("Logs ERROR", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.ERROR);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "error");
            });
            it("Logs VERBOSE", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.VERBOSE);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "verbose");
            });
            it("Logs WARN from THREAT with THREAT tagging", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.THREAT);
                assert.strictEqual(_azcontext.log.message, "[THREAT][mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "warn");
            });
            it("Logs VERBOSE from unknown", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                let __LEVEL = LOG_LEVEL;
                __LEVEL.UNKNOWN = 99;
                _context.log("mock_message", __LEVEL.UNKNOWN);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "verbose");
            });
            it("Logs INFO with Subject 'mock_subject'", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.INFO, "mock_subject");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_subject][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
        });
        describe("#logObjectAsJSON(object, level = LOG_LEVEL.INFO, subject = null)", () => {
            it("Stringifys object and forwards LEVEL and Subject", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context( _config);
                _azcontext.log.reset();
                let _obj = {mock: "value"};
                _context.logObjectAsJSON(_obj, LOG_LEVEL.INFO, "mock_subject");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_subject][mock_invocation_id][" + _context.requestId + "]: {\"mock\":\"value\"}");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
        });
    });
    describe("subject", () => {
        it("Sets subject passed in", async () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            await _config.initialize(_azcontext);
            let _context = new Context(_config);
            let _subject = new Subject("mock_subject");
            _context.subject = _subject;
            assert.strictEqual(_context.subject, _subject);
        });
    });
    describe("properties", () => {
        describe("#get properties()", () => {
            it("Has properties from configuration", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                let _pm = new MockPropertyManager();
                _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
                assert.strictEqual(_context.properties, _pm);
            });
        });
        describe("#getProperty(key, defaultValue)", () => {
            it("shoudl get a property", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                let _pm = new MockPropertyManager();
                _pm.mockProperty("mock_string_key", "value_1");
                _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
                await _config.initialize(_azcontext);
                await _config.ready();
                let _context = new Context(_config);
                await _context.initialize();
                assert.strictEqual(await _context.getProperty("mock_string_key"), "value_1", "Expected 'value_1'.");
            });
        });
    });
    describe("bindings", () => {
        describe("#setBinding(name, value = null)", () => {
            it("Sets binding by name using default value null", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                await _context.setBinding("mock_bindning-one");
                assert.strictEqual(_azcontext.bindings["mock_bindning-one"], null);
            });
            it("Sets binding by name", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                await _context.setBinding("mock_bindning-one", 42);
                assert.strictEqual(_azcontext.bindings["mock_bindning-one"], 42);
            });
        });
        describe("#getBinding(name, defaultValue = null)", () => {
            it("Gets binding set by Azure Function", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                assert.deepStrictEqual(await _context.getBinding("mockBindingTwo"), {key: "mock_key", value: "mock_value"});
            });
            it("Gets binding set by setter", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                _azcontext.bindings["mock_bindning-one"] = 42;
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                assert.deepStrictEqual(await _context.getBinding("mock_bindning-one"), 42);
            });
            it("Returns binding if null or not defined", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                assert.deepStrictEqual(await _context.getBinding("mock_bindning-two", 42), 42);
            });
        });
        describe("#done(value = null)", () => {
            it("Defaults done to null", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                _context.done();
                assert.strictEqual(_context._result, null);
            });
            it("Sets results to done", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                _context.done({test: "value"});
                assert.deepStrictEqual(_context._result, {test: "value"});
            });
            it("Results returns value from done", async () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                await _config.initialize(_azcontext);
                let _context = new Context(_config);
                _context.done({test: "value"});
                assert.deepStrictEqual(_context.result, {test: "value"});
            });
        });
        describe("#initialize()", () => {
            describe("Initializing trace ID if present.", () => {
                it("has trace ID", async () => {
                    let _config = new Configuration("mock_configuration");
                    let _azcontext = new MockAzureFunctionContext();
                    await _config.initialize(_azcontext);
                    let _context = new Context(_config);
                    await _context.initialize();
                    assert.strictEqual(_context.traceId, _azcontext.traceContext.traceparent);
                });
            });
            describe("Initializing in monitor mode..", () => {
                it("Monitor is true and response not null.", async () => {
                    let _config = new Configuration("mock_configuration");
                    let _azcontext = new MockAzureFunctionContext();
                    await _config.initialize(_azcontext);
                    let _context = new Context(_config);
                    _context._monitor = true;
                    await _context.initialize();
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
