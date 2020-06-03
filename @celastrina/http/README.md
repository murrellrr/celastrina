#celastrina
Javascript Framework for simplifying Microsoft Azure Functions and supporting resources.
##Recent Changes
- Support for Application Settings, App Configurations, and a hybrid Application Settings and Vault.
- Fixed issues on start-up that caused the BaseSentry to lose context.
- Updated BaseSentry to cache all function roles, resource, and application authorizations.
##Basic Quick-start
To use Celastrina.js simply deploy the following to your Microsoft Azure HTTP Trigger function:
```
"use strict";

const {StringProperty, Configuration} = require("@celastrina/core");
const {JSONHTTPFunction} = require("@celastrina/http");

const config = new Configuration(new StringProperty("function.name"));

class MyFunction extends JSONHTTPFunction {
    async _get(context) {
        return new Promise((resolve, reject) => {
            context.send({message: "_get invoked."});
            resolve();
        });
    }

    async _post(context) {
        return new Promise((resolve, reject) => {
            context.send({message: "_post invoked."});
            resolve();
        });
    }
}

module.exports = new MyFunction(config);
```
###function.json
Update you r Microsoft Azure function.json file with the following directive "entryPoint": "execute". Your in and out 
bdinges should be named `req` and `res` respectively. Your `function.json` should look something like this:
```
{
  "entryPoint": "execute",
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": [
        "get",
        "post"
      ]
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```
##Detailed Help & Documentation
Please visit [https://www.celastrinajs.com](https://www.celastrinajs.com) for a comprehensive quick-start guide and 
complete documentation on using Celastrina.js.
