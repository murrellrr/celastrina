/*
 * Copyright (c) 2020, Robert R Murrell.
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
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
 * @brief JWT Claims from the Authorization header bearer token.
 *
 * @author Robert R Murrell
 *
 * @type {{subject: null|string, roles: string[]}}
 */
class BaseUser {
    /**
     * @brief
     *
     * @param {null|string} [sub]
     */
    constructor(sub = null) {
        this._version    = "1.0";
        this._subject    = sub;
        this._roles      = [];
    }

    /**
     * @brief Returns the framework version of this claims token.
     *
     * @returns {string} the framework version of this claims token.
     */
    get version() {
        return this._version;
    }

    /**
     * @brief
     *
     * @returns {null|string}
     */
    get subject() {
        return this._subject;
    }

    /**
     * @brief
     *
     * @returns {string[]}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief
     *
     * @param {string[]} roles
     */
    addRoles(roles) {
        if(typeof roles === "undefined" || roles == null || !Array.isArray(roles))
            throw CelastrinaError.newError("Roles are required.");
        this._roles = roles.concat(this._roles);
    }

    /**
     * @brief
     *
     * @param {string} role
     */
    addRole(role) {
        if(typeof role !== "string" || role.trim().length === 0 || this._roles.includes(role))
            throw CelastrinaError.newError("Role is required and cannot be duplicate.");
        this._roles.unshift(role);
    }

    /**
     * @brief
     *
     * @param {string} role
     */
    removeRole(role) {
        if(typeof role === "string" && role.trim().length > 0 && this.roles.includes(role)) {
            let index;
            if((index =this._roles.indexOf(role)) > -1)
                this._roles = this._roles.slice(index, 1);
        }
    }

    /**
     * @brief
     *
     * @param {string} role
     */
    isInRole(role) {
        return this._roles.includes(role);
    }

    /**
     * @brief
     *
     * @param {string} json
     *
     * @return {Object}
     */
    parse(json) {
        Object.assign(this, JSON.parse(json));
    }

    /**
     * @brief
     *
     * @returns {*}
     */
    toJSON() {
        return {_subject: this._subject, _roles: this._roles};
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
        this.user             = null;
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
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{config: SentryConfig, _user: null|JwtUser, appTokens: Object, managedTokens: Object}}
 */
class Sentry {
    /**
     * @brief
     *
     * @param {SentryConfig} config
     */
    constructor(config) {
        if(!(config instanceof SentryConfig))
            throw CelastrinaError.newError("Not authorized.", 401);
        this._user         = null;
        this.appTokens     = {};
        this.managedTokens = {};
        this.config        = config;
        this.roles         = [];
    }

    /**
     * @brief
     *
     * @returns {null|JwtUser}
     */
    get user() {
        return this._user;
    }

    /**
     * @brief
     *
     * @param {string} bearerToken
     *
     * @returns {Promise<BaseUser>}
     */
    async authenticate(bearerToken) {
        return new Promise(
            (resolve, reject) => {
                if(typeof bearerToken === "undefined" || bearerToken == null || !bearerToken.trim())
                    reject(CelastrinaError.newError("Not authorized.", 401));
                else {
                    this._user  = JwtUser.decode(bearerToken);
                    let now = moment();
                    if(now.isSameOrAfter(this._user.expires))
                        reject(CelastrinaError.newError("Not Authorized.", 401));
                    else {
                        let issuers = this.config.issuers;
                        let matched = false;
                        for(const index in issuers) {
                            /** @type Issuer */
                            if(issuers[index].setRoles(this._user, this.roles) && !matched)
                                matched = true;
                        }

                        if(matched)
                            resolve(_user);
                        else
                            reject(CelastrinaError.newError("Not Authorized.", 401));
                    }
                }
            });
    }

