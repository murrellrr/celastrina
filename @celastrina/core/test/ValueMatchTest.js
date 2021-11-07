const {CelastrinaError, ValueMatch, MatchAll, MatchAny, MatchNone} = require("../Core");
const assert = require("assert");

describe("ValueMatch", () => {
    describe("constructor(type = \"ValueMatch\")", () => {
        it("Sets type if specified", () => {
            let _vm = new ValueMatch("TestMatch");
            assert.strictEqual(_vm.type, "TestMatch");
        });
        it("defaults to 'ValueMatch'", () => {
            let _vm = new ValueMatch();
            assert.strictEqual(_vm.type, "ValueMatch");
        });
    });
    describe("isMatch(assertion, values)", () => {
        it("Throws Not Implemented exception", () => {
            let _vm = new ValueMatch();
            let _err = new CelastrinaError("Not Implemented.", 501);
            assert.rejects(async () => {await _vm.isMatch(new Set([""]), new Set([""]));}, _err);
        });
    });
    describe("MatchAll", () => {
        let _vm = new MatchAll();
        describe("#get type()", () => {
            it("Has type 'MatchAll'", () => {
                assert.strictEqual(_vm.type, "MatchAll");
            });
        });
        describe("#isMatch(assertions, roles)", () => {
            it("Matches when all assertion are not found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role1" , "role2"]), new Set(["role1" , "role2"])), true);
            });
            it("Does not match when at least one assertion is not found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role1" , "role3"]), new Set(["role1" , "role2"])), false);
            });
            it("Does not match when all assertion are not found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role3" , "role4"]), new Set(["role1" , "role2"])), false);
            });
        });
    });
    describe("MatchAny", () => {
        let _vm = new MatchAny();
        describe("#get type()", () => {
            it("Has type 'MatchAny'", () => {
                assert.strictEqual(_vm.type, "MatchAny");
            });
        });
        describe("#isMatch(assertions, roles)", () => {
            it("Matches when any assertion is found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role2", "role3"]), new Set(["role1", "role2"])), true);
            });
            it("Does not match when no assertion is found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role3", "role4"]), new Set(["role1", "role2"])), false);
            });
        });
    });
    describe("MatchNone", () => {
        let _vm = new MatchNone();
        describe("#get type()", () => {
            it("Has type 'MatchNone'", () => {
                assert.strictEqual(_vm.type, "MatchNone");
            });
        });
        describe("#isMatch(assertions, roles)", () => {
            it("Matches when all assertion are not found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role3", "role4"]), new Set(["role1", "role2"])), true);
            });
            it("Does not match when at least one assertion is found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role1", "role3"]), new Set(["role1", "role2"])), false);
            });
            it("Does not match when all assertion are found in values", async () => {
                assert.strictEqual(await _vm.isMatch(new Set(["role1", "role2"]), new Set(["role1", "role2"])), false);
            });
        });
    });
});
