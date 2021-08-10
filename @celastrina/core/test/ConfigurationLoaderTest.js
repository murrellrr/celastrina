const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, MatchAny, MatchAll, MatchNone, Permission, PermissionManager,
       ResourceAuthorization, ManagedIdentityResource, AppRegistrationResource, ResourceManager, ContentParser,
       ConfigurationLoader, Configuration} = require("../Core");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");
const fs = require("fs");

describe("ConfigurationLoader", () => {
    describe("#constructor(property)", () => {
        it("Should succeed with valid property", () => {
            let _loader = new ConfigurationLoader("mock_property");
            assert.strictEqual(_loader._property, "mock_property", "Set property");
            assert.strictEqual(_loader._ctp instanceof ContentParser, true, "Content Parser is ContentParser.");
            assert.strictEqual(_loader._cfp, null, "Config Parser is ContentParser.");
        });
        it("Should fail with null", () => {
            let _err = new CelastrinaValidationError("[ConfigurationLoader][property]: Invalid string. Argument cannot be null or zero length.", 400, false, "property");
            assert.throws(() => {let _loader = new ConfigurationLoader(null);}, _err);
        });
        it("Should fail with 0 length string", () => {
            let _err = new CelastrinaValidationError("[ConfigurationLoader][property]: Invalid string. Argument cannot be null or zero length.", 400, false, "property");
            assert.throws(() => {let _loader = new ConfigurationLoader("");}, _err);
        });
        it("Should fail with empty string", () => {
            let _err = new CelastrinaValidationError("[ConfigurationLoader][property]: Invalid string. Argument cannot be null or zero length.", 400, false, "property");
            assert.throws(() => {let _loader = new ConfigurationLoader("          ");}, _err);
        });
        it("Should trim string", () => {
            let _loader = new ConfigurationLoader("     mock_property     ");
            assert.strictEqual(_loader._property, "mock_property", "Trim property");
        });
        it("Should fail when spaces are in the middle of string", () => {
            let _err = new CelastrinaValidationError("[ConfigurationLoader][property]: Invalid string. Argument cannot contain spaces.", 400, false, "property");
            assert.throws(() => {let _loader = new ConfigurationLoader("mock _ property");}, _err);
        });
    });
    describe("#load(pm, config)", () => {
        let _loader = new ConfigurationLoader("mock_property");
        let _pm = new MockPropertyManager();
        _pm.mockProperty("mock_resource", "[{\"id\": \"mock-resource-2\", \"authority\": \"authority2\", \"tenant\":  \"tenant2\", \"secret\": \"secret2\"}]");
        _pm.mockProperty("mock_permission", "{\"action\": \"mock-process-3\", \"roles\": [\"role-7\", \"role-8\", \"role-9\"], \"match\": {\"type\": \"MatchNone\"}}");
        _pm.mockProperty("mock_permission_expand", "[{\"action\": \"mock-process-4\", \"roles\": [\"role-10\", \"role-11\", \"role-12\"], \"match\": {\"type\": \"MatchAny\"}}, {\"action\": \"mock-process-5\", \"roles\": [\"role-13\", \"role-14\", \"role-15\"], \"match\": {\"type\": \"MatchAny\"}}]");
        _pm.mockProperty("mock_property", fs.readFileSync("./test/config-good.json", "utf8"));
        let _azcontext = new MockAzureFunctionContext();

        it("Loads known good config file to config object", async () => {
            let _config = {"celastrinajs.core.permission": new PermissionManager(),
                "celastrinajs.core.resource": new ResourceManager(),
                "celastrinajs.core.property.manager": _pm};
            await assert.doesNotReject(_loader.initialize(_pm, _azcontext, _config));
            await assert.doesNotReject(_loader.load(_config));
        });
        it("Sets permissions", async () => {
            let _config = {"celastrinajs.core.permission": new PermissionManager(),
                "celastrinajs.core.resource": new ResourceManager(),
                "celastrinajs.core.property.manager": _pm};
            await assert.doesNotReject(_loader.load(_pm, _azcontext, _config));
            assert.notStrictEqual(_config[Configuration.CONFIG_PERMISSION], null, "PermissionManager null.");
            /**@type{PermissionManager}*/let _permissions = _config[Configuration.CONFIG_PERMISSION];
            let _pm1 = new Permission("mock-process-1", ["role-1", "role-2", "role-3"], new MatchAny());
            let _pm2 = new Permission("mock-process-2", ["role-4", "role-5", "role-6"], new MatchAll());
            let _pm3 = new Permission("mock-process-3", ["role-7", "role-8", "role-9"], new MatchNone());
            assert.deepStrictEqual(_permissions._permissions["mock-process-1"], _pm1, "mock-process-1 correct.");
            assert.deepStrictEqual(_permissions._permissions["mock-process-2"], _pm2, "mock-process-2 correct.");
            assert.deepStrictEqual(_permissions._permissions["mock-process-3"], _pm3, "mock-process-3 correct.");
            assert.deepStrictEqual(_permissions.getPermission("mock-process-1"), _pm1, "mock-process-1 correct via getPermission.");
            assert.deepStrictEqual(_permissions.getPermission("mock-process-2"), _pm2, "mock-process-2 correct via getPermission.");
            assert.deepStrictEqual(_permissions.getPermission("mock-process-3"), _pm3, "mock-process-3 correct via getPermission.");
        });
        it("Sets resource authorizations", async () => {
            let _config = {"celastrinajs.core.permission": new PermissionManager(),
                "celastrinajs.core.resource": new ResourceManager(),
                "celastrinajs.core.property.manager": _pm};
            await assert.doesNotReject(_loader.load(_pm, _azcontext, _config));
            assert.notStrictEqual(_config[Configuration.CONFIG_RESOURCE], null, "ResourceManager null.");
            /**@type{ResourceManager}*/let _resources = _config[Configuration.CONFIG_RESOURCE];
            let _rm1 = new AppRegistrationResource("mock_resource_1", "authority1", "tenant1", "secret1");
            let _rm2 = new AppRegistrationResource("mock_resource_2", "authority2", "tenant2", "secret2");
            assert.deepStrictEqual(_resources._resources["mock_resource_1"], _rm1, "mock_resource_1 set.");
            assert.deepStrictEqual(_resources._resources["mock_resource_2"], _rm2, "mock_resource_2 set.");
            assert.deepStrictEqual(_resources.getResource("mock_resource_1"), _rm1, "mock_resource_1 via getResource.");
            assert.deepStrictEqual(_resources.getResource("mock_resource_2"), _rm2, "mock_resource_2 via getResource.");
        });
    });
});
