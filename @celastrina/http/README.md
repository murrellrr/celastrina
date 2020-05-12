#celastrina
Javascript Framework for simplifying Microsoft Azure Functions and supporting resources.

##Who should use celastrina.js?
Right now, to receive the highest time-to-value, celastrina.js should be used in green-field application development. 
While stable and well-supported, Celastrina.js has not been out in the wild very long; because of this, configurations 
to support diverse deployments are not yet available. While extremely flexible and developer oriented, Celastrina.js is
still fairly rigid to its intended framework, using it on established or legacy projects usually requires a lot of 
customization and code, potentially lowering your time-to-value.

##Prerequisite
1. You gotta know Azure, at least a little.
2. You gotta know Javascript and Node.js, duh.

##Recent Changes
1. Removed `managed` mode from the `Configuration`. Adopting Azure Key Vault and App Configuration changed how to 
managed resources are handled internally and now no longer required indicating the system uses managed services like 
Vault.
2. Support for Application Settings, App Configurations, and a hybrid Application Settings and Vault.
3. Repaired issue in JwtSentry when expired tokens are allowed.

##Quick-start
To use Celastrina.js simply deploy the following to your Microsoft Azure HTTP Trigger function:

```
"use strict";

const {LOG_LEVEL, StringProperty, BooleanProperty, Configuration} = require("@celastrina/core");
const {JSONHTTPContext, JSONHTTPFunction} = require("@celastrina/http");

const config = new Configuration(new StringProperty("function.name"));

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

If you are feeling brave, or just here for a refresher, you can skip down to [Putting it all together](#Putting-it-all-together) 
and dive right in.

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
Please visit https://www.celastrinajs.com for complete documentation on using Celastrina.js.

###Environment Properties
Celastrina.js leverages Microsoft Azure Function application settings a little differently. Celastrina.js uses a 
confiuration object (`Configuration`) that is linked through `Property` instances. A property represents a key=value pair in the 
`process.env`. The `Property` paradigm is a little different as it enfources some degree of type-safety as well as a 
way to secure key=value pairs using Microsoft Azure Vault.

Celastrina.js core comes with 4 out-of-the-box `Property` types:

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
constructor(name, defaultValue = null)
```

- `name` {`string`}: The name, or KEY, of the property in the process.env. This paramter is required and cannot be 
undefined.
- `defaultValue` {`*`}: The default value to use if the entry in process.env is `null` or `unddefined. The super
class `Property` will accept Any (`*`) value but implentations such as `StringProperty` or `BooleanProperty` will enforce thier 
respective types. This parameter is optional and will default to `null`.

####Using a Property
To use a `Property`, add to your function application settings through the Azure portal at _All services > Function App > 
\[Your function App\] > Configuration_ and in your local.settings.json.

```
{
  "IsEncrypted": false,
  "Values": {
    "function.name": "Your Function Name"
  }
}
```

Next, you need create a property instance and add it to a configuration. A `Configuration` has 1 required parameter passed 
in the constructor:

- `name` {`string`}: The firendly name of this function. This name is used for diagnostics, insights, and logging and 
should not be seen by the caller.

As stated you may use the primitive types or corrosponding `Property` instances.

```
const config = new Configuration("Your Function Name");

/* OR */

const config = new Configuration(new StringProperty("function.name"));

