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

/**
 * @author Robert R Murrell
 * @copyright Robert R Murrell
 * @license MIT
 */

"use strict";

const axios  = require("axios").default;
const moment = require("moment");
const uuid4v = require("uuid/v4");
const crypto = require('crypto');
const {TokenResponse, AuthenticationContext} = require("adal-node");
const {CelastrinaError} = require("./CelastrinaError");
const {PropertyHandler, AppSettingsPropertyHandler, Property,
       JsonProperty, StringProperty, BooleanProperty, NumericProperty, } = require("./Property");
const {Vault} = require("./Vault");
const {App} = require("./Property");

/**
 * @typedef _ManagedResourceToken
 * @property {string} access_token
 * @property {string} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */
/**
 * @typedef _CelastrinaToken
 * @property {string} resource
 * @property {string} token
 * @property {moment.Moment} expires
 */
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
 * @property {Object & {req: Object, res: Object}} bindings
 * @property {Object & {invocationId: string}} bindingData
 * @property {_AzureLog} log
 * @property {function()|function(*)} done
 * @property {function(string)} log
 * @property {string} invocationId
 * @property {Object} traceContext
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
/*
 * *********************************************************************************************************************
 * APPLICATION AUTHENTICATION AND AUTHORIZATION
 * *********************************************************************************************************************
 */
/**
 * @type {{_authority:StringProperty|string, _tenant:StringProperty|string, _id:StringProperty|string,
 *         _secret:StringProperty|string}}
 * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-client-application-configuration
 */
class ApplicationAuthorization {
    /**
     * @param {StringProperty|string} authority
     * @param {StringProperty|string} tenant
     * @param {StringProperty|string} id
     * @param {StringProperty|string} secret
     * @param {Array.<StringProperty|string>} [resources]
     * @param {BooleanProperty|boolean} [managed]
     */
    constructor(authority, tenant, id,
                secret, resources = [], managed = false) {
        this._authority = authority;
        this._tenant    = tenant;
        this._id        = id;
        this._secret    = secret;
        this._resources = resources;
        this._managed   = managed;
        this._tokens    = {};
    }

    /**
     * @returns {string}
     */
    get authority() {
        return this._authority;
    }

    /**
     * @returns {string}
     */
    get tenant() {
        return this._tenant;
    }

    /**
     * @returns {string}
     */
    get id() {
        return this._id;
    }

    /**
     * @returns {string}
     */
    get secret() {
        return this._secret;
    }

    /**
     * @returns {boolean}
     */
    get managed() {
        return this._managed;
    }

    /**
     * @param {StringProperty|string} resource
     * @returns {ApplicationAuthorization}
     */
    addResource(resource) {
        this._resources.unshift(resource);
        return this;
    }

    /**
     * @returns {Array.<string>}
     */
    get resources() {
        return this._resources;
    }

