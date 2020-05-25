#celastrina
Javascript Framework for simplifying Microsoft Azure Functions and supporting resources.
##Prerequisite
1. You gotta know Azure, at least a little.
2. You gotta know Javascript and Node.js, duh.
##Recent Changes
1. Support for Application Settings, App Configurations, and a hybrid Application Settings and Vault.
2. Fixed JwtSentry that allowed expired JWT tokens to pass authorization.
3. Fixed HTTPContext initialization issue.
4. Updated BaseSentry to cache all function roles, resource, and application authorizations.
5. Reduced overall file size of core and http packages.
##Quick-start
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
Please visit [https://www.celastrinajs.com](https://www.celastrinajs.com) for a comprehensive quicj-start guide and 
complete documentation on using Celastrina.js.