```
Let's unpack this real quick. The name parameter in the later example uses a `StringProperty` with a key that points to 
"function.name" in process.env, equivelent to calling `process.env["function.name"]`:

```
new StringProperty("function.name")
```

At runtime, when the `execute` function of the class is invoked, this `StringProperty` will be converted to a `string` from 
the `process.env`.

Pretty straight forward,eh? The core `Configuration` of Celastrina.js comes with numerous out-of-the-box attributes 
including `name` and `managed`. You can set these attributes using the `Configuration.addValue` method or using explicit 
setter methods. The following explicit attributes are supported:

- `addApplicationAuthorization` {`ApplicationAuthorization`}
- `addResourceAuthorization` {`string`}
- `addFunctionRole` {`FunctionRole`}

More on what these are later... The `Configuration` is only available during the `bootstrap` life-cycle. After that, any 
environment properties can be accessed from the `BaseContext` object.

#### The Celastrina.js Life-Cycle
Celastrina.js follows a fairly straight forward life-cycle of promises to execute work. The basic life-cycle executed 
when the 'execute' method is invoked in BaseFunction is, in order, as follows:

1. `bootstrap`: This is a critical life-cycle phase. This phase creates objects and dependencies necessary for the 
function to work. This is the only phase, that if overridden, should always call the super method on.
2. `intialize`: Implementors should override this function to manage dependencies.
3. `authenticate`: Phase used to authenticate requests. The base implementation forwards this call to the `BaseSentry`.
4. `authorize`: Authorizes (role verification) requests. The base implementation forwards this call to the `BaseSentry`.
5. `validate`: Phase used to validate any request input like headers, query params, request body.
6. `load`: Load from a data store any object you might need to fulfill this request. I use it all the 
time to pull documents from Azure Cosmos DB from a URI parameter and place an object into the context.
7. Processing: Depends on whether this request is a monitor (HTTP trace) request. If its a monitor request then
`monitor` is invoked, otherwise `process` is invoked. This phase is where you performs all those precious busine$$ 
rules you are getting paid for.
8. `save`: Inverse of load! LOL Commit back to your data store all the preciou$ information you gathered from your user 
base.
9. `terminate`: Clean up anything you might have created during `initialize`.

There is a special phase that can happen anywhere from `initialize` to `terminate`, and that is the `exception` phase. 
This is invoked when any of the life-cycle promises are rejected. If the `exception` life-cycle is invoked prior to 
`terminate` then terminate will still be invoked. If an exception happens during `createContext` then `terminate` will 
**not** be invoked as the context might not have been safely instantiated. If an exception happens within `exception` or 
`terminate` then an "unhandled" condition is met, and an error is returned via the Azure `context.done()`

In the processing phase, the HTTP package looks at the HTTP method in the request and invokes the `_[method]` function 
in the class. For example, if the HTTP method is GET, then `_get(context)` is invoked. A typical HTTP Trigger function 
might look like:

```
class MyNewHTTPTriggerFunction extends JSONHTTPFunction {
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

###So, How do I use Azure Key Vault or App Configuration Service?
Glad you asked! 
**COMING SOON**

####Back to Managed Resources
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

####Wait, what about Applications Registrations?
Awesome! So you finally realized that roll'n your own user management system is a bad idea and have set up Azure AD B2C!
I'm proud of you, that's a big step! If I was wrong and you haven't, I choose not to help you. Just don't. If you're gonna 
use Azure, use Azure AD. If you are an enterprise and writing an application for employees, you're almost there. If not, 
use Azure AD B2C for your customers. Its basically free for most small to medium application so there is really no reason 
not to. Please, don't fight this. BTW, heres a good link on configuring Azure AD B2C [https://docs.microsoft.com/en-us/azure/active-directory-b2c/](https://docs.microsoft.com/en-us/azure/active-directory-b2c/)

If you've made it this far, you probably have Azure AD, or Azure AD B2C and want to access resources not as a function 
managed identity, but as an application. No problem, Celastrina.js makes this pretty easy to do as well, enter 
`ApplicationAuthorization`. 

The `ApplicationAuthorization` constructor takes the following information:

-`authority` {`string`}: This is the authorizing URL for the directory. For most Azure AD B2C deployments this will be 
`https://login.microsoftonline.com`.
- `tenant` {`string`}: This is the UUID for your tenant. You can get this by navigating to Home > Azure AD B2C in the
Azure portal and clicking on the "Resource name" in the "Overview" page. There will be a "Tenant ID" you can copy from 
there.
- `id` {`string`}: This is the Application ID of the registered application. You can get the application ID in Azure 
portal at Home > Azure AD B2C | App registrations (Preview) > \[Your Application\].
- `secret` {`string`}: This is the credential the application uses.
- `resources` {`Array.<string>`}: An array of resources to register for the application.

Using the  `ApplicationAuthorization` in code:

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

config.addApplicationAuthorization(new ApplicationAuthorization("https://login.microsoftonline.com", 
    "c7b24e39-37e9-4fcf-bbf0-480309764eef", "f396619a-f2dc-455c-8f71-0fc77d424b46", "x?=/4ZkXh<Yv'4_m2&n]<B[L", 
    ["https://datalake.azure.net"]));
```

There is also a custom `Property` instance called `ApplicationAuthorizationProperty` (_how original_) that allows you 
to load from and application authorization from a application setting.

```
config.addApplicationAuthorization(new ApplicationAuthorizationProperty("YOUR PROPERTY NAME", true));
```

In Azure Key Vault add the following json string:

```
{
    "_authority":"https://login.microsoftonline.com", 
    "_tenant": "c7b24e39-37e9-4fcf-bbf0-480309764eef", 
    "_id":"f396619a-f2dc-455c-8f71-0fc77d424b46", 
    "_secret":"x?=/4ZkXh<Yv'4_m2&n]<B[L", 
    "_resources": [
            "https://vault.azure.net", "https://datalake.azure.net/"
        ]
}
```

I **highly** recommend you use `ApplicationAuthorizationProperty` and place the json in Azure Key Vault. I **DO NOT** 
recommend giving out application secrets to developers!

For more information on Application registrations and MSAL, see [https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-client-application-configuration](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-client-application-configuration).

####How do I use the resource registrations and application authorizations?
Use them is as simple as assing the bearer token to the `authorization` header of your RESTful requests to azure 
resources.

Accessing these bearer tokens introduces another concept of Celastrina.js, the Sentry! Queue menacing music! The sentry
handles all security matters in Celastrina.js from managed resources registrations, authentication, to authorization. The
sentry is derrived from the base class `BaseSentry`, and is contained in the context of any life-cycle function.

To use an application authorization bearer token simply look up the resource by the application ID. Let say I want the 
bearer token for Azure Datalake for the application authorization above:

```
    async _get(context) {
        return new Promise(async (resolve, reject) => {
            let token = await context.sentry.getAuthorizationToken("https://datalake.azure.net/", 
                                "f396619a-f2dc-455c-8f71-0fc77d424b46");
            resolve();
        });
    }
```

If you want to get the Datalake bearer token for the Azure function's managed identity simply omit the optional 
application ID:

```
    async _get(context) {
        return new Promise(async (resolve, reject) => {
            let token = await context.sentry.getAuthorizationToken("https://datalake.azure.net/");
            resolve();
        });
    }
```

All bearer tokens are fetched and cached during the bootstrap life-cycle. Tokens are also lazy refreshed during access if 
the token has expired. Because of this, a call to `getAuthorizationToken` may take longer then expected if the token 
has expired.

###WOW, this is awesome! Wait, what about authentication and authorization of users?
Yes! Of course! Now that you are using Azure AD B2C you have authentication and are iching to get your users to login. 
I'm so proud of how mindful you are about protecting your web application. Celastrina.js has got your back!

####I wanna use JWT!
Great I do too. Time to use Azure API Manager... _queue sound of record being scratched followed by silence_.

_Queue wavy line fade-out_

>Look, gonna level with you about the architecture that Celastrina.js was designed to support. It was designed for 
>micro services behind an API Gateway. I know! I know! You are saying it right now - "_this architecture is way 
>too complex for my simple application!_" You probably almost clicked away. Look, don't fight this. Use Azure API 
>Manager. I promise it will cost you, in most cases, nothing to use. It has all the mechinisms in place to validate JWT.
>Please don't do this in your azure function, especially if you went the Azure AD B2C route. I know you can do it in 
>the function, just don't. **I'll make my case:** It won't be long before your application has a dozen or so micro 
>services. Configuring JWT validation for each is daunting and prone to failure. Simply adding an API manager in front 
>with a global validation policy makes this so much safer and easier. Also, while I'm on my soap box, it won't be long 
>before your micro service will need a resource from another micro service. You know, even the smallest application, it 
>will take about 5 days before you are writing a call to another azure function within a function. **DON'T DO THIS 
>EITHER!** Simply enrich the message in API Manager, keep your code decoupled. It becomes a nightmare calling azure 
>functions from other functions, especially when deploying from DEV->INT->UAT->PROD. Make this decision early, bite the 
>bullet, spare yourself a lot of time, energy, and sanity. Use API manager for JWT validation and message enrichment.

_Queue wavy line fade-in_

Whoa, where were you? Welcome back! Once API Manager is configured to validate your JWT token from Azure AD B2C 
Celastrina.js can leverage the token information for function AAA. Oh, and heres a good link to help you configure 
API Manager [https://docs.microsoft.com/en-us/azure/api-management/](https://docs.microsoft.com/en-us/azure/api-management/).

**WARNING** I'm going to state this now in case it wasn't obvious above; **_Celastrina.js DOES NOT validate JWT. It 
only decodes it!_** One more time, it doesn't validate, it only decodes it. There, now don't go gett'n mad at me when you
use out-of-the-box Celastrina.js JWT, don't use Azure API manager, you get compromised, and all your users are after 
you with torches and pitch forks.

Using JWT requires changes to the core sentry we talked about earlier. To make these changes you simply extend the base 
class called `JwtJSONHTTPFunction`.

```
class MyNewSecureHTTPTriggerFunction extends JwtJSONHTTPFunction {
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

module.exports = new MyNewSecureHTTPTriggerFunction(config);
```

Then you will need to set up the allowed issuers in your configuration. An `Issuer` tells Celastrina.js which JWT 
tokens to accept and, if you must, what roles to escalate your users to when they use those issuers. To use an `Issuer` 
you must also add a JWT configuration item using the `JwtConfiguration`. First, lets go over `Issuer`:

- `name` {`string`}: Thhe issuer name to match, the `iss` attribute in the JWT token.
- `audience` {`string`}: The audience name to match, the `aud` attribute in the JWT token.
- `roles` {`Array.<string>`}: An optional array of role names to escalate the user to if they match this issuer.
- `nonce` {`string`}: The optional nonce to match, the `nonce` attribute in the JWT token.

Basically, during the `authenticate` phase of the `JwtJSONHTTPFunction`, the JWT token will be pulled from the header, 
and is compared against the `name`, `audiance`, and optionally the `nonce` of each `Issuer` in the configuration. Each 
issuer the subject matches will be escalated to the optional `roles` by adding those roles to the subject. If you do not 
match any `Issuer` then your request will fail with a 401. If the subject matches any `Issuer` it is considered 
"authenticated" and will move on to the `authorization` life-cycle.

Now, let's configure JWT:

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

const jwtconfig = new JwtConfiguration();

jwtconfig.addIssuer(new Issuer("https://YourRegisteredApplication.b2clogin.com/c7b24e39-37e9-4fcf-bbf0-480309764eef/v2.0/", 
                               "f396619a-f2dc-455c-8f71-0fc77d424b46", ["user_role"]))
         .addIssuer(new Issuer("https://sts.windows.net/c7b24e39-37e9-4fcf-bbf0-480309764eef/", 
                               "f396619a-f2dc-455c-8f71-0fc77d424b46", ["admin_role"]));

config.addValue(JwtConfiguration.CELASTRINAJS_CONFIG_JWT, jwtconfig);
```

You may also use the custom property `IssuerProperty`:

```
jwtconfig.addIssuer(new IssuerProperty("function.jwt.issuer.user"))
         .addIssuer(new IssuerProperty("function.jwt.issuer.admin"));
```

and include in your settings the following JSON:

```
{
    "_name": "https://YourRegisteredApplication.b2clogin.com/c7b24e39-37e9-4fcf-bbf0-480309764eef/v2.0/", 
    "_audience": "f396619a-f2dc-455c-8f71-0fc77d424b46", 
    "_roles": [
        "user_role"
    ]
}
```

Celastrina.js is an all-or-nothing authentication system, regardless of the HTTP methods you've implemented. If you 
need a different level of authentication per HTTP method you'll need to split them out into different functions.

BAM! That's it!

####Wait, you said Authentication and Authorization, what about roles?
Whoa, slow your role child! _Queue Batman and Robin *slap* meme and slapping sound_ I got a soap box for this one... 

_Queue wavy line fade-out_

>So, you are about to go into Azure AD B2C, add a custom attribute for roles, and place a bunch of comma delim strings 
>of roles in there, add it to the claim, feel all clever about putting roles in your JWT toke. **DON'T!** Please, 
>just don't. Huge mistake. **I'll make my case:** First off, JWT is signed, not encrypted, and then encoded. All you 
>need to do is decode it. Anything like adding roles or user info outside the base claims introduces a potential attack 
>vector. Also, custom attributes in AD B2C only allow a length of 255 characters and you'll likely run out of space 
>quickly, especially if your like me and end up on a project whose roles are UUID's. After a few failed attempts 
>Celastrina.js landed on an encrypted cookie. I know this is spitting in the face of stateless micro services but its 
>the same as JWT being in the header. Celastrina.js has a concept of a "session" (to be used sparingly) that gets 
>encrypted and placed in a cookie, so we just place the roles there.

_Queue wavy line fade-in_

Celastrina.js leverages user roles encrypted in a cookie header. By default Celastrina.js attempts to check its internal 
session object for an attribure called `roles` that is of type `Array.<string>`. If its there, it suffs them into the 
subject roles in `context.subject`. Thos roles, in addition to escalations from issuers can be compared to a 
`FunctionRole` within Celastrina.js sentry. First, lets create some function roles that force authorization to occur. 
`FunctionRole` has the following constructor:

- `action` {`string`}: This is the action to authorize. The default is `process`. In the HTTP, the method will be used 
as the action.
- `roles` {`Array.<string>`}: The roles related to the action.
- `match` {`ValueMatch`}: The optional matching rule instance for this role. This is the rule on how to match roles 
between the function and the subject. The default is `MatchAny`. There are 3 types of rules:
    - `MatchAny`: Any role in subject matches any role in function.
    - `MatchAll`: All roles in subject match all roles in function.
    - `MatchNone`: No roles in subject match no roles in functions.

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

config.addFunctionRole(new FunctionRole("post", ["role1", "role2", "role3"])); // Default MatchAny
```

Of course, you may also use any of the `Property` types in the constructor of `FunctionRole`. There is also a custom 
`Property` type `FunctionRoleProperty` that resolves a `FunctionRole` from a JSON string.

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

config.addFunctionRole(new FunctionRoleProperty("function.role.post")); // Default MatchAny
```

A application setting or Azure Key Vault attribute must be created with the follow JSON:

```
{
    "_action": "post", 
    "_roles": [
        "role1",
        "role2",
        "role3"
    ], 
    "_match": {
        "_type": "MatchAny"
    }
}
```

The `_match._type` value must follow the same convension of the match parameter in `FunctionRole`.

Now we've defined a role for an HTTP method, we can configure Celastrina.js to read an encrypted session 
cookie. To do this wee need to configre the `SecureCookieSessionResolver`. The constructor is as 
follows:

- `crypto` {`Cryptography`}: The instance of `Cryptography` to encrypt and decrypt raw data.
- `name` {`string`}: The name of the cookie to use from the `Cookie` header.

You could create all this by hand or simply use the custom property `SecureCookieSessionResolverProperty`. When using 
the custom property you are forced into AES256, specifically aes-256-cbc. If you need different, you'll need to roll 
 your own.

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));

