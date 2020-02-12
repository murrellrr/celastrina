/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");
const {LOG_LEVEL, BaseContext, BaseFunction} = require("./BaseFunction");

/**
 * @typedef _AzureFunctionRequest
 * @property {Object} headers
 * @property {Object} params
 * @property {Object} body
 */

/**
 * @typedef _AzureFunctionResponse
 * @property {number} status
 * @property {Object} headers
 * @property {Object} body
 */

/**
 * @typedef _AzureLog
 * @property error
 * @property warn
 * @property verbose
 * @property info
 */

/**
 * @typedef {Object} _Body
 */

/**
 * @typedef _AzureFunctionContext
 * @property {Object} bindings
 * @property {_AzureLog} log
 *
 * @typedef {Base & _AzureFunctionContext} _AzureHTTPFunctionContext
 * @property {_AzureFunctionResponse} res
 * @property {_AzureFunctionRequest} req
 * @property {Object} params
 * @property {Object} query
 * @property {string} method
 * @property {string} originalUrl
 * @property {string} rawBody
 */

/**
 * @brief Base context for an HTTP Request/Response.
 *
 * @description Used with the {HTTPFunction}
 *
 * @author Robert R Murrell
 *
 * @see HTTPFunction
 */
class HTTPContext extends BaseContext {
    /**
     * @brief
     *
     * @param {_AzureHTTPFunctionContext} context
     * @param {string} [topic]
     */
    constructor(context, topic = "HTTPFunction") {
        super(context, topic);

        this._context.res = {status: 200,
                             headers: {"Content-Type": "text/html; charset=ISO-8859-1"},
                             body: "<html lang=\"en\"><head><title>" + topic + "</title></head><body>200, Success</body></html>"};

        // Override the request ID if its there.
        let id = context.req.query["requestId"];
        if(typeof id === "string")
            this._requestId = id;
        // Checking to see if this is a monitoring request.
        /** @type {null|undefined|boolean} */
        let monitorQuery = context.req.query["monitor"];
        if((typeof monitorQuery === "undefined" && context.req.method.toLowerCase() === "trace") ||
                (typeof monitorQuery === "boolean" && monitorQuery))
            this._setContextToMonitor();
    }

    /**
     * @brief Returns the HTTP request method used.
     *
     * @returns {string}
     */
    get method() {
        return this._context.req.method.toLowerCase();
    }

    /**
     * @brief Returns the url request.
     *
     * @returns {string}
     */
    get url() {
        return this._context.req.originalUrl;
    }

    /**
     * @brief Gets the request
     *
     * @returns {_AzureFunctionRequest}
     */
    get request() {
        return this._context.req;
    }

    /**
     * @brief Gets the response.
     *
     * @returns {_AzureFunctionResponse}
     */
    get response() {
        return this._context.res;
    }

    /**
     * @brief
     *
     * @returns {Object}
     */
    get params() {
        return this._context.req.params;
    }

    /**
     * @brief
     *
     * @returns {Object}
     */
    get query() {
        return this._context.req.query;
    }

    /**
     * @brief The RAW request body.
     *
     * @returns {string}
     */
    get raw() {
        return this._context.req.rawBody;
    }

    /**
     * @brief Gets a request header.
     *
     * @param {string} name The name of the header.
     * @param {null|string} [defaultValue] The value to return if the header was undefined, null, or empty.
     *
     * @return {null|string}
     */
    getRequestHeader(name, defaultValue = null) {
        let header = this._context.req.headers[name];
        if(typeof header !== "string")
            return defaultValue;
        else
            return header;
    }

    /**
     * @brief Gets a response header.
     *
     * @param {string} name The name of the header.
     * @param {null|string} [defaultValue] The value to return if the header was undefined, null, or empty.
     *
     * @return {string}
     */
    getResponseHeader(name, defaultValue = null) {
        let header = this._context.res.headers[name];
        if(typeof header !== "string")
            return defaultValue;
        else
            return header;
    }

    /**
     * @brief Sets a response header.
     *
     * @param {string} name The name of the header.
     * @param {string} value The value to set.
     */
    setResponseHeader(name, value) {
        this._context.res.headers[name] = value;
    }

    /**
     * @brief Returns the request body.
     *
     * @returns {_Body}
     */
    get requestBody() {
        return this._context.req.body;
    }

    /**
     * @brief Returns the response body.
     *
     * @returns {_Body}
     */
    get responseBody() {
        return this._context.res.body;
    }

