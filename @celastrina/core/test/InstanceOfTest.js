const {instanceOfCelastringType} = require("../Core");
const assert = require("assert");

describe("instanceOfCelastringType", () => {
    describe("works correctly!", () => {
        it("should evaluate type equality correctly", () => {
            let _test = {__type: "mock.type"};
            assert.strictEqual(instanceOfCelastringType("mock.type", _test), true, "Expected true.");
        });
        it("should fail string null", () => {
            let _test = {__type: "mock.type"};
            assert.strictEqual(instanceOfCelastringType(null, _test), false, "Expected false.");
        });
        it("should fail string empty", () => {
            let _test = {__type: "mock.type"};
            assert.strictEqual(instanceOfCelastringType("", _test), false, "Expected false.");
        });
        it("should fail string not equal", () => {
            let _test = {__type: "mock.type"};
            assert.strictEqual(instanceOfCelastringType("mock.type.new", _test), false, "Expected false.");
        });
        it("should fail object null", () => {
            let _test = {__type: "mock.type"};
            assert.strictEqual(instanceOfCelastringType("mock.type", null), false, "Expected false.");
        });
        it("should fail object undefined", () => {
            let _test = {__type: "mock.type"};
            let _newobj = _test.doesNotExist;
            assert.strictEqual(instanceOfCelastringType("mock.type", _newobj), false, "Expected false.");
        });
        it("should fail object no '__type' attribute", () => {
            let _test = {name: "mock.type"};
            assert.strictEqual(instanceOfCelastringType("mock.type", _test), false, "Expected false.");
        });
        it("should fail object null '__type' attribute", () => {
            let _test = {__type: null};
            assert.strictEqual(instanceOfCelastringType("mock.type", _test), false, "Expected false.");
        });
        it("should fail object '__type' attribute not a string", () => {
            let _test = {__type: {}};
            assert.strictEqual(instanceOfCelastringType("mock.type", _test), false, "Expected false.");
        });
    });
});
