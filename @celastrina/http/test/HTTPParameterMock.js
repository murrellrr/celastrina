const {HTTPParameter} = require("../index");
const {CelastrinaError} = require("../../core/Core");
class MockHTTPParameter extends HTTPParameter {
    constructor(type = "MockHTTPParameter", readOnly = true, value = {mock_key: "Mock Value"}) {
        super(type, readOnly);
        this.getParameterInvoked = false;
        this.setParameterInvoked = false;
        /**@type{Object}*/this.value = value;
    }
    reset() {
        this.getParameterInvoked = false;
        this.setParameterInvoked = false;
        this.value = {mock_key: "Mock Value"};
    }
    stageParameter(key, value) {
        this.value[key] = value;
        return this;
    }
    _getParameter(context, key) {
        this.getParameterInvoked = true;
        return this.value[key];
    }
    _setParameter(context, key, value = null) {
        this.getParameterInvoked = true;
        this.value[key] = value;
    }
}
module.exports = {
    MockHTTPParameter: MockHTTPParameter
};
