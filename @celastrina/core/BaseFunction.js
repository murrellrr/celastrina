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

const axios             = require("axios").default;
const moment            = require("moment");
const uuid4v            = require("uuid/v4");
const {TokenResponse, AuthenticationContext} = require("adal-node");
const {CelastrinaError} = require("./CelastrinaError");
const {Vault}           = require("./Vault");

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
 * PROPERTIES
 * *********************************************************************************************************************
 */
/**
 * @brief Handler class to load properties from {process.env}.
 * @author Robert R Murrell
 */
class PropertyHandler {
    constructor() {}

    /**
     * @brief
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async getEnvironmentProperty(key, defaultValue = null) {
        return new Promise((resolve) => {
            let value = process.env[key];
            if(typeof value === "undefined" || value.trim().length === 0)
                value = defaultValue;
            resolve(value);
        });
    }

    /**
     * @brief
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async getSecureEnvironmentProperty(key, defaultValue = null) {
        return this.getEnvironmentProperty(key, defaultValue);
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @type {{_vault: Vault}}
 */
class VaultPropertyHandler extends PropertyHandler {
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
     * @returns {Vault}
     */
    get vault() {
        return this._vault;
    }

    /**
     * @brief
     * @param {string} key
     * @param {null|string} [defaultValue]
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
 * @author Robert R Murrell
 * @type {{_name:string, _type:string, _secure:boolean, _defaultValue:null|*}}
 */
class Property {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} [secure]
     * @param {null|*} [defaultValue]
     */
    constructor(name, secure = false, defaultValue = null) {
        this._name         = name;
        this._type         = "Property";
        this._secure       = secure;
        this._defaultValue = defaultValue;
    }

    /**
     * @brief
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @brief
     * @returns {string}
     */
    get type() {
        return this._type;
    }

    /**
     * @brief
     * @returns {boolean}
     */
    get secure() {
        return this._secure;
    }

    /**
     * @brief
     * @returns {*}
     */
    get defaultValue() {
        return this._defaultValue;
    }

    /**
     * @brief Lookup a value based on a key.
     * @description Default behavior is to retrieve the value from the {PropertyHandler} instance. Override this method
     *              to get property values from other locations.
     * @param {PropertyHandler} handler
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    async lookup(handler) {
        if(this._secure)
            return handler.getSecureEnvironmentProperty(this._name, this._defaultValue);
        else
            return handler.getEnvironmentProperty(this._name, this._defaultValue);
    }

    /**
     * @brief Convert from a string value to the desired property type.
     * @description. Default behavior is to throw an error. Override this method to convert a string to the desired
     *               type.
     * @param {string} value The string value to convert.
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    async resolve(value) {
        return new Promise((reject) => {
            reject(CelastrinaError.newError("Property not supported."));
        });
    }

    /**
     * @brief
     * @param {PropertyHandler} handler
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    load(handler) {
        return new Promise((resolve, reject) => {
            this.lookup(handler)
                .then((local) => {
                    return this.resolve(local);
                })
                .then((value) => {
                    resolve(value);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @type {Property}
 */
class JsonProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} secure
     * @param {null|string} defaultValue
     */
    constructor(name, secure = false, defaultValue = null) {
        super(name, secure, defaultValue);
        this._type = "json";
    }

    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve(JSON.parse(value));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @type {Property}
 */
class StringProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} secure
     * @param {null|string} defaultValue
     */
    constructor(name, secure = false, defaultValue = null) {
        super(name, secure, defaultValue);
        this._type = "string";
    }

    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|string>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @type {Property}
 */
class BooleanProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} secure
     * @param {null|boolean} defaultValue
     */
    constructor(name, secure = false, defaultValue = null) {
        super(name, secure, defaultValue);
        this._type = "boolean";
    }

    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|boolean>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve((value.toLowerCase() === "true"));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @type {Property}
 */
class NumericProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} secure
     * @param {null|number} defaultValue
     */
    constructor(name, secure = false, defaultValue = null) {
        super(name, secure, defaultValue);
        this._type = "number";
    }

    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|number>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve(Number(value));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/*
 * *********************************************************************************************************************
 * APPLICATION AUTHENTICATION AND AUTHORIZATION
 * *********************************************************************************************************************
 */
