const {CelastrinaError, Subject} = require("../Core");
const assert = require("assert");


describe("Subject", () => {
    describe("#constructor(id, roles = [])", () => {
        it("must set ID", () => {
            let _subject = new Subject("1234567890");
            assert.strictEqual(_subject.id, "1234567890");
        });
        it("must set roles", () => {
            let _subject = new Subject("1234567890", ["role1"]);
            assert.strictEqual(_subject._roles.has("role1"), true);
        });
        it("must set roles empty if not passed", () => {
            let _subject = new Subject("1234567890");
            assert.strictEqual(_subject._roles instanceof Set, true, "Set an empty array.");
            assert.strictEqual(_subject._roles.size, 0, "Array length 0.");
        });
    });
    describe("roles", () => {
        describe("#get roles()", () => {
            it("return roles set in constructor", ()=> {
                let _subject = new Subject("1234567890", ["role1"]);
                let _roles = _subject._roles;
                assert.strictEqual(_roles.has("role1"), true);
            });
        });
        describe("#set roles(roles)", () => {
            it("return roles set in setter", () => {
                let _subject = new Subject("1234567890");
                let __roles = new Set(["role3"]);
                _subject._roles = __roles;
                /**@type{Set}*/let _roles = _subject._roles;
                assert.strictEqual(_roles.has("role3"), true);
                assert.strictEqual(_roles.size, 1);
                assert.strictEqual(_roles, __roles);
            });
        });
        describe("#addRole(role)", () => {
            let _subject = new Subject("1234567890");
            it("should return _subject to chain role methods", () => {
                assert.strictEqual(_subject.addRole("role1"), _subject);
            });
            it("should add role", () => {
                _subject.addRole("role2");
                assert.strictEqual(_subject._roles.has("role2"), true);
            });
        });
        describe("#addRoles(role)", () => {
            let _subject = new Subject("1234567890");
            it("should return _subject to chain role methods", () => {
                assert.strictEqual(_subject.addRoles(["role1", "role2"]), _subject);
            });
            it("should add role", () => {
                _subject.addRoles(["role3", "role4"]);
                assert.strictEqual(_subject._roles.has("role1"), true);
                assert.strictEqual(_subject._roles.has("role2"), true);
                assert.strictEqual(_subject._roles.has("role3"), true);
                assert.strictEqual(_subject._roles.has("role4"), true);
            });
            it("should not have duplicate role", () => {
                _subject.addRoles(["role3", "role4"]);
                assert.strictEqual(_subject._roles.has("role1"), true);
                assert.strictEqual(_subject._roles.has("role2"), true);
                assert.strictEqual(_subject._roles.has("role3"), true);
                assert.strictEqual(_subject._roles.has("role4"), true);
            });
        });
        describe("#isInRole(role)", async () => {
            let _subject = new Subject("1234567890", ["role2"]);
            assert.strictEqual(await _subject.isInRole("role2"), true);
        });
    });
    describe("claims", () => {
        describe("#addClaim(claim)", () => {
            let _subject = new Subject("1234567890");
            it("should add a claim", () => {
                _subject.addClaim("claim2", "value2");
                assert.strictEqual(_subject._claims.hasOwnProperty("claim2"), true);
                assert.strictEqual(_subject._claims["claim2"], "value2");
            });
            it("should add a claims", () => {
                let _object = {claim9: "value9", claim10: "value10"};
                _subject.addClaims(_object);
                assert.strictEqual(_subject._claims.hasOwnProperty("claim9"), true);
                assert.strictEqual(_subject._claims.hasOwnProperty("claim10"), true);
                assert.strictEqual(_subject._claims["claim9"], "value9");
                assert.strictEqual(_subject._claims["claim10"], "value10");
            });
            it("should have claim", async () => {
                assert.strictEqual(await _subject.hasClaim("claim2"), true);
            });
            it("should get claim", async () => {
                assert.strictEqual(await _subject.getClaim("claim2"), "value2");
            });
            it("should get defult claim", async () => {
                assert.strictEqual(await _subject.getClaim("claim3", "value4"), "value4");
            });
            it("should get null claim", async () => {
                assert.strictEqual(await _subject.getClaim("claim3"), null);
            });
            it("should get requested claims", async () => {
                let _claims = {claim2: null, claim9: null, claim10: null, claim11: null};
                await _subject.getClaims(_claims);
                assert.strictEqual(_claims["claim2"], "value2");
                assert.strictEqual(_claims["claim9"], "value9");
                assert.strictEqual(_claims["claim10"], "value10");
                assert.strictEqual(_claims["claim11"], null);
            });
        });
    });
});
