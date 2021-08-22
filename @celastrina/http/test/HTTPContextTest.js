const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {HTTPContext} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockHTTPContext extends HTTPContext {
    constructor(context = new MockAzureFunctionContext(), config = new Configuration("MockHTTPContext")) {
        super(context, config);
    }
}


module.exports = {
    MockHTTPContext: MockHTTPContext
};