const jwtconfig = new JwtConfiguration();

jwtconfig.addIssuer(new IssuerProperty("function.jwt.issuer.user", true))
         .addIssuer(new IssuerProperty("function.jwt.issuer.admin", true)));

config.addFunctionRole(new FunctionRoleProperty("function.role.post", true))
      .addValue(JwtConfiguration.CELASTRINAJS_CONFIG_JWT, 
                jwtconfig)
      .addValue(CookieSessionResolver.CELASTRINA_CONFIG_HTTP_SESSION_RESOLVER,
                new SecureCookieSessionResolverProperty("function.cookie.secure", true));

```

The JSON configiration for `SecureCookieSessionResolverProperty` must be:

```
{
    "_name":"celastrina_session", 
    "_key":"bf3c199c2470cb477d907b1e0917c17b", 
    "_iv":"5183666c72eec9e4"
}
```

For more information on the keys and initialization vectors, please see the crypto API in Node.js at 
[https://nodejs.org/api/crypto.html](https://nodejs.org/api/crypto.html).

Where _`name` is the cookie name, _`key` the AES 256 Key and `_iv` the initialization vector. Once configured Celastrina.js 
will retrieve and decrypt the session cookie from the cookie header, copy the `roles` attribute from the session to the 
subject roles, authenticate the requesters JWT token against the issuers, apply role escalations, then authorize the 
HTTP method requested.

#Putting it all together
Setting up the index.js:

```
const config = new Configuration(new StringProperty("function.name"),
                                 new BooleanProperty("function.managed"));
