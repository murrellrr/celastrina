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
const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");
const {Vault} = require("./Vault");
const {AppConfiguration} = require("./AppConfiguration");
/**
 * @typedef _ManagedResourceToken
 * @property {string} access_token
 * @property {string} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 * @typedef _CelastrinaToken
 * @property {string} resource
 * @property {string} token
 * @property {moment.Moment} expires
 * @typedef _AzureFunctionRequest
 * @property {Object} headers
 * @property {Object} params
 * @property {Object} body
 * @typedef _AzureFunctionResponse
 * @property {number} status
 * @property {Object} headers
 * @property {Object} body
 * @typedef {Object} _Body
 * @typedef _AzureLog
 * @function error
 * @function info
 * @function warn
 * @function verbose
 * @typedef _AzureFunctionContext
 * @property {Object & {req: Object, res: Object}} bindings
 * @property {Object & {invocationId: string}} bindingData
 * @property {function(*)|_AzureLog} log
 * @property {function()|function(*)} done
 * @property {function(string)} log
 * @property {string} invocationId
 * @property {Object} traceContext
 * @typedef {_AzureFunctionContext} _AzureHTTPFunctionContext
 * @property {_AzureFunctionResponse} res
 * @property {_AzureFunctionRequest} req
 * @property {Object} params
 * @property {Object} query
 * @property {string} method
 * @property {string} originalUrl
 * @property {string} rawBody
 * @typedef _Credential
 * @property {string} access_token
 * @property {moment.Moment} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */
