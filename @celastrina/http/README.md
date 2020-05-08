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
To use Celastrina.js simply deploy the following to your Microsoft Azure HTTP Trigger function:

```
"use strict";

const {LOG_LEVEL, StringProperty, BooleanProperty, Configuration} = require("@celastrina/core");
const {JSONHTTPContext, JSONHTTPFunction} = require("@celastrina/http");

const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

class MyNewHTTPTriggerFunction extends JSONHTTPFunction {
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

module.exports = new MyNewHTTPTriggerFunction(config);

```

### function.json
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

## Detailed Help & Documentation
Please visit https://www.celastrinajs.com for complete documentation on using Celastrina.js.

### Environment Properties
Celastrina.js leverages Microsoft Azure Function configuration properties a little differently. Celastrina.js uses a 
confiuration object (`Configuration`) that is linked through `Property` instances. A property represents a key=value pair in the 
process.env. The `Property` paradigm is a little different as it enfources some degree of type-safety as well as a 
way to secure key=value pairs using Microsoft Azure Vault.

Celastrina.js core comes with four out-of-the-box `Property` types:

1. `NumericProperty`: `key=value` pair representing a Numberic data-type.
2. `BooleanProperty`: `key=value` pair representing a true/false data type. The `BooleanProperty` simple looks for 
`string === "true"` for `true`, `false` otherwise.
3. `StringProperty`: `key=value` pair for string, duh.
4. `JsonProperty`: A serialized JavaScript object parsed using `JSON.parse()`.

This HTTP package also includes specialized property types will discuss later in this document. Celastrina.js takes 
advantage of varient-type nature of JavaScript by allowing ANY configuration element to be a primitive type, or a 
`Property` instance. All `Property` instances are converted to thier respective types during the bootstrp life-cycle of 
the Celastrina.js function. More on life-cycle later.

A `Property` instance has the following constructor:

```
constructor(name, secure = false, defaultValue = null, factory = null)
```

- `name` {`string`}: The name, or KEY, of the property in the process.env. This paramter is required and cannot be 
undefined.
- `secure` {`boolean`}: Determines if this property actually contains a link to a Microsoft Azure Key Vault Secret 
Identifier. This parameter is optional and the default is `false`.
- `defaultValue` {`*`}: The default value to use if the entry in process.env is `null` or `unddefined. The super
class `Property` will accept Any (`*`) value but implentations such as `StringProperty` or `BooleanProperty` will enforce thier 
respective types. This parameter is optional and will default to `null`.
- `factory` {`*`}: RESERVED. Currently, not used.

#### Using a Property
To use a `Property`, add to your function application settings through the Azure portal at _All services > Function App > 
\[Your function App\] > Configuration_ and in your local.settings.json.

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

- `name` {`string`}: The firendly name of this function. This name is used for diagnostics, insights, and logging and 
should not be seen by the caller.
- `managed` {`boolean`}: Determines if this function runs in a secure `managed` mode. More on that later.

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

- `addApplicationAuthorization` {`ApplicationAuthorization`}
- `addResourceAuthorization` {`string`}
- `addFunctionRole` {`FunctionRole`}

More on what these mean later... The `Configuration` is only available during the bootstrap life-cycle. After that, any 
environment properties can be accessed from the `BaseContext` object.

#### The Celastrina.js Life-Cycle
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
`terminate` then an &quot;unhandled&quot; condition is met, and an error is returned via the Azure `context.done()` method 
passing an error message.

In the processing phase, the HTTP package looks at the HTTP method in the request and invokes the `_[method]` function 
in the class. For example, if the HTTP method is GET, then `_get(context)` is invoked. A typical HTTP Trigger function 
might look like:

```
class MyNewHTTPTriggerFunction extends JwtJSONHTTPFunction {
    async initialize(context) {
        return new Promise((resolve, reject) => {
            // Do some initialization stuff
            resolve();
        });
    }
    
    async load(context) {
        return new Promise((resolve, reject) => {
            // Load some objects from your data store
            resolve();
        });
    }
    
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

    async save(context) {
        return new Promise((resolve, reject) => {
            // Save some objects to your data store
            resolve();
        });
    }
    
    async terminate(context) {
        return new Promise((resolve, reject) => {
            // Do your cleanup.
            resolve();
        });
    }
}

