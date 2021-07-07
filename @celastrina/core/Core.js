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
/**
 * CelastrinaError
 * @author Robert R Murrell
 */
class CelastrinaError extends Error {
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} [drop=false]
     * @param {Error} [cause=null]
     */
    constructor(message, code = 500, drop = false, cause = null) {
        super(message);
        /**@type{Error}*/this.cause = cause;
        this.code = code;
        this.drop = drop;
    }
    /**
     * @return {string}
     */
    toString() {
        let _tostring = "[" + this.code + "][" + this.drop + "]: " + this.message;
        if(typeof this.cause !== "undefined" && this.cause != null)
            _tostring += " Caused by " + this.cause.toString();
        return _tostring;
    }
    /**
     * @return {Object}
     */
    toJSON() {
        return {message: this.message, code: this.code, drop: this.drop};
    }
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} [drop=false]
     * @param {Error} [cause=null]
     * @return {CelastrinaError}
     */
    static newError(message, code = 500, drop = false, cause = null) {
        return new CelastrinaError(message, code, drop, cause);
    }
    /**
     * @param {*} error
     * @param {int} code
     * @param {boolean} drop
     * @return {CelastrinaError}
     */
    static wrapError(error, code = 500, drop = false) {
        let ex = error;
        if(typeof ex === "undefined" || ex == null)
            return new CelastrinaError("Unhandled Exception.", code, drop);
        if(ex instanceof CelastrinaError)
            return ex;
        else if(typeof ex === "string" || typeof ex === "number"  || typeof ex === "boolean")
            return new CelastrinaError(ex, code, drop);
        else if(ex instanceof Error)
            return new CelastrinaError(ex.message, code, drop, ex);
        else
            return new CelastrinaError("Unhandled Exception.",code, drop);
    }
}
/**
 * CelastrinaValidationError
 * @author Robert R Murrell
 */
class CelastrinaValidationError extends CelastrinaError {
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} [drop=false]
     * @param {string} [tag=""]
     * @param {Error} [cause=null]
     */
    constructor(message, code = 500, drop = false, tag = "", cause = null) {
        super(message, code, drop, cause);
        this.tag = tag;
    }
    /**@return{string}*/toString(){return "[" + this.tag + "]" + super.toString();}
    /**
     * @return {Object}
     */
    toJSON() {
        let _object = super.toJSON();
        _object.tag = this.tag;
        return _object;
    }
    /**
     * @param {string} message
     * @param {int} [code=400]
     * @param {boolean} [drop=false]
     * @param {string} [tag=""]
     * @param {Error} [cause=null]
     * @return {CelastrinaValidationError}
     */
    static newValidationError(message, tag = "", drop = false, code = 400, cause = null) {
        return new CelastrinaValidationError(message, code, drop, tag);
    }
    /**
     * @param {*} error
     * @param {int} [code=400]
     * @param {boolean} [drop=false]
     * @param {string} [tag=""]
     * @return {CelastrinaValidationError}
     */
    static wrapValidationError(error, tag = "", drop = false, code = 400) {
        let ex = error;
        if(typeof ex === "undefined")
            return new CelastrinaValidationError("Unhandled Exception.", code, drop, tag);
        if(ex instanceof CelastrinaValidationError)
            return ex;
        else if(typeof ex === "string" || typeof ex === "number"  || typeof ex === "boolean")
            return new CelastrinaValidationError(ex, code, drop, tag);
        else if(ex instanceof Error)
            return new CelastrinaValidationError(ex.message, code, drop, tag, ex);
        else
            return new CelastrinaValidationError("Unhandled Exception.",code, drop, tag);
    }
}
/**
 * ConfigurationItem
 * @author Robert R Murrell
 * @abstract
 */
class ConfigurationItem {
    constructor(){}
    /**@type{string}*/get key() {throw CelastrinaError.newError("Not Implimented", 501);}
}
/**
 * ResourceAuthorization
 * @author Robert R Murrell
 * @abstract
 */
class ResourceAuthorization {
    /**
     * @param {string} id
     * @param {number} [skew=0]
     */
    constructor(id, skew = 0) {
        this._id = id;
        this._tokens = {};
        this._skew = skew;
    }
    /**@return{string}*/get id(){return this._id;}
    /**
     * @param {string} resource
     * @return {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource) { throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {string} resource
     * @return {Promise<string>}
     * @private
     */
    async _refresh(resource) {
        let token = await this._resolve(resource);
        if(this._skew !== 0)
            token.expires.add(this._skew, "seconds");
        this._tokens[resource] = token;
        return token.token;
    };
    /**
     * @param {string} resource
     * @return {Promise<string>}
     */
    async getToken(resource) {
        /** @type{_CelastrinaToken}*/let token = this._tokens[resource];
        if(typeof token !== "object" || moment().isSameOrAfter(token.expires))
            return await this._refresh(resource)
        else
            return token.token;
    }
}
/**
 * ManagedIdentityAuthorization
 * @author Robert R Murrell
 */
