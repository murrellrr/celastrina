/*
 * Copyright (c) 2020, Robert R Murrell.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const {CelastrinaError, LOG_LEVEL, Configuration, Subject, Sentry, Context, RoleFactory, Permission,
       MatchNone} = require("../Core");
const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const assert = require("assert");

class MockRoleFactory extends RoleFactory {
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

describe("Sentry", () => {
    describe("#constructor()", () => {
        it("Should construct with defaults without error", () => {
            let _sentry = new Sentry();
            assert.strictEqual(_sentry._authenticator, null, "Expected null Authenticaror");
            assert.strictEqual(_sentry._authorizor != null, true, "Expected authorizer.");
        });
    });
    describe("#initialize(config)", () => {
        it("Should initialize and initialize role resolver.", async () => {
            let _resolver = new MockRoleFactory();
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            _config.setValue(Configuration.CONFIG_ROLE_FACTORY, _resolver);
            _config.setAuthorizationOptimistic(true);
            await _config.initialize(_azcontext);
            await _config.ready();
            assert.strictEqual(_resolver.initialized, true, "Initialized RoleResolver.");
        });
    });
    describe("#authenticate(context)", () => {
        it("Should create a Subject, always authenticating (Sentry behavior), and set roles.", async () => {
            let _resolver = new MockRoleFactory();
            let _config = new Configuration("mock_configuration");
            let _azcontext = new MockAzureFunctionContext();
            _config.setAuthorizationOptimistic(true);
            _config.setValue(Configuration.CONFIG_ROLE_FACTORY, _resolver);
            await _config.initialize(_azcontext);
            await _config.ready();
            let _context = new Context(_config);
            let _subject = await _config.sentry.authenticate(_context);
            assert.strictEqual(_subject instanceof Subject, true, "Instanceof BaseSubject.");
            assert.strictEqual(_subject.id, _context.requestId, "Has request ID as subject ID.");
            assert.strictEqual(_subject._roles.has("role1"), true, "Is in role1.");
            assert.strictEqual(_subject._roles.has("role2"), true, "Is in role2.");
        });
    });
    describe("#authorize(context, subject)", () => {
        describe("Pessimistic", () => {
            it("Should throw authorization error as not optimistic and no permissions are set.", async () => {
                let _resolver = new MockRoleFactory();
                let _config = new Configuration("mock_configuration");
                let _azcontext = new MockAzureFunctionContext();
                let _context = new Context(_config);
                let _perm = new Permission("process", ["role1", "role2"], new MatchNone());
                _config.setValue(Configuration.CONFIG_ROLE_FACTORY, _resolver);
                _config.permissions.addPermission(_perm);
                await _config.initialize(_azcontext);
                await _config.ready();
                _config.sentry._optimistic = true;
                let _subject = await _config.sentry.authenticate(_context);
                _config.sentry._optimistic = false;
                let _err = new CelastrinaError("Forbidden.", 403);
                await assert.rejects(_config.sentry.authorize(_context), _err);
            });
        });
        describe("Optimistic", () => {
            it("Should authenticate", async () => {
                let _resolver = new MockRoleFactory();
                let _config = new Configuration("mock_configuration");
                _config.setAuthorizationOptimistic(true);
                let _azcontext = new MockAzureFunctionContext();
                let _context = new Context(_config);
                _config.setValue(Configuration.CONFIG_ROLE_FACTORY, _resolver);
                await _config.initialize(_azcontext);
                await _config.ready();
                let _subject = await _config.sentry.authenticate(_context);
                await assert.doesNotReject(_config.sentry.authorize(_context));
            });
            it("should authorize", async () => {
                let _resolver = new MockRoleFactory();
                let _config = new Configuration("mock_configuration");
                _config.setAuthorizationOptimistic(true);
                let _azcontext = new MockAzureFunctionContext();
                let _context = new Context(_config);
                let _perm = new Permission("process", ["role1", "role2"], new MatchNone());
                _config.setValue(Configuration.CONFIG_ROLE_FACTORY, _resolver);
                _config.permissions.addPermission(_perm);
                await _config.initialize(_azcontext);
                await _config.ready();
                let _subject = await _config.sentry.authenticate(_context);
                await assert.doesNotReject(_config.sentry.authorize(_context));
            });
        });
    });
});
