/*
 * Copyright (c) 2021, KRI, LLC.
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
const { v4: uuidv4 } = require('uuid');
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
 * @typedef _AzureFunctionContext
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
class ConfigurationItem {
    /**@type{string}*/get key() {return ""}
}
/**@abstract*/
class ResourceAuthorization {
    /**
     * @param {string} id
     */
    constructor(id, skew = -120) {
        this._id = id;
        this._tokens = {};
    }
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
            try {
                /** @type{_CelastrinaToken}*/let token = this._tokens[resource];
                if(typeof token !== "object" || moment().isSameOrAfter(token.expires)) {
                    this._refresh(resource)
                        .then((rtoken) => {
                            resolve(rtoken);
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                }
                else
                    resolve(token.token);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{ResourceAuthorization}*/
class ManagedIdentityAuthorization extends ResourceAuthorization {
    /**@type{string}*/static SYSTEM_MANAGED_IDENTITY = "celastrinajs.core.system.managed.identity";
    constructor() {
        super(ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY);
    }
    /**
     * @param {string} resource
     * @returns {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource) {
        return new Promise((resolve, reject) => {
            try {
                axios.get(process.env["IDENTITY_ENDPOINT"] + "?api-version=2019-08-01&resource=" + resource,
                    {headers: {"x-identity-header": process.env["IDENTITY_HEADER"]}})
                    .then((response) => {
                        let token = {
                            resource: resource,
                            token: response.data.access_token,
                            expires: moment(response.data.expires_on)
                        };
                        resolve(token);
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
/**@type{ResourceAuthorization}*/
class AppRegistrationAuthorization extends ResourceAuthorization {
    /**
     * @param {StringProperty|string} id
     * @param {StringProperty|string} authority
     * @param {StringProperty|string} tenant
     * @param {StringProperty|string} secret
     */
    constructor(id, authority, tenant, secret) {
        super(id);
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
            try {
                let adContext = new AuthenticationContext(this._authority + "/" + this._tenant);
                adContext.acquireTokenWithClientCredentials(resource, this._id, this._secret,
                    (err, response) => {
                        if (err) reject(CelastrinaError.newError("Not authorized.", 401));
                        else {
                            let token = {
                                resource: resource,
                                token: response.accessToken,
                                expires: moment(response.expiresOn)
                            };
                            resolve(token);
                        }
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/** ResourceAuthorizationContext @author Robert R Murrell */
class ResourceAuthorizationContext {
    /**@type{string}*/static CONFIG_RESOURCE_AUTH_CONTEXT = "celastrinajs.core.configuration.authorizations.context";
    constructor() {this._authorizations = {};}
    /**@type{Object}*/get authorizations() {return this._authorizations;}
    /**@param {ResourceAuthorization} authorization*/
    addAuthorization(authorization) {
        this._authorizations[authorization.id] = authorization;
    }
    /**
     * @param {null|string} [id=ManagedIdentityAuthorization.MANAGED_IDENTITY_ID]
     * @returns {Promise<ResourceAuthorization>}
     */
    async getAuthorization(id = ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY) {
        return new Promise((resolve, reject) => {
            try {
                /**@tye{ResourceAuthorization}*/let authorization = this._authorizations[id];
                if (typeof authorization === "undefined" || authorization == null)
                    reject(CelastrinaError.newError("Not authorized.", 401));
                else
                    resolve(authorization);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {string} resource
     * @param {null|string} [id = ResourceAuthorizationManager.MANAGED_IDENTITY_ID]
     * @returns {Promise<string>}
     */
    async getResourceToken(resource, id = ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY) {
        return new Promise((resolve, reject) => {
            try {
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
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/** @author Robert R Murrell */
class ResourceAuthorizationConfiguration extends ConfigurationItem {
    /**@type{string}*/static CONFIG_RESOURCE_AUTH = "celastrinajs.core.confgiuration.authorizations";
    /** */
    constructor() {
        super();
        /**@type{Array.<JsonProperty|ResourceAuthorization>}*/this._authorizations = [];
    }
    /**@type{string}*/get key() {return ResourceAuthorizationConfiguration.CONFIG_RESOURCE_AUTH};
    /**
     * @param {JsonProperty|ResourceAuthorization} authorization
     * @returns {ResourceAuthorizationConfiguration}
     */
    addAuthorization(authorization) {
        this._authorizations.unshift(authorization);
        return this;
    }
    /**@returns{Array.<ResourceAuthorization>}*/get authorizations() {return /**@type{Array.<ResourceAuthorization>}*/this._authorizations;}
    /**@returns{boolean}*/get containesManagedResourceAuthorization() {
        let hasem = false;
        for(const auth of this._authorizations) {
            if(auth instanceof ManagedIdentityAuthorization) {
                hasem = true;
                break;
            }
        }
        return hasem;
    }
    /**
     * @param {Configuration} config
     * @returns {Promise<void>}
     */
    async install(config) {
        return new Promise((resolve, reject) => {
            try {
                /**@type{ResourceAuthorizationContext}*/let authcontext = config.getValue(ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT);
                for(/**@type{ResourceAuthorization}*/const auth of this._authorizations) {
                    authcontext.addAuthorization(auth);
                }
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
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
            try {
                this._config.headers["Authorization"] = "Bearer " + token;
                axios.get(identifier, this._config)
                    .then((response) => {
                        resolve(response.data.value);
                    })
                    .catch((exception) => {
                        reject(CelastrinaError.newError("Error getting secret for '" + identifier + "'."));
                    });
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@abstract*/
class PropertyHandler {
    constructor(){}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async initialize(azcontext, config) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async ready(azcontext, config) {
        return new Promise((resolve, reject) => {
            resolve();
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
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @returns {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            try {
                let value = process.env[key];
                if (typeof value === "undefined") value = defaultValue;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * AppConfigPropertyHandler
 * @extends{AppSettingsPropertyHandler}
 * @author Robert R Murrell
 */
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
            configStoreName + "/listKeyValue?api-version=2019-10-01";
        /** @type {null|ResourceAuthorization} */this._auth = null;
        /** @type{boolean} */this._useVaultSecrets = useVaultSecrets;
        if(this._useVaultSecrets)
            /** @type{Vault} */this._vault = new Vault();
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async ready(azcontext, config) {
        return new Promise((resolve, reject) => {
            /**@type{ResourceAuthorizationContext}*/let authctx = config[ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT];
            authctx.getAuthorization()
                .then((_auth) => {
                    this._auth = _auth;
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param kvp
     * @returns {Promise<*>}
     * @private
     */
    async _resolveVaultReference(kvp) {
        return new Promise((resolve, reject) => {
            try {
                if(kvp.contentType === "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8" &&
                        this._useVaultSecrets) {
                    this._auth.getToken("https://vault.azure.net")
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
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {string} key
     * @returns {Promise<*>}
     * @private
     */
    async _getAppConfigProperty(key) {
        return new Promise((resolve, reject) => {
            try {
                this._auth.getToken("https://management.azure.com/")
                    .then((token) => {
                        return axios.post(this._endpoint, {key: key}, {headers: {"Authorization": "Bearer " + token}});
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
     * @param {moment.DurationInputArg2} [unit="s"]
     */
    constructor(time = 300, unit = "s") {
        /** @type {*} */this._value = null;
        this._time = time;
        /**@type{moment.DurationInputArg2} */this._unit = unit;
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
            try {
                this.value = null;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{AppSettingsPropertyHandler}*/
class CachePropertyHandler extends PropertyHandler {
    /**@type{string}*/static PROP_CACHE_DEFAULT_EXPIRE_TIME = "celastrinajs.core.property.cache.expire.time";
    /**@type{string}*/static PROP_CACHE_DEFAULT_EXPIRE_UNIT = "celastrinajs.core.property.cache.expire.unit";
    /**@type{string}*/static PROP_CACHE_DEFAULT_EXPIRE_OVERRIDE = "celastrinajs.core.property.cache.expire.override";
    /**
     * @param {PropertyHandler} [handler=new AppSettingsPropertyHandler()]
     * @param {number} [defaultTime=300]
     * @param {moment.DurationInputArg2} [defaultUnit="s"]
     */
    constructor(handler = new AppSettingsPropertyHandler(), defaultTime = 300,
                defaultUnit = "s") {
        super();
        /**@type{PropertyHandler}*/this._handler = handler;
        this._cache = {};
        this._defaultTime = defaultTime;
        /**@type{moment.DurationInputArg2}*/this._defaultUnit = defaultUnit;
    }
    /**@returns{boolean}*/get loaded(){return this._handler.loaded;}
    /**@returns{PropertyHandler}*/get handler(){return this._handler;}
    /**@returns{{Object}}*/get cache(){return this._cache;}
    /**@returns{Promise<void>}*/
    async clear() {
        return new Promise((resolve, reject) => {
            try {
                /**@type{Array.<Promise<void>>}*/let promises = [];
                for (let prop in this._cache) {
                    let cached = this._cache[prop];
                    if (cached instanceof CachedProperty) promises.unshift(cached.clear());
                }
                Promise.all(promises)
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
    async _configure() {
        return new Promise(async (resolve, reject) => {
            try {
                let time = await this._handler.getProperty(CachePropertyHandler.PROP_CACHE_DEFAULT_EXPIRE_TIME, 300);
                let unit = await this._handler.getProperty(CachePropertyHandler.PROP_CACHE_DEFAULT_EXPIRE_UNIT, "s");
                this._defaultTime = time;
                this._defaultUnit = /**@type{moment.DurationInputArg2}*/unit;
                let override = await this._handler.getProperty(CachePropertyHandler.PROP_CACHE_DEFAULT_EXPIRE_OVERRIDE, null);
                if(typeof override === "string") {
                    let tempovr = JSON.parse(override);
                    if((typeof tempovr === "object") && tempovr.hasOwnProperty("_type") &&
                        (typeof tempovr._type === "string") &&
                        (tempovr._type === CachePropertyHandler.PROP_CACHE_DEFAULT_EXPIRE_OVERRIDE)) {
                        /**@type{{_overrides:Array.<object>}}*/
                        let overrides = tempovr._overrides;
                        for(const /**@type{{_property:string,_time:number,_unit:moment.DurationInputArg2}}*/ovr of overrides) {
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
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @returns {Promise<void>}
     */
    async initialize(azcontext, config) {
        return new Promise((resolve, reject) => {
            try {
                this._handler.initialize(azcontext, config)
                    .then(() => {
                        this._configure()
                            .then(() => {
                                azcontext.log.verbose("[CachePropertyHandler.initialize(context, config, force)]: Caching configured.");
                                resolve();
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
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
     * @param {string} key
     * @returns {Promise<CachedProperty>}
     */
    async getCacheInfo(key) {
        return new Promise((resolve, reject) => {
            try {
                let cached = this._cache[key];
                if (!(cached instanceof CachedProperty)) resolve(null);
                else resolve(cached);
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
            try {
                handler.getProperty(this._name, this._defaultValue)
                    .then((value) => {
                        resolve(value);
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
            try {
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
            }
            catch(exception) {
                reject(exception);
            }
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
    /**@type{string}*/static PROP_PROPERTY = "celastrinajs.core.property.handler";
    /**@param{null|string}[name=null]*/
    constructor(name = null){this._name = name;}
    /**@returns{string}*/get name(){return this._name}
    /**@returns {PropertyHandler}*/
    _createPropertyHandler(source) {return null;}
    /**@returns{PropertyHandler}*/
    initialize() {
        let lname = this._name;
        if(typeof lname === "undefined" || lname == null)
            lname = HandlerProperty.PROP_PROPERTY;
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
                            else source = new AppRegistrationAuthorization(source._authority, source._tenant, source._id, source._secret);
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
            try {
                property.load(handler)
                    .then((value) => {
                        object[attribute] = value;
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
/**@abstract*/
class Module {
    /**@param{string}name*/
    constructor(name) {
        this._name = name;
    }
    /**@returns{string}*/get name(){return this._name;}
    /**
     * @param {Configuration} config
     * @returns{Promise<void>}
     * @abstract
     */
    async install(config) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
}
/**@type{ConfigurationItem}*/
class ModuleConfiguration extends ConfigurationItem {
    /**@type{string}*/static CONFIG_MODULES = "celastrinajs.core.configuration.modules";
    constructor() {
        super();
        /**@type{empty|Array.<JsonProperty|Module>}*/this._modules = [];
    }
    /**@type{string}*/get key() {return ModuleConfiguration.CONFIG_MODULES}
    /**
     * @param {JsonProperty|Module} module
     * @returns {ModuleConfiguration}
     */
    addModule(module){
        if(!(module instanceof Module) || !(module instanceof JsonProperty))
            throw CelastrinaValidationError.newValidationError("Argument 'module' is required.", "module");
        this._modules.unshift(module);
        return this;
    }
    /**
     * @param {Configuration} config
     * @returns {Promise<void>}
     */
    async install(config) {
        return new Promise((resolve, reject) => {
            try {
                /**@type{Array.<Promise<void>>}*/let promises = [];
                for (/**@type{Module}*/const module of this._modules) {
                    promises.unshift(module.install(config));
                }
                Promise.all(promises)
                    .then(() => {
                        /**@type{ModuleContext}*/let modcontext = config.getValue(ModuleContext.CONFIG_MODULE_CONTEXT);
                        for (/**@type{Module}*/const module of this._modules) {
                            modcontext.addModule(module);
                        }
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
/** ModuleContext */
class ModuleContext {
    /**@type{string}*/static CONFIG_MODULE_CONTEXT = "celastrinajs.core.configuration.modules.context";
    constructor() {
        this._modules = {};
    }
    /**
     * @param {string} name
     * @returns {Module}
     */
    getModule(name) {
        let module = this._modules[name];
        if(typeof module === "undefined" || module == null)
            throw CelastrinaError.newError("Module '" + name + "' not found.", 404);
        return module;
    }
    /**
     * @param {Module} module
     */
    addModule(module) {
        if(!(module instanceof Module))
            throw CelastrinaValidationError.newValidationError("Argument 'module' is required.", "module");
        this._modules[module.name] = module;
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
            try {
                resolve(this._roles.includes(role));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
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
            try {
                if (action === this._action) {
                    this._match.isMatch(context.subject.roles, this._roles)
                        .then((inrole) => {
                            resolve(inrole);
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                } else resolve(false);
            }
            catch(exception) {
                reject(exception);
            }
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
            try {
                switch (type) {
                    case "MatchAny": resolve(new MatchAny()); break;
                    case "MatchAll": resolve(new MatchAll()); break;
                    case "MatchNone": resolve(new MatchNone()); break;
                    default: reject(CelastrinaError.newError("Invalid Match Type."));
                }
            }
            catch(exception) {
                reject(exception);
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
/**
 * FunctionRoleContext
 * @author Robert R Murrell
 */
class FunctionRoleContext {
    /**@type{string}*/static CONFIG_ROLE_CONTEXT = "celastrinajs.core.configuration.roles.context";
    constructor() {
        this._roles = {};
        /**@type{null|RoleResolver}*/this._resolver = new DefaultRoleResolver();
    }
    /**
     * @param {FunctionRole} role
     */
    addFunctionRole(role) {
        this._roles[role.action] = role;
    }
    /**@param{RoleResolver}resolver*/set resolver(resolver) {this._resolver = resolver;}
    /**@returns{RoleResolver}*/get resolver() {return this._resolver;}
    /**
     * @param {string} action
     * @returns {Promise<null|FunctionRole>}
     */
    async getFunctionRole(action) {
        return new Promise((resolve, reject) => {
            try {
                let role = this._roles[action];
                if (typeof role === "undefined" || role == null)
                    role = null;
                resolve(role);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{ConfigurationItem}*/
class FunctionRoleConfiguration extends ConfigurationItem {
    /**@type{string}*/static CONFIG_ROLES = "celastrinajs.core.configuration.roles";
    constructor() {
        super();
        /**@type{Array.<JsonProperty|FunctionRole>}*/this._roles = [];
        /**@type{null|JsonProperty|RoleResolver}*/this._resolver = null;
    }
    /**@type{string}*/get key() {return FunctionRoleConfiguration.CONFIG_ROLES};
    /**
     * @param {JsonProperty|FunctionRole} role
     * @returns {FunctionRoleConfiguration}
     */
    addFunctionRole(role){this._roles.unshift(role); return this;}
    /**
     * @param {JsonProperty|RoleResolver} resolver
     * @returns {FunctionRoleConfiguration}
     */
    setResolver(resolver) {this._resolver = resolver; return this;}
    /**
     * @param {Configuration} config
     * @returns {Promise<void>}
     */
    async install(config) {
        return new Promise((resolve, reject) => {
            try {
                /**@type{FunctionRoleContext}*/let rolecontext = config.getValue(FunctionRoleContext.CONFIG_ROLE_CONTEXT);
                for(/**@type{FunctionRole}*/const role of this._roles) {
                    rolecontext.addFunctionRole(role);
                }
                if(this._resolver == null)
                    this._resolver = new DefaultRoleResolver();
                rolecontext.resolver = this._resolver;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * Configuration
 * @author Robert R Murrell
 */
class Configuration extends EventEmitter {
    /**@type{string}*/static CONFIG_NAME    = "celastrinajs.core.configuration.name";
    /**@type{string}*/static CONFIG_HANDLER = "celastrinajs.core.configuration.handler";
    /**@type{string}*/static CONFIG_CONTEXT = "celastrinajs.core.configuration.context";
    /**@type{string}*/static PROP_LOCAL_DEV = "celastringjs.core.property.deployment.local.development";
    /**@param{StringProperty|string} name*/
    constructor(name) {
        super();
        if(typeof name === "string") {
            if(name.trim().length === 0) throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else if(!(name instanceof StringProperty)) throw CelastrinaError.newError("Invalid configuration. Name must be string or StringProperty.");
        this._config = {};
        /**@type{boolean}*/this._loaded = false;
        this._config[Configuration.CONFIG_CONTEXT] = null;
        this._config[Configuration.CONFIG_HANDLER] = null;
        this._config[Configuration.CONFIG_NAME] = name;
        this._config[ModuleContext.CONFIG_MODULE_CONTEXT] = new ModuleContext();
        this._config[ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT] = new ResourceAuthorizationContext();
        this._config[FunctionRoleContext.CONFIG_ROLE_CONTEXT] = new FunctionRoleContext();
    }
    /**@returns{string}*/get name(){return this._config[Configuration.CONFIG_NAME];}
    /**@returns{PropertyHandler}*/get properties() {return this._config[Configuration.CONFIG_HANDLER];}
    /**@returns{object}*/get values(){return this._config;}
    /**@returns{_AzureFunctionContext}*/get context(){return this._config[Configuration.CONFIG_CONTEXT];}
    /**@returns{boolean}*/get loaded(){return this._loaded;}
    /**@returns{Promise<void>}*/
    async bootstrapped() {
        return new Promise((resolve, reject) => {
            try {
                if(!this._loaded) {
                    /**@type{null|ModuleConfiguration}*/let modconfig = this.getValue(ModuleConfiguration.CONFIG_MODULES);
                    if(modconfig != null) {
                        modconfig.install(this)
                            .then(() => {
                                this._loaded = true;
                                resolve();
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                    else {
                        this._loaded = true;
                        resolve();
                    }
                }
                else resolve();
            }
            catch(exception) {
                reject(exception);
            }
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
        if(typeof key !== "string" || key.trim().length === 0)
            throw CelastrinaError.newError("Invalid configuration. Key cannot be undefined, null or 0 length.");
        this._config[key] = value;
        return this;
    }
    /**
     * @param {ConfigurationItem} config
     * @returns {Configuration}
     */
    setConfigurationItem(config) {this.setValue(config.key, config); return this;};
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
     * @param {Object} obj
     * @param {Array.<Promise>} promises
     * @private
     */
    _load(obj, promises) {
        if(typeof obj === "object") {
            for(let prop in obj) {
                let local = obj[prop];
                if(typeof local !== "undefined" && local != null) {
                    if(local instanceof Property) promises.unshift(PropertyLoader.load(obj, prop, local,
                                                                   this._config[Configuration.CONFIG_HANDLER]));
                    else this._load(local, promises);
                }
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @returns {PropertyHandler}
     * @private
     */
    _getPropertyHandler(azcontext) {
        /**@type{undefined|null|PropertyHandler}*/let _handler = this._config[Configuration.CONFIG_HANDLER];
        if(typeof _handler === "undefined" || _handler == null) {
            azcontext.log.info("[Configuration._getPropertyHandler(context)]: No property handler specified, defaulting to AppSettingsPropertyHandler.");
            _handler = new AppSettingsPropertyHandler();
            this._config[Configuration.CONFIG_HANDLER] = _handler;
        }
        else
            azcontext.log.info("[Configuration._getPropertyHandler(context)]: Loading PropertyHandler '" + _handler.constructor.name + "'.");
        return _handler;
    }
    /**
     * @returns {boolean}
     * @private
     */
    _isPropertyHandlerOverridden() {
        let overridden = false;
        let deployment = /**@type{null|undefined|string}*/process.env[Configuration.PROP_LOCAL_DEV];
        if(typeof deployment === "string")
            overridden = (deployment.trim().toLowerCase() === "true");
        return overridden;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @returns {Promise<void>}
     */
    async initialize(azcontext) {
        return new Promise((resolve, reject) => {
            try {
                this._config[Configuration.CONFIG_CONTEXT] = azcontext;
                if(!this._loaded) {
                    /**@type{PropertyHandler}*/let handler = this._getPropertyHandler(azcontext);
                    if(this._isPropertyHandlerOverridden()) {
                        azcontext.log.warn("[Configuration.initialize(azcontext)]: Local development override, using AppSettingsPropertyHandler.");
                        handler = new AppSettingsPropertyHandler();
                        this._config[Configuration.CONFIG_HANDLER] = handler;
                    }
                    else if(handler instanceof HandlerProperty) {
                        azcontext.log.info("[Configuration.initialize(azcontext)]: Handler property identified, creating Property Handler.");
                        handler = handler.initialize();
                        this._config[Configuration.CONFIG_HANDLER] = handler;
                    }
                    handler.initialize(azcontext, this._config)
                        .then(() => {
                            azcontext.log.info("[Configuration.initialize(azcontext)]: Property Handler initialized.");
                            /**@type{Array.<Promise<void>>}*/let promises = [];
                            this._load(this, promises);
                            return Promise.all(promises);
                        })
                        .then(() => {
                            let _name = this._config[Configuration.CONFIG_NAME];
                            if(typeof _name !== "string" || _name.trim().length === 0) {
                                azcontext.log.error("[Configuration.load(context)]: Invalid Configuration. Name cannot be undefined, null, or 0 length.");
                                reject(CelastrinaValidationError.newValidationError("Name cannot be undefined, null, or 0 length.", Configuration.CONFIG_NAME));
                            }
                            else {
                                /**@type{null|undefined|string}*/let endpoint = process.env["IDENTITY_ENDPOINT"];
                                /**@type{null|undefined|ResourceAuthorizationConfiguration}*/let authconfig = this._config[ResourceAuthorizationConfiguration.CONFIG_RESOURCE_AUTH];
                                if(typeof endpoint !== "string") {
                                    azcontext.log.info("[Configuration.initialize(azcontext)]: Managed Identity detected, validating managed resource authorization configuration.");
                                    if(!(authconfig instanceof ResourceAuthorizationConfiguration)) {
                                        authconfig = new ResourceAuthorizationConfiguration();
                                        authconfig.addAuthorization(new ManagedIdentityAuthorization());
                                        this._config[ResourceAuthorizationConfiguration.CONFIG_RESOURCE_AUTH] = authconfig;
                                    }
                                    else if(!authconfig.containesManagedResourceAuthorization)
                                        authconfig.addAuthorization(new ManagedIdentityAuthorization());
                                }
                                /**@type{null|FunctionRoleConfiguration}*/let roleconfig = this.getValue(FunctionRoleConfiguration.CONFIG_ROLES);
                                /**@type{Array.<Promise<void>>}*/let promises = [];
                                if(authconfig != null)
                                    promises.unshift(authconfig.install(this));
                                if(roleconfig != null)
                                    promises.unshift(roleconfig.install(this));
                                return Promise.all(promises);
                            }
                        })
                        .then((results) => {
                            azcontext.log.info("[Configuration.initialize(azcontext)]: Changing Property Handler to Ready.");
                            return handler.ready(azcontext, this._config);
                        })
                        .then(() => {
                            azcontext.log.info("[Configuration.initialize(azcontext)]: Configuration initialized.");
                            resolve();
                        })
                        .catch((exception) => {
                            azcontext.log.error("[Configuration.load(context)]: Exception initializing handler: " + exception);
                            reject(exception);
                        });
                }
                else
                    resolve();
            }
            catch(exception) {
                azcontext.log.error("[Configuration.load(context)]: Exception initializing configuration: " + exception);
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
            try {
                this._algorithm.initialize()
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
            try {
                let roles = context.getSessionProperty("roles", []);
                context.subject.addRoles(roles);
                resolve(context.subject);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{RoleResolver}*/
class DefaultRoleResolver extends RoleResolver {
    constructor(){super();}
    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async resolve(context) {
        return new Promise((resolve, reject) => {
            try {
                resolve(context.subject);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/** BaseSentry */
class BaseSentry {
    constructor() {
        /**@type{null|FunctionRoleContext}*/this._roleContext = null;
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {resolve(new BaseSubject(
            ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY));});
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            try {
                this._roleContext.getFunctionRole(context.action)
                    .then((role) => {
                        if(role == null)
                            resolve();
                        else {
                            role.authorize(context.action, context)
                                .then((auth) => {
                                    if(auth)
                                        resolve();
                                    else
                                        reject(CelastrinaError.newError("Forbidden.", 403));
                                })
                                .catch((exception) => {
                                    context.log("Exception authorizing role '" + role + "' for action '" + context.action + "', exception: " + exception, LOG_LEVEL.LEVEL_ERROR,"BaseSentry.authorize(context)");
                                    reject(CelastrinaError.newError("Forbidden.", 403));
                                });
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
    /**
     * @param {BaseContext} context
     * @returns {Promise<BaseSubject>}
     */
    async setRoles(context) {
        return new Promise((resolve, reject) => {
            this._roleContext.resolver.resolve(context)
                .then((subject) => {
                    resolve(subject);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {Configuration} config
     * @returns {Promise<void>}
     */
    async initialize(config) {
        return new Promise((resolve, reject) => {
            try {
                this._roleContext = config.getValue(FunctionRoleContext.CONFIG_ROLE_CONTEXT);
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
class BaseContext {
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Configuration} config
     */
    constructor(azcontext, config) {
        /**@type{string}*/this._requestId = uuidv4();
        /**@type{_AzureFunctionContext}*/this._funccontext = azcontext;
        /**@type{null|string}*/this._traceId = null;
        /**@type{boolean}*/this._monitor = false;
        /**@type{null|MonitorResponse}*/this._monitorResponse = null;
        /**@type{Configuration}*/this._config = config;
        /**@type{null|BaseSubject}*/this._subject = null;
        /**@type{string}*/this._action = "process";
        /**@type{null|BaseSentry}*/this._sentry = null;
        /**@type{object}*/this._session = {};
    }
    /**
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise((resolve, reject) => {
            try {
                if(this._monitor)
                    this._monitorResponse = new MonitorResponse();
                /** @type {{traceparent: string}} */
                let _traceContext = this._funccontext.traceContext;
                if(typeof _traceContext !== "undefined")
                    this._traceId = _traceContext.traceparent;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**@returns{string}*/get name() {return this._config.name;}
    /**@returns{Configuration}*/get config(){return this._config;}
    /**@returns{boolean}*/get isMonitorInvocation(){return this._monitor;}
    /**@returns{null|MonitorResponse}*/get monitorResponse(){return this._monitorResponse;}
    /**@returns{string}*/get invocationId(){return this._funccontext.bindingData.invocationId;}
    /**@returns{string}*/get requestId(){return this._requestId;}
    /**@returns{BaseSentry}*/get sentry(){return this._sentry;}
    /**@param{BaseSentry} sentry*/set sentry(sentry){this._sentry = sentry;}
    /**@returns{BaseSubject}*/get subject(){return this._subject;}
    /**@param{BaseSubject} subject*/set subject(subject){this._subject = subject;}
    /**@returns{string}*/get action(){return this._action;}
    /**@returns{object}*/get session(){return this._session;}
    /**@returns{PropertyHandler}*/get properties(){return this._config.properties;}
    /**@returns{_AzureFunctionContext}*/get functionContext(){return this._funccontext;}
    /**@returns{ModuleContext}*/get moduleContext() {return this._config.getValue(ModuleContext.CONFIG_MODULE_CONTEXT);}
    /**@return{ResourceAuthorizationContext}*/get authorizationContext() {return this._config.getValue(ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT);}
    /**@return{FunctionRoleContext}*/get roleContext() {return this._config.getValue(FunctionRoleContext.CONFIG_ROLE_CONTEXT);}
    /**@param{string}name*/getBinding(name){return this._funccontext.bindings[name];}
    /**
     * @param {string} name
     * @param {Object} value
     */
    setBinding(name, value){this._funccontext.bindings[name] = value;}
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
     * @param {Object} message
     * @param {number} [level=LOG_LEVEL.LEVEL_VERBOSE]
     * @param {null|string} [subject=null]
     */
    log(message = "[NO MESSAGE]", level = LOG_LEVEL.LEVEL_VERBOSE, subject = null) {
        let out = "[" + this._config.name + "][LEVEL " + level + "]";
        if(typeof subject === "string") out += "[" + subject + "]";
        out += "[" + this._funccontext.invocationId + "]:" + "[" + this._requestId + "]:" + message.toString();
        switch(level) {
            case LOG_LEVEL.LEVEL_ERROR:this._funccontext.log.error(out); break;
            case LOG_LEVEL.LEVEL_INFO:this._funccontext.log.info(out); break;
            case LOG_LEVEL.LEVEL_WARN:this._funccontext.log.warn(out); break;
            case LOG_LEVEL.LEVEL_VERBOSE:this._funccontext.log.verbose(out); break;
            default:this._funccontext.log(out);
        }
    }
    /**
     * @param {Object} object
     * @param {number} [level=LOG_LEVEL.LEVEL_VERBOSE]
     * @param {null|string} [subject=null]
     */
    logObjectAsJSON(object, level = LOG_LEVEL.LEVEL_VERBOSE, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }
    /**@param{null|Object}[value=null]*/
    done(value = null) {
        if(value === null) this._funccontext.done();
        else this._funccontext.done(value);
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
     * @param {_AzureFunctionContext} azcontext
     * @param {Configuration} config
     * @returns {Promise<BaseSentry>}
     * @throws {CelastrinaError}
     */
    async createSentry(azcontext, config) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new BaseSentry());
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Configuration} config
     * @returns {Promise<BaseContext>}
     */
    async createContext(azcontext, config) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new BaseContext(azcontext, config));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @returns {Promise<void>}
     * @throws {CelastrinaError}
     */
    async bootstrap(azcontext) {
        return new Promise((resolve, reject) => {
            try {
                /**@type{null|BaseSentry}*/let _sentry = null;
                /**@type{null|BaseContext}*/let _context = null;
                this._configuration.initialize(azcontext)
                    .then(() => {
                        return this.createSentry(azcontext, this._configuration);
                    })
                    .then((_basesentry) => {
                        _sentry = _basesentry;
                        return this.createContext(azcontext, this._configuration);
                    })
                    .then((_basecontext) => {
                        _context = _basecontext;
                        return _context.initialize();
                    })
                    .then(() => {
                        return _sentry.initialize(this._configuration);
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
            }
            catch(exception) {
                reject(exception);
            }
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
            try {
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
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            try {
                context.sentry.authorize(context)
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
            try {
                context.monitorResponse.addPassedDiagnostic("default", "Monitor not implemented.");
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
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
                            return this.authenticate(this._context);
                        })
                        .then((subject) => {
                            this._context.subject = subject;
                            return this.authorize(this._context);
                        })
                        .then(() => {
                            return this.validate(this._context);
                        })
                        .then(() => {
                            return this.load(this._context);
                        })
                        .then(() => {
                            if(this._context.isMonitorInvocation)
                                return this.monitor(this._context);
                            else
                                return this.process(this._context);
                        })
                        .then(() => {
                            return this.save(this._context);
                        })
                        .catch((exception) => {
                            this._context.log("Exception Lifecycle invoked from Monitor or Process lifecycle: " + exception, LOG_LEVEL.LEVEL_ERROR,"BaseFunction.execute(context)");
                            return this.exception(this._context, exception);
                        })
                        .then(() => {
                            return this.terminate(this._context);
                        })
                        .then(() => {
                            this._context.done();
                        })
                        .catch((exception) => {
                            this._context.log("Critical Exception Lifecycle invoked from Exception or Terminate Lifecycle: " + exception, LOG_LEVEL.LEVEL_ERROR, "BaseFunction.execute(context)");
                            this._unhandled(context, exception);
                        });
                })
                .catch((exception) => {
                    context.log.error("[BaseFunction.execute(context)]: Critical unhandled exception during Bootstrap, done. Exception: " + exception);
                    this._unhandled(context, exception);
                });
        }
        catch(exception) {
            context.log.error("[BaseFunction.execute(context)]: Critical unhandled exception, done. Exception: " + exception);
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
    ResourceAuthorizationContext: ResourceAuthorizationContext, ResourceAuthorizationConfiguration: ResourceAuthorizationConfiguration,
    ManagedIdentityAuthorization: ManagedIdentityAuthorization, AppRegistrationAuthorization: AppRegistrationAuthorization,
    Vault: Vault, PropertyHandler: PropertyHandler,
    AppSettingsPropertyHandler: AppSettingsPropertyHandler,
    AppConfigPropertyHandler: AppConfigPropertyHandler, CachedProperty: CachedProperty, CachePropertyHandler: CachePropertyHandler,
    AppConfigHandlerProperty: AppConfigHandlerProperty, Property: Property, StringProperty: StringProperty,
    BooleanProperty: BooleanProperty, NumericProperty: NumericProperty, JsonProperty: JsonProperty, ModuleConfiguration: ModuleConfiguration, ModuleContext: ModuleContext,
    Module: Module, ApplicationAuthorization: AppRegistrationAuthorization, ApplicationAuthorizationProperty: ApplicationAuthorizationProperty,
    ValueMatch: ValueMatch, MatchAny: MatchAny, MatchAll: MatchAll, MatchNone: MatchNone, FunctionRole: FunctionRole,
    FunctionRoleProperty: FunctionRoleProperty, FunctionRoleConfiguration: FunctionRoleConfiguration, FunctionRoleContext: FunctionRoleContext, Configuration: Configuration, Algorithm: Algorithm, AES256Algorithm: AES256Algorithm,
    Cryptography: Cryptography, LOG_LEVEL: LOG_LEVEL, BaseSubject: BaseSubject, MonitorResponse: MonitorResponse, RoleResolver: RoleResolver,
    BaseSentry: BaseSentry, BaseContext: BaseContext, BaseFunction: BaseFunction
};
