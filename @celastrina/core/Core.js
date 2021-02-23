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
const {EventEmitter} = require('events');
const {TokenResponse, AuthenticationContext} = require("adal-node");

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
 * @typedef {Object} _Body
 */
/**
 * @typedef _AzureLog
 * @function error
 * @function info
 * @function warn
 * @function verbose
 */
/**
 * @typedef _AzureFunctionContext
 * @property {Object & {req: Object, res: Object}} bindings
 * @property {Object & {invocationId: string}} bindingData
 * @property {function(*)|_AzureLog} log
 * @property {function()|function(*)} done
 * @property {function(string)} log
 * @property {string} invocationId
 * @property {Object} traceContext
 */
/**
 * @typedef {_AzureFunctionContext} _AzureHTTPFunctionContext
 * @property {_AzureFunctionResponse} res
 * @property {_AzureFunctionRequest} req
 * @property {Object} params
 * @property {Object} query
 * @property {string} method
 * @property {string} originalUrl
 * @property {string} rawBody
 */
/**
 * @typedef _Credential
 * @property {string} access_token
 * @property {moment.Moment} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */

/** @author Robert R Murrell */
class CelastrinaError {
    /**
     * @param {Error} cause
     * @param {int} code
     * @param {boolean} drop
     */
    constructor(cause, code = 500, drop = false) {
        this.cause = cause;
        this.code  = code;
        this.drop  = drop;
    }
    /**@returns{string}*/toString() {return "[" + this.code + "][" + this.drop + "]: " + this.cause.message;}
    toJSON() {return {message: this.cause.message, code: this.code, drop: this.drop};}
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} drop
     * @returns {CelastrinaError}
     */
    static newError(message, code = 500, drop = false) {
        return new CelastrinaError(new Error(message), code, drop);
    }
    /**
     * @param {Error} error
     * @param {int} code
     * @param {boolean} drop
     * @returns {CelastrinaError}
     */
    static wrapError(error, code = 500, drop = false) {
        return new CelastrinaError(error, code, drop);
    }
}
/**@type{CelastrinaError}*/
class CelastrinaValidationError extends CelastrinaError {
    /**
     * @param {Error} error
     * @param {int} code
     * @param {boolean} drop
     * @param {string} tag
     */
    constructor(error, code = 500, drop = false, tag = "") {
        super(error, code, drop);
        this.tag = tag;
    }
    /**@returns{string}*/toString(){return "[" + this.tag + "]" + super.toString();}
    toJSON(){return {message: this.cause.message, code: this.code, tag: this.tag, drop: this.drop};}
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} drop
     * @param {string} tag
     *
     * @returns {CelastrinaValidationError}
     */
    static newValidationError(message, tag = "", drop = false, code = 400) {
        return new CelastrinaValidationError(new Error(message), code, drop, tag);
    }
    /**
     * @param {Error} error
     * @param {int} code
     * @param {boolean} drop
     * @param {string} tag
     * @returns {CelastrinaValidationError}
     */
    static wrapValidationError(error, tag = "", drop = false, code = 400) {
        return new CelastrinaValidationError(error, code, drop, tag);
    }
}
/**@abstract*/
class ResourceAuthorization {
    /**
     * @param {string} id
     * @param {Array.<StringProperty|string>} [resources]
     */
    constructor(id, resources = []) {
        this._id = id;
        this._resources = resources;
        this._tokens = {};
    }
    /**@returns{Array.<string>}*/get resources(){return this._resources;}
    /**
     * @param {StringProperty|string} resource
     * @returns {ResourceAuthorization}
     */
    addResource(resource){this._resources.unshift(resource); return this;}
    /**@returns{string}*/get id(){return this._id;}
    /**
     * @param {string} resource
     * @returns {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
    /**
     * @param {string} resource
     * @returns {Promise<string>}
     * @private
     */
    async _refresh(resource) {
        return new Promise((resolve, reject) => {
            this._resolve(resource)
                .then((token) => {
                    this._tokens[resource] = token;
                    resolve(token.token);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    };
    /**
     * @param {string} resource
     * @returns {Promise<string>}
     */
    async getToken(resource) {
        return new Promise((resolve, reject) => {
            /** @type {_CelastrinaToken} */
            let token = this._tokens[resource];
            if(typeof token !== "object") {
                this._refresh(resource)
                    .then((rtoken) => {
                        resolve(rtoken);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else {
                let exp = token.expires;
                let now = moment();
                if(exp.isSameOrAfter(now))
                    this._refresh(resource)
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
}
/**@type{ResourceAuthorization}*/
class ManagedIdentityAuthorization extends ResourceAuthorization {
    /**
     * @param {Array.<null|string>} [resources=null]
     * @param {string}[apiVersion="2017-09-01"]
     */
    constructor(apiVersion = "2017-09-01", resources = null) {
        super(ResourceAuthorizationConfiguration.CONFIG_SENTRY_IDENTITY, resources);
        this._apiVersion = apiVersion;
        let params = new URLSearchParams();
        params.append("resource", null);
        params.append("api-version", this._apiVersion);
        this._config = {/**@type{URLSearchParams}*/params: params, headers: {"secret": process.env["IDENTITY_HEADER"]}};
        this._endpoint = process.env["IDENTITY_ENDPOINT"];
    }
    /**
     * @param {string} resource
     * @returns {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource) {
        return new Promise((resolve, reject) => {
            this._config.params.set("resource", resource);
            axios.get(this._endpoint, this._config)
                .then((response) => {
                    let token = {resource:resource,token:response.data.access_token,expires:moment(response.data.expires_on)};
                    this._tokens[token.resource] = token;
                    resolve(token);
                })
                .catch((exception) =>{
                    reject(exception);
                });
        });
    }
}
/**@type{ResourceAuthorization}*/
class AppRegistrationAuthorization extends ResourceAuthorization {
    /**
     * @param {StringProperty|string} id
     * @param {StringProperty|string} authority
     * @param {StringProperty|string} tenant
     * @param {StringProperty|string} secret
     * @param {Array.<StringProperty|string>} [resources=null]
     */
    constructor(id, authority, tenant, secret,
                resources = null) {
        super(id, resources);
        this._authority = authority;
        this._tenant = tenant;
        this._secret = secret;
    }
    /**@returns{string}*/get authority(){return this._authority;}
    /**@returns{string}*/get tenant(){return this._tenant;}
    /**@returns{string}*/get secret(){return this._secret;}
    /**
     * @param {string} resource
     * @returns {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource) {
        return new Promise((resolve, reject) => {
            let adContext = new AuthenticationContext(this._authority + "/" + this._tenant);
            adContext.acquireTokenWithClientCredentials(resource, this._id, this._secret,
                (err, response) => {
                    if(err) reject(CelastrinaError.newError("Not authorized.", 401));
                    else {
                        let token = {resource: resource, token: response.accessToken, expires: moment(response.expiresOn)};
                        this._tokens[token.resource] = token;
                        resolve(token.token);
                    }
            });
        });
    }
}
/** @author Robert R Murrell */
class ResourceAuthorizationConfiguration {
    /**@type{string}*/static CONFIG_SENTRY_APPAUTH = "celastrinajs.core.sentry.appauth";
    /**@type{string}*/static CONFIG_SENTRY_IDENTITY = "celastrinajs.core.sentry.identity";
    /** */
    constructor() {
        this._authorizations = {};
    }
    /**
     * @param {ResourceAuthorization} authorization
     * @returns {ResourceAuthorizationConfiguration}
     */
    addAuthorization(authorization) {
        /**@type{ResourceAuthorization}*/let resauth = this._authorizations[authorization.id];
        if(typeof resauth === "undefined" || resauth == null) {
            resauth = authorization;
            this._authorizations[resauth.id] = resauth;
        }
        else {
            // Copy the resources into the existing ID.
            for(let resource of authorization.resources) {
                resauth.addResource(resource);
            }
        }
        return this;
    }
    /**
     * @param {null|string} [id=ResourceAuthorization.MANAGED_IDENTITY_ID]
     * @returns {Promise<ResourceAuthorization>}
     */
    async getAuthorization(id = ResourceAuthorizationConfiguration.CONFIG_SENTRY_IDENTITY) {
        return new Promise((resolve, reject) => {
            let authorization = this._authorizations[id];
            if(typeof authorization === "undefined" || authorization == null)
                reject(CelastrinaError.newError("Not authorized.", 401));
            else
                resolve(authorization);
        });
    }
    /**
     * @param {string} resource
     * @param {null|string} [id = ResourceAuthorizationManager.MANAGED_IDENTITY_ID]
     * @returns {Promise<string>}
     */
    async getResourceToken(resource, id = ResourceAuthorizationConfiguration.CONFIG_SENTRY_IDENTITY) {
        return new Promise((resolve, reject) => {
            this.getAuthorization(id)
                .then((authorization) => {
                    return authorization.getToken(resource);
                })
                .then((token) => {
                    resolve(token);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/** Vault */
class Vault {
    /** @param {string} [version="7.0"] */
    constructor(version = "7.0") {
        let params = new URLSearchParams();
        params.append("api-version", version);
        this._config = {params: params,headers:{}};
    }
    /**
     * @param {string} token
     * @param {string} identifier
     * @returns {Promise<string>}
     */
    async getSecret(token, identifier) {
        return new Promise((resolve, reject) => {
            this._config.headers["Authorization"] = "Bearer " + token;
            axios.get(identifier, this._config)
                .then((response) => {
                    resolve(response.data.value);
                })
                .catch((exception) => {
                    reject(CelastrinaError.newError("Error getting secret for '" + identifier + "'."));
                });
        });
    }
}
/**@abstract*/
class PropertyHandler {
    constructor(){}
    /**
     * @param {_AzureFunctionContext} context
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async initialize(context, config) {
        return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not Implemented."));});
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue = null]
     * @returns {Promise<*>}
     * @abstract
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not Implemented."));});
    }
}
/**@type{PropertyHandler}*/
class AppSettingsPropertyHandler extends PropertyHandler {
    constructor(){super();}
    /**
     * @param {_AzureFunctionContext} context
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async initialize(context, config) {
        return new Promise((resolve, reject) => {
            context.log.verbose("[AppSettingsPropertyHandler.initialize(context, config)]: AppSettingsPropertyHandler initialized.");
            resolve();
        });
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            let value = process.env[key];
            if(typeof value === "undefined") value = defaultValue;
            resolve(value);
        });
    }
}

/**@type{AppSettingsPropertyHandler}*/
class AppConfigPropertyHandler extends AppSettingsPropertyHandler {
    /**
     * @param {string} subscriptionId
     * @param {string} resourceGroupName
     * @param {string} configStoreName
     * @param {string} [label="development"]
     * @param {boolean} [useVaultSecrets=true]
     */
    constructor(subscriptionId, resourceGroupName, configStoreName,
                label = "development", useVaultSecrets = true, ) {
        super();
        this._url = "https://management.azure.com/subscriptions/" + subscriptionId +
            "/resourceGroups/" + resourceGroupName + "/providers/Microsoft.AppConfiguration/configurationStores/" +
            configStoreName + "/listKeyValue";
        let params = new URLSearchParams();
        params.append("api-version","2019-10-01");
        this._requestBody = {key: "", label: label};
        this._config = {params: params, headers: {}};
        /** @type {null|ResourceAuthorizationConfiguration} */this._authConfig = null;
        /** @type{boolean} */this._useVaultSecrets = useVaultSecrets;
        if(this._useVaultSecrets)
            /** @type{Vault} */this._vault = new Vault();
    }
    /**
     * @param {_AzureFunctionContext} context
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async initialize(context, config) {
        return new Promise((resolve, reject) => {
            this._authConfig = config[ResourceAuthorizationConfiguration.CONFIG_SENTRY_APPAUTH];
            context.log.verbose("[AppConfigPropertyHandler.initialize(context, config)]: AppConfigPropertyHandler initialized.");
            resolve();
        });
    }
    /**
     * @param kvp
     * @returns {Promise<*>}
     * @private
     */
    async _resolveVaultReference(kvp) {
        return new Promise((resolve, reject) => {
            if(kvp.contentType === "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8" &&
                    this._useVaultSecrets) {
                this._authConfig.getResourceToken("https://vault.azure.net")
                    .then((token) => {
                        let vaultRef = JSON.parse(kvp.value);
                        return this._vault.getSecret(token, vaultRef.uri);
                    })
                    .then((value) => {
                        resolve(value);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else
                resolve(kvp.value);
        });
    }
    /**
     * @param {string} key
     * @returns {Promise<*>}
     * @private
     */
    async _getAppConfigProperty(key) {
        return new Promise((resolve, reject) => {
            this._requestBody.key = key;
            this._authConfig.getResourceToken("https://management.azure.com/")
                .then((token) => {
                    this._config.headers["Authorization"] = "Bearer " + token;
                    return axios.post(this._url, this._requestBody, this._config);
                })
                .then((response) => {
                    return this._resolveVaultReference(response.data);
                })
                .then((value) => {
                    resolve(value);
                })
                .catch((exception) => {
                    reject(CelastrinaError.newError("Error getting value for '" + key + "'.",
                                                    exception.response.status, false));
                });
        });
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise(async (resolve, reject) => {
            try {
                this._getAppConfigProperty(key)
                    .then((value) => {
                        resolve(value);
                    })
                    .catch((exception) => {
                        if(exception.code === 404) {
                            super.getProperty(key, defaultValue)
                                .then((value) => {
                                    resolve(value);
                                })
                                .catch((exception) => {
                                    reject(exception);
                                });
                        }
                        else
                            reject(exception);
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/** @author Robert R Murrell */
class CachedProperty {
    /**
     * @param {number} [time=300]
     * @param {DurationInputArg2} [unit="s"]
     */
    constructor(time = 300, unit = "s") {
        /** @type {*} */this._value = null;
        this._time = time;
        this._unit = unit;
        /**@type{null|moment.Moment}*/this._expires = null;
        /**@type{null|moment.Moment}*/this._lastUpdate = null;
    }
    /**@returns{*}*/get value(){return this._value;}
    /**@returns{null|moment.Moment}*/get expires(){return this._expires;}
    /**@returns{null|moment.Moment}*/get lastUpdated(){return this._lastUpdate;}
    /**@param{*}value*/
    set value(value) {
        this._value = value;
        this._lastUpdate = moment();
        if(this._time === 0 || value == null) this._expires = null;
        else this._expires = moment().add(this._time, this._unit);
    }
    /**@returns{boolean}*/
    isExpired() {
        if(this._expires == null) return true;
        else return (moment().isSameOrAfter(this._expires));
    }
    /**@returns{Promise<void>}*/
    async clear() {
        return new Promise((resolve, reject) => {
            this.value = null;
            resolve();
        });
    }
}
/**@type{AppSettingsPropertyHandler}*/
class CachePropertyHandler extends PropertyHandler {
    /**@type{string}*/static CONFIG_CACHE_DEFAULT_EXPIRE_TIME = "celastrinajs.core.property.cache.expire.time";
    /**@type{string}*/static CONFIG_CACHE_DEFAULT_EXPIRE_UNIT = "celastrinajs.core.property.cache.expire.unit";
    /**@type{string}*/static CONFIG_CACHE_DEFAULT_EXPIRE_OVERRIDE = "celastrinajs.core.property.cache.expire.override";
    /**
     * @param {PropertyHandler} [handler=new AppSettingsPropertyHandler()]
     * @param {number} [defaultTime=300]
     * @param {DurationInputArg2} [defaultUnit="s"]
     */
    constructor(handler = new AppSettingsPropertyHandler(), defaultTime = 300,
                defaultUnit = "s") {
        super();
        this._handler = handler;
        this._cache = {};
        this._defaultTime = defaultTime;
        this._defaultUnit = defaultUnit;
    }
    /**@returns{boolean}*/get loaded(){return this._handler.loaded;}
    /**@returns{PropertyHandler}*/get handler(){return this._handler;}
    /**@returns{{Object}}*/get cache(){return this._cache;}
    /**@returns{Promise<void>}*/
    async clear() {
        return new Promise((resolve, reject) => {
            /**@type{Array.<Promise<void>>}*/let promises = [];
            for(let prop in this._cache) {
                let cached = this._cache[prop];
                if(cached instanceof CachedProperty) promises.unshift(cached.clear());
            }
            Promise.all(promises)
                .then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**@returns{Promise<void>}*/
    async _configure() {
        return new Promise(async (resolve, reject) => {
            try {
                let time = await this._handler.getProperty(CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_TIME, 300);
                let unit = await this._handler.getProperty(CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_UNIT, "s");
                this._defaultTime = time;
                this._defaultUnit = /**@type{DurationInputArg2}*/unit;
                let override = await this._handler.getProperty(CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_OVERRIDE, null);
                if(typeof override === "string") {
                    let tempovr = JSON.parse(override);
                    if((typeof tempovr === "object") && tempovr.hasOwnProperty("_type") &&
                        (typeof tempovr._type === "string") &&
                        (tempovr._type === CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_OVERRIDE)) {
                        /**@type{{_overrides:Array.<object>}}*/
                        let overrides = tempovr._overrides;
                        for(/**@type{{_property:string,_time:number,_unit:DurationInputArg2}}*/const ovr of overrides) {
                            this._cache[ovr._property] = new CachedProperty(ovr._time, ovr._unit);
                        }
                    }
                }
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     */
    async initialize(context) {
        return new Promise((resolve, reject) => {
            this._handler.initialize(context)
                .then(() => {
                    this._configure()
                        .then(() => {
                            context.log.verbose("[CachePropertyHandler.initialize(context, config, force)]: Caching configured.");
                            resolve();
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {string} key
     * @returns {Promise<CachedProperty>}
     */
    async getCacheInfo(key) {
        return new Promise((resolve, reject) => {
            let cached = this._cache[key];
            if(!(cached instanceof CachedProperty)) resolve(null);
            else resolve(cached);
        });
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise(async (resolve, reject) => {
            try {
                /**@type{undefined|CachedProperty}*/
                let cached  = this._cache[key];
                let value;
                if(!(cached instanceof CachedProperty)) {
                    value = await this._handler.getProperty(key, null);
                    if(value == null) value = defaultValue;
                    else {
                        cached = new CachedProperty(this._defaultTime, this._defaultUnit);
                        cached.value = value;
                        this._cache[key] = cached;
                    }
                }
                else if(cached.isExpired()) {
                    value = await this._handler.getProperty(key, null);
                    cached.value = value;
                    if(value == null) value = defaultValue;
                }
                else value = cached.value;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@abstract*/
class Property {
    /**
     * @param {string} name
     * @param {*} [defaultValue = null]
     */
    constructor(name, defaultValue = null) {
        this._name = name;
        this._defaultValue = defaultValue;
    }
    /**@returns{string}*/get name(){return this._name;}
    /**@returns{*}*/get defaultValue(){return this._defaultValue;}
    /**
     * @param {PropertyHandler} handler
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    async lookup(handler) {
        return new Promise((resolve, reject) => {
            handler.getProperty(this._name, this._defaultValue)
                .then((value) => {
                    resolve(value);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {null|string} value
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Property not supported."));});
    }
    /**
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
/**@type{Property}*/
class JsonProperty extends Property {
    /**
     * @param {string} name
     * @param {null|Object} defaultValue
     */
    constructor(name, defaultValue = null) {super(name, defaultValue);}
    /**
     * @param {null|string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                if(value == null) resolve(null);
                else resolve(JSON.parse(value));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{Property}*/
class StringProperty extends Property {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**
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
/**@type{Property}*/
class BooleanProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {null|boolean} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|boolean>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve((value.trim().toLowerCase() === "true"));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{Property}*/
class NumericProperty extends Property {
    /**
     * @param {string} name
     * @param {null|number} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**
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
/**@abstract*/
class HandlerProperty {
    /**@type{string}*/static CONFIG_PROPERTY = "celastrinajs.core.property.config";
    /**@param{null|string}[name=null]*/
    constructor(name = null){this._name = name;}
    /**@returns{string}*/get name(){return this._name}
    /**@returns {PropertyHandler}*/
    _createPropertyHandler(source) {return null;}
    /**@returns{PropertyHandler}*/
    initialize() {
        let lname = this._name;
        if(typeof lname === "undefined" || lname == null)
            lname = HandlerProperty.CONFIG_PROPERTY;
        /**@type{string}*/let config = process.env[lname];
        if(typeof config === "string" && config.trim().length > 0) {
            /**@type{{cached:boolean}}*/let source = JSON.parse(config);
            let handler = this._createPropertyHandler(source);
            if(source.hasOwnProperty("chached") && typeof source.chached === "boolean" && source.chached === true)
                return new CachePropertyHandler(handler);
            else
                return handler;
        }
        else
            throw CelastrinaError.newError("Invalid Configuration for property '" + lname + "'.");
    }
}
/**@type{HandlerProperty}*/
class AppConfigHandlerProperty extends HandlerProperty {
    constructor(name = "celastrinajs.core.property.appconfig.config"){super(name);}
    /**
     * @param {{subscriptionId:string, resourceGroupName:string, configStoreName:string, label:null|undefined|string, useVault:null|undefined|boolean}} source
     * @returns {PropertyHandler}
     */
    _createPropertyHandler(source) {
        if(!source.hasOwnProperty("subscriptionId") || typeof source.subscriptionId !== "string" ||
                source.subscriptionId.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigHandlerProperty, missing 'subscriptionId'.", "subscriptionId");
        if(!source.hasOwnProperty("resourceGroupName") || typeof source.resourceGroupName !== "string" ||
                source.resourceGroupName.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigHandlerProperty, missing 'resourceGroupName'.", "resourceGroupName");
        if(!source.hasOwnProperty("configStoreName") || typeof source.configStoreName !== "string" ||
                source.configStoreName.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigHandlerProperty, missing 'configStoreName'.", "configStoreName");
        // Defaulting label and vault.
        let _label    = "development";
        let _useVault = false;
        if(source.hasOwnProperty("label") && typeof source.label === "string" && source.label.trim().length > 0)
            _label = source.label;
        if(source.hasOwnProperty("useVault") && typeof source.useVault === "boolean")
            _useVault = source.useVault;
        return new AppConfigPropertyHandler(source.subscriptionId, source.resourceGroupName, source.configStoreName, _label, _useVault);
    }
}
/**@type{JsonProperty}*/
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
                            if(!source.hasOwnProperty("_authority")) reject(CelastrinaError.newError("Invalid ApplicationAuthorization, _authority required."));
                            else if(!source.hasOwnProperty("_tenant")) reject(CelastrinaError.newError("Invalid ApplicationAuthorization, _tenant required."));
                            else if(!source.hasOwnProperty("_id")) reject(CelastrinaError.newError("Invalid ApplicationAuthorization, _id required."));
                            else if(!source.hasOwnProperty("_secret")) reject(CelastrinaError.newError("Invalid ApplicationAuthorization, _secret required."));
                            else if(!source.hasOwnProperty("_resources")) reject(CelastrinaError.newError("Invalid ApplicationAuthorization, _resources required."));
                            else if (!Array.isArray(source._resources)) reject(CelastrinaError.newError("Invalid ApplicationAuthorization, _resources must be array."));
                            else source = new AppRegistrationAuthorization(source._authority, source._tenant, source._id, source._secret, source._resources);
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
/** PropertyLoader */
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
                .then((value) => {
                    object[attribute] = value;
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/** ModuleContext */
class ModuleContext {
    /**@param{BaseContext}context*/
    constructor(context) {
        this._context = context;
    }
    /**@returns{BaseContext}*/get context(){return this._context;}
}
/**@abstract*/
class Module {
    /**@param{string}name*/
    constructor(name) {
        this._name = name;
    }
    /**@returns{string}*/get name(){return this._name;}
    /**
     * @param {object} configuration
     * @param {_AzureFunctionContext} context
     * @param {PropertyHandler} properties
     * @returns{Promise<Module>}
     * @abstract
     */
    async initialize(configuration, context, properties) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<ModuleContext>}
     * @abstract
     */
    async newModuleContext(context) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
}
/** BaseSubject */
class BaseSubject {
    /**
     * @param {string} id
     * @param {Array.<string>} roles
     */
    constructor(id, roles = []) {
        this._id = id;
        this._roles = roles;
    }
    /**@returns{string}*/get id(){return this._id;}
    /**@returns{Array.<string>}*/get roles(){return this._roles;}
    /**@param{string}role*/
    addRole(role){this._roles.unshift(role);}
    /**@param{Array.<string>}roles*/
    addRoles(roles){this._roles = roles.concat(this._roles);}
    /**
     * @param {string} role
     * @returns {Promise<boolean>}
     */
    async isInRole(role) {
        return new Promise((resolve, reject) => {
            resolve(this._roles.includes(role));
        });
    }
    /**@returns{{subject:string,roles:Array.<string>}}*/
    toJSON(){return {subject: this._id, roles: this._roles};}
}
/**@abstract*/
class ValueMatch {
    /**
     * @brief
     * @param {string} [type]
     */
    constructor(type = "ValueMatch"){this._type = type}
    /** @returns {string} */get type(){return this._type;}
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
}
/**@type{ValueMatch}*/
class MatchAny extends ValueMatch {
    constructor(){super("MatchAny");}
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
                    if((match = values.includes(role))) break;
                }
                resolve(match);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{ValueMatch}*/
class MatchAll extends ValueMatch {
    constructor(){super("MatchAll");}
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
                    if(!(match = assertion.includes(role))) break;
                }
                resolve(match);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{ValueMatch}*/
class MatchNone extends ValueMatch {
    constructor(){super("MatchNone");}
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
                    if((match = assertion.includes(role))) break;
                }
                resolve(!match);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/** FunctionRole */
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
    /**@returns{string}*/get action(){return this._action;}
    /**@returns{Array<string>}*/get roles(){return this._roles;}
    /**
     * @param {string} role
     * @returns {FunctionRole}
     */
    addRole(role){this._roles.unshift(role); return this;}
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
            else resolve(false);
        });
    }
}
/**@type{JsonProperty}*/
class FunctionRoleProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**
     * @param type
     * @returns {Promise<ValueMatch>}
     * @private
     */
    static async _getMatchType(type) {
        return new Promise((resolve, reject) => {
            switch (type) {
                case "MatchAny": resolve(new MatchAny()); break;
                case "MatchAll": resolve(new MatchAll()); break;
                case "MatchNone": resolve(new MatchNone()); break;
                default: reject(CelastrinaError.newError("Invalid Match Type."));
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
                            if(!source.hasOwnProperty("_roles")) reject(CelastrinaError.newError("Invalid FunctionRole, _roles required."));
                            else if(!Array.isArray(source._roles)) reject(CelastrinaError.newError("Invalid FunctionRole, _roles must be an array."));
                            else if(!source.hasOwnProperty("_action")) reject(CelastrinaError.newError("Invalid FunctionRole, _action required."));
                            else if(!source.hasOwnProperty("_match")) reject(CelastrinaError.newError("Invalid FunctionRole, _match required."));
                            else if(!source._match.hasOwnProperty("_type")) reject(CelastrinaError.newError("Invalid FunctionRole._match._type, _type required."));
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
/** Configuration */
class Configuration extends EventEmitter {
    /**@type{string}*/static CONFIG_NAME = "celastrinajs.core.name";
    /**@type{string}*/static CONFIG_HANDLER = "celastrinajs.core.properties.handler";
    /**@type{string}*/static CONFIG_CONTEXT = "celastrinajs.core.properties.context";
    /**@type{string}*/static CONFIG_APPLICATION_AUTHORIZATION = "celastrinajs.core.authorization.application";
    /**@type{string}*/static CONFIG_RESOURCE_AUTHORIZATION = "celastrinajs.core.authorization.resource";
    /**@type{string}*/static CONFIG_ROLES = "celastrinajs.core.roles";
    /**@type{string}*/static CONFIG_MODULES = "celastrinajs.core.modules";
    /**@type{string}*/static CONFIG_LOCAL_DEV = "celastringjs.core.deployment.local.development";
    /**@param{StringProperty|string} name*/
    constructor(name) {
        super();
        if(typeof name === "string") {
            if(name.trim().length === 0) throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else if(!(name instanceof StringProperty)) throw CelastrinaError.newError("Invalid configuration. Name must be string or StringProperty.");
        this._config = {};
        /**@type{boolean}*/this._loaded = false;
        /**@type{null|_AzureFunctionContext}*/this._config[Configuration.CONFIG_CONTEXT] = null;
        /**@type{null|JsonProperty|PropertyHandler}*/this._config[Configuration.CONFIG_HANDLER] = null;
        /**@type{string|StringProperty}*/this._config[Configuration.CONFIG_NAME] = name;
        /**@type{Array.<JsonProperty|AppRegistrationAuthorization>}*/this._config[Configuration.CONFIG_APPLICATION_AUTHORIZATION] = [];
        /**@type{Array.<StringProperty|string>}*/this._config[Configuration.CONFIG_RESOURCE_AUTHORIZATION] = [];
        /**@type{Array.<JsonProperty|FunctionRole>}*/this._config[Configuration.CONFIG_ROLES] = [];
        /**@type{Array.<JsonProperty|Module>}*/this._config[Configuration.CONFIG_MODULES] = {_modules: []};
    }
    /**@returns{string}*/get name(){return this._config[Configuration.CONFIG_NAME];}
    /**@returns{PropertyHandler}*/get properties() {return this._config[Configuration.CONFIG_HANDLER];}
    /**@returns{object}*/get values(){return this._config;}
    /**@returns{Array<AppRegistrationAuthorization>}*/get applicationAuthorizations(){return this._config[Configuration.CONFIG_APPLICATION_AUTHORIZATION];}
    /**@returns{Array<string>}*/get resourceAuthorizations(){return this._config[Configuration.CONFIG_RESOURCE_AUTHORIZATION];}
    /**@returns{Array<FunctionRole>}*/get roles(){return this._config[Configuration.CONFIG_ROLES];}
    /**@returns{Array<Module>}*/get modules(){return this._config[Configuration.CONFIG_MODULES]._modules;}
    /**@returns{{_modules:Array.<Module>}}*/get moduleConfig(){return this._config[Configuration.CONFIG_MODULES];}
    /**@returns{_AzureFunctionContext}*/get context(){return this._config[Configuration.CONFIG_CONTEXT];}
    /**@returns{boolean}*/get loaded(){return this._loaded;}
    /**@returns{Promise<void>}*/
    async bootstrapped() {
        return new Promise((resolve, reject) => {
            if(!this._loaded) {
                /**@type{Array.<Promise<Module>>}*/let promises = [];
                /**@type{{_modules:Array.<Module>}}*/let modConfig = this.moduleConfig;
                /**@type{Array.<Module>}*/let modules = modConfig._modules;
                let context = this.context;
                for(/**@type{Module}*/const module of modules) {
                    context.log.verbose("[Configuration.bootstrapped()]: Loading module '" + module.name + "'");
                    promises.unshift(module.initialize(modConfig, context, this.properties));
                }
                Promise.all(promises)
                    .then((_modules) => {
                        context.log.info("[Configuration.bootstrapped()]: " + promises.length + " module(s) loaded successfuly.");
                        for(/**@type{Module}*/const _module of _modules){
                            modConfig[_module.name] = _module;
                        }
                        this._loaded = true;
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else resolve();
        });
    }
    /**
     * @param {null|undefined|HandlerProperty|PropertyHandler} handler
     * @returns {Configuration}
     */
    setPropertyHandler(handler){this._config[Configuration.CONFIG_HANDLER] = handler; return this;}
    /**
     * @param {string} key
     * @param {*} value
     * @returns {Configuration}
     */
    setValue(key , value) {
        if(typeof key !== "string" || key.trim().length === 0) throw CelastrinaError.newError("Invalid configuration. Key cannot be undefined, null or 0 length.");
        this._config[key] = value; return this;
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {*}
     */
    getValue(key, defaultValue = null) {
        let value = this._config[key];
        if(typeof value === "undefined" || value == null) value = defaultValue;
        return value;
    }
    /**
     * @param {JsonProperty|AppRegistrationAuthorization} application
     * @returns {Configuration}
     */
    addApplicationAuthorization(application){this._config[Configuration.CONFIG_APPLICATION_AUTHORIZATION].unshift(application); return this;}
    /**
     * @param {StringProperty|string} resource
     * @returns {Configuration}
     */
    addResourceAuthorization(resource){this._config[Configuration.CONFIG_RESOURCE_AUTHORIZATION].unshift(resource); return this;}
    /**
     * @param {JsonProperty|FunctionRole} role
     * @returns {Configuration}
     */
    addFunctionRole(role){this._config[Configuration.CONFIG_ROLES].unshift(role); return this;}
    /**
     * @param {JsonProperty|Module} module
     * @returns {Configuration}
     */
    addModule(module){this._config[Configuration.CONFIG_MODULES]._modules.unshift(module); return this;}
    /**
     * @param {Object} obj
     * @param {Array.<Promise>} promises
     * @private
     */
    _load(obj, promises) {
        if(typeof obj === "object") {
            let _handler = this._config[Configuration.CONFIG_HANDLER];
            for(let prop in obj) {
                let local = obj[prop];
                if(typeof local !== "undefined" && local != null) {
                    if(local instanceof Property) promises.unshift(PropertyLoader.load(obj, prop, local, _handler));
                    else this._load(local, promises);
                }
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} context
     * @returns {PropertyHandler}
     * @private
     */
    _getPropertyHandler(context) {
        /**@type{undefined|null|PropertyHandler}*/let _handler = this._config[Configuration.CONFIG_HANDLER];
        if(typeof _handler === "undefined" || _handler == null) {
            context.log.info("[Configuration._getPropertyHandler(context)]: No property handler specified, defaulting to AppSettingsPropertyHandler.");
            _handler = new AppSettingsPropertyHandler();
            this._config[Configuration.CONFIG_HANDLER] = _handler;
        }
        else
            context.log.info("[Configuration._getPropertyHandler(context)]: Loading PropertyHandler '" + _handler.constructor.name + "'.");
        return _handler;
    }
    /**
     * @returns {boolean}
     * @private
     */
    _isPropertyHandlerOverridden() {
        let overridden = false;
        let deployment = /**@type{null|undefined|string}*/process.env[Configuration.CONFIG_LOCAL_DEV];
        if(typeof deployment === "string")
            overridden = (deployment.trim().toLowerCase() === "true");
        return overridden;
    }
    /**
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     */
    async initialize(context) {
        return new Promise((resolve, reject) => {
            try {
                this._config[Configuration.CONFIG_CONTEXT] = context;
                /**@type{PropertyHandler}*/let handler = this._getPropertyHandler(context);
                if(!this._loaded) {
                    context.log.info("[Configuration.load(context)]: Initial configuration.");
                    if(this._isPropertyHandlerOverridden()) {
                        context.log.info("[Configurationload(context)]: Local development override, using AppSettingsPropertyHandler.");
                        handler = new AppSettingsPropertyHandler();
                        this._config[Configuration.CONFIG_HANDLER] = handler;
                    }
                    else if(handler instanceof HandlerProperty) {
                        handler = handler.initialize();
                        this._config[Configuration.CONFIG_HANDLER] = handler;
                    }
                    handler.initialize(context, this._config)
                        .then(() => {
                            /**@type{Array.<Promise<void>>}*/let promises = [];
                            this._load(this, promises);
                            return Promise.all(promises);
                        })
                        .then(() => {
                            let _name = this._config[Configuration.CONFIG_NAME];
                            if(typeof _name !== "string" || _name.trim().length === 0) {
                                context.log.error("[Configuration.load(context)]: Invalid Configuration. Name cannot be " +
                                    "undefined, null, or 0 length.");
                                reject(CelastrinaError.newError("Invalid Configuration."));
                            }
                            else {
                                context.log.info("[Configuration.load(context)]: Initial configuration successful.");
                                resolve();
                            }
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                }
                else {
                    context.log.info("[Configuration.load(context)]: Configuration successful, aready loaded.");
                    resolve();
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@abstract*/
class Algorithm {
    constructor(name){this._name = name;}
    /**@returns{string}*/get name(){return this._name;}
    /**@returns{Promise<void>}*/
    async initialize() {return new Promise((resolve, reject) => {resolve();});}
    /**@returns{Promise<Cipher>}*/
    async createCipher(){return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not supported."));});}
    /**@returns{Promise<Decipher>}*/
    async createDecipher(){return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not supported."));});}
}
/**@type{Algorithm}*/
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
    /**@returns{Promise<Cipher>}*/
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
    /**@returns{Promise<Decipher>}*/
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
/** Cryptography */
class Cryptography {
    /**@param{Algorithm}algorithm*/
    constructor(algorithm){this._algorithm = algorithm;}
    /**@returns{Promise<void>}*/
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
/**@type{{LEVEL_TRACE: number, LEVEL_INFO: number, LEVEL_VERBOSE: number, LEVEL_WARN: number, LEVEL_ERROR: number}}*/
const LOG_LEVEL = {LEVEL_TRACE: 0, LEVEL_VERBOSE: 1, LEVEL_INFO: 2, LEVEL_WARN: 3, LEVEL_ERROR: 4};
/** MonitorResponse */
class MonitorResponse {
    constructor() {
        this._passed = {};
        this._failed = {};
        this._passedCheck = false;
    }
    /**@returns{Object}*/get passed(){return this._passed;}
    /**@returns{Object}*/get failed(){return this._failed;}
    /**
     * @param {string} probe
     * @param {string} message
     */
    addPassedDiagnostic(probe, message){this._passed[probe] = message;}
    /**
     * @param {string} probe
     * @param {string} message
     */
    addFailedDiagnostic(probe, message) {
        if(!this._passedCheck) this._passedCheck = !this._passedCheck;
        this._failed[probe] = message;
    }
    /**@returns{string}*/
    get result() {
        if(this._passedCheck) return "FAILED";
        else return "PASSED";
    }
}
/**@abstract*/
class RoleResolver {
    /**@type{string}*/static CONFIG_SENTRY_ROLE_RESOLVER = "celastrinajs.core.function.roles.resolver";
    constructor(){}
    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async resolve(context) {
        return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not Implemented."));});
    }
}
/**@type{RoleResolver}*/
class SessionRoleResolver extends RoleResolver {
    constructor(){super();}
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






class BaseAuthorization {
    /**@type{string}*/static CONFIG_SENTRY_IDENTITY = "celastrinajs.core.identity";
    /**
     * @param {object} [appauth={}]
     */
    constructor(appauth = {}) {
        this._appauth = appauth;
        this._appauth[BaseAuthorization.CONFIG_SENTRY_IDENTITY] = new AppRegistrationAuthorization(process.env["IDENTITY_ENDPOINT"], "", BaseSentry.CONFIG_SENTRY_IDENTITY, process.env["IDENTITY_HEADER"], [], true);
    }
    /**@returns{Object}*/get authorizations(){return this._appauth;}
    /**
     * @param {string} resource
     * @param {string} [id=BaseAuthorization.CONFIG_SENTRY_IDENTITY]
     * @returns {Promise<string>}
     */
    async getAuthorizationToken(resource, id = BaseAuthorization.CONFIG_SENTRY_IDENTITY) {
        return new Promise((resolve, reject) => {
            /** @type{AppRegistrationAuthorization}*/let appobj = this._appauth[id];
            if(appobj instanceof AppRegistrationAuthorization) {
                appobj.getToken(resource)
                    .then((token) => {
                        resolve(token);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else reject(CelastrinaError.newError("Application ID '" + id + "' not found for resource '" + resource + "'."));
        });
    }

    async addResourceAuthorization(resource) {
        return new Promise((resolve, reject) => {
            //
        });
    }

    async addResourceAuthorizations(resources) {
        return new Promise((resolve, reject) => {
            let promises = [];
            for(const resource of resources) {
                promises.push(this.addResourceAuthorization(resource));
            }
            Promise.all(promises)
                .then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            //
        })
    }
}




/** BaseSentry */
class BaseSentry {
    /**@type{string}*/static CONFIG_SENTRY_ROLES = "celastrinajs.core.sentry.roles";
    /**@param{Configuration} config*/
    constructor(config) {
        this._configuration = config;
    }
    /**@returns{Object}*/get roles(){return this._configuration.getValue(BaseSentry.CONFIG_SENTRY_ROLES);}
    /**@returns{Object}*/get authorizations(){return this._configuration.getValue(BaseSentry.CONFIG_SENTRY_APPAUTH);}
    /**
     * @param {string} resource
     * @param {undefined|null|string} [id]
     * @returns {Promise<string>}
     */
    async getAuthorizationToken(resource, id = ResourceAuthorizationConfiguration.CONFIG_SENTRY_IDENTITY) {
        return new Promise((resolve, reject) => {
            /**@type{ResourceAuthorizationConfiguration}*/let _authmanager = this._configuration.getValue(ResourceAuthorizationConfiguration.CONFIG_SENTRY_APPAUTH);
            if(typeof _authmanager === "undefined" || _authmanager == null)
                reject(CelastrinaError.newError(""));
            else {
                _authmanager.getResourceToken(resource, id)
                    .then((token) => {
                        resolve(token);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
        });
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {resolve(new BaseSubject(ResourceAuthorizationConfiguration.CONFIG_SENTRY_IDENTITY));});
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            try {
                const _roles = this._configuration.getValue(BaseSentry.CONFIG_SENTRY_ROLES);
                let   _role  = _roles[context.action];
                if(typeof _role === "undefined" || _role == null)
                    resolve();
                else {
                    _role.authorize(context.action, context)
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
            const _roleresolver = this._configuration.getValue(RoleResolver.CONFIG_SENTRY_ROLE_RESOLVER);
            _roleresolver.resolve(context)
                .then((subject) => {
                    resolve(subject);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {FunctionRole} role
     * @returns {Promise<void>}
     * @private
     */
    async _loadFunctionRole(role) {
        return new Promise((resolve, reject) => {
            try {
                const _roles = this._configuration.getValue(BaseSentry.CONFIG_SENTRY_ROLES);
                _roles[role.action] = role;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @returns {Promise<void>}
     * @private
     */
    async _loadFunctionRoles() {
        return new Promise((resolve, reject) => {
            let _roles = this._configuration.roles;
            if(_roles.length > 0) {
                /**@type{Array.<Promise<void>>}*/let promises = [];
                for(let roleobj of _roles) {
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
            else resolve();
        });
    }
    /**@returns {Promise<void>}*/
    async initialize() {
        return new Promise((resolve, reject) => {
            // Set up the local application id.
            if(!this._configuration.loaded) {
                this._configuration.context.log.verbose("[BaseSentry.initialize()]: Loading Sentry objects.");

                // Check to see if the resource manager was specified.
                let _authManager = this._configuration.getValue(ResourceAuthorizationManager.CONFIG_SENTRY_ROLE_RESOLVER, null);
                if(_authManager == null)
                    this._configuration.setValue(ResourceAuthorizationManager.CONFIG_SENTRY_ROLE_RESOLVER, new ResourceAuthorizationManager());
                // Checking to see if the role resolver was specified.
                let _roleresolver = this._configuration.getValue(RoleResolver.CONFIG_SENTRY_ROLE_RESOLVER, null);
                if(_roleresolver == null)
                    this._configuration.setValue(RoleResolver.CONFIG_SENTRY_ROLE_RESOLVER, new SessionRoleResolver());
                // Checking to see if roles is specified.
                let _roles = this._configuration.getValue(BaseSentry.CONFIG_SENTRY_ROLES, null);
                if(_roles == null)
                    this._configuration.setValue(BaseSentry.CONFIG_SENTRY_ROLES, {});

                // Loading the function roles.
                this._loadFunctionRoles()
                    .then(() => {
                        this._configuration.context.log.verbose("[BaseSentry.initialize()]: Sentry objects loaded successfully.");
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else resolve();
        });
    }
}
class BaseContext {
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     */
    constructor(context, config) {
        this._requestId = uuid4v();
        this._context = context;
        /**@type{null|string}*/this._traceId = null;
        this._monitor = false;
        /**@type{null|MonitorResponse}*/this._monitorResponse = null;
        this._config = config;
        /**@type{null|BaseSubject}*/this._subject = null;
        this._action = "process";
        /**@type{null|BaseSentry}*/this._sentry = null;
        /**@type{object}*/this._session = {};
    }
    /**
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            if(this._monitor) this._monitorResponse = new MonitorResponse();
            /** @type {{traceparent: string}} */
            let _traceContext = this._context.traceContext;
            if(typeof _traceContext !== "undefined") this._traceId = _traceContext.traceparent;
            resolve();
        });
    }
    /**@returns{Configuration}*/get config(){return this._config;}
    /**@returns{boolean}*/get isMonitorInvocation(){return this._monitor;}
    /**@returns{null|MonitorResponse}*/get monitorResponse(){return this._monitorResponse;}
    /**@returns{_AzureFunctionContext}*/get context(){return this._context;}
    /**@returns{string}*/get name() {return this._config.name;}
    /**@returns{string}*/get invocationId(){return this._context.bindingData.invocationId;}
    /**@returns{string}*/get requestId(){return this._requestId;}
    /**@returns{BaseSentry}*/get sentry(){return this._sentry;}
    /**@param{BaseSentry} sentry*/set sentry(sentry){this._sentry = sentry;}
    /**@returns{BaseSubject}*/get subject(){return this._subject;}
    /**@param{BaseSubject} subject*/set subject(subject){this._subject = subject;}
    /**@returns{string}*/get action(){return this._action;}
    /**@returns{object}*/get session(){return this._session;}
    /**@returns{PropertyHandler}*/get properties(){return this._config.properties;}
    /**@param{string}name*/
    getBinding(name){return this._context.bindings[name];}
    /**
     * @param {string} name
     * @param {Object} value
     */
    setBinding(name, value){this._context.bindings[name] = value;}
    /**
     * @param {string} name
     * @param {*} [defaultValue=null]
     * @returns {null|*}
     */
    getSessionProperty(name, defaultValue = null) {
        let prop = this._session[name];
        if(typeof prop === "undefined" || prop == null) return defaultValue;
        else return prop;
    }
    /**
     * @param {string} name
     * @param {*} value
     * @returns {BaseContext}
     */
    setSessionProperty(name, value) {
        this._session[name] = value; return this;
    }
    /**
     * @param {object} source
     * @returns {BaseContext}
     */
    loadSessionProperties(source) {
        Object.assign(this._session, source); return this;
    }
    /**
     * @param {string} key
     * @param {null|string} [defaultValue=null]
     * @return {Promise<string>}
     */
    async getProperty(key, defaultValue = null){return this._config.properties.getProperty(key, defaultValue);}
    /**
     * @param {string} name
     * @returns {Promise<ModuleContext>}
     */
    async getModule(name) {
        return new Promise((resolve, reject) => {
            let moduleConfig = this.config.moduleConfig;
            let module = moduleConfig[name];
            if(typeof module === "undefined" || module == null)
                return null;
            else
                return module.newModuleContext(this);
        });
    }
    /**
     * @param {Object} message
     * @param {LOG_LEVEL} [level] default is verbose.
     * @param {null|string} [subject] default is null.
     */
    log(message = "[NO MESSAGE]", level = LOG_LEVEL.LEVEL_VERBOSE, subject = null) {
        let out = "[" + this._config.name + "][LEVEL " + level + "]";
        if(typeof subject === "string") out += "[" + subject + "]";
        out += "[" + this._context.invocationId + "]:" + "[" + this._requestId + "]:" + message.toString();
        switch(level) {
            case LOG_LEVEL.LEVEL_INFO:this._context.log.info(out); break;
            case LOG_LEVEL.LEVEL_ERROR:this._context.log.error(out); break;
            case LOG_LEVEL.LEVEL_WARN:this._context.log.warn(out); break;
            case LOG_LEVEL.LEVEL_VERBOSE:this._context.log.verbose(out); break;
            default:this._context.log(out);
        }
    }
    /**
     * @param {Object} object
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    logObjectAsJSON(object, level = LOG_LEVEL.LEVEL_VERBOSE, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }
    /**@param{null|Object}[value=null]*/
    done(value = null) {
        if(value === null) this._context.done();
        else this._context.done(value);
    }
}
/**@abstract*/
class BaseFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration) {
        this._configuration = configuration;
        /**@type{null|BaseContext}*/this._context = null;
    }
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     * @returns {Promise<BaseSentry>}
     * @throws {CelastrinaError}
     */
    async createSentry(context, config) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new BaseSentry(config));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     * @returns {Promise<BaseContext>}
     */
    async createContext(context, config) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new BaseContext(context, config));
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
        return new Promise((resolve, reject) => {
            /**@type{BaseSentry}*/let _sentry = null;
            /**@type{BaseContext}*/let _context = null;
            this._configuration.initialize(context)
                .then(() => {
                    // Create the sentry
                    return this.createSentry(context, this._configuration);
                })
                .then((_basesentry) => {
                    // Create the sentry
                    _sentry = _basesentry;
                    return this.createContext(context, this._configuration);
                })
                .then((_basecontext) => {
                    _context = _basecontext;
                    return _sentry.initialize();
                })
                .then(() => {
                    return _context.initialize();
                })
                .then(() => {
                    this._context = _context;
                    this._context.sentry = _sentry;
                    return this._configuration.bootstrapped();
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
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async initialize(context) {return new Promise((resolve, reject) => {resolve();});}
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
    async validate(context) {return new Promise((resolve, reject) => {resolve();});}
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async monitor(context) {
        return new Promise((resolve, reject) => {
            context.log("No monitoring checks performed, monitor not overridden.", LOG_LEVEL.LEVEL_VERBOSE, "BaseFunction.monitor(context)");
            context.monitorResponse.addPassedDiagnostic("default", "Monitor not overridden.");
            resolve();
        });
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async load(context) {return new Promise((resolve, reject) => {resolve();});}
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async process(context) {return new Promise((resolve, reject) => {resolve();});}
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async save(context) {return new Promise((resolve, reject) => {resolve();});}
    /**
     * @param {BaseContext} context
     * @param {*} exception
     * @returns {Promise<void>}
     */
    async exception(context, exception) {return new Promise((resolve, reject) => {resolve();});}
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async terminate(context) {return new Promise((resolve, reject) => {resolve();});}
    /**
     * @brief Method called by the Azure Function to execute the lifecycle.
     * @param {_AzureFunctionContext} context The context of the function.
     */
    execute(context) {
        try {
            context.log.verbose("[BaseFunction.execute(context)]: Configuring Celastrina.");
            this.bootstrap(context)
                .then(() => {
                    // Execute the rest of the lifecycle.
                    this.initialize(this._context)
                        .then(() => {
                            this._context.log("Authenticate Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE, "BaseFunction.execute(context)");
                            return this.authenticate(this._context);
                        })
                        .then((subject) => {
                            this._context.log("Authorize Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE, "BaseFunction.execute(context)");
                            this._context.subject = subject;
                            return this.authorize(this._context);
                        })
                        .then(() => {
                            this._context.log("Validate Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE, "BaseFunction.execute(context)");
                            return this.validate(this._context);
                        })
                        .then(() => {
                            this._context.log("Load Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE,"BaseFunction.execute(context)");
                            return this.load(this._context);
                        })
                        .then(() => {
                            if(this._context.isMonitorInvocation) {
                                this._context.log("Monitor Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE,"BaseFunction.execute(context)");
                                return this.monitor(this._context);
                            }
                            else {
                                this._context.log("Process Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE,"BaseFunction.execute(context)");
                                return this.process(this._context);
                            }
                        })
                        .then(() => {
                            this._context.log("Save Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE,"BaseFunction.execute(context)");
                            return this.save(this._context);
                        })
                        .catch((exception) => {
                            this._context.log("Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR,"BaseFunction.execute(context)");
                            return this.exception(this._context, exception);
                        })
                        .then(() => {
                            this._context.log("Terminate Lifecycle.", LOG_LEVEL.LEVEL_VERBOSE, "BaseFunction.execute(context)");
                            return this.terminate(this._context);
                        })
                        .then(() => {
                            this._context.log("Function lifecycle complete.", LOG_LEVEL.LEVEL_VERBOSE,"BaseFunction.execute(context)");
                            this._context.done();
                        })
                        .catch((exception) => {
                            this._context.log("Critical Exception Lifecycle.", LOG_LEVEL.LEVEL_ERROR, "BaseFunction.execute(context)");
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
     * @param {exception|Error|CelastrinaError|*} exception
     * @private
     */
    _unhandled(context, exception) {
        /**@type{exception|Error|CelastrinaError|*}*/let ex = exception;
        if(!(ex instanceof CelastrinaError)) {
            if(ex instanceof Error) ex = CelastrinaError.wrapError(ex);
            else if (typeof ex === "undefined" || ex == null) ex = CelastrinaError.newError("Unhandled server error.");
            else ex = CelastrinaError.newError(ex.toString());
        }
        context.log.error("[BaseFunction._unhandled(context, exception)][exception](NAME:" + ex.cause.name + ") (MESSAGE:" + ex.cause.message + ") (STACK:" + ex.cause.stack + ")");
        if(ex.drop) context.done();
        else context.done(ex);
    }
}
module.exports = {
    CelastrinaError: CelastrinaError, CelastrinaValidationError: CelastrinaValidationError, ResourceAuthorization: ResourceAuthorization,
    ManagedIdentityAuthorization: ManagedIdentityAuthorization, AppRegistrationAuthorization: AppRegistrationAuthorization,
    ResourceAuthorizationConfiguration: ResourceAuthorizationConfiguration, Vault: Vault, PropertyHandler: PropertyHandler,
    AppSettingsPropertyHandler: AppSettingsPropertyHandler,
    AppConfigPropertyHandler: AppConfigPropertyHandler, CachedProperty: CachedProperty, CachePropertyHandler: CachePropertyHandler,
    CacheHandlerProperty: HandlerProperty, VaultAppSettingHandlerProperty: VaultAppSettingHandlerProperty,
    AppConfigHandlerProperty: AppConfigHandlerProperty, Property: Property, StringProperty: StringProperty,
    BooleanProperty: BooleanProperty, NumericProperty: NumericProperty, JsonProperty: JsonProperty, ModuleContext: ModuleContext,
    Module: Module, ApplicationAuthorization: AppRegistrationAuthorization, ApplicationAuthorizationProperty: ApplicationAuthorizationProperty,
    ValueMatch: ValueMatch, MatchAny: MatchAny, MatchAll: MatchAll, MatchNone: MatchNone, FunctionRole: FunctionRole,
    FunctionRoleProperty: FunctionRoleProperty, Configuration: Configuration, Algorithm: Algorithm, AES256Algorithm: AES256Algorithm,
    Cryptography: Cryptography, LOG_LEVEL: LOG_LEVEL, BaseSubject: BaseSubject, MonitorResponse: MonitorResponse, RoleResolver: RoleResolver,
    BaseSentry: BaseSentry, BaseContext: BaseContext, BaseFunction: BaseFunction
};