    /**
     * @brief Sets the body of the response and invoked done on the context.
     *
     * @param {*} [body]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        this._context.res.status = status;
        this._context.res.headers["X-nodoubtshowcase-request-uuid"] = this._requestId;

        if(status !== 204) {
            if (body === null) {
                let content = this._topic + ", " + status + ".";
                this._context.res.body = "<html lang=\"en\"><head><title>" + content + "</title></head><body>" + content +
                    "</body></html>";
            }
            else
                body = body.toString();
        }

        this._context.res.body = body;
    }

    /**
     * @brief Sends an HTTP 400 error from an {CelastrinaValidationError}.
     *
     * @param {null|CelastrinaValidationError} [error]
     */
    sendValidationError(error = null) {
        if(!(error instanceof CelastrinaValidationError))
            error = CelastrinaValidationError.newValidationError("Bad request.", this._requestId);
        this.send(error, error.code);
    }

    /**
     * @brief Sends a redirect to the calling end-point.
     *
     * @param {string} url
     * @param {null|Object} [body]
     */
    sendRedirect(url, body = null) {
        this._context.res.headers["Location"] = url;
        this.send(body, 302);
    }

    /**
     * @brief Sends a redirect to the calling end-point and places the request bodt in the response body.
     *
     * @param {string} url
     */
    sendRedirectForwardBody(url) {
        this.sendRedirect(url, this._context.req.body);
    }

    /**
     * @brief Sends an HTTP 400 error from an {CelastrinaValidationError}.
     *
     * @param {null|CelastrinaError} [error]
     */
    sendServerError(error = null) {
        if(!(error instanceof CelastrinaError))
            error = CelastrinaError.newError("Server Error.");
        this.send(error, error.code);
    }

    /**
     * @brief Sends an HTTP 4001error from an {CelastrinaValidationError}.
     *
     * @param {null|CelastrinaError} [error]
     */
    sendNotAuthorizedError(error= null) {
        if(!(error instanceof CelastrinaError))
            error = CelastrinaError.newError("Not Authorized.", 401);
        this.send(error, 401);
    }

    /**
     * @brief Sends an HTTP 400 error from an {CelastrinaValidationError}.
     *
     * @param {null|CelastrinaError} [error]
     */
    sendForbiddenError(error = null) {
        if(!(error instanceof CelastrinaError))
            error = CelastrinaError.newError("Forbidden.", 403);
        this.send(error, 403);
    }
}

/**
 * @brief Extension of the {BaseFunction} that handles HTTP triggers.
 *
 * @description Implementors must create a httpTrigger input binding named <code>red</code> and an output binding named
 *              res to handle the HTTP request and response objects respectively.
 *
 * @author Robert R Murrell
 *
 * @see BaseFunction
 */
