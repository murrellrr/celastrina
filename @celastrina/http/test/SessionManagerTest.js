const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {SessionManager} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const assert = require("assert");


class MockSessionManager extends SessionManager {
    constructor() {
        super();
    }
}




module.exports = {
    MockSessionManager: MockSessionManager
};
