const {PrincipalMappingParser} = require("../Core");
const assert = require("assert");

describe("PrincipalMappingParser", () => {
	describe("#_create(_PrincipalMapping)", () => {
		it("should create principal mapping object", async () => {
			let _PrincipalMappingParser = {
				_content: {type: "application/vnd.celastrinajs.attribute+json;PrincipalMapping"},
				principal: "mock_principal",
				resource: "mock_resource"
			};
			let _parser = new PrincipalMappingParser();
			let _parsed = await _parser.parse(_PrincipalMappingParser);
			assert.deepStrictEqual(_parsed, {principal: "mock_principal", resource: "mock_resource"}, "Expected object.");
		});
		it("should fail, no principal", async () => {
			let _PrincipalMappingParser = {
				_content: {type: "application/vnd.celastrinajs.attribute+json;PrincipalMapping"},
				resource: "mock_resource"
			};
			let _parser = new PrincipalMappingParser();
			await assert.rejects(_parser.parse(_PrincipalMappingParser));
		});
		it("should fail, no resource", async () => {
			let _PrincipalMappingParser = {
				_content: {type: "application/vnd.celastrinajs.attribute+json;PrincipalMapping"},
				principal: "mock_principal",
			};
			let _parser = new PrincipalMappingParser();
			await assert.rejects(_parser.parse(_PrincipalMappingParser));
		});
		it("should fail, no principal or resource", async () => {
			let _PrincipalMappingParser = {
				_content: {type: "application/vnd.celastrinajs.attribute+json;PrincipalMapping"}
			};
			let _parser = new PrincipalMappingParser();
			await assert.rejects(_parser.parse(_PrincipalMappingParser));
		});
		it("should fail, principal 0 length", async () => {
			let _PrincipalMappingParser = {
				_content: {type: "application/vnd.celastrinajs.attribute+json;PrincipalMapping"},
				principal: "    ",
				resource: "mock_resource"
			};
			let _parser = new PrincipalMappingParser();
			await assert.rejects(_parser.parse(_PrincipalMappingParser));
		});
		it("should fail, resource 0 length", async () => {
			let _PrincipalMappingParser = {
				_content: {type: "application/vnd.celastrinajs.attribute+json;PrincipalMapping"},
				principal: "mock_principal",
				resource: "    "
			};
			let _parser = new PrincipalMappingParser();
			await assert.rejects(_parser.parse(_PrincipalMappingParser));
		});
	});
});