const jwtconfig = new JwtConfiguration();

jwtconfig.addIssuer(new IssuerProperty("function.jwt.issuer.user"))
         .addIssuer(new IssuerProperty("function.jwt.issuer.admin")));

config.addFunctionRole(new FunctionRoleProperty("function.role.post"))
      .addResourceAuthorization(new StringProperty("function.resource.local.graph"))
      .addApplicationAuthorization(new ApplicationAuthorizationProperty("function.resource.app.datalake"))
      .addValue(JwtConfiguration.CELASTRINAJS_CONFIG_JWT, 
                jwtconfig)
      .addValue(CookieSessionResolver.CELASTRINA_CONFIG_HTTP_SESSION_RESOLVER,
                new SecureCookieSessionResolverProperty("function.cookie.secure"));

class MyFunction extends JwtJSONHTTPFunction {
    async initialize(context) {
        return new Promise((resolve, reject) => {
            // Do some initialization stuff
            context.log("Initialized.", LOG_LEVEL.LEVEL_INFO, "MyFunction.initialize(context)");
            resolve();
        });
    }
    
    async load(context) {
        return new Promise((resolve, reject) => {
            // Load some objects from your data store
            context.log("Loaded.", LOG_LEVEL.LEVEL_INFO, "MyFunction.load(context)");
            resolve();
        });
    }
    
