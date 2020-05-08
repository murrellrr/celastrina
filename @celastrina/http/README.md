# celastrina
Javascript Framework for simplifying Microsoft Azure Functions and supporting resources.

## Who should use celastrina.js?
Right now, to receive the highest time-to-value, celastrina.js should be used in green-field application development. 
While stable and well-supported, Celastrina.js has not been out in the wild very long; because of this, configurations 
to support diverse deployments are not yet available. While extremely flexible and developer oriented, Celastrina.js is
still fairly rigid to its intended framework, using it on established or legacy projects usually requires a lot of 
customization and code, potentially lowering your time-to-value.

## Prerequisite
1. You gotta know Azure, at least a little.
2. You gotta know Javascript and Node.js, duh.

## Quick-start
To use Celastring.js simply deploy the following to your Microsoft Azure HTTP Trigger function:

```
"use strict";

const {LOG_LEVEL, StringProperty, BooleanProperty, Configuration} = require("@celastrina/core");
const {JSONHTTPContext, JSONHTTPFunction} = require("@celastrina/http");

const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

class MyNewHTTPTriggerFunction extends JSONHTTPFunction {
    async _get(context) {
        return new Promise((resolve, reject) => {
            context.send({"message": "_get invoked."});
            resolve();
        });
    }

    async _post(context) {
        return new Promise((resolve, reject) => {
            context.send({"message": "_post invoked."});
            resolve();
        });
    }
}

module.exports = new MyNewHTTPTriggerFunction(config);

```

### function.json
Update you r Microsoft Azure function.json file with the following directive "entryPoint": "execute". Your in and out 
bdinges should be named "req" and "res" respectively. Your function.json should look something like this:

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

## Detailed Help & Documentation
Please visit https://www.celastrinajs.com for complete documentation on using Celastrina.js.

### Environment Properties
Celastrina.js leverages Microsoft Azure Function configuration properties a little differently. Celastrina.js uses a 
confiuration object (`Configuration`) that is linked through `Property` instances. A property represents a key=value pair in the 
process.env. The `Property` paradigm is a little different as it enfources some degree of type-safety as well as a 
way to secure key=value pairs using Microsoft Azure Vault.

Celastrina.js core comes with four out-of-the-box `Property` types:

1. **NumericProperty**: `key=value` pair representing a Numberic data-type.
2. **BooleanProperty**: `key=value` pair representing a true/false data type. The `BooleanProperty` simple looks for 
`string === "true"` for `true`, `false` otherwise.
3. **StringProperty**: `key=value` pair for string, duh.
4. **JsonProperty**: A serialized JavaScript object parsed using `JSON.parse()`.

This HTTP package also includes specialized property types will discuss later in this document. Celastrina.js takes 
advantage of varient-type nature of JavaScript by allowing ANY configuration element to be a primitive type, or a 
`Property` instance. All `Property` instances are converted to thier respective types during the bootstrp life-cycle of 
the Celastring.js function. More on life-cycle later.

A `Property` instance has the following constructor:

```
constructor(name, secure = false, defaultValue = null, factory = null)
```

- **name** {_string_}: The name, or KEY, of the property in the process.env. This paramter is required and cannot be 
undefined.
- **secure** {_boolean_}: Determines if this property actually contains a link to a Microsoft Azure Key Vault Secret 
Identifier. This parameter is optional and the default is `false`.
- **defaultValue** {_\*_}: The default value to use if the entry in process.env is `null` or `unddefined. The super
class `Property` will accept Any (`*`) value but implentations such as `StringProperty` or `BooleanProperty` will enforce thier 
respective types. This parameter is optional and will default to `null`.
- **factory** {_\*_}: RESERVED. Current not used and optional. Defaults to `null`.

#### Using a Property
To use a `Property`, add to your function configuration through the portal at All services > Function App > 
\[Your function App\] > Configuration and in your local.settings.json.

```
{
  "IsEncrypted": false,
  "Values": {
    "function.name": "Your Function Name",
    "function.managed": "false"
  }
}
```

Next, you need create a property instance and add it to a configuration. A `Configuration` has 2 required parameters passed 
in the constructor. The 2 parameters are the `name` and `managed` mode parameters. 

- **name** {_string_}: The firendly name of this function. This name is used for diagnostics, insights, and logging and 
should not be seen by the caller.
- **managed** {_boolean_}: Determines if this function runs in a secure `managed` mode. More on that later.

As stated you may use the primitive types or corrosponding `Property` instances.

```
const config = new Configuration("Your Function Name", false);

