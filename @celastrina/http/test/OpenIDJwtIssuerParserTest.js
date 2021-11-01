const {CelastrinaError, CelastrinaValidationError, Cryptography, BaseRoleFactory} = require("@celastrina/core");
const {OpenIDJwtIssuer, OpenIDJwtIssuerParser} = require("../HTTP");
const assert = require("assert");

describe("OpenIDJwtIssuerParser", () => {
    describe("#_create(_LocalJwtIssuer)", () => {
        it("creates a new OpenIDJwtIssuer", async () => {
            let _parser = new OpenIDJwtIssuerParser();
            let _OpenIDJwtIssuer = {_content: {type: "application/vnd.celastrinajs.attribute+json;_OpenIDJwtIssuer"},
                issuer: "@celastrinajs/issuer/mock",
                audiences: ["celastrinajs_mock_aud"],
                assignments: ["assignment_a"],
                configURL: "https://www.configurl.com/some/uri",
                validateNonce: true};
            let _issuer = await _parser._create(_OpenIDJwtIssuer);
            assert.strictEqual(_issuer.issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_issuer.configURL, "https://www.configurl.com/some/uri", "Expected 'https://www.configurl.com/some/uri'.");
            assert.deepStrictEqual(_issuer.audiences, ["celastrinajs_mock_aud"], "Expected ['celastrinajs_mock_aud'].");
            assert.deepStrictEqual(_issuer.assignments, ["assignment_a"], "Expected ['assignment_a'].");
            assert.strictEqual(_issuer.validateNonce, true, "Expected true.");
        });
        it("creates a default OpenIDJwtIssuer", async () => {
            let _parser = new OpenIDJwtIssuerParser();
            let _OpenIDJwtIssuer = {_content: {type: "application/vnd.celastrinajs.attribute+json;_OpenIDJwtIssuer"},
                issuer: "@celastrinajs/issuer/mock",
                audiences: ["celastrinajs_mock_aud"],
                configURL: "https://www.configurl.com/some/uri"};
            let _issuer = await _parser._create(_OpenIDJwtIssuer);
            assert.strictEqual(_issuer.issuer, "@celastrinajs/issuer/mock", "Expected '@celastrinajs/issuer/mock'.");
            assert.strictEqual(_issuer.configURL, "https://www.configurl.com/some/uri", "Expected 'https://www.configurl.com/some/uri'.");
            assert.deepStrictEqual(_issuer.audiences, ["celastrinajs_mock_aud"], "Expected ['celastrinajs_mock_aud'].");
            assert.deepStrictEqual(_issuer.assignments, [], "Expected [].");
            assert.strictEqual(_issuer.validateNonce, false, "Expected false.");
        });
    });
});