    async _get(context) {
        return new Promise((resolve, reject) => {
            context.log("HTTP GET Invoked.", LOG_LEVEL.LEVEL_INFO, "MyFunction._get(context)");
            context.send({message: "HTTP GET Invoked"});
            resolve();
        });
    }

    async _post(context) {
        return new Promise((resolve, reject) => {
            context.log("HTTP POST Invoked.", LOG_LEVEL.LEVEL_INFO, "MyFunction._post(context)");
            context.send({message: "HTTP POST Invoked"});
            resolve();
        });
    }

    async save(context) {
        return new Promise((resolve, reject) => {
            // Save some objects to your data store
            context.log("Saved.", LOG_LEVEL.LEVEL_INFO, "MyFunction.save(context)");
            resolve();
        });
    }
    
    async terminate(context) {
        return new Promise((resolve, reject) => {
            // Do your cleanup.
            context.log("Terminated.", LOG_LEVEL.LEVEL_INFO, "MyFunction.terminate(context)");
            resolve();
        });
    }
}

module.exports = new MyFunction(config);
```

Function application settings and `local.settings`.json:

```
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "{AzureWebJobsStorage}",
    "function.name": "ExampleJwtSecureRoleJSONHTTPFunction",
    "function.managed": "false",
    "function.role.post": "{\"_action\": \"post\", \"_roles\": [\"role1\", \"role2\", \"role3\"], \"_match\": {\"_type\": \"MatchAny\"}}",
    "function.resource.app.datalake": "{\"_authority\":\"https://login.microsoftonline.com\", \"_tenant\": \"c7b24e39-37e9-4fcf-bbf0-480309764eef\", \"_id\":\"f396619a-f2dc-455c-8f71-0fc77d424b46\", \"_secret\":\"x?=/4ZkXh<Yv'4_m2&n]<B[L\", \"_resources\": [\"https://datalake.azure.net/\"]}",
    "function.jwt.issuer.user": "{\"_name\": \"https://YourRegisteredApplication.b2clogin.com/c7b24e39-37e9-4fcf-bbf0-480309764eef/v2.0/\", \"_audience\":\"f396619a-f2dc-455c-8f71-0fc77d424b46\", \"_roles\":[\"user_role\"]}",
    "function.jwt.issuer.admin": "{\"_name\": \"https://sts.windows.net/c7b24e39-37e9-4fcf-bbf0-480309764eef/\", \"_audience\":\"f396619a-f2dc-455c-8f71-0fc77d424b46\", \"_roles\":[\"admin_role\"]}",
    "function.cookie.secure": "{\"_name\":\"celastrina_session\", \"_key\":\"bf3c199c2470cb477d907b1e0917c17b\", \"_iv\":\"5183666c72eec9e4\"}"
  }
}
```

Notice for the `local.settings.json` `managed` is set `false`. This is because the managed identity settings are **NOT** 
available when running locally. Azure func uses the VisualStudio credentials to access resources instead. Also, please 
make a note to use `secure` set to `true` when using `Property` instances that should be secured and replace the 
application settings with Key Vault Secret resource URL's.

your function.json:

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
