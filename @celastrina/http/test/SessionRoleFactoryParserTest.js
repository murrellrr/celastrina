const {CelastrinaError, CelastrinaValidationError, Cryptography, BaseRoleFactory} = require("@celastrina/core");
const {SessionRoleFactoryParser, SessionRoleFactory} = require("../HTTP");
const assert = require("assert");

describe("SessionRoleFactoryParser", () => {
    describe("#_create(_SessionRoleFactory)", () => {
        it("create a new session role factory", async () => {
            let _parser = new SessionRoleFactoryParser();
            let _SessionRoleFactory = {_content: {type: "application/vnd.celastrinajs.attribute+json;SessionRoleFactory"}, key: "_user_roles"};
            let _factory = await _parser._create(_SessionRoleFactory);
            assert.strictEqual(_factory.key, "_user_roles", "Expected '_user_roles'.");
        });
        it("defaults to 'roles'", async () => {
            let _parser = new SessionRoleFactoryParser();
            let _SessionRoleFactory = {_content: {type: "application/vnd.celastrinajs.attribute+json;SessionRoleFactory"}};
            let _factory = await _parser._create(_SessionRoleFactory);
            assert.strictEqual(_factory.key, "roles", "Expected 'roles'.");
        });
    });
});
