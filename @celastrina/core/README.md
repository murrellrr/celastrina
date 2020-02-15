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

This configuration tells Celastrina to use the topic &quot;_Your App Name_&quot; in all logging and also tells it to not use &quot;_managed_&quot;
 mode. More about that in a minute. Lets just get down to the code.

### Example Code
Here is a simple example of the post http trigger. I know, at first it looks a little verbose but its really not. Almost everything in Celastrina is optional but I can tell you from experience, you'll end up writing all this anyway so let me do all the work for you.

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

#### So, what about that managed mode stuff again?
Well, &quot;managed&quot; mode is a little more complicated, First lets talk briefly about making stuff secure. 
Remember, Celastrina is a Microsoft Azure Framework, not a Cloud agnostic framework. Azure has specific PaaS services in 
mind to protect and manage your configurations, as well as protect access to other resources in the Cloud. Azure 
resources are a mixed bag of AAA security ranging from authorization bearer tokens like JWT, SAS tokens, and even access 
keys like those used to CRUD an Azure Cosmos DB. In my experience to date I have had to write just as convoluted set of 
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
...

### Slick, but What about authorization?
...

## What about unauthenticated request, can I protect those?
...

### RECAPTCHA
...