class HTTPFunction extends BaseFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     */
    constructor(config = null) {
        super(config);
    }

    /**
     * @brief Converts an Azure function context to an {HTTPContext}.
     *
     * @param {_AzureFunctionContext} context The base Azure Function Context.
     *
     * @returns {Promise<BaseContext & HTTPContext>}
     */
    async createContext(context) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new HTTPContext(context, this._topic));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Handles an HTTP GET request.
     *
     * @description Override this function to handle an HTTP GET request. Sends response 204 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _get(context) {
        return new Promise((resolve) => {
            context.log("WARNING: GET Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            context.send(null, 204);
            resolve();
        });
    }

    /**
     * @brief Handles an HTTP PATCH request.
     *
     * @description Override this function to handle an HTTP PATCH request. Sends response 501 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _patch(context) {
        return new Promise((reject) => {
            context.log("WARNING: PATCH Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP PUT request.
     *
     * @description Override this function to handle an HTTP PUT request. Sends response 501 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _put(context) {
        return new Promise((reject) => {
            context.log("WARNING: PUT Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP POST request.
     *
     * @description Override this function to handle an HTTP POST request. Sends response 501 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _post(context) {
        return new Promise((reject) => {
            context.log("WARNING: POST Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP DELETE request.
     *
     * @description Override this function to handle an HTTP DELETE request. Sends response 501 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _delete(context) {
        return new Promise((reject) => {
            context.log("WARNING: DELETE Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP OPTOINS request.
     *
     * @description Override this function to handle an HTTP OPTOINS request. Sends response 501 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _options(context) {
        return new Promise((reject) => {
            context.log("WARNING: OPTOINS Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP HEAD request.
     *
     * @description Override this function to handle an HTTP HEAD request. Sends response 501 by default.
     *
     * @param {HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _head(context) {
        return new Promise((resolve) => {
            context.log("WARNING: HEAD Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            context.send(null, 204);
            resolve();
        });
    }

    /**
     * @brief Handles an HTTP TRACE request.
     *
     * @description <p>Override this function to handle an HTTP TRACE request. Sends response 501 by default. This function
     *              is also called by {HTTPFunction.monitor(context)} function if a monitoring message is received.</p>
     *
     *              <p>Do not invoke the {HTTPContext.send()} function from this promise. The monitor object will be
     *                 sent in the {HTTPFunction.monitor(context)} method.</p>
     *
     * @param {BaseContext | HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async _trace(context) {
        return new Promise((resolve) => {
            context.log("WARNING: TRACE Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            context.monitorResponse.addPassedDiagnostic("Defualt HTTPFunction",
                "HTTPFunction._trace(context): Not implemented.");
            resolve();
        });
    }

    /**
     * @brief Calls {HTTPFunction._trace(context)}
     *
     * @param {BaseContext | HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async monitor(context) {
        return new Promise((resolve, reject) => {
            this._trace(context)
                .then(() => {
                    let response = [{test: context.topic, passed: context.monitorResponse.passed,
                                     failed: context.monitorResponse.failed, result: context.monitorResponse.result}];
                    context.send(response, 200);
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief HTTP Exception handler.
     *
     * @param {BaseContext | HTTPContext} context
     * @param {*} exception
     *
     * @returns {Promise<void>}
     */
    async exception(context, exception) {
        return new Promise(
            (resolve) => {
                let ex = exception;
                if(ex instanceof CelastrinaValidationError)
                    context.sendValidationError(ex);
                else if(ex instanceof CelastrinaError)
                    context.sendServerError(ex);
                else if(ex instanceof Error) {
                    ex = CelastrinaError.wrapError(ex);
                    context.sendServerError(ex);
                }
                else if(typeof ex === "undefined" || ex == null) {
                    ex = CelastrinaError.newError("Unhandled server error.");
                    context.sendServerError(ex);
                }
                else {
                    ex = CelastrinaError.newError(ex.toString());
                    context.sendServerError(ex);
                }

                context.log("Request failed to process. (NAME:" + ex.cause.name + ") (MESSAGE:" +
                            ex.cause.message + ") (STACK:" + ex.cause.stack + ")", this._topic, LOG_LEVEL.LEVEL_ERROR);
                resolve();
            });
    }

    /**
     * @brief Rejects this promoise with a HTTP Bad Request Response.
     *
     * @description Override this method to handle and HTTP methods not handled by this Function. The default behavior
     *              is to respond with an HTTP 400.
     *
     * @param {BaseContext & HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async unhandledRequestMethod(context) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("HTTP Method '" + context.method + "' not supported.", 400));
        });
    }

    /**
     * @brief Dispatches the HTTP request to the corrosponding handler method.
     *
     * @param {BaseContext | HTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async process(context) {
        let httpMethodHandler = this["_" + context.method];
        let promise;

        if(typeof httpMethodHandler === "undefined")
            promise = this.unhandledRequestMethod(context);
        else
            promise = httpMethodHandler(context);

        return promise;
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class JSONHTTPContext extends HTTPContext {
    /**
     * @brief
     *
     * @param {_AzureHTTPFunctionContext} context
     * @param {string} [topic]
     */
    constructor(context, topic = "JSON HTTP function") {
        super(context, topic);
        this._context.res.headers["Content-Type"] = "application/json; charset=utf-8";
    }

    /**
     * @brief Sets the body of the response and invoked done on the context.
     *
     * @param {*} [body]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        this._context.res.status = status;
        this._context.res.headers["X-nodoubtshowcase-request-uuid"] = this._requestId;
        this._context.res.body = body;
    }
}

/**
 * @brief Implementation of the HTTPFunction designed to handle JSON.
 *
 * @description Uses the {JSONHTTPContext} object to ensure the response Content-Type header is "application/json".
 *
 * @author Robert R Murrell
 *
 * @see HTTPFunction
 * @see JSONHTTPContext
 */
class JSONHTTPFunction extends HTTPFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     */
    constructor(config = null) {
        super(config);
    }

    /**
     * @brief Returns a {JSONHTTPContext}
     *
     * @param {_AzureFunctionContext} context
     *
     * @returns {Promise<HTTPContext & JSONHTTPContext>}
     */
    async createContext(context) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new JSONHTTPContext(context, this._topic));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}

module.exports = {
    HTTPContext:      HTTPContext,
    HTTPFunction:     HTTPFunction,
    JSONHTTPContext:  JSONHTTPContext,
    JSONHTTPFunction: JSONHTTPFunction
};