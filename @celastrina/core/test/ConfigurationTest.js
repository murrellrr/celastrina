const {CelastrinaError, Configuration, AppSettingsPropertyManager, ResourceManager, PermissionManager, AttributeParser,
       ConfigParser, CelastrinaValidationError, AppRegistrationResource, Permission, MatchAny, MatchAll, MatchNone} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {MockPropertyManager} = require("./PropertyManagerTest");
const {MockResourceManager} = require("./ResourceAuthorizationTest");
const assert = require("assert");
const fs = require("fs");

describe("Configuration", () => {
    describe("#constructor(name)", () => {
        it("must set name", () => {
            let _config = new Configuration("test");
            assert.strictEqual(_config.name, "test");
        });
        it("must throw error when name is null", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration(null);}, err);
        });
        it("must throw error when name is empty string", () => {
            let err = new CelastrinaError("Invalid configuration. Name cannot be undefined, null or 0 length.");
            assert.throws(() => {let _config = new Configuration("");}, err);
        });
        it("must throw error when name is not string", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration(42);}, err);
        });
        it("must throw error when name does not exist", () => {
            let err = new CelastrinaError("Invalid configuration. Name must be string.");
            assert.throws(() => {let _config = new Configuration();}, err);
        });
        it("Loaded must default false", () => {
            let _config = new Configuration("test");
            assert.strictEqual(_config.loaded, false);
        });
        it("Should succeed with valid property", () => {
            let _loader = new Configuration("ConfigurationTest", "mock_property");
            assert.strictEqual(_loader._property, "mock_property", "Set property");
            assert.strictEqual(_loader._atp instanceof AttributeParser, true, "Content Parser is AttributeParser.");
            assert.strictEqual(_loader._cfp instanceof ConfigParser, true, "Config Parser is ContentParser.");
        });
        it("Should load with null.", () => {
            let _loader = new Configuration("ConfigurationTest");
            assert.strictEqual(_loader.configParser, null, "Expected configParser to be null.");
            assert.strictEqual(_loader.contentParser, null, "Expected contentParser to be null.");
        });
        it("Should fail with 0 length string", () => {
            let _err = new CelastrinaValidationError("[Configuration][property]: Invalid string. Argument cannot be null or zero length.", 400, false, "property");
            assert.throws(() => {let _loader = new Configuration("ConfigurationTest", "");}, _err);
        });
        it("Should fail with empty string", () => {
            let _err = new CelastrinaValidationError("[Configuration][property]: Invalid string. Argument cannot be null or zero length.", 400, false, "property");
            assert.throws(() => {let _loader = new Configuration("ConfigurationTest", "          ");}, _err);
        });
        it("Should trim string", () => {
            let _loader = new Configuration("ConfigurationTest", "     mock_property     ");
            assert.strictEqual(_loader._property, "mock_property", "Trim property");
        });
        it("Should fail when spaces are in the middle of string", () => {
            let _err = new CelastrinaValidationError("[Configuration][property]: Invalid string. Argument cannot contain spaces.", 400, false, "property");
            assert.throws(() => {let _loader = new Configuration("ConfigurationTest", "mock _ property");}, _err);
        });
    });
    describe("values", () => {
        describe("#setValue(key , value)", () => {
            let _config = new Configuration("test");
            it("Must throw error if key is null", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue(null, "mock-value")}, err);
            });
            it("Must throw error if key is zero length", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue("", "mock-value")}, err);
            });
            it("Must throw error if key is undefined", () => {
                let err = new CelastrinaError("Invalid configuration. Key cannot be undefined, null or 0 length.");
                assert.throws(() => {_config.setValue(undefined, "mock-value")}, err);
            });
            it("Must set value string at key", () => {
                _config.setValue("mock-key", "mock-value");
                assert.strictEqual(_config._config["mock-key"], "mock-value");
            });
            it("Must set value number at key", () => {
                _config.setValue("mock-key", 42);
                assert.strictEqual(_config._config["mock-key"], 42);
            });
            it("Must set value boolean at key", () => {
                _config.setValue("mock-key", true);
                assert.strictEqual(_config._config["mock-key"], true);
            });
            it("Must set value Object at key", () => {
                let _test = {value: 123456789};
                _config.setValue("mock-key", _test);
                assert.strictEqual(_config._config["mock-key"], _test);
            });
        });
        describe("#getValue(key , defaultValue = null)", () => {
            let _config = new Configuration("test");
            it("must return null if key not found and defaultValue not set", () => {
                assert.strictEqual(_config.getValue("mock-key"), null);
            });
            it("Must return defaultValue if key not found", () => {
                let _default = "default";
                assert.strictEqual(_config.getValue("mock-key", _default), _default);
            });
            it("Must return string 'mock-value' if key not found", () => {
                _config.setValue("mock-key", "mock-value")
                assert.strictEqual(_config.getValue("mock-key"), "mock-value");
            });
            it("Must return number '42' if key not found", () => {
                _config.setValue("mock-key", 42)
                assert.strictEqual(_config.getValue("mock-key"), 42);
            });
            it("Must return boolean 'true' if key not found", () => {
                _config.setValue("mock-key", true)
                assert.strictEqual(_config.getValue("mock-key"), true);
            });
            it("Must return object '{value: 123456789}' if key not found", () => {
                let _test = {value: 123456789};
                _config.setValue("mock-key", _test)
                assert.strictEqual(_config.getValue("mock-key"), _test);
            });
        });
    });

    describe("#initialize(azcontext)", () => {
        let _azcontext = new MockAzureFunctionContext();
        it("Should initialize specified property and authorization managers", async () => {
            let _config = new Configuration("mock_configuration");
            let _pm = new MockPropertyManager();
            let _rm = new MockResourceManager();
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setValue(Configuration.CONFIG_RESOURCE, _rm);
            await _config.initialize(_azcontext);
            assert.strictEqual(_config.properties, _pm);
            assert.strictEqual(_config.resources, _rm);
            assert.strictEqual(_config.loaded, false, "Should not be loaded yet.");
            assert.strictEqual(_pm.initialized, true, "PropertyManager Initialized.");
            assert.strictEqual(_pm.readied, true, "PropertyManager Readied.");
            assert.strictEqual(_rm.initialized, true, "AuthorizationManager Initialized.");
            assert.strictEqual(_rm.readied, true, "AuthorizationManager Readied.");
        });
        it("Should initialize default property, permission, and authorization managers", async () => {
            let _config = new Configuration("mock_configuration");
            await _config.initialize(_azcontext);
            assert.strictEqual(_config.properties instanceof AppSettingsPropertyManager, true, "properties is AppSettingsPropertyManager.");
            assert.strictEqual(_config.resources instanceof ResourceManager, true, "authorizations is ResourceManager.");
            assert.strictEqual(_config.permissions instanceof PermissionManager, true, "authorizations is PermissionManager.");
            assert.strictEqual(_config.loaded, false, "Should not be loaded yet.");
        });
        it("Should invoke configuration loader if present", async () => {
            let _config = new Configuration("mock_configuration");
            let _pm = new MockPropertyManager();
            let _rm = new MockResourceManager();
            _pm.mockProperty("mock_process-1-roles", "[\"role-1\", \"role-2\", \"role-3\"]");
            _pm.mockProperty("mock_resources", "[{\"id\": \"mock-resource-1\", \"authority\": \"authority1\", \"tenant\":  \"tenant1\", \"secret\": \"secret1\"},{\"id\": \"mock-resource-2\", \"authority\": \"authority2\", \"tenant\":  \"tenant2\", \"secret\": \"secret2\"}]");
            _pm.mockProperty("mock_permission", "{\"action\": \"mock-process-3\", \"roles\": [\"role-7\", \"role-8\", \"role-9\"], \"match\": {\"type\": \"MatchNone\"}}");
            _pm.mockProperty("mock_permission_expand", "[{\"action\": \"mock-process-4\", \"roles\": [\"role-10\", \"role-11\", \"role-12\"], \"match\": {\"type\": \"MatchAny\"}}, {\"action\": \"mock-process-5\", \"roles\": [\"role-13\", \"role-14\", \"role-15\"], \"match\": {\"type\": \"MatchAny\"}}]");
            _pm.mockProperty("mock_property", fs.readFileSync("./test/config-good-all.json", "utf8"));
            _config.setValue(Configuration.CONFIG_PROPERTY, _pm);
            _config.setValue(Configuration.CONFIG_RESOURCE, _rm);
            await _config.initialize(_azcontext);
            assert.strictEqual(_config.properties, _pm);
            assert.strictEqual(_config.resources, _rm);
            assert.strictEqual(_config.loaded, false, "Should not be loaded yet.");
            assert.strictEqual(_pm.initialized, true, "PropertyManager Initialized.");
            assert.strictEqual(_pm.readied, true, "PropertyManager Readied.");
            assert.strictEqual(_rm.initialized, true, "AuthorizationManager Initialized.");
            assert.strictEqual(_rm.readied, true, "AuthorizationManager Readied.");
        });
    });
    describe("#load(pm, config), resource config", () => {
        let _loader = new Configuration("ConfigurationTest", "mock_property");
        let _pm = new MockPropertyManager();
        _pm.mockProperty("mock_resources", "[{\"id\": \"mock-resource-1\", \"authority\": \"authority1\", \"tenant\":  \"tenant1\", \"secret\": \"secret1\"},{\"id\": \"mock-resource-2\", \"authority\": \"authority2\", \"tenant\":  \"tenant2\", \"secret\": \"secret2\"}]");
        _pm.mockProperty("mock_property", fs.readFileSync("./test/config-good-resources.json", "utf8"));
        let _azcontext = new MockAzureFunctionContext();
        it("Sets resource authorizations", async () => {
            _loader.setValue("celastrinajs.core.permission", new PermissionManager());
            _loader.setValue("celastrinajs.core.resource", new ResourceManager());
            _loader.setValue("celastrinajs.core.property.manager", _pm);
            await assert.doesNotReject(_loader.initialize(_azcontext));
            assert.notStrictEqual(_loader.getValue(Configuration.CONFIG_RESOURCE), null, "ResourceManager null.");
            /**@type{ResourceManager}*/let _resources = _loader.getValue(Configuration.CONFIG_RESOURCE);
            let _rm1 = new AppRegistrationResource("mock-resource-1", "authority1", "tenant1", "secret1");
            let _rm2 = new AppRegistrationResource("mock-resource-2", "authority2", "tenant2", "secret2");
            assert.deepStrictEqual(_resources._resources["mock-resource-1"], _rm1, "mock-resource-1 set.");
            assert.deepStrictEqual(_resources._resources["mock-resource-2"], _rm2, "mock-resource-2 set.");
            assert.deepStrictEqual(await _resources.getResource("mock-resource-1"), _rm1, "mock-resource-1 via getResource.");
            assert.deepStrictEqual(await _resources.getResource("mock-resource-2"), _rm2, "mock-resource-2 via getResource.");
        });
    });
    describe("#load(pm, config), full config", () => {
        let _pm = new MockPropertyManager();
        _pm.mockProperty("mock_process-1-roles", "[\"role-1\", \"role-2\", \"role-3\"]");
        _pm.mockProperty("mock_resources", "[{\"id\": \"mock-resource-1\", \"authority\": \"authority1\", \"tenant\":  \"tenant1\", \"secret\": \"secret1\"},{\"id\": \"mock-resource-2\", \"authority\": \"authority2\", \"tenant\":  \"tenant2\", \"secret\": \"secret2\"}]");
        _pm.mockProperty("mock_permission", "{\"action\": \"mock-process-3\", \"roles\": [\"role-7\", \"role-8\", \"role-9\"], \"match\": {\"type\": \"MatchNone\"}}");
        _pm.mockProperty("mock_permission_expand", "[{\"action\": \"mock-process-4\", \"roles\": [\"role-10\", \"role-11\", \"role-12\"], \"match\": {\"type\": \"MatchAny\"}}, {\"action\": \"mock-process-5\", \"roles\": [\"role-13\", \"role-14\", \"role-15\"], \"match\": {\"type\": \"MatchAny\"}}]");
        _pm.mockProperty("mock_property", fs.readFileSync("./test/config-good-all.json", "utf8"));
        let _azcontext = new MockAzureFunctionContext();
        it("Sets permissions", async () => {
            let _loader = new Configuration("ConfigurationTest", "mock_property");
            _loader.setValue("celastrinajs.core.permission", new PermissionManager());
            _loader.setValue("celastrinajs.core.resource", new ResourceManager());
            _loader.setValue("celastrinajs.core.property.manager", _pm);
            await assert.doesNotReject(_loader.initialize(_azcontext));
            assert.notStrictEqual(_loader.getValue(Configuration.CONFIG_PERMISSION), null, "PermissionManager null.");
            /**@type{PermissionManager}*/let _permissions = _loader.getValue(Configuration.CONFIG_PERMISSION);
            let _pm1 = new Permission("mock-process-1", ["role-1", "role-2", "role-3"], new MatchAny());
            let _pm2 = new Permission("mock-process-2", ["role-4", "role-5", "role-6"], new MatchAll());
            let _pm3 = new Permission("mock-process-3", ["role-7", "role-8", "role-9"], new MatchNone());
            assert.deepStrictEqual(_permissions._permissions["mock-process-1"], _pm1, "mock-process-1 correct.");
            assert.deepStrictEqual(_permissions._permissions["mock-process-2"], _pm2, "mock-process-2 correct.");
            assert.deepStrictEqual(_permissions._permissions["mock-process-3"], _pm3, "mock-process-3 correct.");
            assert.deepStrictEqual(await _permissions.getPermission("mock-process-1"), _pm1, "mock-process-1 correct via getPermission.");
            assert.deepStrictEqual(await _permissions.getPermission("mock-process-2"), _pm2, "mock-process-2 correct via getPermission.");
            assert.deepStrictEqual(await _permissions.getPermission("mock-process-3"), _pm3, "mock-process-3 correct via getPermission.");
        });
        it("Sets resource authorizations", async () => {
            let _loader = new Configuration("ConfigurationTest", "mock_property");
            _loader.setValue("celastrinajs.core.permission", new PermissionManager());
            _loader.setValue("celastrinajs.core.resource", new ResourceManager());
            _loader.setValue("celastrinajs.core.property.manager", _pm);
            await assert.doesNotReject(_loader.initialize(_azcontext));
            assert.notStrictEqual(_loader.getValue(Configuration.CONFIG_RESOURCE), null, "ResourceManager null.");
            /**@type{ResourceManager}*/let _resources = _loader.getValue(Configuration.CONFIG_RESOURCE);
            let _rm1 = new AppRegistrationResource("mock-resource-1", "authority1", "tenant1", "secret1");
            let _rm2 = new AppRegistrationResource("mock-resource-2", "authority2", "tenant2", "secret2");
            assert.deepStrictEqual(_resources._resources["mock-resource-1"], _rm1, "mock-resource-1 set.");
            assert.deepStrictEqual(_resources._resources["mock-resource-2"], _rm2, "mock-resource-2 set.");
            assert.deepStrictEqual(await _resources.getResource("mock-resource-1"), _rm1, "mock-resource-1 via getResource.");
            assert.deepStrictEqual(await _resources.getResource("mock-resource-2"), _rm2, "mock-resource-2 via getResource.");
        });
        it("Should do nothing when property is null.", async () => {
            let _loader = new Configuration("ConfigurationTest");
            _loader.setValue("celastrinajs.core.permission", new PermissionManager());
            _loader.setValue("celastrinajs.core.resource", new ResourceManager());
            _loader.setValue("celastrinajs.core.property.manager", _pm);
            await assert.doesNotReject(_loader.initialize(_azcontext));
            assert.notStrictEqual(_loader.getValue(Configuration.CONFIG_PERMISSION), null, "PermissionManager null.");
            /**@type{PermissionManager}*/let _permissions = _loader.getValue(Configuration.CONFIG_PERMISSION);
            assert.deepStrictEqual(_permissions._permissions, {}, "mock-process-1 correct.");
        });
    });
});
