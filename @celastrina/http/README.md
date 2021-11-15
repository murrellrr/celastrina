# celastrina
Celastrina is a JavaScript framework for simplifying server-less compute in Microsoft Azure Functions. Celastrina
attempts to simplify the configuration and connectivity of common PaaS services in the Azure Platform with a special
emphasis on security.

Celastrina is flexible enough to support small open-source efforts and can easily scale up to large enterprise
deployments. Celastrina is committed to maintaining compatibility with JavaScript libraries released by Microsoft and
will continue to adapt and grow with the Microsoft Azure eco-system.

# Quick Start
Creating your first JSON Based HTTP Function:

```
const {LOG_LEVEL, CelastrinaError, Configuration} = require(“@celastrina/core”);
const {HTTPAddOn, JSONHTTPContext, JSONHTTPFunction} = require(“@celastrina/http”);

class MyFirstFunction extends JSONHTTPFunction {
    constructor(config) {
        super(config);
    } 

    async _get(context) {
        context.log(“Welcome to Celastrina!”, LOG_LEVEL.INFO, “MyFirstFunction._get(context)”);
        context.send({name: “sample”, message: }); // Return whatever object you’d like
        context.done();
    }
}
 
const _config = new Configuration(“MyFirstFunction”);
const _httpconfig = new HTTPAddOn();
 
_config.setAuthorizationOptimistic(true); // Allow anon access, Celastrina defaults to pessimistic AuthN/AuthZ
_config.addOn(_httpconfig);
module.exports = new MyFirstFunction (_config);
```

You will need to make a few updates to your function.json. You’ll need to add an “entryPoint” attribute with the value “execute” and insure your in/out bindings are named “req” and “res” respectively.

```
{
    “entryPoint”: “execute”,
    “bindings”: [
        {
            “authLevel”: “function”,
            “type”: “httpTrigger”,
            “direction”: “in”,
            “name”: “req”,
            “methods”: [ “get”]
        },
        {
            “type”: “http”,
            “direction”: “out”,
            “name”: “res”
        }
    ]
}
```

Please visit [celastrinajs.com](https://www.celastrinajs.com) for further examples and documentation.
