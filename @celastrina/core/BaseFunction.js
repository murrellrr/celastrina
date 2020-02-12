/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const axios = require("axios").default;
const {Vault} = require("./Vault");
const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");

const uuid4v = require("uuid/v4");

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
 * @function ()
 */

/**
 * @typedef {Object} _Body
 */


/**
 * @typedef _AzureFunctionContext
 * @property {Object} bindings
 * @property {_AzureLog} log
 * @property {function()|function(*)} done
 * @property {function(string)} log
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
 * @brief
 *
 * @type {{LEVEL_TRACE: number, LEVEL_INFO: number, LEVEL_VERBOSE: number, LEVEL_WARN: number, LEVEL_ERROR: number}}
 */
const LOG_LEVEL = {
    LEVEL_TRACE:   0,
    LEVEL_VERBOSE: 1,
    LEVEL_INFO:    2,
    LEVEL_WARN:    3,
    LEVEL_ERROR:   4
};

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{_topic: string, _passed: Object, _failed: Object, failed: boolean}}
 */
class MonitorResponse {
    constructor() {
        this._passed = {};
        this._failed = {};
        this._passedCheck = false;
    }

    /**
     * @brief
     *
     * @returns {Object}
     */
    get passed() {
        return this._passed;
    }

    /**
     * @brief
     *
     * @returns {Object}
     */
    get failed() {
        return this._failed;
    }

    /**
     * @brief Sets a check that was made by this monitor that passed.
     *
     * @param {string} probe
     * @param {string} message
     */
    addPassedDiagnostic(probe, message) {
        this._passed[probe] = message;
    }

