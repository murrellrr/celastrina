const {CloudEvent} = require("cloudevents");


let event = {
    source : "/mycontext",
    id: "A234-1234-1234",
    time: "2018-04-05T17:31:00Z",
    datacontenttype: "text/plain",
    data: "This is a test"
};

try {
    let _cevent = new CloudEvent(event);
}
catch(exception) {
    console.log(exception.message);
    console.log(exception.errors);
}