    /**
     * @param {string} resource
     * @returns {Promise<string>}
     */
    async getToken(resource) {
        return new Promise((resolve, reject) => {
            /** @type {_CelastrinaToken} */
            let token = this._tokens[resource];
            if(typeof token !== "object")
                reject(CelastrinaError.newError("Resource '" + resource + "' not authorized for " +
                                                 "application '" + this._id + "'.", 401));
            else {
                let exp = token.expires;
                let now = moment();
                if(exp.isSameOrAfter(now))
                    this.refreshToken(resource)
                        .then((rtoken) => {
                            resolve(rtoken);
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                else
                    resolve(token.token);
            }
        });
    }

    /**
     * @param {string} resource
     * @returns {Promise<string>}
     * @private
     */
    async _refreshManagedToken(resource) {
        return new Promise((resolve, reject) => {
            let params = new URLSearchParams();
            params.append("resource", resource);
            params.append("api-version", "2017-09-01");
            let config = {/** @type {URLSearchParams} */params: params, headers: {"secret": this._secret}};
            axios.get(this._tenant, config)
                .then((response) => {
                    let token = {resource: resource,
                                 token: response.data.access_token,
                                 expires: moment(response.data.expires_on)};
                    this._tokens[token.resource] = token;
                    resolve(token.token);
                })
                .catch((exception) =>{
                    reject(exception);
                });
        });
    }

    /**
     * @param {string} resource
     * @returns {Promise<string>}
     * @private
     */
    async _refreshApplicationToken(resource) {
        return new Promise((resolve, reject) => {
            let adContext = new AuthenticationContext(this._authority + "/" + this._tenant);
            adContext.acquireTokenWithClientCredentials(resource, this._id, this._secret,
                (err, response) => {
                    if(err)
                        reject(CelastrinaError.newError("Not authorized.", 401));
                    else {
                        let token = {resource: resource,
                                     token: response.accessToken,
                                     expires: moment(response.expiresOn)};
                        this._tokens[token.resource] = token;
                        resolve(token.token);
                    }
                });
        });
    }

    /**
     * @param {string} resource
     * @returns {Promise<string>}
     */
    async refreshToken(resource) {
        return new Promise((resolve, reject) => {
            let promise;
            if(this._managed)
                promise = this._refreshManagedToken(resource);
            else
                promise = this._refreshApplicationToken(resource);
            promise
                .then((token) => {
                    resolve(token);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @param {Array.<_CelastrinaToken>} tokens
     * @returns {Promise<void>}
     * @private
     */
    async _setResourceTokens(tokens) {
        return new Promise((resolve, reject) => {
            try {
                for(let token of tokens) {
                    this._tokens[token.resource] = token;
                }
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @param {{params:URLSearchParams, headers:Object}} config
     * @param {string} resource
     * @returns {Promise<_CelastrinaToken>}
     * @private
     */
    async _initializeManagedResource(config, resource) {
        return new Promise((resolve, reject) => {
            config.params.set("resource", resource);
            axios.get(this._tenant, config)
                .then(( response) => {
                    resolve({resource: resource,
                                   token: response.data.access_token,
                                   expires: moment(response.data.expires_on)});
                })
                .catch((exception) =>{
                    reject(exception);
                });
        });
    }

    /**
     * @returns {Promise<void>}
     * @private
     */
    async _initializeManagedResources() {
        return new Promise((resolve, reject) => {
            let params = new URLSearchParams();
            params.append("resource", "");
            params.append("api-version", "2017-09-01");
            let config = {/** @type {URLSearchParams} */params: params, headers: {"secret": this._secret}};

            /** @type {Array.<Promise<_CelastrinaToken>>} */
            let promises = [];
            for(const resource of this._resources) {
                promises.unshift(this._initializeManagedResource(config, resource));
            }

            Promise.all(promises)
                .then((results) => {
                    return this._setResourceTokens(results);
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
     * @param {AuthenticationContext} adContext
     * @param {string} resource
     * @returns {Promise<_CelastrinaToken>}
     * @private
     */
    async _initializeAppResource(adContext, resource) {
        return new Promise((resolve, reject) => {
            adContext.acquireTokenWithClientCredentials(resource, this._id, this._secret,
                (err, response) => {
                    if(err)
                        reject(CelastrinaError.newError("Not authorized.", 401));
                    else {
                        resolve({resource: resource,
                                       token: response.accessToken,
                                       expires: moment(response.expiresOn)});
                    }
                });
        });
    }

    /**
     * @returns {Promise<void>}
     * @private
     */
    async _initializeAppResources() {
        return new Promise((resolve, reject) => {
            try {
                let adContext = new AuthenticationContext(this._authority + "/" + this._tenant);
                /** @type {Array.<Promise<_CelastrinaToken>>} */
                let promises = [];
                for(const resource of this._resources) {
                    promises.unshift(this._initializeAppResource(adContext, resource));
                }

                Promise.all(promises)
                    .then((results) => {
                        return this._setResourceTokens(results);
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            if(this._resources.length === 0)
                reject(CelastrinaError.newError("No resources defined for authorization '" + this._id + "'."));
            else {
                let promise;
                if(this._managed)
                    promise = this._initializeManagedResources();
                else
                    promise = this._initializeAppResources();
                promise
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
        });
    }
}
/**
 * @author Robert R Murrell
 */
class ApplicationAuthorizationProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
        this._type = "ApplicationAuthorization";
    }

    /**
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                super.resolve(value)
                    .then((source) => {
                        if(source != null) {
                            if(!source.hasOwnProperty("_authority"))
                                reject(CelastrinaError.newError(
                                    "Invalid ApplicationAuthorization, _authority required."));
                            else if(!source.hasOwnProperty("_tenant"))
                                reject(CelastrinaError.newError(
                                    "Invalid ApplicationAuthorization, _tenant required."));
                            else if(!source.hasOwnProperty("_id"))
                                reject(CelastrinaError.newError(
                                    "Invalid ApplicationAuthorization, _id required."));
                            else if(!source.hasOwnProperty("_secret"))
                                reject(CelastrinaError.newError(
                                    "Invalid ApplicationAuthorization, _secret required."));
                            else if(!source.hasOwnProperty("_resources"))
                                reject(CelastrinaError.newError(
                                    "Invalid ApplicationAuthorization, _resources required."));
                            else if (!Array.isArray(source._resources))
                                reject(CelastrinaError.newError(
                                    "Invalid ApplicationAuthorization, _resources must be array."));
                            else
                                source = new ApplicationAuthorization(source._authority, source._tenant, source._id,
                                                                     source._secret, source._resources);
                        }
                        resolve(source);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/*
 * *********************************************************************************************************************
 * PROPERTIES LOADER FOR ASYNC LOADING OF CONFIGURATION
 * *********************************************************************************************************************
 */
class PropertyLoader {
    /**
     * @param {Object} object
     * @param {string} attribute
     * @param {Property} property
     * @param {PropertyHandler} handler
     * @returns {Promise<void>}
     */
    static async load(object, attribute, property, handler) {
        return new Promise((resolve, reject) => {
            property.load(handler)
                .then((resolved) => {
                    object[attribute] = resolved;
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/*
 * *********************************************************************************************************************
 * SECURITY
 * *********************************************************************************************************************
 */
class BaseSubject {
    /**
     * @param {string} id
     * @param {Array.<string>} roles
     */
    constructor(id, roles = []) {
        this._id    = id;
        this._roles = roles;
    }

    /**
     * @returns {string}
     */
    get id() {
        return this._id;
    }

    /**
     * @returns {Array.<string>}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @param {string} role
     */
    addRole(role) {
        this._roles.unshift(role);
    }

    /**
     * @param {Array.<string>} roles
     */
    addRoles(roles) {
        this._roles = roles.concat(this._roles);
    }

    /**
     * @param {string} role
     * @returns {Promise<boolean>}
     */
    async isInRole(role) {
        return new Promise((resolve, reject) => {
            resolve(this._roles.includes(role));
        });
    }

    /**
     * @returns {{subject:string, roles:Array.<string>}}
     */
    toJSON() {
       return {subject: this._id, roles: this._roles};
    }
}
/**
 * @abstract
 */
class ValueMatch {
    /**
     * @brief
     * @param {string} [type]
     */
    constructor(type = "ValueMatch") {
        this._type = type
    }

    /**
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @returns {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        return new Promise((resolve, reject) => {
            resolve(true);
        });
    }

    /**
     * @returns {string}
     */
    get type() {
        return this._type;
    }
}
/**
 * @type {ValueMatch}
 */
class MatchAny extends ValueMatch {
    constructor() {
        super("MatchAny");
    }

    /**
     * @brief A role in assertion can match a role in values and pass.
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @returns {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        return new Promise((resolve, reject) => {
            try {
                let match = false;
                for(const role of assertion) {
                    if((match = values.includes(role)))
                        break; // We have matched one, we are good.
                }
                resolve(match);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {ValueMatch}
 */
class MatchAll extends ValueMatch {
    constructor() {
        super("MatchAll");
    }

    /**
     * @brief All roles in assertion must match all roles in values.
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @returns {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        return new Promise((resolve, reject) => {
            try {
                let match = false;
                for(const role of values) {
                    if(!(match = assertion.includes(role)))
                        break; // We have matched one, we are good.
                }
                resolve(match);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {ValueMatch}
 */
class MatchNone extends ValueMatch {
    constructor() {
        super("MatchNone");
    }

    /**
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @returns {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        return new Promise((resolve, reject) => {
            try {
                let match = false;
                for(const role of values) {
                    if((match = assertion.includes(role)))
                        break; // We have matched one, we are good.
                }
                resolve(!match);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
class FunctionRole {
    /**
     * @param {string} [action]
     * @param {Array.<string>} roles
     * @param {ValueMatch} [match]
     */
    constructor(action = "process", roles = [], match = new MatchAny()) {
        this._roles = roles;
        this._action = action.toLowerCase();
        this._match = match;
    }

    /**
     * @returns {string}
     */
    get action() {
        return this._action;
    }

    /**
     * @param {string} role
     * @returns {FunctionRole}
     */
    addRole(role) {
        this._roles.unshift(role);
        return this;
    }

    /**
     * @returns {Array<string>}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @param {string} action
     * @param {BaseContext} context
     * @returns {Promise<boolean>}
     */
    async authorize(action, context) {
        return new Promise((resolve, reject) => {
            if(action === this._action) {
                this._match.isMatch(context.subject.roles, this._roles)
                    .then((inrole) => {
                        resolve(inrole);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else
                resolve(false);
        });
    }
}
/**
 * @type {JsonProperty}
 */
class FunctionRoleProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

    /**
     * @param type
     * @returns {Promise<ValueMatch>}
     * @private
     */
    static async _getMatchType(type) {
        return new Promise((resolve, reject) => {
            switch (type) {
                case "MatchAny":
                    resolve(new MatchAny());
                    break;
                case "MatchAll":
                    resolve(new MatchAll());
                    break;
                case "MatchNone":
                    resolve(new MatchNone());
                    break;
                default:
                    reject(CelastrinaError.newError("Invalid Match Type."));
            }
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                super.resolve(value)
                    .then((source) => {
                        if(source != null) {
                            if(!source.hasOwnProperty("_roles"))
                                reject(CelastrinaError.newError(
                                    "Invalid FunctionRole, _roles required."));
                            else if(!Array.isArray(source._roles))
                                reject(CelastrinaError.newError(
                                    "Invalid FunctionRole, _roles must be an array."));
                            else if(!source.hasOwnProperty("_action"))
                                reject(CelastrinaError.newError(
                                    "Invalid FunctionRole, _action required."));
                            else if(!source.hasOwnProperty("_match"))
                                reject(CelastrinaError.newError(
                                    "Invalid FunctionRole, _match required."));
                            else if(!source._match.hasOwnProperty("_type"))
                                reject(CelastrinaError.newError(
                                    "Invalid FunctionRole._match._type, _type required."));
                            else {
                                FunctionRoleProperty._getMatchType(source._match._type)
                                    .then((match) => {
                                        resolve(new FunctionRole(source._action, source._roles, match));
                                    })
                                    .catch((exception) => {
                                        reject(exception);
                                    });
                            }
                        }
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/*
 * *********************************************************************************************************************
 * CONFIGURATION
 * *********************************************************************************************************************
 */
/**
 * @type {{_name:StringProperty|string, managed:BooleanProperty|boolean}}
 */
class Configuration {
    static CELASTRINA_CONFIG_APPLICATION_AUTHORIZATION = "celastrinajs.core.authorization.application";
    static CELASTRINA_CONFIG_RESOURCE_AUTHORIZATION    = "celastrinajs.core.authorization.resource";
    static CELASTRINA_CONFIG_ROLES                     = "celastrinajs.core.function.roles";

    /**
     * @param {StringProperty|string} name
     */
    constructor(name) {
        if(typeof name == "string" && name.trim().length === 0)
            throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        else if(!(name instanceof StringProperty))
            throw CelastrinaError.newError("Invalid configuration. Name must be string or StringProperty.");
        this._name    = name;
        this._config  = {}; // Class for storing named configurations.
        /** @type {null|_AzureFunctionContext} */
        this._context = null;
        /** @type {null|PropertyHandler} */
        this._handler = null;
        /** @type {Array.<JsonProperty|ApplicationAuthorization>} **/
        this._config[Configuration.CELASTRINA_CONFIG_APPLICATION_AUTHORIZATION] = [];
        /** @type {Array.<StringProperty|string>} **/
        this._config[Configuration.CELASTRINA_CONFIG_RESOURCE_AUTHORIZATION] = [];
        /** @type {Array.<JsonProperty|FunctionRole>} */
        this._config[Configuration.CELASTRINA_CONFIG_ROLES] = [];
        this._loaded = false;
    }

    /**
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @returns {PropertyHandler}
     */
    get properties() {
        return this._handler;
    }

    /**
     * @returns {object}
     */
    get values(){
        return this._config;
    }

    /**
     * @param {PropertyHandler} handler
     * @returns {Configuration}
     */
    setPropertyHandler(handler) {
        this._handler = handler;
        return this;
    }

    /**
     * @param {string} key
     * @param {*} value
     * @returns {Configuration}
     */
    setValue(key , value) {
        if(typeof key !== "string" || key.trim().length === 0)
            throw CelastrinaError.newError("Invalid configuration. Key cannot be undefined, null or 0 length.");
        this._config[key] = value;
        return this;
    }

    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {*}
     */
    getValue(key, defaultValue = null) {
        let value = this._config[key];
        if(typeof value === "undefined" || value == null)
            value = defaultValue;
        return value;
    }

    /**
     * @param {ApplicationAuthorizationProperty|ApplicationAuthorization} application
     * @returns {Configuration}
     */
    addApplicationAuthorization(application) {
        this._config[Configuration.CELASTRINA_CONFIG_APPLICATION_AUTHORIZATION].unshift(application);
        return this;
    }

    /**
     * @brief
     * @returns {Array<ApplicationAuthorization>}
     */
    get applicationAuthorizations() {
        return this._config[Configuration.CELASTRINA_CONFIG_APPLICATION_AUTHORIZATION];
    }

    /**
     * @param {StringProperty|string} resource
     * @returns {Configuration}
     */
    addResourceAuthorization(resource) {
        this._config[Configuration.CELASTRINA_CONFIG_RESOURCE_AUTHORIZATION].unshift(resource);
        return this;
    }

    /**
     * @returns {Array<string>}
     */
    get resourceAuthorizations() {
        return this._config[Configuration.CELASTRINA_CONFIG_RESOURCE_AUTHORIZATION];
    }

    /**
     * @param {FunctionRoleProperty|FunctionRole} role
     * @returns {Configuration}
     */
    addFunctionRole(role) {
        this._config[Configuration.CELASTRINA_CONFIG_ROLES].unshift(role);
        return this;
    }

    /**
     * @returns {Array<FunctionRole>}
     */
    get roles() {
        return this._config[Configuration.CELASTRINA_CONFIG_ROLES];
    }

    /**
     * @returns {_AzureFunctionContext}
     */
    get context() {
        return this._context;
    }

    /**
     * @param {Object} obj
     * @param {Array.<Promise>} promises
     * @private
     */
    _load(obj, promises) {
        if(typeof obj === "object") {
            for(let prop in obj) {
                let local = obj[prop];
                if(typeof local !== "undefined" && local != null) {
                    if(local instanceof Property)
                        promises.unshift(PropertyLoader.load(obj, prop, local, this._handler));
                    else
                        this._load(local, promises);
                }
            }
        }
    }

    /**
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     */
    async load(context) {
        return new Promise(
            (resolve, reject) => {
                try {
                    // Set up the Azure function context for the configuration.
                    this._context = context;
                    if(!this._loaded) {
                        // Setting the default handler to the application settings handler.
                        if(typeof this._handler === "undefined" || this._handler == null)
                            this._handler = new AppSettingsPropertyHandler();

                        // Setting up the property handler.
                        this._handler.initialize(context, this._config)
                            .then(() => {
                                // Scan for any property object then replace async.
                                /** @type {Array.<Promise<void>>} */
                                let promises = [];
                                this._load(this, promises);
                                return Promise.all(promises);
                            })
                            .then(() => {
                                if(typeof this._name !== "string" || this._name.trim().length === 0) {
                                    context.log.error("Invalid Configuration. Name cannot be undefined, null, or 0 length."); // Low level logger.
                                    reject(CelastrinaError.newError("Invalid Configuration."));
                                }
                                else {
                                    this._context.log("[Configuration.load(context)]: Configuration loaded from source.");
                                    this._loaded = true;
                                    resolve();
                                }
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                    else {
                        this._context.log("[Configuration.load(context)]: Configuration loaded from cache.");
                        resolve();
                    }
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}
/*
 * *********************************************************************************************************************
 * CRYPTOGRAPHY
 * *********************************************************************************************************************
 */
/**
 * @abstract
 */
class Algorithm {
    constructor(name) {
        this._name = name;
    }

    /**
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @returns {Promise<Cipher>}
     */
    async createCipher() {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not supported."));
        });
    }

    /**
     * @returns {Promise<Decipher>}
     */
    async createDecipher() {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not supported."));
        });
    }
}
/**
 * @type {Algorithm}
 */
class AES256Algorithm extends Algorithm {
    /**
     * @param {string} key
     * @param {string} iv
     */
    constructor(key, iv) {
        super("aes-256-cbc");
        this._key = key;
        this._iv  = iv;
    }

    /**
     * @returns {Promise<Cipher>}
     */
    async createCipher() {
        return new Promise((resolve, reject) => {
            try {
                resolve(crypto.createCipheriv(this._name, this._key, this._iv));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @returns {Promise<Decipher>}
     */
    async createDecipher() {
        return new Promise((resolve, reject) => {
            try {
                resolve(crypto.createDecipheriv(this._name, this._key, this._iv));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
class Cryptography {
    /**
     * @param {Algorithm} algorithm
     */
    constructor(algorithm) {
        this._algorithm = algorithm;
    }

    /**
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            this._algorithm.initialize()
                .then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<string>}
     */
    async encrypt(value) {
        return new Promise((resolve, reject) => {
            try {
                this._algorithm.createCipher()
                    .then((cryp) => {
                        let encrypted = cryp.update(value, "utf8", "hex");
                        encrypted += cryp.final("hex");
                        encrypted  = Buffer.from(encrypted, "hex").toString("base64");
                        resolve(encrypted);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @param {string} value Base64 encded HEX string.
     * @returns {Promise<string>}
     */
    async decrypt(value) {
        return new Promise((resolve, reject) => {
            try {
                this._algorithm.createDecipher()
                    .then((cryp) => {
                        let encrypted = Buffer.from(value, "base64").toString("hex");
                        let decrypted = cryp.update(encrypted, "hex", "utf8");
                        decrypted += cryp.final("utf8");
                        resolve(decrypted);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/*
 * *********************************************************************************************************************
 * FUNCTION
 * *********************************************************************************************************************
 */
/**
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
 * @type {{_topic: string, _passed: Object, _failed: Object, failed: boolean}}
 */
class MonitorResponse {
    constructor() {
        this._passed = {};
        this._failed = {};
        this._passedCheck = false;
    }

    /**
     * @returns {Object}
     */
    get passed() {
        return this._passed;
    }

    /**
     * @returns {Object}
     */
    get failed() {
        return this._failed;
    }

    /**
     * @param {string} probe
     * @param {string} message
     */
    addPassedDiagnostic(probe, message) {
        this._passed[probe] = message;
    }

    /**
     * @param {string} probe
     * @param {string} message
     */
    addFailedDiagnostic(probe, message) {
        if(!this._passedCheck) this._passedCheck = !this._passedCheck;
        this._failed[probe] = message;
    }

    /**
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
 * @abstract
 */
class RoleResolver {
    /** @type {string} */
    static CELASTRINA_CONFIG_SENTRY_ROLE_RESOLVER = "celastrinajs.core.function.roles.resolver";

    constructor() {}

    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async resolve(context) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
}

/**
 * @type {RoleResolver}
 */
class SessionRoleResolver extends RoleResolver {
    constructor() {
        super();
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async resolve(context) {
        return new Promise((resolve, reject) => {
            let roles = context.getSessionProperty("roles", []);
            context.subject.addRoles(roles);
            resolve(context.subject);
        });
    }
}
/**
 * @type {{_appauth:Object}}
 */
class BaseSentry {
    constructor() {
        this._appauth = {};
        this._roles = {};
        /** @type {null|RoleResolver} */
        this._roleresolver = null;
        this._localAppId = null;
    }

    /**
     * @returns {string}
     */
    get localApplicationId() {
        return this._localAppId;
    }

    /**
     * @returns {Object}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @param {string} resource
     * @param {null|string} [id]
     * @returns {Promise<string>}
     */
    async getAuthorizationToken(resource, id = null) {
        return new Promise((resolve, reject) => {
            if(id == null)
                id = this._localAppId;
            /** @type {ApplicationAuthorization} */
            let appobj = this._appauth[id];
            if(appobj instanceof ApplicationAuthorization)
                resolve(appobj.getToken(resource));
            else
                reject(CelastrinaError.newError("Application ID '" + id + "' not found for resource '" +
                    resource + "'."));
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            resolve(new BaseSubject(this._localAppId));
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            try {
                let funcrole = this._roles[context.action];
                if (typeof funcrole === "undefined" || funcrole == null)
                    resolve();
                else {
                    funcrole.authorize(context.action, context)
                        .then((auth) => {
                            if(auth)
                                resolve();
                            else
                                reject(CelastrinaError.newError("Forbidden.", 403));
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async setRoles(context) {
        return new Promise((resolve, reject) => {
            this._roleresolver.resolve(context)
                .then((subject) => {
                    resolve(subject);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @param {ApplicationAuthorization} authorization
     * @returns {Promise<void>}
     * @private
     */
    async _loadApplicationAuthorization(authorization) {
        return new Promise((resolve, reject) => {
            try {
                authorization.initialize()
                    .then(() => {
                        this._appauth[authorization.id] = authorization;
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @param {Array.<ApplicationAuthorization>} applications
     * @returns {Promise<void>}
     * @private
     */
    async _loadApplicationAuthorizations(applications) {
        return new Promise((resolve, reject) => {
            if(applications.length > 0) {
                let promises = [];
                for(let appobj of applications) {
                    promises.unshift(this._loadApplicationAuthorization(appobj));
                }
                Promise.all(promises)
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else
                resolve();
        });
    }

    /**
     * @param {Configuration} configuration
     * @private
     */
    _loadResourceAuthorizations(configuration) {
        if(configuration.resourceAuthorizations.length > 0) {
            configuration.addApplicationAuthorization(new ApplicationAuthorization(process.env["MSI_ENDPOINT"],
                "", this._localAppId, process.env["MSI_SECRET"], configuration.resourceAuthorizations,
                true));
        }
    }

    /**
     * @param {FunctionRole} role
     * @returns {Promise<void>}
     * @private
     */
    async _loadFunctionRole(role) {
        return new Promise((resolve, reject) => {
            try {
                this._roles[role.action] = role;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @param {Array.<FunctionRole>} roles
     * @returns {Promise<void>}
     * @private
     */
    async _loadFunctionRoles(roles) {
        return new Promise((resolve, reject) => {
            if(roles.length > 0) {
                /** @type {Array.<Promise<void>>} */
                let promises = [];
                let itr = roles[Symbol.iterator]();
                for(let roleobj of roles) {
                    promises.unshift(this._loadFunctionRole(roleobj));
                }
                Promise.all(promises)
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else
                resolve(); // Do nothing. Default behavior is open.
        });
    }

    /**
     * @param {Configuration} configuration
     * @returns {Promise<BaseSentry>}
     */
    async initialize(configuration) {
        return new Promise((resolve, reject) => {
            // Set up the local application id.
            this._localAppId = configuration.properties.getEnvironmentProperty("CELASTRINA_MSI_OBJECT_ID");
            if(typeof this._localAppId !== "string")
                this._localAppId = configuration.context.invocationId;

            this._roleresolver = configuration.getValue(RoleResolver.CELASTRINA_CONFIG_SENTRY_ROLE_RESOLVER,
                                                       null);
            if(this._roleresolver == null)
                this._roleresolver = new SessionRoleResolver();

            this._loadResourceAuthorizations(configuration);
            this._loadApplicationAuthorizations(configuration.applicationAuthorizations)
                .then(() => {
                    return this._loadFunctionRoles(configuration.roles);
                })
                .then(() => {
                    resolve(this);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
class BaseContext {
    /**
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     */
    constructor(context, name, properties) {
        this._requestId       = uuid4v();
        this._context         = context;
        this._traceId         = null;
        this._monitor         = false;
        /** @type {null|MonitorResponse} */
        this._monitorResponse = null;
        this._properties      = properties;
        this._name            = name;
        /** @type {null|BaseSubject} */
        this._subject         = null;
        this._action          = "process";
        /** @type {null|BaseSentry} */
        this._sentry          = null;
        /** @type {object} */
        this._session         = {};
    }

    /**
     * @brief {Configuration} configration
     * @returns {Promise<BaseContext>}
     */
    async initialize(configuration) {
        return new Promise((resolve, reject) => {
            if(this._monitor)
                this._monitorResponse = new MonitorResponse();

            let traceContext = this._context.traceContext;
            if(typeof traceContext !== "undefined" || traceContext != null)
                this._traceId = traceContext.traceparent;

            resolve(this);
        });
    }

    /**
     * @returns {boolean}
     */
    get isMonitorInvocation() {
        return this._monitor;
    }

    /**
     * @returns {null|MonitorResponse}
     */
    get monitorResponse() {
        return this._monitorResponse;
    }

    /**
     * @returns {_AzureFunctionContext}
     */
    get context() {
        return this._context;
    }

    /**
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @returns {string}
     */
    get invocationId() {
        return this._context.bindingData.invocationId;
    }

    /**
     * @returns {string}
     */
    get requestId() {
        return this._requestId;
    }

    /**
     * @returns {BaseSentry}
     */
    get sentry() {
        return this._sentry;
    }

    /**
     * @param {BaseSentry} sentry
     */
    set sentry(sentry) {
        this._sentry = sentry;
    }

    /**
     * @returns {BaseSubject}
     */
    get subject() {
        return this._subject;
    }

    /**
     * @param {BaseSubject} subject
     */
    set subject(subject) {
        this._subject = subject;
    }

    /**
     * @returns {string}
     */
    get action() {
        return this._action;
    }

    /**
     * @returns {object}
     */
    get session() {
        return this._session;
    }

    /**
     * @param {string} name
     */
    getBinding(name) {
        return this._context.bindings[name];
    }

    /**
     * @param {string} name
     * @param {Object} value
     */
    setBinding(name, value) {
        this._context.bindings[name] = value;
    }

    /**
     * @param {string} name
     * @param {*} [defaultValue=null]
     * @returns {null|*}
     */
    getSessionProperty(name, defaultValue = null) {
        let prop = this._session[name];
        if(typeof prop === "undefined" || prop == null)
            return defaultValue;
        else
            return prop;
    }

    /**
     * @param {string} name
     * @param {*} value
     * @returns {BaseContext}
     */
    setSessionProperty(name, value) {
        this._session[name] = value;
        return this;
    }

    /**
     * @param {object} source
     * @returns {BaseContext}
     */
    loadSessionProperties(source) {
        Object.assign(this._session, source);
        return this;
    }

    /**
     * @param {string} key
     * @param {null|string} [defaultValue=null]
     * @return {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        return this._properties.getProperty(key, defaultValue);
    }

    /**
     * @param {Object} message
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    log(message = "[NO MESSAGE]", level = LOG_LEVEL.LEVEL_TRACE, subject = null) {
        let out = "[" + this._name + "][LEVEL " + level + "]";
        if(typeof subject === "string")
            out += "[" + subject + "]";
        out += "[" + this._context.invocationId + "]:" + "[" + this._requestId + "]:" + message.toString();

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
     * @param {Object} object
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    logObjectAsJSON(object, level = LOG_LEVEL.LEVEL_TRACE, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }

    /**
     * @param {null|Object} [value=null]
     */
    done(value = null) {
        if(value === null)
            this._context.done();
        else
            this._context.done(value);
    }
}
/**
 * @abstract
 */
class BaseFunction {
    /**
     * @param {Configuration} configuration
     */
    constructor(configuration) {
        this._configuration = configuration;
        /** @type {null|BaseContext} */
        this._context       = null;
    }

    /**
     * @returns {Promise<BaseSentry>} BaseSentry if successful.
     *
     * @throws {CelastrinaError}
     */
    async createSentry() {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new BaseSentry());
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     * @returns {Promise<BaseContext>}
     */
    async createContext(context, name, properties) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new BaseContext(context, name, properties));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     * @throws {CelastrinaError}
     */
    async bootstrap(context) {
        return new Promise(
            (resolve, reject) => {
                // First we load the configuration.
                this._configuration.load(context)
                    .then(() => {
                        // Create the sentry
                        return Promise.all([this.createSentry(),
                                                   this.createContext(context, this._configuration.name,
                                                                      this._configuration.properties)]);
                    })
                    .then((results) => {
                        return Promise.all([results[0].initialize(this._configuration),
                                                  results[1].initialize(this._configuration)]);
                    })
                    .then((results) => {
                        this._context = results[1];
                        this._context.sentry = results[0];
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async initialize(context) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            context.sentry.authenticate(context)
                .then((subject) => {
                    context.subject = subject;
                    return context.sentry.setRoles(context);
                })
                .then((subject) => {
                    resolve(subject);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            context.sentry.authorize(context)
                .then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async validate(context) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async monitor(context) {
        return new Promise(
            (resolve, reject) => {
                context.log("No monitoring checks performed, monitor not overridden.",
                    LOG_LEVEL.LEVEL_WARN, "BaseFunction.monitor(context)");
                context.monitorResponse.addPassedDiagnostic("default", "Monitor not overridden.");
                resolve();
            });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async load(context) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async save(context) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @param {*} exception
     * @returns {Promise<void>}
     */
    async exception(context, exception) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async terminate(context) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async secureInitialize(context) {
        return new Promise(
            (resolve, reject) => {
                context.log("Secure Initialize Lifecycle.",
                    LOG_LEVEL.LEVEL_INFO, "BaseFunction.secureInitialize(context)");
                resolve();
            });
    }

    /**
     * @brief Method called by the Azure Function to execute the lifecycle.
     * @param {_AzureFunctionContext} context The context of the function.
     */
    execute(context) {
        try {
            context.log("[BaseFunction.execute(context)]: Configuring Celastrina.");
            this.bootstrap(context)
                .then(() => {
                    // Execute the rest of the lifecycle.
                    this.initialize(this._context)
                        .then(() => {
                            this._context.log("Authenticate Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            return this.authenticate(this._context);
                        })
                        .then((subject) => {
                            this._context.log("Authorize Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            this._context.subject = subject;
                            return this.authorize(this._context);
                        })
                        .then(() => {
                            this._context.log("Validate Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            return this.validate(this._context);
                        })
                        .then(() => {
                            this._context.log("Load Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            return this.load(this._context);
                        })
                        .then(() => {
                            if(this._context.isMonitorInvocation) {
                                this._context.log("Monitor Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                    "BaseFunction.execute(context)");
                                return this.monitor(this._context);
                            }
                            else {
                                this._context.log("Process Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                    "BaseFunction.execute(context)");
                                return this.process(this._context);
                            }
                        })
                        .then(() => {
                            this._context.log("Save Lifecycle.", LOG_LEVEL.LEVEL_TRACE,
                                "BaseFunction.execute(context)");
                            return this.save(this._context);
                        })
                        .catch((exception) => {
                            this._context.log("Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR,
                                "BaseFunction.execute(context)");
                            return this.exception(this._context, exception);
                        })
                        .then(() => {
                            this._context.log("Terminate Lifecycle.",
                                LOG_LEVEL.LEVEL_INFO, "BaseFunction.execute(context)");
                            return this.terminate(this._context);
                        })
                        .then(() => {
                            this._context.log("Function lifecycle complete.", LOG_LEVEL.LEVEL_INFO,
                                "BaseFunction.execute(context)");
                            this._context.done();
                        })
                        .catch((exception) => {
                            this._context.log("Critical Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR,
                                "BaseFunction.execute(context)");
                            this._unhandled(context, exception);
                        });
                })
                .catch((exception) => {
                    context.log.error("[BaseFunction.execute(context)]: Critical unhandled exception, done.");
                    this._unhandled(context, exception);
                });
        }
        catch(exception) {
            context.log.error("[BaseFunction.execute(context)]:Critical unhandled exception, done.");
            this._unhandled(context, exception);
        }
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {*} exception
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
/*
 * *********************************************************************************************************************
 * EXPORTS
 * *********************************************************************************************************************
 */
module.exports = {
    Property: Property,
    JsonProperty: JsonProperty,
    StringProperty: StringProperty,
    BooleanProperty: BooleanProperty,
    NumericProperty: NumericProperty,
    ApplicationAuthorization: ApplicationAuthorization,
    ApplicationAuthorizationProperty: ApplicationAuthorizationProperty,
    ValueMatch: ValueMatch,
    MatchAny: MatchAny,
    MatchAll: MatchAll,
    MatchNone: MatchNone,
    FunctionRole: FunctionRole,
    FunctionRoleProperty: FunctionRoleProperty,
    Configuration: Configuration,
    Algorithm: Algorithm,
    AES256Algorithm: AES256Algorithm,
    Cryptography: Cryptography,
    LOG_LEVEL: LOG_LEVEL,
    BaseSubject: BaseSubject,
    MonitorResponse: MonitorResponse,
    RoleResolver: RoleResolver,
    BaseSentry: BaseSentry,
    BaseContext: BaseContext,
    BaseFunction: BaseFunction
};
