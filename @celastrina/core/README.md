# celastrina
Javascript Framework for simplifying Microsoft Azure Functions and supporting resources.

## Prerequisite
1. You gotta know Azure, at least a little bit.
2. You gotta know Javascript and Node.jd, duh.

## Coming Soon!
1. Queue Triggers for use with Service Bus, Event Hub, or Storage Queues.
2. Async messaging handler to send notifications via Twilio. I know! I know! - Azure already got that, but mines a bit more
comprehensive, I promise.

## Quick-start
Want to get started fast? First, create an HTTP Trigger using npm azure tools:

`func init`, then `func new` and create your HTTP Trigger function. Then initialize npm using `npm init`. Then install Celastrina: 

`npm install @celastrina/code`

### Configure your azure HTTP Trigger function to support Celastrina
#### Update you function config
In your `function.json` ass the following configuration before your bindings:

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

Make sure you have an in and out binding named `req` and `res` respectively. This is required for Celastrina to work but 
will be configurable in future releases.

#### Update your local settings
Now, lets tell Celastrina what to do on start-up, its pretty simple. Add the following to your `local.settings.json` or 
if deployed, your application settings:

```
{
...
    "YOUR-APP-CONGIGURATION": "{\"_topic\":\"Your App Name\", \"_managed\":false}"
...
}
```

This configuration tells Celastrina to use the topic &quot;_Your App Name_&quot; in all logging and also tells it to 
not use &quot;_managed_&quot; mode. More about that in a minute. Lets just get down to the code.

### Example Code
Here is a simple example of the post http trigger. I know, at first it looks a little verbose but its really not. Almost 
everything in Celastrina is optional but I can tell you from experience, you'll end up writing all this anyway so let 
me do all the work for you.

```
const {LOG_LEVEL, CelastrinaError, CelastrinaValidationError, 
       JSONHTTPContext, JSONHTTPFunction} = require("@celastrina/core");

/**
 * @brief Congratulations! You new Azure Function Class!
 */
class MyJsonFunction extends JSONHTTPFunction {
    constructor(config = null) {
        super(config);
    }

    /**
     * @brief Optionally, initialize the things you need to use.
     *
     * @description No worries tho, if you dont want to, just dont override this method.
     *
     * @param {BaseContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async initialize(context) {
        return new Promise((resolve, reject) => {
            // TODO: Initialize the things you need to use.
            resolve();
        });
    }

    /**
     * @brief Optionally, validate any headers, query params, payload, ect...
     *
     * @description No worries tho, if you dont want to, just dont override this method.
     *
     * @param {BaseContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async validate(context) {
        return new Promise((resolve, reject) => {
            // TODO: Validate any headers, query params, payload, ect...
            // Get the submitted payload from context:
            let payload = context.requestBody;
            // Do some validation...
            if(typeof payload === "undefined")
                reject(CelastrinaValidationError.newValidationError("Payload is required.", "payload"));
            else
                resolve();
        });
    }

    /**
     * @brief Optionally, Load any dependencies you need. For example, maybe get something from a Cosmos DB.
     *
     * @description No worries tho, if you dont want to, just dont override this method.
     *
     * @param {BaseContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async load(context) {
        return new Promise((resolve, reject) => {
            // TODO: Load any dependencies you need. For example, maybe get something from a Cosmos DB.
            resolve();
        });
    }

    /*
     * Ready to handle your HTTP methods?
     */

    /**
     * @brief Do your business work.
     *
     * @param {BaseContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     *
     * @private
     */
    async _post(context) {
        return new Promise((resolve, reject) => {
            // TODO: Do your business work.
            // ... some business stuff ...

            /*
             * Want to error out? No problem, easy to do.
             */
            reject(CelastrinaError.newError("Some Error Message")); // Produces a 500 error...
            reject(CelastrinaError.newError("Not Found", 404)); // Produces a 404 error...

            /*
             * Otherwise, just gracefully finish.
             */
            // but first, send something back to the requester ...
            context.send({test: true});
            resolve();
        });
    }

    /**
     * @brief Optionally, save your work. Maybe you need to upsert something back to Cosmos DB.
     *
     * @description No worries tho, if you dont want to, just dont override this method.
     *
     * @param {BaseContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async save(context) {
        return new Promise((resolve, reject) => {
            // TODO: Save your work. Maybe you need to upsert something back to Cosmos DB.
            resolve();
        });
    }

    /*
     * Want to gracefully handle your errors?
     */

    /**
     * @brief Optionally, Maybe roll back some things you committed.
     *
     * @description No worries tho, if you dont want to, just dont override this method.
     *
     * @param {BaseContext | JSONHTTPContext} context
     * @param exception The exception that was thrown.
     *
     * @returns {Promise<void>}
     */
    async exception(context, exception) {
        return new Promise((resolve, reject) => {
            // TODO: Maybe roll back some things you committed.
            /*
             * Dont send anything back on error, the framework will for you.
             * 
             * Want to log some stuff? No problem...
             */
            context.log("Your log message here."); // Send s a TRACE level message to the Azure Function log.
            context.log("Your log message here.", LOG_LEVEL.LEVEL_INFO); // Send s a INFO level message to the Azure Function log.
            context.log("Your log message here.", LOG_LEVEL.LEVEL_ERROR); // Send s a ERROR level message to the Azure Function log.
            // ... you get the point ...
            
            resolve();
        });
    }

    /*
     * Want to do any other clean-up before the function completes?
     */

    /**
     * @brief Optionally, maybe close some connections or something.
     *
     * @description No worries tho, if you dont want to, just dont override this method.
     *
     * @param {BaseContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async terminate(context) {
        return new Promise((resolve, reject) => {
            // TODO: Maybe close some connections or something.
            resolve();
        });
    }
}

/*
 * Dont forget to add a configuration item passing the config.
 */
module.exports = new MyJsonFunction("YOUR-APP-CONGIGURATION");
```