/** */
class ApplicationAuthorization {
    /**
     * @param {StringProperty|string} authority
     * @param {StringProperty|string} tenant
     * @param {StringProperty|string} id
     * @param {StringProperty|string} secret
     * @param {Array.<StringProperty|string>} [resources]
     * @param {BooleanProperty|boolean} [managed]
     */
    constructor(authority, tenant, id, secret, resources = [], managed = false) {
        this._authority = authority;
        this._tenant = tenant;
        this._id = id;
        this._secret = secret;
        this._resources = resources;
        this._managed = managed;
        this._tokens = {};
    }
    /**@returns{string}*/get authority(){return this._authority;}
    /**@returns{string}*/get tenant(){return this._tenant;}
    /**@returns{string}*/get id(){return this._id;}
    /**@returns{string}*/get secret(){return this._secret;}
    /**@returns{boolean}*/get managed(){return this._managed;}
    /**@returns{Array.<string>}*/get resources(){return this._resources;}
    /**
     * @param {StringProperty|string} resource
     * @returns {ApplicationAuthorization}
     */
    addResource(resource){this._resources.unshift(resource); return this;}
    /**
     * @param {string} resource
     * @returns {Promise<string>}
     */
    async getToken(resource) {
        return new Promise((resolve, reject) => {
            /** @type {_CelastrinaToken} */
            let token = this._tokens[resource];
            if(typeof token !== "object") reject(CelastrinaError.newError("Resource '" + resource + "' not authorized for " + "application '" + this._id + "'.", 401));
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
            let config = {/**@type{URLSearchParams}*/params: params, headers: {"secret": this._secret}};
            axios.get(this._authority, config)
                .then((response) => {
                    let token = {resource:resource,token:response.data.access_token,expires:moment(response.data.expires_on)};
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
            adContext.acquireTokenWithClientCredentials(resource, this._id, this._secret, (err, response) => {
                if(err) reject(CelastrinaError.newError("Not authorized.", 401));
                else {
                    let token = {resource:resource,token:response.accessToken,expires:moment(response.expiresOn)};
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
            if(this._managed) promise = this._refreshManagedToken(resource);
            else promise = this._refreshApplicationToken(resource);
            promise.then((token) => {
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
            axios.get(this._authority, config)
                .then(( response) => {
                    resolve({resource:resource,token:response.data.access_token,expires:moment(response.data.expires_on)});
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
            let config = {/**@type{URLSearchParams}*/params:params,headers: {"secret": this._secret}};
            /**@type{Array.<Promise<_CelastrinaToken>>}*/let promises = [];
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
                    if(err) reject(CelastrinaError.newError("Not authorized.", 401));
                    else resolve({resource:resource,token:response.accessToken,expires:moment(response.expiresOn)});
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
                /**@type{Array.<Promise<_CelastrinaToken>>}*/let promises = [];
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
    /**@returns{Promise<void>}*/
    async initialize() {
        return new Promise((resolve, reject) => {
            if(this._resources.length === 0) reject(CelastrinaError.newError("No resources defined for authorization '" + this._id + "'."));
            else {
                let promise;
                if(this._managed) promise = this._initializeManagedResources();
                else promise = this._initializeAppResources();
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
/**@abstract*/
class PropertyHandler {
    constructor(){this._loaded = false;}
    /**@returns{boolean}*/get loaded(){return this._loaded;}
    /**
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     * @abstract
     */
    async _initialize(context) {
        return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not Implemented."));});
    }
    /**
     * @param {_AzureFunctionContext} context
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>}
     */
    async initialize(context, force = false) {
        return new Promise((resolve, reject) => {
            if(!this._loaded || force) {
                this._initialize(context)
                    .then(() => {
                        this._loaded = true;
                        resolve(true);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else resolve(false);
        });
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
     * @returns {Promise<void>}
     */
    async _initialize(context) {
        return new Promise((resolve, reject) => {
            context.log.verbose("[AppSettingsPropertyHandler._initialize(context, config)]: AppSettingsPropertyHandler initialized.");
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
/**
 * @type {PropertyHandler}
 * @abstract
 */
class ManagedResourcePropertyHandler extends PropertyHandler {
    /**@param{string}resource*/
    constructor(resource) {
        super();
        /**@type{null|_Credential}*/this._credential = null;
        this._endpoint = null;
        this._secret = null;
        this._resource = resource;
    }
    /**@returns{Promise<string>}*/
    async _refreshCredential() {
        return new Promise(async (resolve, reject) => {
            try {
                let params = new URLSearchParams();
                params.append("resource", this._resource);
                params.append("api-version", "2019-08-01");
                let config = {params: params,headers:{"X-IDENTITY-HEADER":this._secret}};
                let response = await axios.get(this._endpoint, config);
                this._credential = /** @type{_Credential}*/response.data;
                this._credential.expires_on = moment.unix(response.data.expires_on);
                resolve(this._credential.access_token);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {string} token
     * @returns {Promise<void>}
     * @abstract
     */
    async _refreshSource(token){return new Promise((resolve, reject) => {resolve();});}
    /**@returns{Promise<void>}*/
    async refresh() {
        return new Promise(async (resolve, reject) => {
            try {
                if(this._credential == null || moment().isSameOrAfter(this._credential.expires_on)) {
                    let token = await this._refreshCredential();
                    await this._refreshSource(token);
                    resolve();
                }
                else resolve();
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
    async _initialize(context) {
        return new Promise(async (resolve, reject) => {
            try {
                this._endpoint = process.env["IDENTITY_ENDPOINT"];
                this._secret = process.env["IDENTITY_HEADER"];
                if((typeof this._endpoint !== "string" || this._endpoint.trim().length === 0) || (typeof this._secret !== "string" || this._secret.trim().length === 0)) {
                    context.log.error("[VaultAppSettingPropertyHandler.initialize(context)] IDENTITY_ENDPOINT and/or IDENTITY_HEADER environment property missing. Are you sure this Azure Function is using a Managed Identity?");
                    reject(CelastrinaError.newError("Function not configured for Managed Identity."));
                }
                else {
                    await this.refresh();
                    context.log.verbose("[ManagedResourcePropertyHandler._initialize(context, config)]: ManagedResourcePropertyHandler initialized for resource '" + this._resource + "'.");
                    resolve();
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{AppSettingsPropertyHandler}*/
class VaultAppSettingPropertyHandler extends ManagedResourcePropertyHandler {
    constructor() {
        super("https://vault.azure.net");
        /**@type{null|Vault}*/this._vault = null;
        this._settings = new AppSettingsPropertyHandler();
    }
    /**
     * @param {string} token
     * @returns {Promise<void>}
     */
    async _refreshSource(token) {
        return new Promise((resolve, reject) => {
            try {
                if(this._vault == null) this._vault = new Vault(token);
                else this._vault.token = token;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
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
                let value = await this._settings.getProperty(key, null);
                if(typeof value === "undefined" || value == null) resolve(defaultValue);
                else if(typeof value !== "string") resolve(value);
                else {
                    let jsontest = value.trim();
                    if(jsontest.startsWith("{") && jsontest.endsWith("}")) { // loose attempt at detecting JSON
                        /**@type{{_type:string,_resourceId:string}}**/
                        let source = JSON.parse(jsontest);
                        if ((typeof source === "object") && source.hasOwnProperty("_type") &&
                            (typeof source._type === "string") && (source._type === "celastrinajs.vault.reference")) {
                            await this.refresh();
                            resolve(await this._vault.getSecret(source._resourceId));
                        }
                        else resolve(value);
                    }
                    else resolve(value);
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{AppSettingsPropertyHandler}*/
class AppConfigPropertyHandler extends ManagedResourcePropertyHandler {
    /**
     * @param {string} resourceId
     * @param {string} [label="development"]
     */
    constructor(resourceId, label = "development") {
        super("https://management.azure.com/");
        /** @type {null|AppConfiguration} */this._appconfig = null;
        this._resourceId = resourceId;
        this._label = label;
    }
    /**
     * @param {string} token
     * @returns {Promise<void>}
     */
    async _refreshSource(token) {
        return new Promise((resolve, reject) => {
            try {
                if(this._appconfig == null) this._appconfig = new AppConfiguration(token, this._resourceId);
                else this._appconfig.token = token;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
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
                await this.refresh();
                let value = await this._appconfig.getValue(key);
                if(typeof value === "undefined" || value == null) value = defaultValue;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
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
    async _initialize(context){return this._handler._initialize(context);}
    /**
     * @param {_AzureFunctionContext} context
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>}
     */
    async initialize(context, force = false) {
        return new Promise((resolve, reject) => {
            this._handler.initialize(context, force)
                .then((first) => {
                    if(first) {
                        this._configure()
                            .then(() => {
                                context.log.verbose("[CachePropertyHandler.initialize(context, config, force)]: Caching configured.");
                                resolve(first);
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                    else resolve(first);
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
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Property not supported."));
        });
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
class CacheHandlerProperty {
    /**@type{string}*/static CONFIG_PROPERTY = "celastrinajs.core.property.config";
    /**@param{null|string}[name=null]*/
    constructor(name = null){this._name = name;}
    /**@returns{string}*/get name(){return this._name}
    /**@returns {PropertyHandler}*/
    _createPropertyHandler(source) {return null;}
    /**@returns{PropertyHandler}*/
    configure() {
        let lname = this._name;
        if(typeof lname === "undefined" || lname == null)
            lname = CacheHandlerProperty.CONFIG_PROPERTY;
        /**@type{string}*/let config = process.env[lname];
        if(typeof config === "string" && config.trim().length > 0) {
            /**@type{{cached:boolean}}*/let source = JSON.parse(config);
            let handler = this._createPropertyHandler(source);
            if (source.hasOwnProperty("chached") && typeof source.chached === "boolean" && source.chached === true)
                return new CachePropertyHandler(handler);
            else
                return handler;
        }
        else
            throw CelastrinaError.newError("Invalid Configuration for property '" + lname + "'.");
    }
}
/**@type{CacheHandlerProperty}*/
class VaultAppSettingHandlerProperty extends CacheHandlerProperty {
    constructor(name = "celastrinajs.core.property.vault.config"){super(name);}
    /**
     * @param {object} source
     * @returns {PropertyHandler}
     */
    _createPropertyHandler(source){return new VaultAppSettingPropertyHandler();}
}
/**@type{CacheHandlerProperty}*/
class AppConfigHandlerProperty extends CacheHandlerProperty {
    constructor(name = "celastrinajs.core.property.appconfig.config"){super(name);}
    /**
     * @param {object} source
     * @returns {PropertyHandler}
     */
    _createPropertyHandler(source) {
        if(source.hasOwnProperty("resourceId") && typeof source.resourceId === "string" && source.resourceId.trim().length > 0) {
            let label = "development";
            if(source.hasOwnProperty("label") && typeof source.label === "string" && source.label.trim().length > 0)
                label = source.label;
            return new AppConfigPropertyHandler(source.resourceId, label);
        }
        else
            throw CelastrinaError.newError("Invalid AppConfigHandlerProperty, missing 'resourceId'.");
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
                            else source = new ApplicationAuthorization(source._authority, source._tenant, source._id, source._secret, source._resources);
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
class Configuration {
    /**@type{string}*/static CONFIG_NAME = "celastrinajs.core.name";
    /**@type{string}*/static CONFIG_HANDLER = "celastrinajs.core.properties.handler";
    /**@type{string}*/static CONFIG_CONTEXT = "celastrinajs.core.properties.context";
    /**@type{string}*/static CONFIG_APPLICATION_AUTHORIZATION = "celastrinajs.core.authorization.application";
    /**@type{string}*/static CONFIG_RESOURCE_AUTHORIZATION = "celastrinajs.core.authorization.resource";
    /**@type{string}*/static CONFIG_ROLES = "celastrinajs.core.roles";
    /**@type{string}*/static CONFIG_LOCAL_DEV = "celastringjs.core.deployment.local.development";
    /**@param{StringProperty|string} name*/
    constructor(name) {
        if(typeof name === "string") {
            if(name.trim().length === 0) throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else if(!(name instanceof StringProperty)) throw CelastrinaError.newError("Invalid configuration. Name must be string or StringProperty.");
        this._config = {};
        /**@type{boolean}*/this._loadBase = true;
        /**@type{null|_AzureFunctionContext}*/this._config[Configuration.CONFIG_CONTEXT] = null;
        /**@type{null|JsonProperty|PropertyHandler}*/this._config[Configuration.CONFIG_HANDLER] = null;
        /**@type{string|StringProperty}*/this._config[Configuration.CONFIG_NAME] = name;
        /**@type{Array.<JsonProperty|ApplicationAuthorization>}*/this._config[Configuration.CONFIG_APPLICATION_AUTHORIZATION] = [];
        /**@type{Array.<StringProperty|string>}*/this._config[Configuration.CONFIG_RESOURCE_AUTHORIZATION] = [];
        /**@type{Array.<JsonProperty|FunctionRole>}*/this._config[Configuration.CONFIG_ROLES] = [];
    }
    /**@returns{string}*/get name(){return this._config[Configuration.CONFIG_NAME];}
    /**@returns{PropertyHandler}*/get properties() {return this._config[Configuration.CONFIG_HANDLER];}
    /**@returns{object}*/get values(){return this._config;}
    /**@returns{Array<ApplicationAuthorization>}*/get applicationAuthorizations(){return this._config[Configuration.CONFIG_APPLICATION_AUTHORIZATION];}
    /**@returns{Array<string>}*/get resourceAuthorizations(){return this._config[Configuration.CONFIG_RESOURCE_AUTHORIZATION];}
    /**@returns{Array<FunctionRole>}*/get roles(){return this._config[Configuration.CONFIG_ROLES];}
    /**@returns{_AzureFunctionContext}*/get context(){return this._config[Configuration.CONFIG_CONTEXT];}
    /**@returns{boolean}*/get loadBase(){return this._loadBase;}
    /**@param{boolean}load*/set loadBase(load){this._loadBase = load;}
    /**
     * @param {null|undefined|CacheHandlerProperty|PropertyHandler} handler
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
     * @param {ApplicationAuthorizationProperty|ApplicationAuthorization} application
     * @returns {Configuration}
     */
    addApplicationAuthorization(application){this._config[Configuration.CONFIG_APPLICATION_AUTHORIZATION].unshift(application); return this;}
    /**
     * @param {StringProperty|string} resource
     * @returns {Configuration}
     */
    addResourceAuthorization(resource){this._config[Configuration.CONFIG_RESOURCE_AUTHORIZATION].unshift(resource); return this;}
    /**
     * @param {FunctionRoleProperty|FunctionRole} role
     * @returns {Configuration}
     */
    addFunctionRole(role){this._config[Configuration.CONFIG_ROLES].unshift(role); return this;}
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
        /**@type{undefined|null|CacheHandlerProperty|PropertyHandler}*/let _handler = this._config[Configuration.CONFIG_HANDLER];
        if(typeof _handler === "undefined" || _handler == null) {
            context.log.info("[Configuration._getPropertyHandler(context)]: No property handler specified, defaulting to AppSettingsPropertyHandler.");
            _handler = new AppSettingsPropertyHandler();
            this._config[Configuration.CONFIG_HANDLER] = _handler;
        }
        else if(_handler instanceof CacheHandlerProperty) {
            context.log.info("[Configuration._getPropertyHandler(context)]: Loading handler from CacheHandlerProperty.");
            /**@type{PropertyHandler}*/_handler = _handler.configure();
            this._config[Configuration.CONFIG_HANDLER] = _handler;
        }
        else if(!(_handler instanceof PropertyHandler))
            throw CelastrinaError.newError("PropertyHandler not supported.");

        if(!_handler.loaded) {
            let deployment = /**@type{null|undefined|string}*/process.env[Configuration.CONFIG_LOCAL_DEV];
            if(typeof deployment === "string") {
                // There is a local development mode config.
                if(deployment.trim().toLowerCase() === "true") {
                    context.log.info("[Configuration._getPropertyHandler(context)]: Local development override, using AppSettingsPropertyHandler.");
                    /**@type{PropertyHandler}*/_handler = new AppSettingsPropertyHandler();
                    this._config[Configuration.CONFIG_HANDLER] = _handler;
                }
            }
        }
        return _handler;
    }
    /**
     * @param {_AzureFunctionContext} context
     * @returns {Promise<void>}
     */
    async load(context) {
        return new Promise(async (resolve, reject) => {
            try {
                this._config[Configuration.CONFIG_CONTEXT] = context;
                /**@type{PropertyHandler}*/let handler = this._getPropertyHandler(context);
                if(await handler.initialize(context)) {
                    context.log.info("[Configuration.load(context)]: Initial configuration.");
                    /** @type {Array.<Promise<void>>} */
                    let promises = [];
                    this._load(this, promises);
                    await Promise.all(promises);
                    let _name = this._config[Configuration.CONFIG_NAME];
                    if(typeof _name !== "string" || _name.trim().length === 0) {
                        context.log.error("[Configuration.load(context)]: Invalid Configuration. Name cannot be " +
                                          "undefined, null, or 0 length.");
                        reject(CelastrinaError.newError("Invalid Configuration."));
                    }
                    else {
                        context.log.verbose("[Configuration.load(context)]: Initial configuration successful.");
                        resolve();
                    }
                }
                else {
                    context.log.verbose("[Configuration.load(context)]: Configuration aready loaded.");
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
class BaseSentry {
    /**@type{string}*/static CONFIG_SENTRY_APPAUTH = "celastrinajs.core.sentry.appauth";
    /**@type{string}*/static CONFIG_SENTRY_ROLES = "celastrinajs.core.sentry.roles";
    /**@type{string}*/static CONFIG_SENTRY_IDENTITY = "celastrinajs.core.identity";
    /**@param{Configuration} config*/
    constructor(config) {
        this._configuration = config;
    }
    /**@returns{Object}*/get roles(){return this._configuration.getValue(BaseSentry.CONFIG_SENTRY_ROLES);}
    /**@returns{Object}*/get authorizations(){return this._configuration.getValue(BaseSentry.CONFIG_SENTRY_APPAUTH);}
    /**
     * @param {string} resource
     * @param {null|string} [id]
     * @returns {Promise<string>}
     */
    async getAuthorizationToken(resource, id = null) {
        return new Promise((resolve, reject) => {
            if(id == null) id = BaseSentry.CONFIG_SENTRY_IDENTITY;
            let _appauth = this._configuration.getValue(BaseSentry.CONFIG_SENTRY_APPAUTH);
            /** @type{ApplicationAuthorization}*/let appobj = _appauth[id];
            if(appobj instanceof ApplicationAuthorization) {
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
    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {resolve(new BaseSubject(BaseSentry.CONFIG_SENTRY_IDENTITY));});
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
     * @param {ApplicationAuthorization} authorization
     * @returns {Promise<void>}
     * @private
     */
    async _loadApplicationAuthorization(authorization) {
        return new Promise((resolve, reject) => {
            try {
                authorization.initialize()
                    .then(() => {
                        const _appauth = this._configuration.getValue(BaseSentry.CONFIG_SENTRY_APPAUTH);
                        _appauth[authorization.id] = authorization;
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
     * @private
     */
    async _loadApplicationAuthorizations() {
        return new Promise((resolve, reject) => {
            let _auths = this._configuration.applicationAuthorizations;
            if(_auths.length > 0) {
                let promises = [];
                for(let appobj of _auths) {
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
            else resolve();
        });
    }
    /**@private*/
    _loadResourceAuthorizations() {
        if(this._configuration.resourceAuthorizations.length > 0)
            this._configuration.addApplicationAuthorization(new ApplicationAuthorization(process.env["IDENTITY_ENDPOINT"], "", BaseSentry.CONFIG_SENTRY_IDENTITY, process.env["IDENTITY_HEADER"], this._configuration.resourceAuthorizations, true));
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
            if(this._configuration.loadBase) {
                this._configuration.context.log.verbose("[BaseSentry.initialize()]: Loading Sentry objects.");
                this._configuration.setValue(BaseSentry.CONFIG_SENTRY_APPAUTH, {});
                this._configuration.setValue(BaseSentry.CONFIG_SENTRY_ROLES, {});
                let _roleresolver = this._configuration.getValue(RoleResolver.CONFIG_SENTRY_ROLE_RESOLVER, null);
                if (_roleresolver == null)
                    _roleresolver = new SessionRoleResolver();
                this._configuration.setValue(RoleResolver.CONFIG_SENTRY_ROLE_RESOLVER, _roleresolver);
                this._loadResourceAuthorizations();
                this._loadApplicationAuthorizations()
                    .then(() => {
                        return this._loadFunctionRoles();
                    })
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
}
class BaseContext {
    /**
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     */
    constructor(context, name, properties) {
        this._requestId = uuid4v();
        this._context = context;
        this._traceId = null;
        this._monitor = false;
        /**@type{null|MonitorResponse}*/this._monitorResponse = null;
        this._properties = properties;
        this._name = name;
        /**@type{null|BaseSubject}*/this._subject = null;
        this._action = "process";
        /**@type{null|BaseSentry}*/this._sentry = null;
        /**@type{object}*/this._session = {};
    }
    /**
     * @param {Configuration} configration
     * @returns {Promise<void>}
     */
    async initialize(configration) {
        return new Promise((resolve, reject) => {
            if(this._monitor) this._monitorResponse = new MonitorResponse();
            /** @type {{traceparent: string}} */
            let _traceContext = this._context.traceContext;
            if(typeof _traceContext !== "undefined") this._traceId = _traceContext.traceparent;
            resolve();
        });
    }
    /**@returns{boolean}*/get isMonitorInvocation(){return this._monitor;}
    /**@returns{null|MonitorResponse}*/get monitorResponse(){return this._monitorResponse;}
    /**@returns{_AzureFunctionContext}*/get context(){return this._context;}
    /**@returns{string}*/get name() {return this._name;}
    /**@returns{string}*/get invocationId(){return this._context.bindingData.invocationId;}
    /**@returns{string}*/get requestId(){return this._requestId;}
    /**@returns{BaseSentry}*/get sentry(){return this._sentry;}
    /**@param{BaseSentry} sentry*/set sentry(sentry){this._sentry = sentry;}
    /**@returns{BaseSubject}*/get subject(){return this._subject;}
    /**@param{BaseSubject} subject*/set subject(subject){this._subject = subject;}
    /**@returns{string}*/get action(){return this._action;}
    /**@returns{object}*/get session(){return this._session;}
    /**@returns{PropertyHandler}*/get propertHandler(){return this._properties;}
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
    async getProperty(key, defaultValue = null){return this._properties.getProperty(key, defaultValue);}
    /**
     * @param {Object} message
     * @param {LOG_LEVEL} [level] default is trace.
     * @param {null|string} [subject] default is null.
     */
    log(message = "[NO MESSAGE]", level = LOG_LEVEL.LEVEL_VERBOSE, subject = null) {
        let out = "[" + this._name + "][LEVEL " + level + "]";
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
     * @returns {Promise<BaseSentry>} BaseSentry if successful.
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
                resolve(new BaseContext(context, config.name, config.properties));
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
            this._configuration.load(context)
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
                    return _context.initialize(this._configuration);
                })
                .then(() => {
                    this._context = _context;
                    this._context.sentry = _sentry;
                    this._configuration.loadBase = false;
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
    PropertyHandler: PropertyHandler, AppSettingsPropertyHandler: AppSettingsPropertyHandler,
    VaultAppSettingPropertyHandler: VaultAppSettingPropertyHandler, AppConfigPropertyHandler: AppConfigPropertyHandler,
    CachedProperty: CachedProperty, CachePropertyHandler: CachePropertyHandler, CacheHandlerProperty: CacheHandlerProperty,
    VaultAppSettingHandlerProperty: VaultAppSettingHandlerProperty, AppConfigHandlerProperty: AppConfigHandlerProperty, Property: Property,
    StringProperty: StringProperty, BooleanProperty: BooleanProperty, NumericProperty: NumericProperty,
    JsonProperty: JsonProperty, ApplicationAuthorization: ApplicationAuthorization,
    ApplicationAuthorizationProperty: ApplicationAuthorizationProperty, ValueMatch: ValueMatch, MatchAny: MatchAny,
    MatchAll: MatchAll, MatchNone: MatchNone, FunctionRole: FunctionRole, FunctionRoleProperty: FunctionRoleProperty,
    Configuration: Configuration, Algorithm: Algorithm, AES256Algorithm: AES256Algorithm, Cryptography: Cryptography,
    LOG_LEVEL: LOG_LEVEL, BaseSubject: BaseSubject, MonitorResponse: MonitorResponse, RoleResolver: RoleResolver,
    BaseSentry: BaseSentry, BaseContext: BaseContext, BaseFunction: BaseFunction
};
