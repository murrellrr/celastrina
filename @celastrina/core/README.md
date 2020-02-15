# celastrina
Javascript Framework for simplifying Microsoft Azure Functions and supporting resources.

## Prerequisite
...

## Quick-start
Wanted to get started fast? First, create an HTTP Trigger use npm azure tools:

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

Make sure you have an in and out binding named `req` and `res` respectively. This is required for Celastrina to work but will be configurable in future releases.

#### Update your local settings
Now, lets tell Celastrina what to do on start-up, its pretty simple. Add the following to your `local.settings.json`:

```
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "{AzureWebJobsStorage}",
    "YOUR-APP-CONGIGURATION": "{\"_topic\":\"Your App Name\", \"_managed\":false}"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*",
    "CORSCredentials": false
  }
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
module.exports = new MyJsonFunction("CONGIGURATION-ITEM");
```

#### So, what about that managed mode stuff again?
...

## So, I want my users to be authenticated, what do I do?
...

### Slick, but What about authorization?
...

## What about unauthenticated request, can I protect those?
...

### RECAPTCHA
...
