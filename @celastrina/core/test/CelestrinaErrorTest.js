const {CelastrinaError} = require("../Core");
const assert = require("assert");

describe("CelastrinaError", () => {
    describe("#constructor(message, code, drop, cause)", () => {
        let error = new CelastrinaError("test", 999, true, new Error("TestError"));
        it("should set message.", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
    });
    describe("#constructor(message)", () => {
        let error = new CelastrinaError("test");
        it("should set message.", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code to 500.", () => {
            assert.strictEqual(error.code, 500);
        });
        it("should set drop flag to false.", () => {
            assert.strictEqual(error.drop, false);
        });
        it("should set cause object to null.", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("#toString(): display only code, drop, message.", () => {
        let error = new CelastrinaError("test");
        it("should be '[500][false]: test'", () => {
            assert.strictEqual(error.toString(), "[500][false]: test");
        });
    });
    describe("#toString(): code, drop, message and Error cause.", () => {
        let error = new CelastrinaError("test", 999, true, new Error("TestError"));
        it("should be '[999][true]: test Caused by Error: TestError'", () => {
            assert.strictEqual(error.toString(), "[999][true]: test Caused by Error: TestError");
        });
    });
    describe("#toString(): code, drop, message and CelastrinaError cause.", () => {
        let error = new CelastrinaError("test", 999, true, new CelastrinaError("TestError"));
        it("should be '[999][true]: test Caused by [500][false]: TestError'", () => {
            assert.strictEqual(error.toString(), "[999][true]: test Caused by [500][false]: TestError");
        });
    });
    describe("CelastrinaError#newError(message, code, drop, cause)", () => {
        let error = CelastrinaError.newError("test", 999, true, new Error("TestError"));
        it("should set message.", () => {
            assert.strictEqual(error.message, "test");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error null.", () => {
        let error = CelastrinaError.wrapError(null, 999, true);
        it("should set message.", () => {
            assert.strictEqual(error.message, "Unhandled Exception.");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error 'undefined'.", () => {
        let test = {};
        let error = CelastrinaError.wrapError(test.undefined, 999, true);
        it("should set message.", () => {
            assert.strictEqual(error.message, "Unhandled Exception.");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error string.", () => {
        let error = CelastrinaError.wrapError("test string", 999, true);
        it("should set message.", () => {
            assert.strictEqual(error.message, "test string");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error number.", () => {
        let error = CelastrinaError.wrapError(10, 999, true);
        it("should set message.", () => {
            assert.strictEqual(error.message, "10");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error boolean.", () => {
        let error = CelastrinaError.wrapError(false, 999, true);
        it("should set message.", () => {
            assert.strictEqual(error.message, "false");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.strictEqual(error.cause, null);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error type.", () => {
        let error = CelastrinaError.wrapError(new Error("TestError"), 999, true);
        it("should set message.", () => {
            assert.strictEqual(error.message, "TestError");
        });
        it("should set code.", () => {
            assert.strictEqual(error.code, 999);
        });
        it("should set drop flag.", () => {
            assert.strictEqual(error.drop, true);
        });
        it("should set cause object.", () => {
            assert.notStrictEqual(error.cause, null);
            assert.strictEqual(error.cause.message, "TestError");
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error Celastrina.", () => {
        let e1 = new CelastrinaError("test", 999, true, new Error("TestError"));
        let e2 = CelastrinaError.wrapError(e1);
        it("should set same object.", () => {
            assert.strictEqual(e1, e2);
        });
    });
    describe("CelastrinaError#wrapError(error, code, drop): Error Celastrina, different params", () => {
        let e1 = new CelastrinaError("test", 999, true, new Error("TestError"));
        let e2 = CelastrinaError.wrapError(e1, 100, false);
        it("should set same object.", () => {
            assert.strictEqual(e1, e2);
        });
    });
});