module.exports = new MyNewHTTPTriggerFunction(config);
```

### So, what about managed mode?
Glad you asked! Managed mode puts Celastrina.js inso a secure managed resource mode. This allows Celastrina.js to not only 
secure property values in Microsoft Azure Key Vault but also consume resources as a Managed Identity leveraging MSI. Managed 
Identities allow you to access the resource manager, databases, vault, and many other PaaS resources as the functions 
managed identity. To use resources you must enable either a System or User Assigned identity. To do so go to 
_All services > Function App > \[Your function App\] > Identity_ in the Azure portal. There select the "System Assigned" or 
"User Assigned" tab and enable your identity.

Once enabled, all you need to do is set managed to `true` in your `Configuration` and add resources as you please.

```
const config = new Configuration("Your Function Name", false);

/* OR */

const config = new Configuration(new StringProperty("function.name"), new BooleanProperty("function.managed"));
```

When using properties, make sure you update the aplication settings, and your local.settings.json for local debug:

```
{
  "IsEncrypted": false,
  "Values": {
    "function.name": "Your Function Name",
    "function.managed": "true"
  }
}
```

Celastrina.js will not leverage MSI and use the `IDENTITY_ENDPOINT` and `IDENTITY_HEADER` environment variables when 
registering resources. See [https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/overview)
for more information on MSI and Managed Identities.

Celastrina.js will also immediately register the Key Vault resource for the function on bootstrap. This ill allow you to
put configuration properties as secrets in Key Vault.

#### So, why should I use Azure Key Vault and not Application Settings?
Well, that's a great questions. I happen to trust more the added layer os security from Azure Key Vault and the clearer 
Seperation of Duties (SOD) in managing securey properties in Key Vault. It allows a configuration manager or other higher 
privilliged role in your organization safely distribute and version sensitive information without exposing it to 
developers. Basically, you can hand a resource URL to a developer without devulging sensitive information or elevated 
access. Heres how it works:

1. In Azire portal, navigate to _All services > Key vaults > \[Your Key Vault\] | Secrets_ and add a new secret.
2. Then go to _All services > Key vaults > \[Your Key Vault\] | Access policies_ and add your Azure Function's Managed 
Identity to the policy. I usually just add it to `GET` and `LIST`.
3. Get the resource URL for the secret and add it to the application settings.

```
{
  "IsEncrypted": false,
  "Values": {
    "function.name": "Your Function Name",
    "function.managed": "true"
    "YOUR_VUALT_SECURE_PROPERTY": "https://[Your Key Vault].vault.azure.net/secrets/[Your Secret]/[Your Version ID]"
  }
}
```

Your application settings would look something like this:

```
{
  "IsEncrypted": false,
  "Values": {
    "function.name": "Your Function Name",
    "function.managed": "true"
    "YOUR_VUALT_SECURE_PROPERTY": "https://MyNewVault.vault.azure.net/secrets/MyNewSecret/6ff6009aa001384e8edc348064b3503a"
  }
}
```

Now, when you use a Property instance, you just set `secure` to `true` and it will look up the value in Key Vault.

```
new StringProperty("YOUR_VUALT_SECURE_PROPERTY", true);
```

During bootstrap, Celastrina.js will get the resource URL from the application setting then, using the managed resource 
identity for vault, look up the secret and replace it with the value from Key Vault. You can use any `Property` instance 
this way, including placing json in Key Vault and using the `JsonProperty`.

Oh, and BTW, Celastrina.js will cache all the secure properties so that the will not get retrieved from Key Vualt every 
lookup. Please, TRUST me, this is safe, simple, and affordable. For most applications, this is pennies on the dollar.

#### Back to Managed Resources
You can add authorizations for any other supported managed resource using the `Configration`. For a list of supported 
service please visit [https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/services-support-managed-identities](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/services-support-managed-identities).

To add a resource authorization:

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

config.config.addResourceAuthorization("https://datalake.azure.net/");

// OR

config.config.addResourceAuthorization(new StringProperty("YOUR_RESOURCE_AUTHORIZATION"));
```

More about actually using a resource authorization later.

#### Wait, what about Applications Registrations?
Awesome! So you finally realized that roll'n your own user management system is a bad idea and have set up Azure AD B2C!
I'm proud of you, that's a big step! If I was wrong and you haven't, I choose not to help you. Just don't. If you're gonna 
use Azure, use Azure AD. If you are an enterprise and writing an application for employees, you're almost there. If not, 
use Azure AD b2C for your customers. Its basically free for most small to medium application so there is really no reason 
not to. Please, don't fight this.

If you've made it this far, you probably have Azure AD, or Azure AD B2C and want to access resources not as a function 
managed identity, but as an application. No problem, Celastrina.js makes this pretty easy to do as well.