    /**
     * @brief Decrypts an application specific claims object.
     *
     * @param {string} claims The claims to decrypt. Typically a cookie shared with this domain.
     *
     * @returns {Promise<Object>} The application specific claims object.
     */
    async loadApplicationClaims(claims) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if(typeof claims !== "undefined" && claims != null) {
                        let iv        = new Buffer(this.config.crypto.iv);
                        let ivstring  = iv.toString("hex");
                        let cipher    = Buffer.from(claims, "base64").toString("hex");
                        let key       = crypto.createHash("sha256").update(this.config.crypto.key).digest();
                        let decipher  = crypto.createDecipheriv("aes256", key, ivstring);
                        let decrypted = decipher.update(cipher, "hex", "utf8");
                        decrypted += decipher.final("utf8");
                        resolve(decrypted);
                    }
                    else
                        reject(CelastrinaError.newError("Invalid application claims."));
                }
                catch (exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Encrypts an application specific claims object.
     *
     * @param {Object} claims The application specific claims object to encrypt.
     *
     * @returns {Promise<string>} Base64 encoded encrypted claims object.
     */
    async createApplicationClaims(claims) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if(typeof claims !== "undefined" && claims != null) {
                        let iv        = new Buffer(this.config.crypto.iv);
                        let ivstring  = iv.toString("hex");
                        let key       = crypto.createHash("sha256").update(this.config.crypto.key).digest();
                        let cipher    = crypto.createCipheriv("aes256", key, ivstring);
                        let encrypted = cipher.update(JSON.stringify(claims), "utf8", "hex");
                        encrypted += cipher.final("hex");
                        resolve(Buffer.from(encrypted, "hex").toString("base64"));
                    }
                    else
                        reject(CelastrinaError.newError("Invalid application claims."));
                }
                catch (exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Registers an application resource.
     *
     * @description <p>An application resources registration is the resource-based bearer token from a AZAD Domain
     *              registered application. Use the client ID (Application ID), AZAD tenant (domain name), and a
     *              resource ID (URL to a resource) will create a bearer token. Add that token to any REST API call
     *              when an app resources has been granted access.</p>
     *
     *              <p>This method uses the application authority,tenant, id, and secret from the {SentryConfig}
     *              object to create application resources.</p>
     *
     *              <p>Sentry also uses Microsoft adal-node to generate the token.</p>
     *
     * @param {string} resource The name of the resource.
     *
     * @returns {Promise<void>}
     *
     * @see SentryConfig
     */
    async registerAppResource(resource) {
        return new Promise(
            (resolve, reject) => {
                let adContext = new AuthenticationContext(this.config.application.authority + "/" +
                    this.config.application.tenant);
                adContext.acquireTokenWithClientCredentials(resource, this.config.application.credentials.id,
                    this.config.application.secret,
                    (err, response) => {
                        if(err)
                            reject(CelastrinaError.newError("Not authorized.", 401));
                        else {
                            this.appTokens[resource] = response;
                            resolve();
                        }
                    });
            });
    }

    /**
     * @brief Creates a resource authorization from a managed identity.
     *
     * @description For this function to work properly your azure function must have managed identities enabled.
     *
     * @param {string} resource
     * @param {string} endpoint
     * @param {string} secret
     *
     * @returns {Promise<void>}
     */
    async registerManagedResource(resource, endpoint, secret) {
        return new Promise(
            (resolve, reject) => {
                let params = new URLSearchParams();
                params.append("resource", resource);
                params.append("api-version", "2017-09-01");
                let config = {params: params,
                    headers: {"secret": this.config.msi.secret}};
                axios.get(this.config.msi.endpoint, config)
                    .then((/**@type {_AxiosResponse}*/response) => {
                        this.managedTokens[resource] = response.data;
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }

    /**
     * @brief
     *
     * @param {string} resource
     * @param {{}} headers
     */
    setAppResourceAuthorization(resource, headers) {
        /**@type {TokenResponse}*/
        let tokenObject = this.appTokens[resource];

        if(typeof tokenObject === "undefined" )
            throw CelastrinaError.newError("Not Authorized.", 401);
        else
        if(tokenObject.tokenType === "Bearer") {
            let now = moment();
            let exp = moment(tokenObject.expiresOn);

            if(now.isSameOrAfter(exp))
                throw CelastrinaError.newError("Not Authorized.", 401);

            headers["Authorization"] = "Bearer " + tokenObject.accessToken;
        }
        else
            throw CelastrinaError.newError("Token type " + tokenObject.tokenType + " not supported.");
    }

    /**
     * @brief
     *
     * @param {string} resource
     * @param {{}} headers
     */
    setManagedResourceAuthorization(resource, headers) {
        /**@type {_ManagedResourceToken}*/
        let tokenObject = this.managedTokens[resource];

        if(typeof tokenObject === "undefined")
            throw CelastrinaError.newError("Not Authorized.", 401);
        else
        if(tokenObject.token_type === "Bearer") {
            let now = moment();
            let exp = moment(tokenObject.expires_on);

            if(now.isSameOrAfter(exp))
                throw CelastrinaError.newError("Not Authorized.", 401);

            headers["Authorization"] = "Bearer " + tokenObject.access_token;
        }
        else
            throw CelastrinaError.newError("Token type " + tokenObject.token_type + " not supported.");
    }

    /**
     * @brief
     *
     * @param {{}} headers
     */
    setUserAuthorization(headers) {
        headers["Authorization"] = "Bearer " + this._user.token;
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
     * @brief Lifecycle operation to perform key operations of setting up and bootstrapping this function.
     *
     * @description <p>Override this function to perform any pre-initialization tasks. The lifecycle is invoked after
     *              the context is created but before initialization. Implementors MUST call the super of
     *              or this function may not work as intended or produce errors.</p>
     *
     *              <p>Do not rely on any internal features of this function while inside this promise.</p>
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async bootstrap(context) {
        return new Promise((resolve) => {
            resolve();
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
     * @description Override this function to perform any authentication actions. If you need to validate anything
     *              related to authentication you'll need to do it here as validation lifecycle is invoked AFTER
     *              authentication and authorization.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<BaseUser>} An instance of BaseUser.
     *
     * @throws {CelastrinaError} if the user cannot be authenticated for any reason.
     */
    async authenticate(context) {
        return new Promise((resolve) => {
            resolve(new BaseUser());
        });
    }

    /**
     * @brief Lifecycle operation to authorize a requester before performing the action.
     *
     * @description Override this function to perform any authorization actions. If you need to validate anything
     *              related to authorization you'll need to do it here as validation lifecycle is invoked AFTER
     *              authorization.
     *
     * @param {BaseContext} context The context of the function.
     * @param {BaseUser} user The user to authorize.
     *
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the user cannot be authorized for any reason.
     */
    async authorize(context, user) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to validate the business input before performing the rest of the lifecycle.
     *
     * @description Override this function to perform any validation actions.
     *
     * @param {BaseContext} context The context of the function.
     *
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     *
     * @throws {CelastrinaValidationError} if the input cannot be validated.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the monitor lifecycle fails for any reason.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the load lifecycle fails for any reason.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the process lifecycle fails for any reason.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the save lifecycle fails for any reason.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the exception lifecycle fails for any reason.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the terminate lifecycle fails for any reason.
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
     * @returns {Promise<void>} Void if successful.
     *
     * @throws {CelastrinaError} if the secureInitialize lifecycle fails for any reason.
     */
    async secureInitialize(context) {
        return new Promise(
            (resolve, reject) => {
                context.log("Secure Initialize Lifecycle.",
                            LOG_LEVEL.LEVEL_INFO, "BaseFunction.secureInitialize(context)");
                
                let params = new URLSearchParams();
                params.append("resource", "https://vault.azure.net");
                params.append("api-version", "2017-09-01");
                let config = {params: params,
                    headers: {"secret": process.env["MSI_SECRET"]}};

                axios.get(process.env["MSI_ENDPOINT"], config)
                    .then((response) => {
                        context._setPropertyHandler(new VaultPropertyHandler(new Vault(response.data.access_token)));
                        context.log("Initialize Lifecycle.",
                            LOG_LEVEL.LEVEL_INFO, "BaseFunction.secureInitialize(context)");
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
     */
    execute(context) {
        /** @type {BaseContext} */
        let _context = null;
        try {
            this.createContext(context)
                .then((local) => {
                    _context = local;
                    _context.log("Bootstrap Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                        "BaseFunction.execute(context)");
                    return this.bootstrap(_context);
                })
                .then(() => {
                    let _promise;
                    if(this._managed) {
                        _context.log("Function Invoked in Secure Managed Mode. Initializing Vault.",
                                     LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
                        _promise = this.secureInitialize(_context);
                    } else {
                        _context.log("Function Invoked.",
                                     LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
                        _context.log("Initialize Lifecycle.",
                            LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
                        _promise = this.initialize(_context);
                    }

                    // Execute the rest of the lifecycle.
                    _promise
                        .then(() => {
                            _context.log("Authenticate Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                         "BaseFunction.execute(context)");
                            return this.authenticate(_context);
                        })
                        .then((user) => {
                            _context.log("Authorize Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            _context.user = user;
                            return this.authorize(_context, user);
                        })
                        .then(() => {
                            _context.log("Validate Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            return this.validate(_context);
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
                            _context.log("Save Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            return this.save(_context);
                        })
                        .catch((exception) => {
                            _context.log("Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR,
                                         "BaseFunction.execute(context)");
                            return this.exception(_context, exception);
                        })
                        .then(() => {
                            _context.log("Terminate Lifecycle.",
                                LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
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
    LOG_LEVEL:                    LOG_LEVEL,
    MonitorResponse:              MonitorResponse,
    DefaultSecurePropertyHandler: DefaultSecurePropertyHandler,
    VaultPropertyHandler:         VaultPropertyHandler,
    BaseContext:                  BaseContext,
    BaseUser:                     BaseUser,
    BaseFunction:                 BaseFunction
};


