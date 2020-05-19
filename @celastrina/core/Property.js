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

const axios = require("axios").default;
const moment = require("moment");
const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");
const {Vault} = require("./Vault");

/**
 * @typedef _AzureFunctionContext
 * @property {Object & {req: Object, res: Object}} bindings
 * @property {Object & {invocationId: string}} bindingData
 * @property {Object} log
 * @property {function()|function(*)} done
 * @property {function(string)} log
 * @property {string} invocationId
 * @property {Object} traceContext
 */
/**
 * @typedef _Credential
 * @property {string} access_token
 * @property {moment.Moment} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */

/**
 * @abstract
 */
class PropertyHandler {
    constructor() {
        this._loaded = false;
    }

    /**
     * @returns {boolean}
     */
    get loaded() {
        return this._loaded;
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     * @abstract
     */
    async _initialize(context, config) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>}
     */
    async initialize(context, config, force = false) {
        return new Promise((resolve, reject) => {
            if(!this._loaded || force) {
                this._initialize(context, config)
                    .then(() => {
                        this._loaded = true;
                        resolve(true);
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
     * @param {string} key
     * @param {*} [defaultValue = null]
     * @returns {Promise<*>}
     * @abstract
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
}

/**
 * @type {PropertyHandler}
 */
class AppSettingsPropertyHandler extends PropertyHandler {
    constructor() {
        super();
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     */
    async _initialize(context, config) {
        return new Promise((resolve, reject) => {
            context.log("[AppSettingsPropertyHandler._initialize(context, config)]: " +
                        "AppSettingsPropertyHandler initialized.");
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
            if(typeof value === "undefined")
                value = defaultValue;
            resolve(value);
        });
    }
}


/**
 * @type {PropertyHandler}
 * @abstract
 */
class ManagedResourcePropertyHandler extends PropertyHandler {
    /**
     * @param {string} resource
     */
    constructor(resource) {
        super();
        /** @type {null|_Credential} */
        this._credential = null;
        this._endpoint   = null;
        this._secret     = null;
        this._resource   = resource;
    }

    /**
     * @returns {Promise<string>}
     */
    async _refreshCredential() {
        return new Promise(async (resolve, reject) => {
            try {
                let params = new URLSearchParams();
                params.append("resource", this._resource);
                params.append("api-version", "2019-08-01");
                let config = {params: params,
                    headers: {"X-IDENTITY-HEADER": this._secret}};
                let response = await axios.get(this._endpoint, config);
                this._credential = /** @type {_Credential} */response.data;
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
    async _refreshSource(token) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @returns {Promise<void>}
     */
    async refresh() {
        return new Promise(async (resolve, reject) => {
            try {
                if(this._credential == null || moment().isSameOrAfter(this._credential.expires_on)) {
                    let token = await this._refreshCredential();
                    await this._refreshSource(token);
                    resolve();
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     */
    async _initialize(context, config) {
        return new Promise(async (resolve, reject) => {
            try {
                this._endpoint = process.env["IDENTITY_ENDPOINT"];
                this._secret   = process.env["IDENTITY_HEADER"];
                if((typeof this._endpoint !== "string" || this._endpoint.trim().length === 0) ||
                    (typeof this._secret !== "string" || this._secret.trim().length === 0)) {
                    context.log.error("[VaultAppSettingPropertyHandler.initialize(context)] IDENTITY_ENDPOINT and/or " +
                        "IDENTITY_HEADER environment property missing. Are you sure this Azure Function " +
                        "is using a Managed Identity?");
                    reject(CelastrinaError.newError("Function not configured for Managed Identity."));
                }
                else {
                    await this.refresh();
                    context.log("[ManagedResourcePropertyHandler._initialize(context, config)]: " +
                                "ManagedResourcePropertyHandler initialized for resource '" + this._resource + "'.");
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
class VaultReference {
    /**
     * @param {string} resourceId
     */
    constructor(resourceId) {
        /** @type {string} */
        this._resourceId = resourceId;
    }

    /**
     * @returns {string}
     */
    get resourceId() {
        return this._resourceId;
    }

    /**
     * @param {null|undefined|Object} source
     * @returns {boolean}
     */
    static isObject(source) {
        return ((typeof source !== "undefined") && (source != null) && source.hasOwnProperty("_type") &&
            (typeof source._type === "string") && (source._type === "celastrinajs.vault.reference"));
    }

    /**
     * @param {Object} source
     * @returns {VaultReference}
     */
    static create(source) {
        return new VaultReference(source._resourceId);
    }
}
/**
 * @type {AppSettingsPropertyHandler}
 */
class VaultAppSettingPropertyHandler extends ManagedResourcePropertyHandler {
    constructor() {
        super("https://vault.azure.net");
        /** @type {null|Vault} */
        this._vault    = null;
        this._settings = new AppSettingsPropertyHandler();
    }

    /**
     * @param {string} token
     * @returns {Promise<void>}
     */
    async _refreshSource(token) {
        return new Promise((resolve, reject) => {
            try {
                if(this._vault == null)
                    this._vault = new Vault(token);
                else
                    this._vault.token = token;
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
                let value = await this._settings.getProperty(key);
                if(typeof value === "undefined")
                    resolve(defaultValue);
                else if(typeof value !== "string")
                    resolve(value);
                // Checking to see if this is a vault reference.
                else if(VaultReference.isObject(value)) {
                    await this.refresh();
                    // Now we lookup from vault.
                    let reference = await VaultReference.create(value);
                    let secret    = await this._vault.getSecret(reference.resourceId);
                    if(typeof secret === "undefined")
                        secret = defaultValue;
                    resolve(secret);
                }
                else
                    resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {AppSettingsPropertyHandler}
 */
class AppConfigPropertyHandler extends ManagedResourcePropertyHandler {
    constructor() {
        super("https://management.azure.com/");
    }

    /**
     * @param {string} token
     * @returns {Promise<void>}
     */
    async _refreshSource(token) {
        return new Promise((resolve, reject) => {
            resolve();
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
                // call from axios.
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
        /** @type {*} */
        this._value   = null;
        this._time    = time;
        this._unit    = unit;
        /** @type {null|moment.Moment} */
        this._expires = null;
        /** @type {null|moment.Moment} */
        this._lastUpdate = null;
    }

    /**
     * @returns {*}
     */
    get value() {
        return this._value;
    }

    /**
     * @param {*} value
     */
    set value(value) {
        this._value = value;
        this._lastUpdate = moment();
        if(this._time === 0 || value == null)
            this._expires = null;
        else
            this._expires = moment().add(this._time, this._unit);
    }

    /**
     * @returns {boolean}
     */
    isExpired() {
        if(this._expires == null)
            return true;
        else
            return (moment().isSameOrAfter(this._expires));
    }

    /**
     * @returns {null|moment.Moment}
     */
    get expires() {
        return this._expires;
    }

    /**
     * @returns {null|moment.Moment}
     */
    get lastUpdated() {
        return this._lastUpdate;
    }

    /**
     * @returns {Promise<void>}
     */
    async clear() {
        return new Promise((resolve, reject) => {
            this.value = null;
            resolve();
        });
    }
}
/**
 * @type {AppSettingsPropertyHandler}
 */
class CachePropertyHandler extends PropertyHandler {
    /** @type {string} */
    static CONFIG_CACHE_DEFAULT_EXPIRE_TIME = "celastrinajs.property.cache.expire.time";
    /** @type {string} */
    static CONFIG_CACHE_DEFAULT_EXPIRE_UNIT = "celastrinajs.property.cache.expire.unit";
    /** @type {string} */
    static CONFIG_CACHE_DEFAULT_EXPIRE_OVERRIDE = "celastrinajs.property.cache.expire.override";

    /**
     * @param {PropertyHandler} [handler=new AppSettingsPropertyHandler()]
     * @param {number} [defaultTime=300]
     * @param {DurationInputArg2} [defaultUnit="s"]
     */
    constructor(handler = new AppSettingsPropertyHandler(), defaultTime = 300,
                defaultUnit = "s") {
        super();
        this._handler = handler;
        this._cache   = {};
        this._defaultTime = defaultTime;
        this._defaultUnit = defaultUnit;
    }

    /**
     * @returns {boolean}
     */
    get loaded() {
        return this._handler.loaded;
    }

    /**
     * @returns {Promise<void>}
     */
    async clear() {
        return new Promise((resolve, reject) => {
            /** @type {Array.<Promise<void>>} */
            let promises = [];

            for(let prop in this._cache) {
                let cached = this._cache[prop];
                if(cached instanceof CachedProperty) {
                    promises.unshift(cached.clear());
                }
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

    /**
     * @returns {Promise<void>}
     */
    async configure() {
        return new Promise(async (resolve, reject) => {
            try {
                // TODO: Get the cache config information.
                let time = await this._handler.getProperty(CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_TIME,
                                                          null);
                let unit = await this._handler.getProperty(CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_UNIT,
                                                          null);
                if(typeof time === "number")
                    this._defaultTime = time;
                if(typeof unit === "string")
                    this._defaultUnit = /** @type {DurationInputArg2} */unit;
                let override = await this._handler.getProperty(
                    CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_OVERRIDE,
                    null);
                if(typeof override === "string") {
                    // Load the JSON
                    let tempovr = JSON.parse(override);
                    if((typeof tempovr === "object") && tempovr.hasOwnProperty("_type") &&
                        (typeof tempovr._type === "string") &&
                        (tempovr._type === CachePropertyHandler.CONFIG_CACHE_DEFAULT_EXPIRE_OVERRIDE)) {
                        // Loop through and apply the overrides.
                        /** @type {{_overrides: Array.<object>}} */
                        let overrides = tempovr._overrides;
                        for(/** @type {{_property:string, _time:number, _unit:DurationInputArg2}} */const ovr of overrides) {
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
     * @returns {{}}
     */
    get cache() {
        return this._cache;
    }

    /**
     * @returns {PropertyHandler}
     */
    get handler() {
        return this._handler;
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     */
    async _initialize(context, config) {
        return this._handler._initialize(context, config);
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @param {boolean} [force=false]
     * @returns {Promise<boolean>}
     */
    async initialize(context, config, force = false) {
        //return this._handler.initialize(context, config, force);
        return new Promise((resolve, reject) => {
            this._handler.initialize(context, config, force)
                .then((first) => {
                    if(first) {
                        this.configure()
                            .then(() => {
                                context.log("[CachePropertyHandler.initialize(context, config, force)]: " +
                                            "Caching configured.");
                                resolve(first);
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                    else
                        resolve(first);
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
            if(!(cached instanceof CachedProperty))
                resolve(null);
            else
                resolve(cached);
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
                // Checking to see if it is in cache.
                /** @type {undefined|CachedProperty} */
                let cached  = this._cache[key];
                let value;
                // Not in cache, attempting to add to cache.
                if(!(cached instanceof CachedProperty)) {
                    // Checking to see if we are in the source
                    value = await this._handler.getProperty(key, null);
                    // Dont cache null or default value.
                    if(value == null)
                        value = defaultValue;
                    else {
                        cached = new CachedProperty(this._defaultTime, this._defaultUnit);
                        cached.value = value;
                        this._cache[key] = cached;
                    }
                }
                else if(cached.isExpired()) {
                    // Dont want to remove cache item, just keep it expired for now, this is to keep cache override
                    // configurations if they were specified.
                    value = await this._handler.getProperty(key, null);
                    cached.value = value;
                    if(value == null)
                        value = defaultValue;
                }
                else
                    value = cached.value;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}

/**
 * @type {{_name:string, _type:string, _secure:boolean, _defaultValue:null|*}}
 * @abstract
 */
class Property {
    /**
     * @param {string} name
     * @param {*} [defaultValue = null]
     */
    constructor(name, defaultValue = null) {
        this._name         = name;
        this._defaultValue = defaultValue;
    }

    /**
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @returns {*}
     */
    get defaultValue() {
        return this._defaultValue;
    }

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
/**
 * @type {Property}
 */
class JsonProperty extends Property {
    /**
     * @param {string} name
     * @param {null|Object} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

    /**
     * @param {null|string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                if(value == null)
                    resolve(null);
                else
                    resolve(JSON.parse(value));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {Property}
 */
class StringProperty extends Property {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

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
/**
 * @type {Property}
 */
class BooleanProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {null|boolean} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

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
/**
 * @type {Property}
 */
class NumericProperty extends Property {
    /**
     * @param {string} name
     * @param {null|number} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

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

module.exports = {
    PropertyHandler: PropertyHandler,
    AppSettingsPropertyHandler: AppSettingsPropertyHandler,
    VaultAppSettingPropertyHandler: VaultAppSettingPropertyHandler,
    AppConfigPropertyHandler: AppConfigPropertyHandler,
    CachedProperty: CachedProperty,
    CachePropertyHandler: CachePropertyHandler,
    Property: Property,
    StringProperty: StringProperty,
    BooleanProperty: BooleanProperty,
    NumericProperty: NumericProperty,
    JsonProperty: JsonProperty
};
