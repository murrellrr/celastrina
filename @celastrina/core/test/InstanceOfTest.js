const {instanceOfCelastringType} = require("../Core");
const assert = require("assert");

class MockTypeA {
    static get celastrinaType() {return "MockTypeA";}
    constructor() {}
}
class MockTypeB {
    static get celastrinaType() {return "MockTypeB";}
    constructor() {}
}
class MockTypeC {
    constructor() {}
}

describe("instanceOfCelastringType", () => {
    describe("works correctly!", () => {
        it("should fail type null", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(null, _test), false, "Expected false.");
        });
        it("should fail source null", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(MockTypeA, null), false, "Expected false.");
        });
        it("should fail source not an object, numeric", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(MockTypeA, 100), false, "Expected false.");
        });
        it("should fail source not an object, string", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(MockTypeA, "100"), false, "Expected false.");
        });
        it("should fail non-celatrina type", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(MockTypeA, new MockTypeC()), false, "Expected false.");
        });
        it("should fail celatrina type different", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(MockTypeA, new MockTypeB()), false, "Expected false.");
        });
        it("should pass celatrina type same", () => {
            let _test = new MockTypeA();
            assert.strictEqual(instanceOfCelastringType(MockTypeA, new MockTypeA()), true, "Expected true.");
        });
    });
});
