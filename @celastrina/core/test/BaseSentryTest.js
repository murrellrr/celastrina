const {CelastrinaError, LOG_LEVEL, Configuration, BaseSubject, BaseSentry, BaseContext,
       RoleResolver, Permission, MatchNone} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockRoleResolver extends RoleResolver {
    constructor() {
        super();
        this.initialized = false;
    }
    async getSubjectRoles(context, subject) {
        return ["role1", "role2"];
    }
    async initialize(config) {
        this.initialized = true;
        return super.initialize(config);
    }
}

describe("BaseSentry", () => {
    describe("#constructor()", () => {
        it("Should construct with defaults without error", () => {
            let _sentry = new BaseSentry();
            assert.strictEqual(_sentry._optimistic, false, "Optimistic false.");
            assert.strictEqual(_sentry._permissions, null, "Permissions null.");
            assert.strictEqual(_sentry._roleResolver, null, "RoleResolver null.");
        });
    });
    describe("#initialize(config)", () => {
        let _sentry = new BaseSentry();
        let _resolver = new MockRoleResolver();
        let _config = new Configuration("mock_configuration");
        _config.setValue(Configuration.CONFIG_AUTHORIATION_ROLE_RESOLVER, _resolver);
        _config.setAuthorizationOptimistic(true);
        it("Should initialize and initialize role resolver.", async () => {
            await _sentry.initialize(_config);
            assert.strictEqual(_sentry._optimistic, true, "Optimistic true.");
            assert.strictEqual(_resolver.initialized, true, "Initialized RoleResolver.");
        });
    });
    describe("#createSubject(context)", () => {
        let _sentry = new BaseSentry();
        let _resolver = new MockRoleResolver();
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        _config.setValue(Configuration.CONFIG_AUTHORIATION_ROLE_RESOLVER, _resolver);
        it("Should create a BaseSubject", async () => {
            let _subject = await _sentry.createSubject(_context);
            assert.strictEqual(_subject instanceof BaseSubject, true, "Instanceof BaseSubject.");
            assert.strictEqual(_subject.id, _context.requestId, "Has request ID as subject ID.");
        });
    });
    describe("#authenticate(context)", () => {
        let _sentry = new BaseSentry();
        let _resolver = new MockRoleResolver();
        let _config = new Configuration("mock_configuration");
        let _azcontext = new MockAzureFunctionContext();
        let _context = new BaseContext(_azcontext, _config);
        _config.setValue(Configuration.CONFIG_AUTHORIATION_ROLE_RESOLVER, _resolver);
        it("Should create a BaseSubject, always authenticating (BaseSentry behavior), and set roles.", async () => {
            await _sentry.initialize(_config);
            let _subject = await _sentry.authenticate(_context);
            assert.strictEqual(_subject instanceof BaseSubject, true, "Instanceof BaseSubject.");
            assert.strictEqual(_subject.id, _context.requestId, "Has request ID as subject ID.");
            assert.strictEqual(_subject._roles.includes("role1"), true, "Is in role1.");
            assert.strictEqual(_subject._roles.includes("role2"), true, "Is in role2.");
        });
    });
    describe("#authorize(context, subject)", async () => {
        describe("Pessimistic", () => {
            it("Should throw error as not optimistic and no permissions are set.", async () => {
                let _sentry = new BaseSentry();
                let _resolver = new MockRoleResolver();
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                let _context = new BaseContext(_azcontext, _config);
                _config.setValue(Configuration.CONFIG_AUTHORIATION_ROLE_RESOLVER, _resolver);
                await _sentry.initialize(_config);
                let _subject = await _sentry.authenticate(_context);
                let _err = new CelastrinaError("Forbidden.", 403);
                await assert.rejects(_sentry.authorize(_context, _subject), _err);
            });
        });
        describe("Optimistic", () => {
            it("Should authenticate.", async () => {
                let _sentry = new BaseSentry();
                let _resolver = new MockRoleResolver();
                let _config = new Configuration("mock_configuration");
                _config.setAuthorizationOptimistic(true);
                let _azcontext = new MockAzureFunctionContext();
                let _context = new BaseContext(_azcontext, _config);
                _config.setValue(Configuration.CONFIG_AUTHORIATION_ROLE_RESOLVER, _resolver);
                await _sentry.initialize(_config);
                let _subject = await _sentry.authenticate(_context);
                await assert.doesNotReject(_sentry.authorize(_context, _subject));
            });
            it("Should not authenticate", async () => {
                let _sentry = new BaseSentry();
                let _resolver = new MockRoleResolver();
                let _config = new Configuration("mock_configuration");
                _config.setAuthorizationOptimistic(true);
                let _azcontext = new MockAzureFunctionContext();
                let _context = new BaseContext(_azcontext, _config);
                let _perm = new Permission("process", ["role1", "role2"], new MatchNone());
                _config.setValue(Configuration.CONFIG_AUTHORIATION_ROLE_RESOLVER, _resolver);
                _config.addPermission(_perm);
                await _sentry.initialize(_config);
                let _subject = await _sentry.authenticate(_context);
                let _err = new CelastrinaError("Forbidden.", 403);
                await assert.rejects(_sentry.authorize(_context, _subject), _err);
            });
        });
    });

});