#### The Celastrina Life-cycle
The framework follows a fairly straight forward life-cycle of promises to execute work. The basic life-cycle executed 
when the 'execute' method is invoked in BaseFunction is, in order, as follows:

1. `createContext`: This lifecycle method creates an instance of BaseContext, or a superclass thereof to use throughout 
the lifecycle of the request. BaseContext is the wrapper around the context object used by Azure Functions. Framework 
developers should override this method when creating custom Function types.
2. `bootstrap`: This is a critical life-cycle phase. This phase creates objects and dependencies necessary for the 
function to work. This is the only phase, that if overridden, should always call the super method on.
3. Initialization: Depending on the `_managed` value of the configuration `true` invokes `secureInitialize` then 
`initialize`, `false` just invokes `initialize`. As discussed in the quick-start, implementors should override this 
function to manage dependencies.
4. `authenticate`: Phase used to authenticate requests. Implements and framework developers can use this phase to do 
custom authentication for their application. `AuthenticatedJSONFunction` uses this phase to validate issuers of JWT 
tokens.
5. `authorize`: Authorizes (role verification) requests. `AuthorizedJSONFunction` uses this phase to challenge roles.
6. `validate`: Phase used to validate any request input like headers, query params, request body.
7. `load`: Intended phase to load from a data store any object you might need to fulfill this request. I use it all the 
time to pull documents from Azure Cosmos DB from a URI parameter and place an object into the context.
8. Processing: Depending on whether or not this request is a monitor (HTTP trace) request. If its a monitor request then
`monitor` is invoked, otherwise `process` is invoked. This phase is where you performs all those precious busine$$ 
rules you are getting paid for.
9. `save`: Inverse of load! LOL Commit back to your data store all the preciou$ information you gathered from your user 
base.
10. `terminate`: Clean up anything you might have created during `initialize`.

There is a special phase that can happen anywhere from `initialize` to `terminate`, and that is the `exception` phase. 
This is invoked when any of the life-cycle promises are rejected. If the `exception` life-cycle is invoked prior to 
`terminate` then terminate will still be invoked. If an exception happens during `createContext` then `terminate` will 
**not** be invoked as the context might not have been safely instantiated. If an exception happens within `excetion` or 
`terminate` then an &quot;unhandled&quot; condition is met and a error is returned via the Azure `context.done()` method 
passing an error message.

#### So, what about that managed mode stuff again?
Well, &quot;managed&quot; mode is a little more complicated, First lets talk briefly about making stuff secure. 
Remember, Celastrina is a Microsoft Azure Framework, not a Cloud agnostic framework. Azure has specific PaaS services in 
mind to protect and manage your configurations, as well as protect access to other resources in the Cloud. Azure 
resources are a mixed bag of AAA security ranging from authorization bearer tokens like JWT, SAS tokens, and even access 
keys like those used to CRUD an Azure Cosmos DB. In my experience to date I have had to write a just as convoluted set of 
code to leverage these AAA features. This has often required me to have sensitive information within my configurations. 
Naturally, I started down the path of app configurations in my serverless compute. This is all well and good if I am 
the only devops guy on a project like something I would do for a mom-and-pop 503c. This was not cool when other 
developers started working on projects. I found myself struggling to protect sensitive information while support 
the devops pipeline I have come to love. What could I do?

