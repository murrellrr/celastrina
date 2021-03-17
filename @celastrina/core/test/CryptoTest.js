

const {Cryptography, AES256Algorithm} = require("../Core");



const crypto = new Cryptography(new AES256Algorithm("=y85PWF_tvxk%Dqbc5!-GqxmG$d^e4rf", "67ce8d336bcd4668")); //6a8304aa44a434b2

let test = "{\"_object\":{\"_type\": \"rentals.southandsunset.api.ring.AuthorizationToken\"},\"location\":{\"id\": \"dacd1345-2f2a-439a-a770-0d120973e42b\",\"name\":\"Spruce Lake House\"},\"refreshToken\":\"eyJhbGciOiJIUzUxMiIsImprdSI6Ii9vYXV0aC9pbnRlcm5hbC9qd2tzIiwia2lkIjoiYzEyODEwMGIiLCJ0eXAiOiJKV1QifQ.eyJpYXQiOjE2MTU3NjY2NDMsInJlZnJlc2hfY2lkIjoicmluZ19vZmZpY2lhbF9hbmRyb2lkIiwicmVmcmVzaF9zY29wZXMiOlsiY2xpZW50Il0sInJlZnJlc2hfdXNlcl9pZCI6NTM3OTQ3NTcsInJuZCI6ImdNb1dJWndld0FOQVdnIiwic2Vzc2lvbl9pZCI6IjQ1ODVkODk4LWQ0MTYtNGZjNy1iY2NhLTU5NDNkMDk5ZTFiOSIsInR5cGUiOiJyZWZyZXNoLXRva2VuIn0.Knzu0_ekfdErVNDWfFFnbsKOFRssaMME0opkmorBetwOT8y-YpN2XFay8O63tXDJglClPFpG7YQM48GP4CMMEg\",\"user\":\"southandsunset@southandsunset.com\",\"lastRefreshDateTime\":\"2021-02-18T19:18:25+00:00\"}"

crypto.encrypt(test)
    .then((value) => {
        console.log("encrypted: " + value);
        return crypto.decrypt(value);
    })
    .then((value) => {
        console.log("decrypted: " + value);
        process.exit(0);
    })
    .catch((exception) => {
        console.log(exception);
        process.exit(-1);
    });


