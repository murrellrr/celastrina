const {CelastrinaError, LOG_LEVEL, Configuration, BaseSentry, BaseSubject, BaseContext} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockResourceAuthorization} = require("./ResourceAuthorizationTest");
const {MockPropertyManager} = require("./PropertyManagerTest");
const assert = require("assert");

describe("BaseContext", () => {
    describe("#constructor(azcontext, config)", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        it("sets azcontext and config", () => {
            let _context = new BaseContext(_azcontext, _config);
            assert.strictEqual(_context._azfunccontext, _azcontext);
            assert.strictEqual(_context._config, _config);
            assert.strictEqual(typeof _context._requestId, "string");
            assert.strictEqual(_context._monitor, false);
            assert.strictEqual(_context._action, "process");
        });
    });
    describe("#get name()", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        it("Has name 'mock_configuration'.", () => {
            assert.strictEqual(_context.name, "mock_configuration");
        });
    });
    describe("#get config()", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        it("Has config.", () => {
            assert.strictEqual(_context.config, _config);
        });
    });
    describe("#get action()", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        it("Has action 'process'", () => {
            assert.strictEqual(_context.action, "process");
        });
    });
    describe("#get azureFunctionContext()", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        it("Has azureFunctionContext.", () => {
            assert.strictEqual(_context.azureFunctionContext, _azcontext);
        });
    });
    describe("logging", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        describe("#log(message, level = LOG_LEVEL.INFO, subject = null)", () => {
            it("Default logs to info.", () => {
                _azcontext.log.reset();
                _context.log("mock_message");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
            it("Logs WARN.", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.WARN);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "warn");
            });
            it("Logs ERROR.", () => {
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
            it("Logs VERBOSE from unknown.", () => {
                _azcontext.log.reset();
                let __LEVEL = LOG_LEVEL;
                __LEVEL.UNKNOWN = 99;
                _context.log("mock_message", __LEVEL.UNKNOWN);
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "verbose");
            });
            it("Logs INFO with Subject 'mock_subject'.", () => {
                _azcontext.log.reset();
                _context.log("mock_message", LOG_LEVEL.INFO, "mock_subject");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_subject][mock_invocation_id][" + _context.requestId + "]: mock_message");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
        });
        describe("#logObjectAsJSON(object, level = LOG_LEVEL.INFO, subject = null)", () => {
            it("Stringifys object and forwards LEVEL and Subject.", () => {
                _azcontext.log.reset();
                let _obj = {mock: "value"};
                _context.logObjectAsJSON(_obj, LOG_LEVEL.INFO, "mock_subject");
                assert.strictEqual(_azcontext.log.message, "[mock_configuration][mock_subject][mock_invocation_id][" + _context.requestId + "]: {\"mock\":\"value\"}");
                assert.strictEqual(_azcontext.log.invoked, "info");
            });
        });
    });
    describe("sentry", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        let _sentry = new BaseSentry();
        it("Sets sentry passed in.", () => {
            _context.sentry = _sentry;
            assert.strictEqual(_context.sentry, _sentry);
        });
    });
    describe("subject", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        let _subject = new BaseSubject("mock_subject");
        it("Sets subject passed in.", () => {
            _context.subject = _subject;
            assert.strictEqual(_context.subject, _subject);
        });
    });
    describe("bindings", () => {
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        describe("#setBinding(name, value = null)", () => {
            it("Sets binding by name using default value null.", () => {
                _context.setBinding("mock_bindning-one");
                assert.strictEqual(_azcontext.bindings["mock_bindning-one"], null);
            });
            it("Sets binding by name.", () => {
                _context.setBinding("mock_bindning-one", 42);
                assert.strictEqual(_azcontext.bindings["mock_bindning-one"], 42);
            });
        });
        describe("#getBinding(name, defaultValue = null)", () => {
            it("Gets binding set by Azure Function.", () => {
                assert.deepStrictEqual(_context.getBinding("mockBindingTwo"), {key: "mock_key", value: "mock_value"});
            });
            it("Gets binding set by setter.", () => {
                assert.deepStrictEqual(_context.getBinding("mock_bindning-one"), 42);
            });
            it("Returns binding if null or not defined.", () => {
                assert.deepStrictEqual(_context.getBinding("mock_bindning-two", 42), 42);
            });
        });
        describe("#get properties()", () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            let _context = new BaseContext(_azcontext, _config);
            let _pm = new MockPropertyManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            it("Has properties from configuration.", () => {
                assert.strictEqual(_context.properties, _pm);
            });
        });
        describe("#done(value = null)", () => {
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            let _context = new BaseContext(_azcontext, _config);
            it("Defaults done to null.", () => {
                _context.done();
                assert.strictEqual(_context._result, null);
            });
            it("Sets results to done.", () => {
                _context.done({test: "value"});
                assert.deepStrictEqual(_context._result, {test: "value"});
            });
            it("Results returns value from done.", () => {
                _context.done({test: "value"});
                assert.deepStrictEqual(_context.result, {test: "value"});
            });
        });
        describe("#initialize()", () => {
            describe("Initializing trace ID if present.", () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                let _context = new BaseContext(_azcontext, _config);
                it("has trace ID.", () => {
                    _context.initialize();
                    assert.strictEqual(_context.traceId, _azcontext.traceContext.traceparent);
                });
            });
            describe("Initializing in monitor mode..", () => {
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                let _context = new BaseContext(_azcontext, _config);
                it("has trace ID.", () => {
                    _context._monitor = true;
                    _context.initialize();
                    assert.strictEqual(_context.isMonitorInvocation, true);
                    assert.notStrictEqual(_context.monitorResponse, null);
                });
            });
        });
    });
});