**Managed Identity** and **Key Vault** to the rescue! Leveraging these two, simple, affordable, PaaS 
capabilities made configuring and protecting my secrets simple. Celastrina environment properties are accessed via
the **BaseContext** object. Invoking `context.getEnvironmentProperty(ket:string)` will return a configuration property 
just like the traditional way in azure functions, `process.env["key"];`. Celastrina offers another function 
`context.getSecureEnvironmentProperty(ket:string)` to securely access configuration items. When `_managed: false`, 
invocations of this method get the values directly from either local.settings.json or the configuration settings of your 
deployed azure function. When `_managed: true` however, The context will attempt to look up the value from an Azure Key 
Vault secret. No worries, on first invocation, the secret value will be cached so you don't hammer Key Vault on 
successive calls to that configuration items.

To make this work, there are a few things you must to within azure: 

1. Enable managed identities. Here is a good link on how to do that: https://docs.microsoft.com/en-us/azure/app-service/overview-managed-identity?tabs=dotnet.
2. create a Key Vault. Instructions for that can be found here: https://docs.microsoft.com/en-us/azure/key-vault/quick-create-portal.
3. Grant an access policy to Key Value your functions managed identity, I just do Get and List policies.
4. Set up our configuration depending on your deployment.

#### Example
If doing local development or in the lifecycle where you don't care about security like development or integration, make 
sure you are **not** in managed mode in your `local.settings.json` or if deployed, your application configuration:

```
"YOUR-APP-CONGIGURATION": "{\"_topic\":\"Your App Name\", \"_managed\":false}"
"YOUR-CONFIG-ITEM": "What ever value you want."
```

With this configuration, calling `context.getSecureEnvironmentProperty("YOUR-CONFIG-ITEM")` will simply retrieve from 
the configuration the value `"What ever value you want"`.  Now, lets move to UAT or production. Update your 
configuration as follows:

```
"YOUR-APP-CONGIGURATION": "{\"_topic\":\"Your App Name\", \"_managed\":true}"
"YOUR-CONFIG-ITEM": "https://{vault name}.vault.azure.net/secrets/{secret name}/{version id}"
```

Now, any call to `context.getSecureEnvironmentProperty("YOUR-CONFIG-ITEM")` will:

1. Check the local configuration cache to see if we've already fetch the configuration item.
2. If so, return the value, in this case `"What ever value you want"`.
3. If not, make a request to the Azure Key Vault using key `https://{vault name}.vault.azure.net/secrets/{secret name}/{version id}`, 
 yours would look something like this: `https://celastrina-secret-test.vault.azure.net/secrets/YOUR-CONFIG-ITEM/1234567890405fa6bf213e63bce891`.
4. Cache the value.
5. Return `"What ever value you want"`

That's it, now your configurations and secrets are secure! You're welcome!

## So, I want my users to be authenticated, what do I do?
Well, that's easy... Use Azure API Management. Sorry, but not sorry. It's 2020 (at the time of this document) developers, 
stop trying to roll your own security. It will never go well. I know, I've tried. It is so easy and cost effective to use 
Microsoft Azure PaaS services for IAM that only extenuating circumstances should drive you away. I'm going to take a hot 
second to jump on my APIM soapbox:

> Please, for the love of whatever deity, please use APIM! It's value far out ways it's perceived complexity, just in AAA 
> alone. That being said, there will come a moment when you need information from another microservice in your domain, and 
> you'll be tempted to hack some javascript (typescript if I'm wearing my denim apron) and brute-force an axios call. 
> **JUST DON'T**, please **just don't**. Use the `<send-request>` policy of APIM and enrich your service to your origin 
> function. Oh, and Just FYI, its pennies on the dollar for the consumption plan. I use it all the time with my non-profits 
> and so far have never had to pay for it. Your millage will very of course, depending on your transaction volume.

Okay, I'm back. Anyway, the real answer to this question if you are in greenfield development is to use Microsoft Azure 
AD B2C combined with a JWT validation policy on APIM. Celastrina is designed for this. So much so, It does not validate 
JWT tokens, even in `AuthenticatedJSONFunction`. If you are not greenfield, you'll still need to use an APIM JWT 
validation policy but you'll need to manage users and token validation yourself, easy to do if your user manager 
supports OpenID.

I'm not going to walk you though create an Azure AD B2C tenant but below is a good link that'll get you started. If 
you're not going to use AD B2C then skip past this.

https://docs.microsoft.com/en-us/azure/active-directory-b2c/

So, now you want to secure your functions created using Celastrina.

1. Create an API Manager instance for your application. Good article here https://docs.microsoft.com/en-us/azure/api-management/.
2. Create an API and link it to your azure function.
3. Create a `validate-jwt` policy.

Now, for the code, you'll need to use the `AuthenticatedJSONFunction` super class. Unlike 'JSONHTTPFunction', this 
function has the `authenticate` life-cycle implemented.

