/*
 * Copyright (c) 2020, Robert R Murrell.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const {CelastrinaError, Configuration, BaseFunction} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockContext} = require("./ContextTest");
const assert = require("assert");

class MockFunction extends BaseFunction {
    constructor(config) {
        super(config);
        this.saveInvoked = false;
        this.createContextInvoked = false;
        this.bootStrapInvoked = false;
        this.initializInvoked = false;
        this.authenticateInvoked = false;
        this.authorizeInvoked = false;
        this.validateInvoked = false;
        this.monitorInvoked = false;
        this.loadInvoked = false;
        this.processInvoked = false;
        this.exceptionInvoked = false;
        this.terminateInvoked = false;
        this.causeErrorInProcess = false;
        this.causeErrorInException = false;
        this.causeErrorInTerminate = false;
        this.causeErrorInInitialize = false;
        this.fakeNullContext = false;
        this.fakeInvalidContext = false;
    }
    reset() {
        this.saveInvoked = false;
        this.createContextInvoked = false;
        this.bootStrapInvoked = false;
        this.initializInvoked = false;
        this.authenticateInvoked = false;
        this.authorizeInvoked = false;
        this.validateInvoked = false;
        this.monitorInvoked = false;
        this.loadInvoked = false;
        this.processInvoked = false;
        this.exceptionInvoked = false;
        this.terminateInvoked = false;
        this.causeErrorInException = false;
        this.causeErrorInTerminate = false;
        this.causeErrorInInitialize = false;
        this.fakeNullContext = false;
        this.fakeInvalidContext = false;
    }
    async createContext(config) {
        this.createContextInvoked = true;
        let _context = await super.createContext(config);
        if(this.fakeInvalidContext) return null;
        else return _context;
    }
    async bootstrap(azcontext) {
        this.bootStrapInvoked = true;
        await super.bootstrap(azcontext);
        if(this.fakeNullContext) this._context = null;
    }
    async initialize(context) {
        this.initializInvoked = true;
        if(this.causeErrorInInitialize) throw new CelastrinaError("Testing Error, #initialize");
        return super.initialize(context);
    }
    async authenticate(context) {
        this.authenticateInvoked = true;
        return super.authenticate(context);
    }
    async authorize(context) {
        this.authorizeInvoked = true;
        return super.authorize(context);
    }
    async validate(context) {
        this.validateInvoked = true;
        return super.validate(context);
    }
    async monitor(context) {
        this.monitorInvoked = true;
        return super.monitor(context);
    }
    async load(context) {
        this.loadInvoked = true;
        return super.load(context);
    }
    async process(context) {
        this.processInvoked = true;
        if(this.causeErrorInProcess) throw new CelastrinaError("Testing Error, #process");
        return super.process(context);
    }
    async save(context) {
        this.saveInvoked = true;
        return super.save(context);
    }
    async exception(context, exception) {
        this.exceptionInvoked = true;
        if(this.causeErrorInException) throw new CelastrinaError("Testing Error, #exception");
        return super.exception(context, exception);
    }
    async terminate(context) {
        this.terminateInvoked = true;
        if(this.causeErrorInTerminate) throw new CelastrinaError("Testing Error, #terminate");
        return super.terminate(context);
    }
}

describe("BaseFunction", () => {
    describe("#constructor(configuration)", () => {
        let _config = new Configuration("mock_configuration");
        it("Set configuration", () => {
            let _func = new MockFunction(_config);
            assert.strictEqual(_func._configuration, _config);
        });
    });
    describe("#execute(azcontext)", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute without exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_config.loaded, true, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, true, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, true, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, true, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, true, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, true, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, true, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, true, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, true, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, false, "Invoke Exception.");
            assert.strictEqual(_func.context.result, null, "Context result null.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
    describe("#execute(azcontext), with celastrina error in process.", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        _func.causeErrorInProcess = true;
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute with exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_config.loaded, true, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, true, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, true, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, true, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, true, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, true, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, true, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, false, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, true, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, true, "Invoke Exception.");
            assert.strictEqual(_func.context.result, null, "Context result null.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
    describe("#execute(azcontext), with celastrina error in exception.", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        _func.causeErrorInProcess = true;
        _func.causeErrorInException = true;
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute with exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_config.loaded, true, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, true, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, true, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, true, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, true, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, true, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, true, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, false, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, true, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, true, "Invoke Exception.");
            assert.strictEqual(_func.context.result, null, "Context result null.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
    describe("#execute(azcontext), with celastrina error in terminate.", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        _func.causeErrorInTerminate = true;
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute with exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_config.loaded, true, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, true, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, true, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, true, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, true, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, true, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, true, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, true, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, true, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, false, "Invoke Exception.");
            assert.strictEqual(_func.context.result, null, "Context result null.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
    describe("#execute(azcontext), with celastrina error in initialize.", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        _func.causeErrorInInitialize = true;
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute with exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_config.loaded, true, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, true, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, false, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, false, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, false, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, false, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, false, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, false, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, true, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, true, "Invoke Exception.");
            assert.strictEqual(_func.context.result, null, "Context result null.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
    describe("#execute(azcontext), with null context after bootstrap.", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        _func.fakeNullContext = true;
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute with exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_azcontext.res.status, 500, "Expected 500.");
            assert.strictEqual(_func.context, null, "Context result null.");
            assert.strictEqual(_config.loaded, true, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, false, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, false, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, false, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, false, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, false, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, false, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, false, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, false, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, false, "Invoke Exception.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
    describe("#execute(azcontext), with null context after create.", () => {
        let _config = new Configuration("mock_configuration");
        _config.setAuthorizationOptimistic(true);
        let _func = new MockFunction(_config);
        _func.fakeInvalidContext = true;
        let _azcontext = new MockAzureFunctionContext();
        it("Should execute with exception.", async () => {
            await assert.doesNotReject(_func.execute(_azcontext));
            assert.strictEqual(_azcontext.res.status, 500, "Expected 500.");
            assert.strictEqual(_func.context, null, "Context result null.");
            assert.strictEqual(_config.loaded, false, "Configuration Loaded.");
            assert.strictEqual(_func.bootStrapInvoked, true, "Invoke Bootstrap.");
            assert.strictEqual(_func.initializInvoked, false, "Invoke Initialize.");
            assert.strictEqual(_func.authenticateInvoked, false, "Invoke Authenticate.");
            assert.strictEqual(_func.authorizeInvoked, false, "Invoke Authorize.");
            assert.strictEqual(_func.validateInvoked, false, "Invoke Validate.");
            assert.strictEqual(_func.monitorInvoked, false, "Invoke Monitor.");
            assert.strictEqual(_func.loadInvoked, false, "Invoke Load.");
            assert.strictEqual(_func.processInvoked, false, "Invoke Process.");
            assert.strictEqual(_func.saveInvoked, false, "Invoke Save.");
            assert.strictEqual(_func.terminateInvoked, false, "Invoke Terminate.");
            assert.strictEqual(_func.exceptionInvoked, false, "Invoke Exception.");
            assert.strictEqual(_azcontext.doneInvoked, true, "Azure Context Done.");
        });
    });
});
