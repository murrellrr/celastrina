const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration} = require("../../core/Core");
const {Cookie, CookieParameter, Session, SessionManager, SecureSessionManager, AESSessionManager, JwtConfiguration,
    LocalJwtIssuer} = require("../index");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockHTTPContext} = require("./HTTPContextTest");
const {MockHTTPParameter} = require("./HTTPParameterMock");
const assert = require("assert");
const crypto = require("crypto");
const {MockPropertyManager} = require("../../core/test/PropertyManagerTest");
const {AES256Algorithm} = require("@celastrina/core");
const cookie = require("cookie");


describe("HTTPFunction", () => {
    //
});
