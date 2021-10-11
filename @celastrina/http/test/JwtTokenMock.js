const {JwtToken} = require("../index");
const {MockHTTPParameter} = require("./HTTPParameterMock");
class MockJwtToken extends JwtToken {
    constructor(name = "MockName", param = new MockHTTPParameter()) {
        super(name, param);
    }
}
module.exports = {
    MockJwtToken: MockJwtToken
};
