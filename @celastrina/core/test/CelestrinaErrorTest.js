const {CelastrinaError, CelastrinaValidationError} = require("../Core");
const assert = require("assert");

describe("CelastrinaError", () => {
    describe("#constructor(message, code, drop, cause)", () => {
        let error = new CelastrinaError("test", 999, true, new Error("TestError"));
        it("should set message", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
        it("Instanceof Error", () => {
            assert.strictEqual(error instanceof Error, true,"Instance of Error");
        });
        it("Instanceof CelastrinaError", () => {
            assert.strictEqual(error instanceof CelastrinaError, true,"Instance of CelastrinaError");
        });
    });
    describe("#constructor(message)", () => {
        let error = new CelastrinaError("test");
        it("should set message", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code to 500", () => {
            assert.strictEqual(error.code, 500);
        });
        it("should set drop flag to false", () => {
            assert.strictEqual(error.drop, false);
        });
        it("should set cause object to null", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("#toString(): display only code, drop, message.", () => {
        let error = new CelastrinaError("test");
        it("should be '[500][false]: test'", () => {
            assert.strictEqual(error.toString(), "[CelastrinaError][500][false]: test");
        });
    });
    describe("CelastrinaError#newError(message, code, drop, cause)", () => {
        let error = CelastrinaError.newError("test", 999, true, new Error("TestError"));
        it("should set message", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error null.", () => {
        let error = CelastrinaError.wrapError(null, 999, true);
        it("should set message", () => {
            assert.strictEqual(error.message, "Unhandled Exception.");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error 'undefined'.", () => {
        let test = {};
        let error = CelastrinaError.wrapError(test.undefined, 999, true);
        it("should set message", () => {
            assert.strictEqual(error.message, "Unhandled Exception.");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error string.", () => {
        let error = CelastrinaError.wrapError("test string", 999, true);
        it("should set message", () => {
            assert.strictEqual(error.message, "test string");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error number.", () => {
        let error = CelastrinaError.wrapError(10, 999, true);
        it("should set message", () => {
            assert.strictEqual(error.message, "10");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error boolean.", () => {
        let error = CelastrinaError.wrapError(false, 999, true);
        it("should set message", () => {
            assert.strictEqual(error.message, "false");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error type.", () => {
        let error = CelastrinaError.wrapError(new Error("TestError"), 999, true);
        it("should set message", () => {
            assert.strictEqual(error.message, "TestError");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error Celastrina.", () => {
        let e1 = new CelastrinaError("test", 999, true, new Error("TestError"));
        let e2 = CelastrinaError.wrapError(e1);
        it("should set same object", () => {
            assert.strictEqual(e1, e2);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error Celastrina, different params", () => {
        let e1 = new CelastrinaError("test", 999, true, new Error("TestError"));
        let e2 = CelastrinaError.wrapError(e1, 100, false);
        it("should set same object", () => {
            assert.strictEqual(e1, e2);
        });
    });
});
describe("CelastrinaValidationError", () => {
    describe("#constructor(message, code, drop, tag, cause)", () => {
        let error = new CelastrinaValidationError("test", 999, true, "sample.message", new Error("TestError"));
        let _error = CelastrinaValidationError.newValidationError("test", "sample.tag", true, 999, new Error("TestError"));
        it("should set message", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.message");
        });
        it("should set cause object", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
        it("Instanceof Error", () => {
            assert.strictEqual(error instanceof Error, true,"Instance of Error");
        });
        it("Instanceof CelastrinaError", () => {
            assert.strictEqual(error instanceof CelastrinaError, true,"Instance of CelastrinaError");
        });
        it("Instanceof CelastrinaValidationError", () => {
            assert.strictEqual(error instanceof CelastrinaValidationError, true,"Instance of CelastrinaValidationError");
        });
        it("Instanceof Error", () => {
            assert.strictEqual(_error instanceof Error, true,"Instance of Error");
        });
        it("Instanceof CelastrinaError", () => {
            assert.strictEqual(_error instanceof CelastrinaError, true,"Instance of CelastrinaError");
        });
        it("Instanceof CelastrinaValidationError", () => {
            assert.strictEqual(_error instanceof CelastrinaValidationError, true,"Instance of CelastrinaValidationError");
        });
    });
    describe("#constructor(message)", () => {
        let error = new CelastrinaValidationError("test");
        it("should set message", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code to 500", () => {
            assert.strictEqual(error.code, 400);
        });
        it("should set drop flag to false", () => {
            assert.strictEqual(error.drop, false);
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "");
        });
        it("should set cause object to null", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("#toString(): display only code, drop, message.", () => {
        let error = new CelastrinaValidationError("test");
        it("should be '[][400][false]: test'", () => {
            assert.strictEqual(error.toString(), "[CelastrinaValidationError][400][false][]: test");
        });
    });
    describe("#toString(): display only tag, code, drop, message.", () => {
        let error = new CelastrinaValidationError("test", 400, false, "sample.tag");
        it("should be '[sample.tag][400][false]: test'", () => {
            assert.strictEqual(error.toString(), "[CelastrinaValidationError][400][false][sample.tag]: test");
        });
    });
    describe("CelastrinaValidationError#newValidationError(message, tag, drop, code, cause)", () => {
        let error = CelastrinaValidationError.newValidationError("test", "sample.tag", true, 999, new Error("TestError"));
        it("should set message", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.notDeepStrictEqual(error.cause, null);
            assert.deepStrictEqual(error.cause.message, "TestError");
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, tag, drop, code): Error null.", () => {
        let error = CelastrinaValidationError.wrapValidationError(null, "sample.tag", true, 999);
        it("should set message", () => {
            assert.strictEqual(error.message, "Unhandled Exception.");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.deepStrictEqual(error.cause, null);
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, tag, drop, code): Error 'undefined'.", () => {
        let test = {};
        let error = CelastrinaValidationError.wrapValidationError(test.undefined, "sample.tag", true, 999);
        it("should set message", () => {
            assert.strictEqual(error.message, "Unhandled Exception.");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.deepStrictEqual(error.cause, null);
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, tag, drop, code): Error string.", () => {
        let error = CelastrinaValidationError.wrapValidationError("test string", "sample.tag", true, 999);
        it("should set message", () => {
            assert.strictEqual(error.message, "test string");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.deepStrictEqual(error.cause, null);
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, tag, drop, code): Error number.", () => {
        let error = CelastrinaValidationError.wrapValidationError(10, "sample.tag", true, 999);
        it("should set message", () => {
            assert.strictEqual(error.message, "10");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.deepStrictEqual(error.cause, null);
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, code, drop): Error boolean.", () => {
        let error = CelastrinaValidationError.wrapValidationError(false, "sample.tag", true, 999);
        it("should set message", () => {
            assert.strictEqual(error.message, "false");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.deepStrictEqual(error.cause, null);
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, code, drop): Error type.", () => {
        let error = CelastrinaValidationError.wrapValidationError(new Error("TestError"), "sample.tag", true, 999);
        it("should set message", () => {
            assert.strictEqual(error.message, "TestError");
        });
        it("should set tag", () => {
            assert.strictEqual(error.tag, "sample.tag");
        });
        it("should set code", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object", () => {
            assert.notDeepStrictEqual(error.cause, null);
        });
    });
    describe("CelastrinaValidationError: Error Celastrina.", () => {
        let e1 = new CelastrinaValidationError("test", 999, true, "sample.tag", new Error("TestError"));
        let e2 = CelastrinaValidationError.wrapError(e1);
        it("should set same object", () => {
            assert.strictEqual(e1, e2);
        });
    });
    describe("CelastrinaValidationError#wrapValidationError(error, code, drop): Error Celastrina, different params", () => {
        let e1 = new CelastrinaValidationError("test", 999, true, "sample.tag", new Error("TestError"));
        let e2 = CelastrinaValidationError.wrapValidationError(e1, "sample.tag", false, 999);
        it("should set same object", () => {
            assert.strictEqual(e1, e2);
        });
    });
});
