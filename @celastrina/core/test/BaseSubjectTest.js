const {CelastrinaError, BaseSubject} = require("../Core");
const assert = require("assert");


describe("BaseSubject", () => {
    describe("#constructor(id, roles = [])", () => {
        it("must set ID", () => {
            let _subject = new BaseSubject("1234567890");
            assert.strictEqual(_subject.id, "1234567890");
        });
        it("must set roles", () => {
            let _subject = new BaseSubject("1234567890", ["role1"]);
            assert.strictEqual(_subject._roles.includes("role1"), true);
        });
        it("must set roles empty if not passed", () => {
            let _subject = new BaseSubject("1234567890");
            assert.strictEqual(Array.isArray(_subject._roles), true, "Set an empty array.");
            assert.strictEqual(_subject._roles.length, 0, "Array length 0.");
        });
    });
    describe("roles", () => {
        describe("#get roles()", () => {
            it("return roles set in constructor", ()=> {
                let _subject = new BaseSubject("1234567890", ["role1"]);
                let _roles = _subject.roles;
                assert.strictEqual(_roles.includes("role1"), true);
            });
        });
        describe("#set roles(roles)", () => {
            it("return roles set in setter", () => {
                let _subject = new BaseSubject("1234567890");
                let __roles = ["role3"];
                _subject.roles = __roles;
                let _roles = _subject.roles;
                assert.strictEqual(_roles.includes("role3"), true);
                assert.strictEqual(_roles.length, 1);
                assert.strictEqual(_roles, __roles);
            });
        });
        describe("#addRole(role)", () => {
            let _subject = new BaseSubject("1234567890");
            it("should return _subject to chain role methods", () => {
                assert.strictEqual(_subject.addRole("role1"), _subject);
            });
            it("should add role", () => {
                _subject.addRole("role2");
                assert.strictEqual(_subject._roles.includes("role2"), true);
            });
        });
        describe("#addRoles(role)", () => {
            let _subject = new BaseSubject("1234567890");
            it("should return _subject to chain role methods", () => {
                assert.strictEqual(_subject.addRoles(["role1", "role2"]), _subject);
            });
            it("should add role", () => {
                _subject.addRoles(["role3", "role4"]);
                assert.strictEqual(_subject._roles.includes("role1"), true);
                assert.strictEqual(_subject._roles.includes("role2"), true);
                assert.strictEqual(_subject._roles.includes("role3"), true);
                assert.strictEqual(_subject._roles.includes("role4"), true);
            });
        });
        describe("#isInRole(role)", async () => {
            let _subject = new BaseSubject("1234567890", ["role2"]);
            assert.strictEqual(await _subject.isInRole("role2"), true);
        });
    });
});
