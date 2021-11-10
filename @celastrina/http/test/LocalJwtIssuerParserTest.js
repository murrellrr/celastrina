const {CelastrinaError, CelastrinaValidationError, Cryptography, BaseRoleFactory} = require("@celastrina/core");
const {LocalJwtIssuer, LocalJwtIssuerParser} = require("../HTTP");
const assert = require("assert");

describe("LocalJwtIssuerParser", () => {
    describe("#_create(_LocalJwtIssuer)", () => {
        it("creates a new LocalJwtIssuer", async () => {
            let _parser = new LocalJwtIssuerParser();
            let _LocalJwtIssuer = {_content: {type: "application/vnd.celastrinajs.attribute+json;LocalJwtIssuer"},
                                   issuer: "@celastrinajs/issuer/mock",
                                   audiences: ["celastrinajs_mock_aud"],
                                   assignments: ["assignment_a"],
                                   key: "celastrinajsmocktoken_key",
                                   validateNonce: true};
            let _issuer = await _parser._create(_LocalJwtIssuer);
            assert.strictEqual(_issuer.issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_issuer.key, "celastrinajsmocktoken_key", "Expected 'celastrinajsmocktoken_key'.");
            assert.deepStrictEqual(_issuer.audiences, ["celastrinajs_mock_aud"], "Expected ['celastrinajs_mock_aud'].");
            assert.deepStrictEqual(_issuer.assignments, ["assignment_a"], "Expected ['assignment_a'].");
            assert.strictEqual(_issuer.validateNonce, true, "Expected true.");
        });
        it("creates a default LocalJwtIssuer", async () => {
            let _parser = new LocalJwtIssuerParser();
            let _LocalJwtIssuer = {_content: {type: "application/vnd.celastrinajs.attribute+json;LocalJwtIssuer"},
                issuer: "@celastrinajs/issuer/mock",
                audiences: ["celastrinajs_mock_aud"],
                key: "celastrinajsmocktoken_key"};
            let _issuer = await _parser._create(_LocalJwtIssuer);
            assert.strictEqual(_issuer.issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_issuer.key, "celastrinajsmocktoken_key", "Expected 'celastrinajsmocktoken_key'.");
            assert.deepStrictEqual(_issuer.audiences, ["celastrinajs_mock_aud"], "Expected ['celastrinajs_mock_aud'].");
            assert.deepStrictEqual(_issuer.assignments, [], "Expected [].");
            assert.strictEqual(_issuer.validateNonce, false, "Expected false.");
        });
    });
});