    /**
     * @brief Sets a check that was made by this monitor that failed.
     *
     * @param {string} probe
     * @param {string} message
     */
    addFailedDiagnostic(probe, message) {
        if(!this._passedCheck) this._passedCheck = !this._passedCheck;
        this._failed[probe] = message;
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get result() {
        if(this._passedCheck)
            return "FAILED";
        else
            return "PASSED";
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class DefaultSecurePropertyHandler {
    constructor() {}

    /**
     * @brief
     *
     * @param {string} key
     * @param {null|string} defaultValue
     *
     * @returns {Promise<string>}
     */
    async getSecureEnvironmentProperty(key, defaultValue = null) {
        return new Promise((resolve) => {
            let value = process.env[key];
            if(typeof value === "undefined" || value.trim().length === 0)
                value = defaultValue;
            resolve(value);
        });
    }
}

/**
 * @type {{_vault: Vault}}
 */
class VaultPropertyHandler extends DefaultSecurePropertyHandler {
    /**
     * @prief
     *
     * @param {Vault} vault
     */
    constructor(vault) {
        super();
        this._vault = vault;
        this._cache = {};
    }

    /**
     * @brief
     *
     * @param {string} key
     * @param {null|string} defaultValue
     *
     * @returns {Promise<string>}
     */
    async getSecureEnvironmentProperty(key, defaultValue = null) {
        return new Promise(
            (resolve, reject) => {
                let result = this._cache[key];
                if(typeof result === "undefined") {
                    super.getSecureEnvironmentProperty(key, defaultValue)
                        .then((value) => {
                            return this._vault.getSecret(value);
                        })
                        .then((secret) => {
                            this._cache[key] = secret;
                            resolve(secret);
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                }
                else
                    resolve(result);
            });
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{_context: _AzureFunctionContext, _requestId: string, _topic: string}}
 */
class BaseContext {
    /**
     * @brief
     *
     * @param {_AzureFunctionContext} context
     * @param {string} [topic]
     */
    constructor(context, topic = "function") {
        /** @type {_AzureFunctionContext} */
        this._context         = context;
        this._topic           = topic;
        this._monitor         = false;
        this._requestId       = uuid4v();
        this._monitorResponse = null;
        /** @type {DefaultSecurePropertyHandler} */
        this._properties      = new DefaultSecurePropertyHandler();
    }

    /**
     * @brief
     *
     * @param {DefaultSecurePropertyHandler} handler
     */
    _setPropertyHandler(handler) {
        this._properties = handler;
    }

    /**
     * @brief Switches this context to monitor mode.
     *
     * @description Should only be used by classes extending this class.
     */
    _setContextToMonitor() {
        if(!this._monitor) {
            this._monitor         = true;
            this._monitorResponse = new MonitorResponse();
        }
    }

    /**
     * @brief Returns true if this a monitor message, false otherwise.
     *
     * @returns {boolean}
     */
    get isMonitorInvocation() {
        return this._monitor;
    }

    /**
     * @brief Returns the monitor response or null if this was not a monitor message.
     *
     * @description Use this to record your passed or failed checks you've mode.
     *
     * @returns {MonitorResponse|null}
     */
    get monitorResponse() {
        return this._monitorResponse;
    }

    /**
     * @brief
     *
     * @returns {_AzureFunctionContext}
     */
    get context() {
        return this._context;
    }

    /**
     * @brief Returns the topic for this context.
     *
     * @description The topic is the textual context of this software context and is used in logging through the
     *              context.
     *
     * @returns {string}
     */
    get topic() {
        return this._topic;
    }

    /**
     * @brief Returns the uuid for this transaction.
     *
     * @returns {string}
     */
    get requestId() {
        return this._requestId;
    }

    /**
     * @brief Returns a binding object by name
     *
     * @param {string} name The binding to get.
     */
    getBinding(name) {
        return this._context.bindings[name];
    }

    /**
     * @brief Sets a binding object.
     *
     * @param {string} name
     * @param {Object} value
     */
    setBinding(name, value) {
        this._context.bindings[name] = value;
    }

    /**
     * @brief
     *
     * @param {string} key
     * @param {null|string} [defaultValue]
     *
     * @return {Promise<string>}
     */
    async getEnvironmentProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            try {
                let value = process.env[key];
                if(typeof value === "undefined")
                    value = defaultValue;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
     *
     * @param {string} key
     * @param {null|string} [defaultValue]
     *
     * @return {Promise<string>}
     */
    async getSecureEnvironmentProperty(key, defaultValue = null) {
        return this._properties.getSecureEnvironmentProperty(key, defaultValue);
    }

    /**
     * @brief
     *
     * @param {Object} message
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    log(message = "[NO MESSAGE]", level = LOG_LEVEL.LEVEL_TRACE, subject = null) {
        let out = "[" + this._topic + "][LEVEL " + level + "]";
        if(typeof subject !== "undefined" && subject != null)
            out += "[" + subject + "]";
         out += "[" + this._requestId + "]:" + message.toString();

        switch(level) {
            case LOG_LEVEL.LEVEL_INFO:
                this._context.log.info(out);
                break;
            case LOG_LEVEL.LEVEL_ERROR:
                this._context.log.error(out);
                break;
            case LOG_LEVEL.LEVEL_WARN:
                this._context.log.warn(out);
                break;
            case LOG_LEVEL.LEVEL_VERBOSE:
                this._context.log.verbose(out);
                break;
            default:
                this._context.log(out);
        }
    }

    /**
     * @brief
     *
     * @param {Object} object
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    logObjectAsJSON(object, level = LOG_LEVEL.LEVEL_TRACE, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }

    /**
     * @brief Calls context.done on the function context with the optional parameter.
     *
     * @param {null|Object} value
     */
    done(value = null) {
        if(value === null)
            this._context.done();
        else
            this._context.done(value);
    }
}

/**
 * @brief Base function class to use with Azure functions.
 *
 * @description <p>{BaseFunction} invokes an Azure Function using the following lifecycle:
 *                  <ul>
 *                      <li>initialize</li>
 *                      <li>authenticate</li>
 *                      <li>validate</li>
 *                      <li>load</li>
 *                      <li>process</li>
 *                      <li>save</li>
 *                      <li>terminate</li>
 *                  </ul></p>
 *              <p>
 *                  If a monitoring request is received then the process lifecycle will be replaced with a monitor
 *                  lifecycle action. Monitoring requests are used to interrogate an Azure Function and ensure the
 *                  function will perform as intended without performing a real, or otherwise perminent business
 *                  action. The {BaseFunction} class itself cannot detect a monitor request and must be implemented by
 *                  sub classes of this object. {BaseFunction} will follow the monitor lifecycle when the {BaseContext}
 *                  function {BaseContext.isMonitorInvocation()} returns <code>true</code>.
 *              </p>
 *              <p>
 *                  If an exception is thrown between the initialize and terminate lifecycles then an exception lifecycle
 *                  will be performed. Once an exception occurs, no further processing of the lifecycles between
 *                  initialize and terminate will be performed, only completing the terminate lifecycle before
 *                  gracefully completing the function. If an exception is thrown during the exception or terminate
 *                  lifecycles then an unhandled exception is reported and the functions is gracefully completed. This
 *                  framework will make every attempt to gracefully handle an exception. If your Azure function gets a
 *                  hard exception while using this framework please report a bug! The default exception handler will
 *                  check for an CelastrinaError and is present, will additionally check the {CelastrinaError.drop} attribute. If
 *                  <code>true</code>, no value will be returned from the Azure Context drop function, effectively
 *                  instructing the Azure Function to terminate gracefully. If using asynchronous functions, this will
 *                  deque the message even if not successful. If {CelastrinaError.drop} is <code>false</code>, the error
 *                  message will be returned, causing an Azure Function failure.
 *              </p>
 *
 * @author Robert R Murrell
 *
 * @type {{_topic: string, _managed: boolean}}
 */
class BaseFunction {
    /**
     * @brief Initializes the function class.
     *
     * @description The config attribute must be null or an environment variable that contains JSON with the following
     *              attributes: <code>{"_topic": "string", "_managed": boolean}</code>. If no configuration is specified
     *              the {BaseFunction._topic} will default to "BaseFunction" and {BaseFunction._managed} will default to
     *              true.
     *
     * @param {null|string} [config] String key to an environment variable (Application Setting) containing the
     *                               serialized JSON string configuration. Default is <code>null</code>.
     */
    constructor(config = null) {
        this._topic   = "BaseFunction";
        this._managed = true;
        if(typeof config === "string" && (config.trim().length !== 0))
            Object.assign(this, JSON.parse(process.env[config]));
    }

    /**
     * @brief Creates an implementations of Base Context from the Azure Function context passed in.
     *
     * @description Override this function to create the instance of BaseContext required for your function.
     *
     * @param {_AzureFunctionContext} context
     *
     * @returns {Promise<BaseContext>} The base context for this function.
     */
    async createContext(context) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new BaseContext(context, this._topic));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Lifecycle operation to initialize any objects required to perform the function.
     *
     * @description Override this function to perform any initialization actions.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async initialize(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to authenticate a requester before performing the action.
     *
     * @description Override this function to perform any authentication actions.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async authenticate(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to validate the payload before performing the rest of the lifecycle.
     *
     * @description Override this function to perform any validation actions.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async validate(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Override this method to respond to monitor requests.
     *
     * @description Fill out the monitor response and resolve. do not use send or done. This must return a promise that
     *              either resolves to void or rejects with a type of {CelastrinaError}
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async monitor(context) {
        return new Promise(
            (resolve) => {
                context.log("No monitoring checks performed, monitor not overridden.",
                    this._topic, LOG_LEVEL.LEVEL_WARN);
                context.monitorResponse.addPassedDiagnostic("default", "Monitor not overridden.");
                resolve();
            });
    }

    /**
     * @brief Lifecycle operation to load information before performing the rest of the lifecycle.
     *
     * @description Override this function to perform any loading actions.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async load(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to process the request.
     *
     * @description Override this function to perform business logic of this function.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async process(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to save information after the process lifecycle.
     *
     * @description Override this function to save any states after processing.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async save(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to save handle any exceptions during the lifecycle, up to processing.
     *
     * @description Override this function to handle any exceptions up to processing.
     *
     * @param {BaseContext} context The context of the function.
     * @param {*} exception
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async exception(context, exception) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to clean up prior to the completion of the function.
     *
     * @description Override this function to clean up before complettion.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async terminate(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Initialized the key vualt resource using the MSI managed identity configuration.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async managedInit(context) {
        return new Promise(
            (resolve, reject) => {
                let params = new URLSearchParams();
                params.append("resource", "https://vault.azure.net");
                params.append("api-version", "2017-09-01");
                let config = {params: params,
                    headers: {"secret": process.env["MSI_SECRET"]}};

                axios.get(process.env["MSI_ENDPOINT"], config)
                    .then((response) => {
                        context._setPropertyHandler(new VaultPropertyHandler(new Vault(response.data.access_token)));
                        return this.initialize(context);
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }

    /**
     * @brief Method called by the Azure Function to execute the lifecycle.
     *
     * @param {_AzureFunctionContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    execute(context) {
        /** @type {BaseContext} */
        let _context = null;
        try {
            this.createContext(context)
                .then((local) => {
                    _context = local;
                    let _promise;
                    if (this._managed) {
                        _context.log("Function Invoked in Managed Mode. Initializing Vault.",
                                     LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
                        _promise = this.managedInit(_context);
                    } else {
                        _context.log("Function Invoked.",
                                     LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
                        _context.log("Initialization Lifecycle.");
                        _promise = this.initialize(_context);
                    }

                    // Execute the rest of the lifecycle.
                    _promise
                        .then(() => {
                            _context.log("Validate Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                         "BaseFunction.execute(context)");
                            return this.validate(_context);
                        })
                        .then(() => {
                            _context.log("Authenticate Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                         "BaseFunction.execute(context)");
                            return this.authenticate(_context);
                        })
                        .then(() => {
                            _context.log("Load Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                         "BaseFunction.execute(context)");
                            return this.load(_context);
                        })
                        .then(() => {
                            if (_context.isMonitorInvocation) {
                                _context.log("Monitor Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                             "BaseFunction.execute(context)");
                                return this.monitor(_context);
                            } else {
                                _context.log("Process Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                             "BaseFunction.execute(context)");
                                return this.process(_context);
                            }
                        })
                        .then(() => {
                            return this.save(_context);
                        })
                        .catch((exception) => {
                            _context.log("Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR,
                                         "BaseFunction.execute(context)");
                            return this.exception(_context, exception);
                        })
                        .then(() => {
                            _context.log("Terminate Lifecycle.");
                            return this.terminate(_context);
                        })
                        .then(() => {
                            _context.log("Function lifecycle complete.", LOG_LEVEL.LEVEL_INFO,
                                         "BaseFunction.execute(context)");
                            _context.done();
                        })
                        .catch((exception) => {
                            _context.log("Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR,
                                         "BaseFunction.execute(context)");
                            this._unhandled(context, exception);
                        });
                })
                .catch((exception) => {
                    context.log.error("[BaseFunction.execute(context)]:Critical unhandled exception, done.");
                    this._unhandled(context, exception);
                });
        }
        catch(exception) {
            context.log.error("[BaseFunction.execute(context)]:Critical unhandled exception, done.");
            this._unhandled(context, exception);
        }
    }

    /**
     * @brief Determines the class of exceptions an sends the appropriate message to the calling end-pont.
     *
     * @param {_AzureFunctionContext} context
     * @param {*} exception
     *
     * @private
     */
    _unhandled(context, exception) {
        let ex = exception;
        if(!(ex instanceof CelastrinaError)) {
            if(ex instanceof Error)
                ex = CelastrinaError.wrapError(ex);
            else if (typeof ex === "undefined" || ex == null)
                ex = CelastrinaError.newError("Unhandled server error.");
            else
                ex = CelastrinaError.newError(ex.toString());
        }

        context.log.error("[BaseFunction._unhandled(context, exception)][exception](NAME:" +
                          ex.cause.name + ") (MESSAGE:" + ex.cause.message + ") (STACK:" + ex.cause.stack + ")");

        if(ex.drop)
            context.done();
        else
            context.done(ex);
    }
}

module.exports = {
    LOG_LEVEL:    LOG_LEVEL,
    BaseContext:  BaseContext,
    BaseFunction: BaseFunction
};


