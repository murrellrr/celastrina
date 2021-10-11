const {HTTPParameter} = require("../index");
const {CelastrinaError} = require("../../core/Core");
class MockHTTPParameter extends HTTPParameter {
    constructor(type = "MockHTTPParameter", readOnly = true, value = "Mock Value") {
        super(type, readOnly);
        this.getParameterInvoked = false;
        this.setParameterInvoked = false;
        /**@type{null|string}*/this.value = value;
    }
    reset() {
        this.getParameterInvoked = false;
        this.setParameterInvoked = false;
        this.value = "Mock Value";
    }
    _getParameter(context, key) {
        this.getParameterInvoked = true;
        return this.value;
    }
    _setParameter(context, key, value = null) {
        this.getParameterInvoked = true;
        this.value = value;
    }
}
module.exports = {
    MockHTTPParameter: MockHTTPParameter
};
