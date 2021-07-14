const {CelastrinaError, ConfigurationItem} = require("../Core");
const assert = require("assert");

describe("ConfigurationItem", () => {
    describe("key", () => {
        it("throws not implmented exception", () => {
            let err = new CelastrinaError("Not Implemented.", 501);
            let item = new ConfigurationItem();
            assert.throws(() => {item.key}, err);
        });
    });
});
