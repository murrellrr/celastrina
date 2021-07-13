const {CelastrinaError, MatchAny, MatchNone, BaseSubject, Permission} = require("../Core");
const assert = require("assert");

describe("Permission", () => {
    describe("#constructor(action, roles = [], match = new MatchAny())", () => {
        it("Sets action, and lower case.", () => {
            let _permission = new Permission("MOCK_ACTION");
            assert.strictEqual(_permission.action, "mock_action");
        });
        it("Sets roles.", () => {
            let _permission = new Permission("mock_action", ["role1"]);
            assert.strictEqual(_permission._roles.includes("role1"), true);
        });
        it("Sets ValueMatch.", () => {
            let _permission = new Permission("mock_action", ["role1"], new MatchNone());
            assert.strictEqual(_permission._match instanceof MatchNone, true);
        });
        it("Defaults ValueMatch to MatchAny.", () => {
            let _permission = new Permission("mock_action");
            assert.strictEqual(_permission._match instanceof MatchAny, true);
        });
        it("Defaults roles to empty array.", () => {
            let _permission = new Permission("mock_action");
            assert.strictEqual(_permission._roles.length, 0);
        });
    });
    describe("roles", () => {
        describe("#get roles()", () => {
            it("returns roles set in constructor.", () => {
                let _roles = ["role1, role2"];
                let _permission = new Permission("mock_action", _roles);
                assert.deepStrictEqual(_permission.roles, _roles);
            });
        });
        describe("#addRole(role)", () => {
            let _permission = new Permission("mock_action");
            it("returns Permission to allow role chaining.", () => {
                assert.strictEqual(_permission.addRole("role2") instanceof Permission, true);
            });
            it("Adds role to permission", () => {
                _permission.addRole("role1");
                assert.strictEqual(_permission._roles.includes("role1"), true);
            });
        });
        describe("#addRoles(roles)", () => {
            let _permission = new Permission("mock_action");
            it("returns Permission to allow role chaining.", () => {
                assert.strictEqual(_permission.addRoles(["role1","role2"]) instanceof Permission, true);
            });
            it("Adds role to permission", () => {
                _permission.addRoles(["role3", "role4"]);
                assert.strictEqual(_permission._roles.includes("role3"), true);
                assert.strictEqual(_permission._roles.includes("role4"), true);
            });
        });
    });
    describe("#authorize(subject)", () => {
        let _permission = new Permission("mock_action", ["role1","role2"]);
        it("Matching roles, any", async () => {
            let _subject = new BaseSubject("mock_user", ["role2","role3"]);
            assert.strictEqual(await _permission.authorize(_subject), true);
        });
        it("Matching roles, none", async () => {
            let _subject = new BaseSubject("mock_user", ["role3","role4"]);
            assert.strictEqual(await _permission.authorize(_subject), false);
        });
    });
});
