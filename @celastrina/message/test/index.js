const {CloudEvent, HTTP} = require("cloudevents");

// const ce = new CloudEvent({ type: "type", source: "source", data: {a: "b"} });
// const message = HTTP.binary(ce); // Or HTTP.structured(ce)
// "\"source\": \"/mycontext\"," +
let _obj =
    "["+
    "{\"specversion\": \"1.0\"," +
    "\"type\": \"com.example.someevent\"," +
    "\"source\": \"/mycontext\"," +
    "\"subject\": \"test subject\"," +
    "\"id\": \"C234-1234-1234\"," +
    "\"time\": \"2018-04-05T17:31:00Z\"," +
    "\"datacontenttype\": \"application/json\"," +
    "\"data\": {" +
    "   \"appinfoA\": \"abc\"," +
    "   \"appinfoB\": 123," +
    "   \"appinfoC\": true" +
    "}}," +
    "{\"specversion\": \"1.0\"," +
    "\"type\": \"com.example.someevent\"," +
    "\"source\": \"/mycontext\"," +
    "\"subject\": \"test subject\"," +
    "\"id\": \"C234-1234-1234\"," +
    "\"time\": \"2018-04-05T17:31:00Z\"," +
    "\"datacontenttype\": \"application/json\"," +
    "\"data\": {" +
    "   \"appinfoA\": \"abc\"," +
    "   \"appinfoB\": 123," +
    "   \"appinfoC\": true" +
    "}}" +
    "]";
let _headers = {};
//let _messge = JSON.parse(_obj);
//_headers["host"] = "celastrinajs.com";
//_headers["user-agent"] = "Mocha Celastrinajs Test / 0.0.0";
//_headers["accept"] = "*/*";
//_headers["accept-encoding"] = "gzip, deflate, br";
//_headers["connection"] = "keep-alive";
//application/cloudevents-batch+json
//_headers["content-type"] = "application/json; charset=utf-8";
_headers["content-type"] = "application/cloudevents-batch;";
_headers["ce-id"] = "C234-1234-1234";
_headers["ce-time"] = "2021-11-15T18:07:23.547Z";
_headers["ce-type"] = "type";
_headers["ce-source"] = "source";
_headers["ce-specversion"] = "1.0";
let test = null;
try {
    test = HTTP.toEvent({headers: _headers, body: _obj});
}
catch(exception) {
    console.log(exception instanceof TypeError);
    console.log(exception);
    console.log(JSON.stringify(exception));
}

console.log(test);