/**
 * @brief Application credential configuration
 * @description An {ApplicationAuthorization} is a configuration for an Azure Application credential. This allows
 *              functions to perform actions as the application identity, granting access to resources provided to the
 *              application.
 * @type {{_authority:StringProperty|string, _tenant:StringProperty|string, _id:StringProperty|string,
 *         _secret:StringProperty|string}}
 * @see https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-client-application-configuration
 */
class ApplicationAuthorization {
    /**
     * @brief
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
     * @brief
     * @returns {string}
     */
    get authority() {
        return this._authority;
    }

    /**
     * @brief
     * @returns {string}
     */
    get tenant() {
        return this._tenant;
    }

    /**
     * @brief
     * @returns {string}
     */
    get id() {
        return this._id;
    }

    /**
     * @brief
     * @returns {string}
     */
    get secret() {
        return this._secret;
    }

    /**
     * @brief
     * @returns {boolean}
     */
    get managed() {
        return this._managed;
    }

    /**
     * @brief
     * @param {StringProperty|string} resource
     * @returns {ApplicationAuthorization}
     */
    addResource(resource) {
        this._resources.unshift(resource);
        return this;
    }

    /**
     * @brief
     * @returns {Array.<string>}
     */
    get resources() {
        return this._resources;
    }

    /**
     * @brief
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
     * @brief
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
     * @brief
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
     * @brief
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
     * @brief
     * @param {Array.<_CelastrinaToken>} tokens
     * @returns {Promise<void>}
     * @private
     */
    async _setResourceTokens(tokens) {
        return new Promise((resolve, reject) => {
            try {
                let ritr = tokens[Symbol.iterator]();
                for (let token of ritr) {
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
     * @brief
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
     * @brief
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
            let itr = this._resources[Symbol.iterator]();
            for(let resource of itr) {
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
     * @brief
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
     * @brief
     * @returns {Promise<void>}
     * @private
     */
    async _initializeAppResources() {
        return new Promise((resolve, reject) => {
            try {
                let adContext = new AuthenticationContext(this._authority + "/" + this._tenant);
                /** @type {Array.<Promise<_CelastrinaToken>>} */
                let promises = [];
                let itr = this._resources[Symbol.iterator]();
                for (let resource of itr) {
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
     * @brief
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

    /**
     * @brief
     * @param {Object} source
     */
    static create(source) {
        if(typeof source === "undefined" || source == null)
            throw CelastrinaError.newError("Invalid ApplicationAuthorization, cannot be null or undefined.");
        if(!source.hasOwnProperty("_authority"))
            throw CelastrinaError.newError("Invalid ApplicationAuthorization, _authority required.");
        if(!source.hasOwnProperty("_tenant"))
            throw CelastrinaError.newError("Invalid ApplicationAuthorization, _tenant required.");
        if(!source.hasOwnProperty("_id"))
            throw CelastrinaError.newError("Invalid ApplicationAuthorization, _id required.");
        if(!source.hasOwnProperty("_secret"))
            throw CelastrinaError.newError("Invalid ApplicationAuthorization, _secret required.");
        if(!source.hasOwnProperty("_resources") || !Array.isArray(source._resources))
            throw CelastrinaError.newError("Invalid ApplicationAuthorization, _resources required.");
        return new ApplicationAuthorization(source._authority, source._tenant, source._id, source._secret,
                                            source._resources);
    }
}
/*
 * *********************************************************************************************************************
 * PROPERTIES LOADER FOR ASYNC LOADING OF CONFIGURATION
 * *********************************************************************************************************************
 */
/**
 * @brief
 */
class PropertyLoader {
    /**
     * @brief
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
/**
 * @brief
 * @author Robert R Murrell
 */
class BaseSubject {
    /**
     * @brief
     * @param {string} id
     * @param {Array.<string>} roles
     */
    constructor(id, roles = []) {
        this._id    = id;
        this._roles = roles;
    }

    /**
     * @brief
     * @returns {string}
     */
    get id() {
        return this._id;
    }

    /**
     * @brief
     * @returns {Array.<string>}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief
     * @param {string} role
     */
    addRole(role) {
        this._roles.unshift(role);
    }

    /**
     * @brief
     * @param {Array.<string>} roles
     */
    addRoles(roles) {
        this._roles = roles.concat(this._roles);
    }

    /**
     * @brief
     * @param {string} role
     * @returns {Promise<boolean>}
     */
    async isInRole(role) {
        return new Promise((resolve, reject) => {
            resolve(this._roles.includes(role));
        });
    }

    /**
     * @brief
     * @returns {{subject:string, roles:Array.<string>}}
     */
    toJSON() {
       return {subject: this._id, roles: this._roles};
    }
}
/**
 * @brief
 * @author Robert R Murrell
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
     * @brief
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @returns {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        return new Promise((resolve) => {
            resolve(true);
        });
    }

    /**
     * @brief
     * @returns {string}
     */
    get type() {
        return this._type;
    }
}
/**
 * @brief
 * @author Robert R Murrell
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
                let itr = assertion[Symbol.iterator]();
                for(let role of itr) {
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
 * @brief
 * @author Robert R Murrell
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
                let itr = values[Symbol.iterator]();
                for(let role of itr) {
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
 * @brief
 * @author Robert R Murrell
 */
class MatchNone extends ValueMatch {
    constructor() {
        super("MatchNone");
    }

    /**
     * @brief No role in assertion must match a role in values.
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @returns {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        return new Promise((resolve, reject) => {
            try {
                let match = false;
                let itr = values[Symbol.iterator]();
                for(let role of itr) {
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

/**
 * @brief
 * @author Robert R Murrell
 */
class FunctionRole {
    /**
     * @brief
     * @param {string} [action]
     * @param {Array.<string>} roles
     * @param {ValueMatch} [match]
     */
    constructor(action = "process", roles = [], match = new MatchAny()) {
        this._roles = roles;
        this._action = action.toLowerCase();
        this._match  = match;
    }

    /**
     * @brief
     * @returns {string}
     */
    get action() {
        return this._action;
    }

    /**
     * @brief
     * @param {string} role
     * @returns {FunctionRole}
     */
    addRole(role) {
        this._roles.unshift(role);
        return this;
    }

    /**
     * @brief
     * @returns {Array<string>}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief
     * @param {string} action
     * @param {BaseSubject} subject
     * @returns {Promise<boolean>}
     */
    async authorize(action, subject) {
        return new Promise((resolve, reject) => {
            if(action === this._action) {
                this._match.isMatch(subject.roles, this._roles)
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

    /**
     * @brief
     * @param {object} source
     * @return {FunctionRole}
     */
    static create(source) {
        if(typeof source === "undefined" || source == null)
            throw CelastrinaError.newError("Invalid FunctionRole, cannot be null or undefined.");
        if(!source.hasOwnProperty("_roles"))
            throw CelastrinaError.newError("Invalid FunctionRole, _roles required.");
        else if(!Array.isArray(source._roles))
            throw CelastrinaError.newError("Invalid FunctionRole, _values must be an array.");
        if(!source.hasOwnProperty("_action"))
            throw CelastrinaError.newError("Invalid FunctionRole, _action required.");
        if(!source.hasOwnProperty("_match"))
            throw CelastrinaError.newError("Invalid FunctionRole, _match required.");
        if(!source._match.hasOwnProperty("_type"))
            throw CelastrinaError.newError("Invalid FunctionRole.ValueMatch, _type required.");

        let match;
        switch(source._match._type) {
            case "ValueMatch":
                match = new ValueMatch();
                break;
            case "MatchAny":
                match = new MatchAny();
                break;
            case "MatchAll":
                match = new MatchAll();
                break;
            case "MatchNone":
                match = new MatchNone();
                break;
            default:
                throw CelastrinaError.newError("Invalid Match Type.");
        }

        return new FunctionRole(source._action, source._roles, match);
    }
}

/*
 * *********************************************************************************************************************
 * CONFIGURATION
 * *********************************************************************************************************************
 */
/**
 * @brief
 * @author Robert R Murrell
 * @type {{_name:StringProperty|string, managed:BooleanProperty|boolean}}
 */
class Configuration {
    /**
     * @brief
     * @param {StringProperty|string} name
     * @param {BooleanProperty|boolean} managed
     */
    constructor(name, managed = true) {
        this._name    = name;
        this._managed = managed;

        /** @type {Array.<JsonProperty|ApplicationAuthorization>} **/
        this._appauth = [];
        /** @type {Array.<StringProperty|string>} **/
        this._resauth = [];
        /** @type {Array.<JsonProperty|FunctionRole>} */
        this._roles   = [];
        /** @type {null|PropertyHandler} */
        this._handler = new PropertyHandler();
        /** @type {null|_AzureFunctionContext} */
        this._context = null;
    }

    /**
     * @brief
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @brief
     * @returns {boolean}
     */
    get isManaged() {
        return this._managed;
    }

    /**
     * @brief
     * @returns {PropertyHandler}
     */
    get properties() {
        return this._handler;
    }

    /**
     * @brief
     * @param {JsonProperty|ApplicationAuthorization} application
     * @returns {Configuration}
     */
    addApplicationAuthorization(application) {
        this._appauth.unshift(application);
        return this;
    }

    /**
     * @brief
     * @returns {Array<Object|ApplicationAuthorization>}
     */
    get applicationAuthorizations() {
        return this._appauth;
    }

    /**
     * @brief Adds a resource name for authorization.
     * @description Resource authorizations are used for Azure Functions with managed identities. If using an
     *              application identity us {ApplicationAuthorization} instead.
     *              In order for resource authorizations to work the {_managed} attribute of this {Configuration}
     *              <strong>must be <code>true</code></strong> or the function will not boot strap.
     * @param {StringProperty|string} resource The name of the resource to authorize.
     * @returns {Configuration}
     */
    addResourceAuthorization(resource) {
        if(!this._managed)
            throw CelastrinaError.newError("Invalied managed state exception. This function MUST be " +
                                           "managed (managed = true) to use resource authorizations. If " +
                                           "attempting to assign resources to an application, please use " +
                                           "ApplicationRegistration.");
        this._resauth.unshift(resource);
        return this;
    }

    /**
     * @brief
     * @returns {Array<string>}
     */
    get resourceAuthorizations() {
        return this._resauth;
    }

    /**
     * @brief
     * @param {JsonProperty|FunctionRole} role
     * @returns {Configuration}
     */
    addFunctionRole(role) {
        this._roles.unshift(role);
        return this;
    }

    /**
     * @brief
     * @returns {Array<Object|FunctionRole>}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief
     * @returns {_AzureFunctionContext}
     */
    get context() {
        return this._context;
    }

    /**
     * @brief
     * @param {string} endpoint
     * @param {string} secret
     * @returns {Promise<string>}
     * @private
     */
    async _registerVaultResource(endpoint, secret) {
        return new Promise((resolve, reject) => {
            let params = new URLSearchParams();
            params.append("resource", "https://vault.azure.net");
            params.append("api-version", "2017-09-01");
            let config = {params: params,
                          headers: {"secret": process.env["MSI_SECRET"]}};

            axios.get(process.env["MSI_ENDPOINT"], config)
                .then((response) => {
                    resolve(response.data.value);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief
     * @return {Promise<void>}
     * @private
     */
    async _setManaged() {
        return new Promise((resolve, reject) => {
            try {
                // We are going to ignore secure property values for this setting.
                if(this._managed instanceof BooleanProperty) {
                    // Setting if this is managed or not, going to ignore
                    let local = process.env[this._managed.name];
                    if(typeof local === "undefined" || local == null)
                        this._managed = false;
                    else
                        this._managed = (local === "true");
                }

                // Now we load the appropriate property handler
                if(this._managed) {
                    this._registerVaultResource(process.env["MSI_ENDPOINT"], process.env["MSI_SECRET"])
                        .then((value) => {
                            this._handler = new VaultPropertyHandler(new Vault(value));
                            resolve();
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                }
                else
                    resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
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
                        if(local.secure !== this._managed)
                            throw CelastrinaError.newError("Managed configuration required. Property '" +
                                local.name + "' is secure.");
                        else
                            promises.unshift(PropertyLoader.load(obj, prop, local, this._handler));
                    else
                        this._load(local, promises);
                }
            }
        }
    }

    /**
     * @brief
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     */
    async load(context) {
        return new Promise(
            (resolve, reject) => {
                try {
                    // Set up the invocationId
                    this._context = context;
                    // Set up the properties loader
                    this._setManaged()
                        .then(() => {
                            // Scan for any property object then replace async.
                            /** @type {Array.<Promise<void>>} */
                            let promises = [];
                            this._load(this, promises);
                            return Promise.all(promises);
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
}
/*
 * *********************************************************************************************************************
 * FUNCTION
 * *********************************************************************************************************************
 */
/**
 * @brief
 * @author Robert R Murrell
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
 * @author Robert R Murrell
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
     * @returns {Object}
     */
    get passed() {
        return this._passed;
    }

    /**
     * @brief
     * @returns {Object}
     */
    get failed() {
        return this._failed;
    }

    /**
     * @brief Sets a check that was made by this monitor that passed.
     * @param {string} probe
     * @param {string} message
     */
    addPassedDiagnostic(probe, message) {
        this._passed[probe] = message;
    }

    /**
     * @brief Sets a check that was made by this monitor that failed.
     * @param {string} probe
     * @param {string} message
     */
    addFailedDiagnostic(probe, message) {
        if(!this._passedCheck) this._passedCheck = !this._passedCheck;
        this._failed[probe] = message;
    }

    /**
     * @brief
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
 * @type {{_appauth:Object}}
 */
class BaseSentry {
    constructor() {
        this._appauth    = {};
        this._roles      = {};
        this._localAppId = null;
    }

    /**
     * @brief
     * @returns {string}
     */
    get localApplicationId() {
        return this._localAppId;
    }

    /**
     * @brief
     * @returns {Object}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief Returns the authorization token for an application or managed identity and resource.
     * @param {string} resource The resource to get an authorization token for. Example https://database.windows.net/.
     *                 See https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/
     *                 services-support-managed-identities for more information.
     * @param {null|string} [id] The application ID, or the ID of the managed identity.
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
     * @brief
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            resolve(new BaseSubject(this._localAppId));
        });
    }

    /**
     * @brief
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
                    funcrole.authorize(context.action, context.subjcet)
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
     * @brief
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async setRoles(context) {
        return new Promise((resolve, reject) => {
            resolve(context.subjcet);
        });
    }

    /**
     * @brief
     * @param {Object|ApplicationAuthorization} authorization
     * @returns {Promise<void>}
     * @private
     */
    async _loadApplicationAuthorization(authorization) {
        return new Promise((resolve, reject) => {
            try {
                // First we convert it to an authorization if its not already.
                if (!(authorization instanceof ApplicationAuthorization)) {
                    /** @type {ApplicationAuthorization} */
                    authorization = ApplicationAuthorization.create(authorization);
                }

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
     * @brief
     * @param {Array.<Object|ApplicationAuthorization>} applications
     * @returns {Promise<void>}
     * @private
     */
    async _loadApplicationAuthorizations(applications) {
        return new Promise((resolve, reject) => {
            if(applications.length > 0) {
                let promises = [];
                let itr = applications[Symbol.iterator]();
                for (let appobj of itr) {
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
     * @brief
     * @param {Configuration} configuration
     * @private
     */
    _loadResourceAuthorizations(configuration) {
        if(configuration.isManaged && configuration.resourceAuthorizations.length > 0) {
            configuration.addApplicationAuthorization(new ApplicationAuthorization(process.env["MSI_ENDPOINT"],
                "", this._localAppId, process.env["MSI_SECRET"], configuration.resourceAuthorizations,
                true));
        }
    }

    /**
     * @brief
     * @param {Object|FunctionRole} role
     * @returns {Promise<void>}
     * @private
     */
    async _loadFunctionRole(role) {
        return new Promise((resolve, reject) => {
            try {
                if (!(role instanceof FunctionRole)) {
                    /** @type {FunctionRole} */
                    role = FunctionRole.create(role);
                }
                this._roles[role.action] = role;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
     * @param {Array.<Object|FunctionRole>} roles
     * @returns {Promise<void>}
     * @private
     */
    async _loadFunctionRoles(roles) {
        return new Promise((resolve, reject) => {
            if(roles.length > 0) {
                /** @type {Array.<Promise<void>>} */
                let promises = [];
                let itr = roles[Symbol.iterator]();
                for(let roleobj of itr) {
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
     * @brief
     * @param {Configuration} configuration
     * @returns {Promise<BaseSentry>}
     */
    async initialize(configuration) {
        return new Promise((resolve, reject) => {
            // Set up the local application id.
            this._localAppId = process.env["CELASTRINA_MSI_OBJECT_ID"];
            if(typeof this._localAppId !== "string")
                this._localAppId = configuration.context.invocationId;
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
/**
 * @brief
 * @author Robert R Murrell
 */
class BaseContext {
    /**
     * @brief
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
    }

    /**
     * @brief
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
     * @brief Returns true if this a monitor message, false otherwise.
     * @returns {boolean}
     */
    get isMonitorInvocation() {
        return this._monitor;
    }

    /**
     * @brief Returns the monitor response or null if this was not a monitor message.
     * @description Use this to record your passed or failed checks you've mode.
     * @returns {null|MonitorResponse}
     */
    get monitorResponse() {
        return this._monitorResponse;
    }

    /**
     * @brief
     * @returns {_AzureFunctionContext}
     */
    get context() {
        return this._context;
    }

    /**
     * @brief Returns the name for this context.
     * @description The name is the textual context of this software context and is used in logging.
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @brief Returns the invocation ID assigned by azure during function invocation.
     * @description This is not the same as the request ID, which is assigned by Celastrina.
     * @returns {string}
     */
    get invocationId() {
        return this._context.bindingData.invocationId;
    }

    /**
     * @brief Returns the uuid for this transaction as assigned by Celastrina.
     * @returns {string}
     */
    get requestId() {
        return this._requestId;
    }

    /**
     * @brief
     * @returns {BaseSubject}
     */
    get subjcet() {
        return this._subject;
    }

    /**
     * @brief
     * @param {BaseSubject} subject
     */
    set subject(subject) {
        this._subject = subject;
    }

    /**
     * @brief Returns the action being performed by this context. Default is "process".
     * @returns {string}
     */
    get action() {
        return this._action;
    }

    /**
     * @brief Returns a binding object by name
     * @param {string} name The binding to get.
     */
    getBinding(name) {
        return this._context.bindings[name];
    }

    /**
     * @brief Sets a binding object.
     * @param {string} name
     * @param {Object} value
     */
    setBinding(name, value) {
        this._context.bindings[name] = value;
    }

    /**
     * @brief
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @return {Promise<string>}
     */
    async getEnvironmentProperty(key, defaultValue = null) {
        return this._properties.getEnvironmentProperty(key, defaultValue);
    }

    /**
     * @brief
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @return {Promise<string>}
     */
    async getSecureEnvironmentProperty(key, defaultValue = null) {
        return this._properties.getSecureEnvironmentProperty(key, defaultValue);
    }

    /**
     * @brief
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
     * @brief
     * @param {Object} object
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    logObjectAsJSON(object, level = LOG_LEVEL.LEVEL_TRACE, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }

    /**
     * @brief Calls context.done on the function context with the optional parameter.
     * @param {null|Object} [value]
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
 * @author Robert R Murrell
 */
class BaseFunction {
    /**
     * @brief Initializes the function class.
     * @param {Configuration} configuration
     */
    constructor(configuration) {
        this._configuration = configuration;
        /** @type {null|BaseSentry} */
        this._sentry        = null;
        /** @type {null|BaseContext} */
        this._context       = null;
    }

    /**
     * @brief
     * @returns {Configuration}
     */
    get configuration() {
        return this._configuration;
    }

    get sentry() {
        return this._sentry;
    }

    get context() {
        return this._context;
    }

    /**
     * @brief Lifecycle operation to perform key operations of setting up and bootstrapping this function.
     * @description <p>Override this function to perform any pre-initialization tasks. The lifecycle is invoked after
     *              the context is created but before initialization. Implementors MUST call the super of
     *              or this function may not work as intended or produce errors.</p>
     *              <p>Do not rely on any internal features of this function while inside this promise.</p>
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
     * @brief Creates an implementations of Base Context from the Azure Function context passed in.
     * @description Override this function to create the instance of BaseContext required for your function.
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     * @returns {Promise<BaseContext>} The base context for this function.
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
     * @brief Lifecycle operation to perform key operations of setting up and bootstrapping this function.
     * @description <p>Override this function to perform any pre-initialization tasks. The lifecycle is invoked after
     *              the context is created but before initialization. Implementors MUST call the super of
     *              or this function may not work as intended or produce errors.</p>
     *              <p>Do not rely on any internal features of this function while inside this promise.</p>
     * @param {_AzureFunctionContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
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
                        this._sentry  = results[0];
                        this._context = results[1];
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }

    /**
     * @brief Lifecycle operation to initialize any objects required to perform the function.
     * @description Override this function to perform any initialization actions.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     */
    async initialize(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to authenticate a requester before performing the action.
     * @description Override this function to perform any authentication actions. If you need to validate anything
     *              related to authentication you'll need to do it here as validation lifecycle is invoked AFTER
     *              authentication and authorization.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<BaseSubject>} An instance of BaseSubject.
     * @throws {CelastrinaError} if the user cannot be authenticated for any reason.
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            this._sentry.authenticate(context)
                .then((subject) => {
                    return this._sentry.setRoles(context, subject);
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
     * @brief Lifecycle operation to authorize a requester before performing the action.
     * @description Override this function to perform any authorization actions. If you need to validate anything
     *              related to authorization you'll need to do it here as validation lifecycle is invoked AFTER
     *              authorization.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the user cannot be authorized for any reason.
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            this._sentry.authorize(context)
                .then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief Lifecycle operation to validate the business input before performing the rest of the lifecycle.
     * @description Override this function to perform any validation actions.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful, or rejected with an CelastrinaError if not.
     * @throws {CelastrinaValidationError} if the input cannot be validated.
     */
    async validate(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Override this method to respond to monitor requests.
     * @description Fill out the monitor response and resolve. do not use send or done. This must return a promise that
     *              either resolves to void or rejects with a type of {CelastrinaError}
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the monitor lifecycle fails for any reason.
     */
    async monitor(context) {
        return new Promise(
            (resolve) => {
                context.log("No monitoring checks performed, monitor not overridden.",
                    LOG_LEVEL.LEVEL_WARN, "BaseFunction.monitor(context)");
                context.monitorResponse.addPassedDiagnostic("default", "Monitor not overridden.");
                resolve();
            });
    }

    /**
     * @brief Lifecycle operation to load information before performing the rest of the lifecycle.
     * @description Override this function to perform any loading actions.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the load lifecycle fails for any reason.
     */
    async load(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to process the request.
     * @description Override this function to perform business logic of this function.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the process lifecycle fails for any reason.
     */
    async process(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to save information after the process lifecycle.
     * @description Override this function to save any states after processing.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the save lifecycle fails for any reason.
     */
    async save(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to save handle any exceptions during the lifecycle, up to processing.
     * @description Override this function to handle any exceptions up to processing.
     * @param {BaseContext} context The context of the function.
     * @param {*} exception
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the exception lifecycle fails for any reason.
     */
    async exception(context, exception) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Lifecycle operation to clean up prior to the completion of the function.
     * @description Override this function to clean up before complettion.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the terminate lifecycle fails for any reason.
     */
    async terminate(context) {
        return new Promise((resolve) => {
            resolve();
        });
    }

    /**
     * @brief Initialized the key vualt resource using the MSI managed identity configuration.
     * @param {BaseContext} context The context of the function.
     * @returns {Promise<void>} Void if successful.
     * @throws {CelastrinaError} if the secureInitialize lifecycle fails for any reason.
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
                            } else {
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
     * @brief Determines the class of exceptions an sends the appropriate message to the calling end-pont.
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
    Property:                   Property,
    JsonProperty:               JsonProperty,
    StringProperty:             StringProperty,
    BooleanProperty:            BooleanProperty,
    NumericProperty:            NumericProperty,
    ApplicationAuthorization:   ApplicationAuthorization,
    ValueMatch:                 ValueMatch,
    MatchAny:                   MatchAny,
    MatchAll:                   MatchAll,
    MatchNone:                  MatchNone,
    FunctionRole:               FunctionRole,
    Configuration:              Configuration,
    LOG_LEVEL:                  LOG_LEVEL,
    BaseSubject:                BaseSubject,
    BaseSentry:                 BaseSentry,
    BaseContext:                BaseContext,
    BaseFunction:               BaseFunction
};