```
const {LOG_LEVEL, CelastrinaError, CelastrinaValidationError,
       JSONHTTPContext, AuthenticatedJSONFunction} = require("@celastrina/core");

/**
 * @brief Congratulations! You new Azure Function Class!
 */
class MyJsonFunction extends AuthenticatedJSONFunction {
    constructor(config = null) {
        super(config);
    }
...
```

To authenticate, Celastrina uses a `Sentry` object. To use the sentry you must load a configuration. As explained in the 
quick-start, this is one of those moments where you'll want to use managed mode and Azure Key Vault.

You will need to add to Key Vault the following secret which will be the sentry configuration:

```
{
    "issuers": [
        {
            "name: "***some unique name***", 
            "issuer": "***issuer information from your JWT token***",
            "audience": "***issuer information from your JWT token***"
        }
    ]
}    
```

You will need to place this configuration in your local.settings.json and key vault under `CLA-SENTRY-CONFIG`. So, what 
does this do? This tells the Sentry to pull the Authorization header, decode the JWT, and if the `issuer` and 
`audience` match and the token is not expired, assume the requester is authenticated.

> This is important, I never want your application to be compromised because of this understanding. **Celastrina DOES NOT 
> validate JWT out of the box.** It only decodes it. Which brings me to my next point, the architecture intended for using 
> Celastrina is one where Azure functions are never exposed to end-users and always fronted by an API Gateway like Azure 
> APIM. Again, its so easy and affordable just do it, don't fight it. :)

Issuers is an array, so you can include as many as you want, up to the 4096 bytes a Key Vault secret should hold. There 
really should only be one or two though, just saying. Here is an example of how one might look:

```
{
    "issuers": [
        {
            "name: "your-application-domain", 
            "issuer": "https://your-application-domain.b2clogin.com/b315e010-8fd0-4445-8bbc-6964a4312d60/v2.0/",
            "audience": "0c7cec12-54d6-4ed2-89d8-9fea3a11d511"
        }
    ]
} 
```

So, lets say you wanted to both authenticate from you application domain and a managed identity from Azure APIM? You 
would simply add both issuers to the configuration:

```
{
    "issuers": [
        {
            "name: "your-application-domain", 
            "issuer": "https://your-application-domain.b2clogin.com/b315e010-8fd0-4445-8bbc-6964a4312d60/v2.0/",
            "audience": "0c7cec12-54d6-4ed2-89d8-9fea3a11d511"
        },
        {
            "name: "managed-identities", 
            "match": 1,
            "issuer": "https://login.microsoftonline.com/b315e010-8fd0-4445-8bbc-6964a4312d60/v2.0",
            "audience": "0c7cec12-54d6-4ed2-89d8-9fea3a11d511",
            "subjects":[
                "86895900-d756-4d2d-aee0-6cef4a3d98ae",
                "adfb0e14-d7bb-4662-9e96-9efbcaf85b21"
            ]
        }
    ]
} 
```

Notice this time there is a `subjects` attribute added to the configuration. Most, if not all, Managed identities in 
Microsoft Azure use the same issuer and audience (which is your tenant uuid BTW) but all have their own ObjectID in your  
tenant, Azure uses the OID as the subject (`sub`) claim in JWT. You'll also notice the `match` attribute. This 
contains a number that corresponds to the `MATCH_TYPE.AUTHORIZATION` enumeration. The match type tells the Sentry how to 
match the subjects In the JWT claims. In this case, `1` equates to `MATCH_TYPE.AUTHORIZATION.MATCH_ANY`, or matching any 
of the subjects is a success. Alternatively, you could do any of the following:

```
MATCH_TYPE.AUTHORIZATION.MATCH_ANY   // = 1
MATCH_TYPE.AUTHORIZATION.MATCH_ALL   // = 2,
MATCH_TYPE.AUTHORIZATION.MATCH_NONE: // = 3
```

The default is MATCH_TYPE.AUTHORIZATION.MATCH_NONE as, in principle, its the default of Celastrina to be as restrictive 
as possible if you the developer are not declarative enough. Again, the `match` attribute is only required if you 
specify `subjects`.

> I just want to step back a moment and revisit how I architect serverless applications in Microsoft Azure. Basically, I
> have my end-user security realm stop at APIM, then use the managed securtiy realm for anything past that, with some 
> exception. I will usually pass the end-user bearer token forward to my functions as sometimes I want to access storage 
> accounts or other resources as the end-user, that's the only time I'll pass the user realm deep into Azure. This may 
> not work for you, I understand. This comes from months of experience in creating secure applications and fighting the 
> 'Azure way' of doing only to fail and refactor hundreds of lines of code.

### Sick, but What about authorization?
...

## What about unauthenticated request, can I protect those?
...

### RECAPTCHA
...