class ManagedIdentityAuthorization extends ResourceAuthorization {
    /**@type{string}*/static SYSTEM_MANAGED_IDENTITY = "celastrinajs.core.system.managed.identity";
    /**@param {number}[skew=0]*/
    constructor(skew = 0) {
        super(ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY, skew);
    }
    /**
     * @param {string} resource
     * @return {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource) {
        try {
            let response = await axios.get(process.env["IDENTITY_ENDPOINT"] + "?api-version=2019-08-01&resource=" + resource,
                                        {headers: {"x-identity-header": process.env["IDENTITY_HEADER"]}});
            return {
                resource: resource,
                token: response.data.access_token,
                expires: moment(response.data.expires_on)
            };
        }
        catch(exception) {
            if(typeof exception === "object" && exception.hasOwnProperty("response")) {
                if(exception.response.status === 404)
                    throw CelastrinaError.newError("Resource '" + resource + "' not found.", 404);
                else
                    throw CelastrinaError.newError("Exception getting respurce '" + resource + "': " +
                                                    exception.response.statusText, exception.response.status);
            }
            else
                throw CelastrinaError.newError("Exception getting resource '" + resource + "'.");
        }
    }
}
/**
 * AppRegistrationAuthorization
 * @author Robert R Murrell
 */
class AppRegistrationAuthorization extends ResourceAuthorization {
    /**
     * @param {StringPropertyType|string} id
     * @param {StringPropertyType|string} authority
     * @param {StringPropertyType|string} tenant
     * @param {StringPropertyType|string} secret
     * @param {number} [skew=0]
     */
    constructor(id, authority, tenant,
                secret, skew = 0) {
        super(id, skew);
        this._authority = authority;
        this._tenant = tenant;
        this._secret = secret;
    }
    /**@return{string}*/get authority(){return this._authority;}
    /**@return{string}*/get tenant(){return this._tenant;}
    /**@return{string}*/get secret(){return this._secret;}
    /**
     * @param {string} resource
     * @return {Promise<_CelastrinaToken>}
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
/**
 * ResourceAuthorizationContext
 * @author Robert R Murrell
 */
class ResourceAuthorizationContext {
    /**@type{string}*/static CONFIG_RESOURCE_AUTH_CONTEXT = "celastrinajs.core.configuration.authorizations.context";
    constructor() {this._authorizations = {};}
    /**@type{Object}*/get authorizations() {return this._authorizations;}
    /**@param {ResourceAuthorization} authorization*/
    addAuthorization(authorization) {this._authorizations[authorization.id] = authorization;}
    /**
     * @param {null|string} [id=ManagedIdentityAuthorization.MANAGED_IDENTITY_ID]
     * @return {Promise<ResourceAuthorization>}
     */
    async getAuthorization(id = ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY) {
        /**@tye{ResourceAuthorization}*/let authorization = this._authorizations[id];
        if (typeof authorization === "undefined" || authorization == null)
            throw CelastrinaError.newError("Not authorized.", 401);
        else
            return authorization;
    }
    /**
     * @param {string} resource
     * @param {null|string} [id = ResourceAuthorizationManager.MANAGED_IDENTITY_ID]
     * @return {Promise<string>}
     */
    async getResourceToken(resource, id = ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY) {
        let authorization = await this.getAuthorization(id);
        return authorization.getToken(resource);
    }
}
/**
 * ResourceAuthorizationConfiguration
 * @author Robert R Murrell
 */
class ResourceAuthorizationConfiguration extends ConfigurationItem {
    /**@type{string}*/static CONFIG_RESOURCE_AUTH = "celastrinajs.core.confgiuration.authorizations";
    /** */
    constructor() {
        super();
        /**@type{Array.<JsonPropertyType|ResourceAuthorization>}*/this._authorizations = [];
    }
    /**@type{string}*/get key() {return ResourceAuthorizationConfiguration.CONFIG_RESOURCE_AUTH};
    /**
     * @param {JsonPropertyType|ResourceAuthorization} authorization
     * @return {ResourceAuthorizationConfiguration}
     */
    addAuthorization(authorization) {
        this._authorizations.unshift(authorization);
        return this;
    }
    /**@return{Array.<ResourceAuthorization>}*/get authorizations() {return /**@type{Array.<ResourceAuthorization>}*/this._authorizations;}
    /**@return{boolean}*/get hasManagedIdentity() {
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
     * @return {Promise<void>}
     */
    async install(config) {
        /**@type{ResourceAuthorizationContext}*/let authcontext = config.getValue(ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT);
        for(/**@type{ResourceAuthorization}*/const auth of this._authorizations) {
            authcontext.addAuthorization(auth);
        }
    }
}
/**
 * Vault
 * @author Robert R Murrell
 */
class Vault {
    constructor() {}
    /**
     * @param {string} token
     * @param {string} identifier
     * @return {Promise<string>}
     */
    async getSecret(token, identifier) {
        try {
            let response = await axios.get(identifier + "?api-version=7.1",
                                              {headers: {"Authorization": "Bearer " + token}});
            return response.data.value;
        }
        catch(exception) {
            if(typeof exception === "object" && exception.hasOwnProperty("response")) {
                if(exception.response.status === 404)
                    throw CelastrinaError.newError("Vault secret '" + identifier + "' not found.", 404);
                else
                    throw CelastrinaError.newError("Exception getting Vault secret '" + identifier + "': " +
                                                   exception.response.statusText, exception.response.status);
            }
            else
                throw CelastrinaError.newError("Exception getting Vault secret '" + identifier + "'.");
        }
    }
}
/**
 * PropertyManager
 * @abstract
 * @author Robert R Murrell
 */
class PropertyManager {
    constructor(){}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {}
    /**
     * @abstract
     * @return {string}
     */
    getName() {return "PropertyManager";}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {}
    /**
     * @param {string} key
     * @param {*} [defaultValue = null]
     * @return {Promise<*>}
     * @abstract
     */
    async getProperty(key, defaultValue = null) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {PropertyType} type
     * @return {Promise<PropertyType>}
     */
    async getPropertyType(type) {
        if(typeof type === "undefined" || type === null) return null;
        else {
            await type.load(this);
            return type;
        }
    }
}
/**
 * AppSettingsPropertyManager
 * @author Robert R Murrell
 */
class AppSettingsPropertyManager extends PropertyManager {
    constructor(){super();}
    /**@return{string}*/getName() {return "AppSettingsPropertyManager";}
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @return {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
        let value = process.env[key];
        if(typeof value === "undefined") value = defaultValue;
        return value;
    }
}
/**
 * AppConfigPropertyManager
 * @author Robert R Murrell
 */
class AppConfigPropertyManager extends AppSettingsPropertyManager {
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
        this._label = label;
        this._endpoint = "https://management.azure.com/subscriptions/" + subscriptionId +
                    "/resourceGroups/" + resourceGroupName + "/providers/Microsoft.AppConfiguration/configurationStores/" +
                    configStoreName + "/listKeyValue?api-version=2019-10-01";
        /** @type {ManagedIdentityAuthorization} */this._auth = null;
        /** @type{boolean} */this._useVaultSecrets = useVaultSecrets;
        if(this._useVaultSecrets)
            /** @type{Vault} */this._vault = new Vault();
    }
    /**@return{string}*/getName() {return "AppConfigPropertyManager";}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {
        let _identityEndpoint = process.env["IDENTITY_ENDPOINT"];
        if(typeof _identityEndpoint === "undefined" || _identityEndpoint == null)
            throw CelastrinaError.newError("AppConfigPropertyManager requires User or System Assigned Managed Identy to be enabled.");
        else {
            azcontext.log.verbose("[AppConfigPropertyManager.initialize(azcontext, config)]: ManagedIdentityAuthorization created.");
            this._auth = new ManagedIdentityAuthorization();
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {
        /**@type{ResourceAuthorizationContext}*/let authctx = config[ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT];
        azcontext.log.verbose("[AppConfigPropertyManager.ready(azcontext, config)]: Added ManagedIdentityAuthorization to authorization context.");
        authctx.addAuthorization(this._auth);
    }
    /**
     * @param kvp
     * @return {Promise<*>}
     * @private
     */
    async _resolveVaultReference(kvp) {
        if(kvp.contentType === "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8" &&
                this._useVaultSecrets) {
            let token = await this._auth.getToken("https://vault.azure.net");
            let vaultRef = JSON.parse(kvp.value);
            return await this._vault.getSecret(token, vaultRef.uri);
        }
        else
            return kvp.value;
    }
    /**
     * @param {string} key
     * @return {Promise<*>}
     * @private
     */
    async _getAppConfigProperty(key) {
        try {
            let token = await this._auth.getToken("https://management.azure.com/");
            let response = await axios.post(this._endpoint, {
                                                key: key,
                                                label: this._label
                                            }, {headers: {"Authorization": "Bearer " + token}});
            return await this._resolveVaultReference(response.data);
        }
        catch(exception) {
            if(exception instanceof CelastrinaError)
                throw exception;
            else if(typeof exception === "object" && exception.hasOwnProperty("response")) {
                if(exception.response.status === 404)
                    throw CelastrinaError.newError("App Configuration '" + key + "' not found.", 404);
                else
                    throw CelastrinaError.newError("Exception getting App Configuration '" + key + "': " +
                                                           exception.response.statusText, exception.response.status);
            }
            else
                throw CelastrinaError.newError("Exception getting App Configuration '" + key + "'.");
        }
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @return {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
        try {
            return await this._getAppConfigProperty(key);
        }
        catch(exception) {
            if(exception.code === 404)
                return await super.getProperty(key, defaultValue);
            else
                throw exception;
        }
    }
}
/**
 * CachedProperty
 * @author Robert R Murrell
 */
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
    /**@return{*}*/get value(){return this._value;}
    /**@return{null|moment.Moment}*/get expires(){return this._expires;}
    /**@return{null|moment.Moment}*/get lastUpdated(){return this._lastUpdate;}
    /**@param{*}value*/
    set value(value) {
        this._value = value;
        this._lastUpdate = moment();
        if(this._time === 0 || value == null) this._expires = null;
        else this._expires = moment().add(this._time, this._unit);
    }
    /**@return{boolean}*/
    isExpired() {
        if(this._expires == null) return true;
        else return (moment().isSameOrAfter(this._expires));
    }
    /**@return{Promise<void>}*/
    async clear() {this.value = null;}
}
/**
 * CachePropertyHandler
 * @author Robert R Murrell
 */
class CachePropertyHandler extends PropertyManager {
    /**
     * @param {PropertyManager} [handler=new AppSettingsPropertyManager()]
     * @param {number} [defaultTime=300]
     * @param {moment.DurationInputArg2} [defaultUnit="s"]
     * @param {Object} [overrides={}]
     */
    constructor(handler = new AppSettingsPropertyManager(), defaultTime = 300,
                defaultUnit = "s", overrides = {}) {
        super();
        /**@type{PropertyManager}*/this._handler = handler;
        this._cache = overrides;
        this._defaultTime = defaultTime;
        /**@type{moment.DurationInputArg2}*/this._defaultUnit = defaultUnit;
    }
    /**@return{string}*/getName() {return "CachePropertyHandler(" + this._handler.getName() + ")";}
    /**@return{PropertyManager}*/get handler(){return this._handler;}
    /**@return{{Object}}*/get cache(){return this._cache;}
    /**@return{Promise<void>}*/
    async clear() {
        /**@type{Array.<Promise<void>>}*/let promises = [];
        for(let prop in this._cache) {
            let cached = this._cache[prop];
            if(cached instanceof CachedProperty) promises.unshift(cached.clear());
        }
        await Promise.all(promises);
    }
    /**
     * @param azcontext
     * @param config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {
        await this._handler.ready(azcontext, config);
        azcontext.log.verbose("[CachePropertyHandler.ready(context, config, force)]: Caching ready.");
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {
        await this._handler.initialize(azcontext, config);
        azcontext.log.verbose("[CachePropertyHandler.initialize(context, config)]: Caching initialized.");
    }
    /**
     * @param {string} key
     * @return {Promise<CachedProperty>}
     */
    async getCacheInfo(key) {
        let cached = this._cache[key];
        if (!(cached instanceof CachedProperty)) return null;
        else return cached;
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @return {Promise<*>}
     */
    async getProperty(key, defaultValue = null) {
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
        return value;
    }
}
/**
 * JsonPropertyType
 * @abstract
 * @author Robert R Murrell
 */
class PropertyType extends ConfigurationItem {
    /**
     * @param {string} key
     * @param {*} [defaultValue = null]
     */
    constructor(key, defaultValue = null) {
        super();
        this._key = key;
        this._defaultValue = defaultValue;
    }
    /**@type{string}*/get key() {return this._key}
    /**
     * @return {string}
     * @abstract
     */
    get mime() {return "text/plain; celastrinajs.core.property.PropertyType"}
    /**@return{string}*/get name(){return this._key;}
    /**@return{*}*/get defaultValue(){return this._defaultValue;}
    /**
     * @param {PropertyManager} handler
     * @return {Promise<null|Object|string|boolean|number>}
     */
    async lookup(handler) {
        return await handler.getProperty(this._key, this._defaultValue);
    }
    /**
     * @param {null|string} value
     * @return {Promise<null|Object|string|boolean|number>}
     */
    async resolve(value) {throw CelastrinaError.newError("PropertyType not supported.");}
    /**
     * @param {PropertyManager} handler
     * @return {Promise<null|Object|string|boolean|number>}
     */
    async load(handler) {
        let local = await this.lookup(handler);
        return await this.resolve(local);
    }
}
/**
 * JsonPropertyType
 * @author Robert R Murrell
 */
class JsonPropertyType extends PropertyType {
    /**
     * @param {string} name
     * @param {null|Object} defaultValue
     */
    constructor(name, defaultValue = null) {super(name, defaultValue);}
    /**@return{string}*/get mime() {return "application/json; celastrinajs.core.property.JsonPropertyType"}
    /**
     * @param {null|string} value
     * @return {Promise<null|Object>}
     */
    async resolve(value) {
        if(value == null) return null;
        else return JSON.parse(value);
    }
}
/**
 * StringPropertyType
 * @author Robert R Murrell
 */
class StringPropertyType extends PropertyType {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**@return{string}*/get mime() {return "text/plain; celastrinajs.core.property.StringPropertyType"}
    /**
     * @param {string} value
     * @return {Promise<null|string>}
     */
    async resolve(value) {return value;}
}
/**
 * BooleanPropertyType
 * @author Robert R Murrell
 */
class BooleanPropertyType extends PropertyType {
    /**
     * @brief
     * @param {string} name
     * @param {null|boolean} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**@return{string}*/get mime() {return "text/plain; celastrinajs.core.property.BooleanPropertyType";}
    /**
     * @brief
     * @param {string} value
     * @return {Promise<null|boolean>}
     */
    async resolve(value) {return (value.trim().toLowerCase() === "true");}
}
/**
 * PropertyConfig
 * @author Robert R Murrell
 */
class NumericPropertyType extends PropertyType {
    /**
     * @param {string} name
     * @param {null|number} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**@return{string}*/get mime() {return "text/plain; celastrinajs.core.property.NumericPropertyType"}
    /**
     * @param {string} value
     * @return {Promise<null|number>}
     */
    async resolve(value) {return Number(value);}
}
/**
 * PropertyConfig
 * @abstract
 * @author Robert R Murrell
 */
class PropertyConfig extends ConfigurationItem {
    /**@type{string}*/static CONFIG_PROPERTY = "celastrinajs.core.property.handler";
    /**@param{null|string}[name=null]*/
    constructor(name = null) {
        super();
        this._name = name;
    }
    /**@type{string}*/get key() {return PropertyConfig.CONFIG_PROPERTY};
    /**@return{string}*/get name(){return this._name}
    /**
     * @abstract
     * @return {PropertyManager}
     * @private
     */
    _createPropertyHandler(source) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @abstract
     * @return {string}
     */
    getName() {return "PropertyConfig";}
    /**
     * @param {PropertyManager} handler
     * @param {Object} source
     * @return {PropertyManager}
     * @private
     */
    _createCache(handler, source) {
        // Checking to see if there is a cache object.
        if(source.hasOwnProperty("cache") && typeof source.cache === "object" && source.cache != null) {
            // Getting the attributes for the cache.
            /**@type{CachedProperty}*/let cache = source.cache;
            if(!cache.hasOwnProperty("ttl") || typeof cache.ttl !== "number")
                throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.ttl");
            if(!cache.hasOwnProperty("unit") || typeof cache.unit !== "string" || cache.unit.length === 0)
                throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.unit");
            /**@type{Object}*/let overrides = {};
            if(cache.hasOwnProperty("overrides") && Array.isArray(cache.overrides)) {
                let overrides = cache.overrides;
                for(/**@type{{key:string, ttl:number, unit:moment.DurationInputArg2}}*/const ovr of overrides) {
                    if(!ovr.hasOwnProperty("key") || typeof ovr.key !== "string" || ovr.key.left === 0)
                        throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.overrides.key");
                    if(!ovr.hasOwnProperty("ttl") || typeof ovr.ttl !== "number")
                        throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.overrides.ttl");
                    if(!ovr.hasOwnProperty("unit") || typeof ovr.unit !== "string" || ovr.unit.length === 0)
                        throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.overrides.unit");
                    overrides[ovr.key] = new CachedProperty(ovr.ttl, ovr.unit);
                }
            }
            return new CachePropertyHandler(handler, cache.ttl, cache.unit, overrides);
        }
        else
            return handler;
    }
    /**@return{PropertyManager}*/
    createPropertyHandler() {
        let lname = this._name;
        if(typeof lname === "undefined" || lname == null)
            lname = PropertyConfig.CONFIG_PROPERTY;
        /**@type{string}*/let config = process.env[lname];
        if(typeof config === "string" && config.trim().length > 0) {
            /**@type{Object}*/let source = JSON.parse(config);
            return this._createCache(this._createPropertyHandler(source), source);
        }
        else
            throw CelastrinaError.newError("Invalid Configuration for property '" + lname + "'.");
    }
}
/**
 * AppConfigPropertyHandlerConfig
 * @author Robert R Murrell
 */
class AppConfigPropertyHandlerConfig extends PropertyConfig {
    constructor(name = "celastrinajs.core.property.appconfig.config"){super(name);}
    /**@return{string}*/getName() {return "AppConfigPropertyHandlerConfig";}
    /**
     * @param {{subscriptionId:string, resourceGroupName:string, configStoreName:string, label:null|undefined|string, useVault:null|undefined|boolean}} source
     * @return {PropertyManager}
     */
    _createPropertyHandler(source) {
        if(!source.hasOwnProperty("subscriptionId") || typeof source.subscriptionId !== "string" ||
                source.subscriptionId.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigPropertyHandlerConfig, missing 'subscriptionId'.", "subscriptionId");
        if(!source.hasOwnProperty("resourceGroupName") || typeof source.resourceGroupName !== "string" ||
                source.resourceGroupName.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigPropertyHandlerConfig, missing 'resourceGroupName'.", "resourceGroupName");
        if(!source.hasOwnProperty("configStoreName") || typeof source.configStoreName !== "string" ||
                source.configStoreName.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigPropertyHandlerConfig, missing 'configStoreName'.", "configStoreName");
        let _label = "development";
        let _useVault = false;
        if(source.hasOwnProperty("label") && typeof source.label === "string" && source.label.trim().length > 0)
            _label = source.label;
        if(source.hasOwnProperty("useVault") && typeof source.useVault === "boolean")
            _useVault = source.useVault;
        return new AppConfigPropertyManager(source.subscriptionId, source.resourceGroupName, source.configStoreName, _label, _useVault);
    }
}
/**
 * AppRegistrationAuthorizationProperty
 * @author Robert R Murrell
 */
class AppRegistrationAuthorizationProperty extends JsonPropertyType {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
        this._type = "ApplicationAuthorization";
    }
    /**
     * @return {string}
     * @abstract
     */
    get mime() {return "application/json; celastrinajs.core.property.AppRegistrationAuthorizationProperty"}
    /**
     * @param {string} value
     * @return {Promise<null|Object>}
     */
    async resolve(value) {
        let source = await super.resolve(value);
        if(source != null) {
            if(!source.hasOwnProperty("_authority")) throw CelastrinaError.newError("Invalid ApplicationAuthorization, _authority required.");
            if(!source.hasOwnProperty("_tenant")) throw CelastrinaError.newError("Invalid ApplicationAuthorization, _tenant required.");
            if(!source.hasOwnProperty("_id")) throw CelastrinaError.newError("Invalid ApplicationAuthorization, _id required.");
            if(!source.hasOwnProperty("_secret")) throw CelastrinaError.newError("Invalid ApplicationAuthorization, _secret required.");
            source = new AppRegistrationAuthorization(source._authority, source._tenant, source._id, source._secret);
        }
        return source;
    }
}
/** PropertyLoader */
class PropertyLoader {
    /**
     * @param {Object} object
     * @param {string} attribute
     * @param {PropertyType} property
     * @param {PropertyManager} handler
     * @return {Promise<void>}
     */
    static async load(object, attribute, property, handler) {
        object[attribute] = await property.load(handler);
    }
}
/**@abstract*/
class Module {
    /**@param{string}name*/
    constructor(name) {
        this._name = name;
    }
    /**@return{string}*/get name(){return this._name;}
    /**
     * @param {Configuration} config
     * @return{Promise<void>}
     * @abstract
     */
    async install(config) {throw CelastrinaError.newError("Not Implemented.", 501);}
}
/**@type{ConfigurationItem}*/
class ModuleConfiguration extends ConfigurationItem {
    /**@type{string}*/static CONFIG_MODULES = "celastrinajs.core.configuration.modules";
    constructor() {
        super();
        /**@type{empty|Array.<JsonPropertyType|Module>}*/this._modules = [];
    }
    /**@type{string}*/get key() {return ModuleConfiguration.CONFIG_MODULES}
    /**
     * @param {JsonPropertyType|Module} module
     * @return {ModuleConfiguration}
     */
    addModule(module){
        if(!(module instanceof Module) || !(module instanceof JsonPropertyType))
            throw CelastrinaValidationError.newValidationError("Argument 'module' is required.", "module");
        this._modules.unshift(module);
        return this;
    }
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async install(config) {
        /**@type{Array.<Promise<void>>}*/let promises = [];
        for (/**@type{Module}*/const module of this._modules) {
            promises.unshift(module.install(config));
        }
        await Promise.all(promises);
        /**@type{ModuleContext}*/let modcontext = config.getValue(ModuleContext.CONFIG_MODULE_CONTEXT);
        for(/**@type{Module}*/const module of this._modules) {
            modcontext.addModule(module);
        }
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
     * @return {Module}
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
    /**@return{string}*/get id(){return this._id;}
    /**@return{Array.<string>}*/get roles(){return this._roles;}
    /**@param{string}role*/
    addRole(role){this._roles.unshift(role);}
    /**@param{Array.<string>}roles*/
    addRoles(roles){this._roles = roles.concat(this._roles);}
    /**
     * @param {string} role
     * @return {Promise<boolean>}
     */
    async isInRole(role) {return this._roles.includes(role);}
}
/**
 * Configuration
 * @author Robert R Murrell
 */
class Configuration extends EventEmitter {
    /**@type{string}*/static CONFIG_NAME    = "celastrinajs.core.configuration.name";
    /**@type{string}*/static CONFIG_CONTEXT = "celastrinajs.core.configuration.context";
    /**@type{string}*/static PROP_LOCAL_DEV = "celastringjs.core.property.deployment.local.development";
    /**@param{StringPropertyType|string} name*/
    constructor(name) {
        super();
        if(typeof name === "string") {
            if(name.trim().length === 0) throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else if(!(name instanceof StringPropertyType)) throw CelastrinaError.newError("Invalid configuration. Name must be string or StringPropertyType.");
        this._config = {};
        /**@type{boolean}*/this._loaded = false;
        this._config[Configuration.CONFIG_CONTEXT] = null;
        this._config[PropertyConfig.CONFIG_PROPERTY] = null;
        this._config[Configuration.CONFIG_NAME] = name;
        this._config[ModuleContext.CONFIG_MODULE_CONTEXT] = new ModuleContext();
        this._config[ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT] = new ResourceAuthorizationContext();
    }
    /**@return{string}*/get name(){return this._config[Configuration.CONFIG_NAME];}
    /**@return{PropertyManager}*/get properties() {return this._config[PropertyConfig.CONFIG_PROPERTY];}
    /**@return{object}*/get values(){return this._config;}
    /**@return{_AzureFunctionContext}*/get context(){return this._config[Configuration.CONFIG_CONTEXT];}
    /**@return{boolean}*/get loaded(){return this._loaded;}
    /**@return{Promise<void>}*/
    async bootstrapped() {
        if(!this._loaded) {
            /**@type{null|ModuleConfiguration}*/let modconfig = this.getValue(ModuleConfiguration.CONFIG_MODULES);
            if(modconfig != null) {
                await modconfig.install(this);
                this._loaded = true;
            }
            else
                this._loaded = true;
        }
    }
    /**
     * @param {string} key
     * @param {*} value
     * @return {Configuration}
     */
    setValue(key , value) {
        if(typeof key !== "string" || key.trim().length === 0)
            throw CelastrinaError.newError("Invalid configuration. Key cannot be undefined, null or 0 length.");
        this._config[key] = value;
        return this;
    }
    /**
     * @param {ConfigurationItem} config
     * @return {Configuration}
     */
    setConfigurationItem(config) {this.setValue(config.key, config); return this;};
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @return {*}
     */
    getValue(key, defaultValue = null) {
        let value = this._config[key];
        if(typeof value === "undefined" || value == null) value = defaultValue;
        return value;
    }
    /**
     * @param {Object} obj
     * @param {Array.<Promise>} promises
     * @param {Object} azcontext
     * @param {PropertyManager} properties
     * @private
     */
    _load(obj, promises, azcontext, properties) {
        if(typeof obj === "object") {
            for(let prop in obj) {
                let local = obj[prop];
                if(typeof local !== "undefined" && local != null) {
                    if(local instanceof PropertyType) {
                        azcontext.log.verbose("[Configuration._load(obj, promises, azcontext)] Replacing '" + prop +
                                               "' with PropertyType '" + local.mime  + "', using key '" + local.name + "'.");
                        promises.unshift(PropertyLoader.load(obj, prop, local, properties));
                    }
                    else this._load(local, promises, azcontext, properties);
                }
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {PropertyManager}
     * @private
     */
    _getPropertyManager(azcontext) {
        /**@type{(undefined|null|PropertyManager)}*/let _manager = this._config[PropertyConfig.CONFIG_PROPERTY];
        if(typeof _manager === "undefined" || _manager == null) {
            azcontext.log.info("[Configuration._getPropertyManager(context)]: No property manager specified, defaulting to AppSettingsPropertyManager.");
            _manager = new AppSettingsPropertyManager();
            this._config[PropertyConfig.CONFIG_PROPERTY] = _manager;
        }
        else
            azcontext.log.info("[Configuration._getPropertyManager(context)]: Loading PropertyConfig '" + _manager.getName() + "'.");
        return _manager;
    }
    /**
     * @return {boolean}
     * @private
     */
    _isPropertyManagerOverridden() {
        let overridden = false;
        let deployment = /**@type{null|undefined|string}*/process.env[Configuration.PROP_LOCAL_DEV];
        if(typeof deployment === "string")
            overridden = (deployment.trim().toLowerCase() === "true");
        return overridden;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     */
    async initialize(azcontext) {
        azcontext.log.info("[Configuration.initialize(azcontext)]: Initializing configuration.");
        this._config[Configuration.CONFIG_CONTEXT] = azcontext;
        if(!this._loaded) {
            azcontext.log.info("[Configuration.initialize(azcontext)]: Configuration not loaded, loading and initializing.");
            /**@type{PropertyManager}*/let _manager = this._getPropertyManager(azcontext);

            if(this._isPropertyManagerOverridden()) {
                azcontext.log.warn("[Configuration.initialize(azcontext)]: Local development override, using AppSettingsPropertyManager.");
                _manager = new AppSettingsPropertyManager();
                this._config[PropertyConfig.CONFIG_PROPERTY] = _manager;
            }
            else if(_manager instanceof PropertyConfig) {
                azcontext.log.info("[Configuration.initialize(azcontext)]: Found PropertyConfig " + _manager.getName() + ", creating PropertyManager.");
                _manager = _manager.createPropertyHandler();
                azcontext.log.info("[Configuration.initialize(azcontext)]: PropertyManager " + _manager.getName() + " created.");
                this._config[PropertyConfig.CONFIG_PROPERTY] = _manager;
            }

            let _name = this._config[Configuration.CONFIG_NAME];
            if(typeof _name !== "string" || _name.trim().length === 0) {
                azcontext.log.error("[Configuration.load(azcontext)]: Invalid Configuration. Name cannot be undefined, null, or 0 length.");
                throw CelastrinaValidationError.newValidationError("Name cannot be undefined, null, or 0 length.", Configuration.CONFIG_NAME);
            }

            await _manager.initialize(azcontext, this._config);
            azcontext.log.info("[Configuration.load(azcontext)]: PropertyManager Initialization Successful.");
            await _manager.ready(azcontext, this._config);
            azcontext.log.info("[Configuration.initialize(azcontext)]: PropertyManager Ready, loading dynamic property types.");
            /**@type{Array.<Promise<void>>}*/let promises = [];
            this._load(this, promises, azcontext, _manager);
            await Promise.all(promises);
            azcontext.log.info("[Configuration.initialize(azcontext)]: Installing authorization and role configurations.");
            /**@type{null|ResourceAuthorizationConfiguration}*/let authconfig = this.getValue(ResourceAuthorizationConfiguration.CONFIG_RESOURCE_AUTH);
            if(authconfig != null) await authconfig.install(this);
            azcontext.log.info("[Configuration.initialize(azcontext)]: Configuration initialized and loaded.");
        }
        else
            azcontext.log.info("[Configuration.initialize(azcontext)]: Configuration loaded, initilization not required.");
    }
}
/**@abstract*/
class Algorithm {
    constructor(name){this._name = name;}
    /**@return{string}*/get name(){return this._name;}
    /**@return{Promise<void>}*/
    async initialize() {}
    /**@return{Promise<Cipher>}*/
    async createCipher(){throw CelastrinaError.newError("Not supported.");}
    /**@return{Promise<Decipher>}*/
    async createDecipher(){throw CelastrinaError.newError("Not supported.");}
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
    /**@return{Promise<Cipher>}*/
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
    /**@return{Promise<Decipher>}*/
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
    /**
     * @param {{key:string,iv:string}} options
     * @return{AES256Algorithm}
     */
    static create(options) {
        return new AES256Algorithm(options.key, options.iv);
    }
}
/** Cryptography */
class Cryptography {
    /**@param{Algorithm}algorithm*/
    constructor(algorithm){this._algorithm = algorithm;}
    /**@return{Promise<void>}*/
    async initialize() {
        return this._algorithm.initialize();
    }
    /**
     * @param {string} value
     * @return {Promise<string>}
     */
    async encrypt(value) {
        let cryp = await this._algorithm.createCipher();
        let encrypted = cryp.update(value, "utf8", "hex");
        encrypted += cryp.final("hex");
        encrypted  = Buffer.from(encrypted, "hex").toString("base64");
        return encrypted;
    }
    /**
     * @param {string} value Base64 encded HEX string.
     * @return {Promise<string>}
     */
    async decrypt(value) {
        let cryp = await this._algorithm.createDecipher();
        let encrypted = Buffer.from(value, "base64").toString("hex");
        let decrypted = cryp.update(encrypted, "hex", "utf8");
        decrypted += cryp.final("utf8");
        return decrypted;
    }
}
/**
 * @type {{TRACE: number, ERROR: number, VERBOSE: number, INFO: number, WARN: number}}
 */
const LOG_LEVEL = {TRACE: 0, VERBOSE: 1, INFO: 2, WARN: 3, ERROR: 4};
/**
 * MonitorResponse
 * @author Robert R Murrell
 */
class MonitorResponse {
    constructor() {
        this._passed = {};
        this._failed = {};
        this._passedCheck = false;
    }
    /**@return{Object}*/get passed(){return this._passed;}
    /**@return{Object}*/get failed(){return this._failed;}
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
    /**@return{string}*/
    get result() {
        if(this._passedCheck) return "FAILED";
        else return "PASSED";
    }
}
/**
 * RoleResolver
 * @abstract
 * @author Robert R Murrell
 */
class RoleResolver {
    constructor(){}
    /**
     * @param {BaseContext} context
     * @return {Promise<BaseSubject>}
     */
    async resolve(context) {
        return new Promise((resolve, reject) => {reject(CelastrinaError.newError("Not Implemented.", 501));});
    }
}
/**
 * BaseSentry
 * @author Robert R Murrell
 */
class BaseSentry {
    constructor() {}
    /**
     * @param {BaseContext} context
     * @return {Promise<BaseSubject>}
     */
    async authenticate(context) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async authorize(context) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<BaseSubject>}
     */
    async setRoles(context) {return context.subject;}
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async initialize(config) {}
}
/**
 * @author Robert R Murrell
 */
class BaseContext {
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Configuration} config
     */
    constructor(azcontext, config) {
        /**@type{string}*/this._requestId = uuidv4();
        /**@type{_AzureFunctionContext}*/this._azfunccontext = azcontext;
        /**@type{null|string}*/this._traceId = null;
        /**@type{boolean}*/this._monitor = false;
        /**@type{null|MonitorResponse}*/this._monitorResponse = null;
        /**@type{Configuration}*/this._config = config;
        /**@type{null|BaseSubject}*/this._subject = null;
        /**@type{string}*/this._action = "process";
        /**@type{null|BaseSentry}*/this._sentry = null;
        /**@type{*}*/this._result = null;
    }
    /**
     * @return {Promise<void>}
     */
    async initialize() {
        if(this._monitor)
            this._monitorResponse = new MonitorResponse();
        /** @type {{traceparent: string}} */
        let _traceContext = this._azfunccontext.traceContext;
        if(typeof _traceContext !== "undefined")
            this._traceId = _traceContext.traceparent;
    }
    /**@return{string}*/get name() {return this._config.name;}
    /**@return{Configuration}*/get config(){return this._config;}
    /**@return{*}*/get result() {return this._result;}
    /**@return{boolean}*/get isMonitorInvocation(){return this._monitor;}
    /**@return{null|MonitorResponse}*/get monitorResponse(){return this._monitorResponse;}
    /**@return{string}*/get invocationId(){return this._azfunccontext.bindingData.invocationId;}
    /**@return{string}*/get requestId(){return this._requestId;}
    /**@return{BaseSentry}*/get sentry(){return this._sentry;}
    /**@param{BaseSentry} sentry*/set sentry(sentry){this._sentry = sentry;}
    /**@return{BaseSubject}*/get subject(){return this._subject;}
    /**@param{BaseSubject} subject*/set subject(subject){this._subject = subject;}
    /**@return{string}*/get action(){return this._action;}
    /**@return{PropertyManager}*/get properties(){return this._config.properties;}
    /**@return{_AzureFunctionContext}*/get azureFunctionContext(){return this._azfunccontext;}
    /**@return{ModuleContext}*/get moduleContext() {return this._config.getValue(ModuleContext.CONFIG_MODULE_CONTEXT);}
    /**@return{ResourceAuthorizationContext}*/get authorizationContext() {return this._config.getValue(ResourceAuthorizationContext.CONFIG_RESOURCE_AUTH_CONTEXT);}
    /**@param{string}name*/getBinding(name){return this._azfunccontext.bindings[name];}
    /**
     * @param {string} name
     * @param {*} [value=null]
     */
    setBinding(name, value= null){this._azfunccontext.bindings[name] = value;}
    /**
     * @param {string} key
     * @param {*} [defaultValue=null]
     * @return {Promise<*>}
     */
    async getProperty(key, defaultValue = null){return this._config.properties.getProperty(key, defaultValue);}
    /**
     * @param {Object} message
     * @param {number} [level=LOG_LEVEL.INFO]
     * @param {null|string} [subject=null]
     */
    log(message = "[NO MESSAGE]", level = LOG_LEVEL.INFO, subject = null) {
        let out = "[" + this._config.name + "]";
        if(typeof subject === "string") out += "[" + subject + "]";
        out += "[" + this._azfunccontext.invocationId + "]:" + "[" + this._requestId + "]:" + message.toString();
        switch(level) {
            case LOG_LEVEL.ERROR:this._azfunccontext.log.error(out); break;
            case LOG_LEVEL.INFO:this._azfunccontext.log.info(out); break;
            case LOG_LEVEL.WARN:this._azfunccontext.log.warn(out); break;
            case LOG_LEVEL.VERBOSE:this._azfunccontext.log.verbose(out); break;
            default:this._azfunccontext.log(out);
        }
    }
    /**
     * @param {Object} object
     * @param {number} [level=LOG_LEVEL.INFO]
     * @param {null|string} [subject=null]
     */
    logObjectAsJSON(object, level = LOG_LEVEL.INFO, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }
    /**@param{*}[value=null]*/
    done(value = null) {this._result = value;}
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
     * @return {Promise<BaseSentry>}
     * @throws {CelastrinaError}
     */
    async createSentry(azcontext, config) {return new BaseSentry();}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Configuration} config
     * @return {Promise<BaseContext>}
     */
    async createContext(azcontext, config) {return new BaseContext(azcontext, config);}
    /**
      * @param {_AzureFunctionContext} azcontext
      * @return {Promise<void>}
      * @throws {CelastrinaError}
      */
    async bootstrap(azcontext) {
        await this._configuration.initialize(azcontext);
        /**@type{null|BaseSentry}*/let _sentry = await this.createSentry(azcontext, this._configuration);
        /**@type{null|BaseContext}*/let _context = await this.createContext(azcontext, this._configuration);
        await _context.initialize();
        await _sentry.initialize(this._configuration);
        this._context = _context;
        this._context.sentry = _sentry;
        await this._configuration.bootstrapped();
    }
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async initialize(context) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<BaseSubject>}
     */
    async authenticate(context) {
        context.subject = await context.sentry.authenticate(context);
        return await context.sentry.setRoles(context);
    }
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async authorize(context) {await context.sentry.authorize(context);}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async validate(context) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async monitor(context) {
        context.monitorResponse.addPassedDiagnostic("default", "Monitor not implemented.");
    }
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async load(context) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async process(context) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async save(context) {}
    /**
     * @param {BaseContext} context
     * @param {*} exception
     * @return {Promise<void>}
     */
    async exception(context, exception) {}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async terminate(context) {}
    /**
      * @brief Method called by the Azure Function to execute the lifecycle.
      * @param {_AzureFunctionContext} context The context of the function.
      */
    async execute(context) {
        context.log.info("[" + context.bindingData.invocationId + "][BaseFunction.execute(context)]: Lifecycle started.");
        try {
            await this.bootstrap(context);
            await this.initialize(this._context);
            this._context.subject = await this.authenticate(this._context);
            await this.authorize(this._context);
            await this.validate(this._context);
            await this.load(this._context);
            if(this._context.isMonitorInvocation)
                await this.monitor(this._context);
            else
                await this.process(this._context);
            await this.save(this._context);
        }
        catch(exception) {
            try {
                context.log.warn("[" + context.bindingData.invocationId + "][BaseFunction.execute(context)]: Exception Lifecycle.");
                await this.exception(this._context, exception);
            }
            catch(_exception) {
                let _ex = this._unhandled(context, _exception);
                context.log.error("[" + context.bindingData.invocationId + "][BaseFunction.execute(context)]: Exception thrown from Exception lifecycle: " +
                                  _ex  + ", caused by " + exception + ". ");
            }
        }
        finally {
            try {
                await this.terminate(this._context);
                context.log.info("[" + context.bindingData.invocationId + "][BaseFunction.execute(context)]: Lifecycle completed.");
                if(this._context.result == null)
                    context.done();
                else
                    context.done(this._context.result);
            }
            catch(exception) {
                let _ex = this._unhandled(context, exception);
                context.log.error("[" + context.bindingData.invocationId + "][BaseFunction.execute(context)]: Exception thrown from Terminate lifecycle: " +
                                  _ex  + ". ");
                _ex.drop? context.done() :  context.done(_ex);
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} context
     * @param {exception|Error|CelastrinaError|*} exception
     * @private
     */
    _unhandled(context, exception) {
        /**@type{exception|Error|CelastrinaError|*}*/let ex = exception;
        if(typeof ex === "undefined" || ex == null) ex = CelastrinaError.newError("Unhandled server error.");
        else if(!(ex instanceof CelastrinaError)) {
            if(ex instanceof Error) ex = CelastrinaError.wrapError(ex);
            else ex = CelastrinaError.newError(ex);
        }
        context.log.error("[BaseFunction._unhandled(context, exception)][exception](MESSAGE:" + ex.message + ") \r\n (STACK:" + ex.stack + ") \r\n (CAUSE:" + ex.cause + ")");
        return ex;
    }
}
module.exports = {
    CelastrinaError: CelastrinaError,
    CelastrinaValidationError: CelastrinaValidationError,
    ConfigurationItem: ConfigurationItem,
    ResourceAuthorization: ResourceAuthorization,
    ManagedIdentityAuthorization: ManagedIdentityAuthorization,
    AppRegistrationAuthorization: AppRegistrationAuthorization,
    ResourceAuthorizationContext: ResourceAuthorizationContext,
    ResourceAuthorizationConfiguration: ResourceAuthorizationConfiguration,
    Vault: Vault,
    PropertyHandler: PropertyManager,
    AppSettingsPropertyHandler: AppSettingsPropertyManager,
    AppConfigPropertyHandler: AppConfigPropertyManager,
    CachedProperty: CachedProperty,
    CachePropertyHandler: CachePropertyHandler,
    AppConfigHandlerProperty: AppConfigPropertyHandlerConfig,
    PropertyType: PropertyType,
    StringPropertyType: StringPropertyType,
    BooleanPropertyType: BooleanPropertyType,
    NumericPropertyType: NumericPropertyType,
    JsonPropertyType: JsonPropertyType,
    ModuleConfiguration: ModuleConfiguration,
    ModuleContext: ModuleContext,
    Module: Module,
    ApplicationAuthorization: AppRegistrationAuthorization,
    AppRegistrationAuthorizationProperty: AppRegistrationAuthorizationProperty,
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
