const {CelastrinaError, ResourceAuthorization, ManagedIdentityResource, ResourceManager, Configuration} = require("../Core");
const assert = require("assert");
const moment = require("moment");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");

describe("ResourceManager", () => {
    describe("#constructor()", () => {
        it("sets defaults", () => {
            let _rm = new ResourceManager();
            assert.deepStrictEqual(_rm._resources, {}, "Expected empty object.");
            assert.strictEqual(_rm.__type, "celastrinajs.core.ResourceManager", "Expected empty object.");
            assert.strictEqual(_rm.__type, ResourceManager.CELASTRINAJS_TYPE, "Expected empty object.");
        });
    });
    describe("resources", () => {
        describe("#addResource(auth)", () => {
            it("adds resource authorization", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                assert.deepStrictEqual(await _rm.addResource(_auth), _rm, "Expected to chain ResourceManager");
                assert.deepStrictEqual(_rm._resources[ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY], _auth, "Expected to chain ResourceManager");
            });
        });
        describe("#getResource(id)", () => {
            it("gets resource authorization, no id", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getResource(), _auth, "Expected ManagedIdentityResource _auth.");
            });
            it("gets resource authorization, by id", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getResource(ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY), _auth, "Expected ManagedIdentityResource _auth.");
            });
            it("returns null if not found", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getResource("foozled"), null, "Expected null.");
            });
        });
        describe("#getToken(resource, id)", () => {
            it("it gets token", async () => {
                let _rm = new ResourceManager();
                let _auth = new ManagedIdentityResource();
                let exp = moment();
                exp.add(30, "minutes");
                _auth._tokens["mock_resource"] = {expires: exp, token: "test_token"}
                await _rm.addResource(_auth);
                assert.deepStrictEqual(await _rm.getToken("mock_resource"), "test_token", "Expected 'test_token'.");
            });
        });
        describe("#ready(azcontext, config)", () => {
            it("defaults the ManagedIdentityResource", async () => {
                process.env["IDENTITY_ENDPOINT"] = "test_end_point";
                let _azcontext = new MockAzureFunctionContext();
                let _config = new Configuration("ResourceManagerTest");
                await _config.initialize(_azcontext);
                await _config.ready();
                let _rm = new ResourceManager();
                await _rm.ready(_azcontext, _config);
                let _auth = await _rm.getResource(ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY);
                assert.strictEqual(_auth != null, true, "Expected not null.");
            });
            it("does not default with no 'IDENTITY_ENDPOINT'", async () => {
                delete process.env["IDENTITY_ENDPOINT"];
                let _azcontext = new MockAzureFunctionContext();
                let _config = new Configuration("ResourceManagerTest");
                await _config.initialize(_azcontext);
                await _config.ready();
                let _rm = new ResourceManager();
                await _rm.ready(_azcontext, _config);
                let _auth = await _rm.getResource(ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY);
                assert.strictEqual(_auth == null, true, "Expected null.");
            });
        });
    });
});