/* OR */

const config = new Configuration(new StringProperty("function.name"), new BooleanProperty("function.managed"));

```
Let's unpack this real quick. The name parameter in the later example uses a `StringProperty` with a key that points to 
"function.name" in process.env, equivelent to calling `process.env["function.name"]`:

```
new StringProperty("function.name")
```

At runtime, when the `execute` function of the class is invoked, this `StringProperty` will be converted to a `string` from 
the process.env.

Pretty straight forward,eh? The core `Configuration` of Celastrina.js comes with numerous out-of-the-box attributes 
including `name` and `managed`. You can set these attributes using the `Configuration.addValue` method or using explicit 
setter methods. The following explicit attributes are supported:

- **addApplicationAuthorization** {_ApplicationAuthorization_}
- **addResourceAuthorization** {_string_}
- **addFunctionRole** {_FunctionRole_}

More on what these mean later... The `Configuration` is only available during the bootstrap life-cycle. After that, any 
environment properties can be accessed from the `BaseContext` object.

#### The Celastring.js Life-Cycle
Celastrina.js follows a fairly straight forward life-cycle of promises to execute work. The basic life-cycle executed 
when the 'execute' method is invoked in BaseFunction is, in order, as follows:

1. `bootstrap`: This is a critical life-cycle phase. This phase creates objects and dependencies necessary for the 
function to work. This is the only phase, that if overridden, should always call the super method on.
2. Initialization: Depending on the `_managed` value of the configuration `true` invokes `secureInitialize` then 
`initialize`, `false` just invokes `initialize`. As discussed in the quick-start, implementors should override this 
function to manage dependencies.
3. `authenticate`: Phase used to authenticate requests. Implements and framework developers can use this phase to do 
custom authentication for their application. `AuthenticatedJSONFunction` uses this phase to validate issuers of JWT 
tokens.
4. `authorize`: Authorizes (role verification) requests. `AuthorizedJSONFunction` uses this phase to challenge roles.
5. `validate`: Phase used to validate any request input like headers, query params, request body.
6. `load`: Intended phase to load from a data store any object you might need to fulfill this request. I use it all the 
time to pull documents from Azure Cosmos DB from a URI parameter and place an object into the context.
7. Processing: Depending on whether or not this request is a monitor (HTTP trace) request. If its a monitor request then
`monitor` is invoked, otherwise `process` is invoked. This phase is where you performs all those precious busine$$ 
rules you are getting paid for.
8. `save`: Inverse of load! LOL Commit back to your data store all the preciou$ information you gathered from your user 
base.
9. `terminate`: Clean up anything you might have created during `initialize`.

There is a special phase that can happen anywhere from `initialize` to `terminate`, and that is the `exception` phase. 
This is invoked when any of the life-cycle promises are rejected. If the `exception` life-cycle is invoked prior to 
`terminate` then terminate will still be invoked. If an exception happens during `createContext` then `terminate` will 
**not** be invoked as the context might not have been safely instantiated. If an exception happens within `excetion` or 
`terminate` then an &quot;unhandled&quot; condition is met and a error is returned via the Azure `context.done()` method 
passing an error message.

In the processing phase, the HTTP package looks at the HTTP method in the request and invokes the `_[method]` function 
in the class. For example, if the HTTP method is GET, then `_get(context)` is invoked.
