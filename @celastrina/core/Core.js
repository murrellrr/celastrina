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
    /**
     * @return {string}
     * @abstract
     */
    get key() {throw CelastrinaError.newError("Not Implemented.", 501);}
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
     * @abstract
     */
    async _resolve(resource) { throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {string} resource
     * @return {Promise<string>}
     * @private
     */
    async _refresh(resource) {
        let token = await this._resolve(resource);
        if(this._skew !== 0) token.expires.add(this._skew, "seconds");
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
            return await this._refresh(resource);
        else
            return token.token;
    }
}
/**
 * ManagedIdentityResource
 * @author Robert R Murrell
 */
class ManagedIdentityResource extends ResourceAuthorization {
    /**@type{string}*/static SYSTEM_MANAGED_IDENTITY = "celastrinajs.core.system.managed.identity";
    /**@param {number}[skew=0]*/
    constructor(skew = 0) {
        super(ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY, skew);
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
 * AppRegistrationResource
 * @author Robert R Murrell
 */
class AppRegistrationResource extends ResourceAuthorization {
    /**
     * @param {string} id
     * @param {string} authority
     * @param {string} tenant
     * @param {string} secret
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
 * ResourceManager
 */
class ResourceManager {
    constructor() {
        this._resources = {};
    }
    /**@return{Object}*/get authorizations() {return this._resources;}
    /**
     * @param {ResourceAuthorization} auth
     * @return {ResourceManager}
     */
    async addResource(auth) {
        this._resources[auth.id] = auth;
        return this;
    }
    /**
     * @param {string} id
     * @return {Promise<ResourceAuthorization>}
     */
    async getResource(id = ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY) {
        let _auth = this._resources[id];
        if(typeof _auth === "undefined" || _auth == null)
            throw CelastrinaError.newError("Not authorized.", 401);
        return _auth;
    }
    /**
     * @param {string} resource
     * @param {string} id
     * @return {Promise<string>}
     */
    async getToken(resource, id = ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY) {
        /**@type{ResourceAuthorization}*/let _auth = await this.getResource(id);
        return await _auth.getToken(resource);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {}
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
    get name() {return "PropertyManager";}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {}
    /**
     * @param {string} key
     * @return {null|*}
     * @abstract
     */
    async _getProperty(key) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {string} key
     * @param {(null|*)} defaultValue
     * @return {{value: (null|*), defaulted: boolean}}
     * @private
     */
    async _getPropertyOrDefault(key, defaultValue = null){
        let value = await this._getProperty(key);
        if(typeof value === "undefined" || value == null) return {value: defaultValue, defaulted: true};
        else return {value: value, defaulted: false};
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue = null]
     * @param {(null|StringConstructor|BooleanConstructor|NumberConstructor|ObjectConstructor|DateConstructor|
     *          RegExpConstructor|ErrorConstructor|ArrayConstructor|ArrayBufferConstructor|DataViewConstructor|
     *          Int8ArrayConstructor|Uint8ArrayConstructor|Uint8ClampedArrayConstructor|Int16ArrayConstructor|
     *          Uint16ArrayConstructor|Int32ArrayConstructor|Uint32ArrayConstructor|Float32ArrayConstructor|
     *          Float64ArrayConstructor|FunctionConstructor|function(...*))} [type = String]
     * @return {null|*}
     */
    async _getConvertProperty(key, defaultValue = null, type = null) {
        let _response = await this._getPropertyOrDefault(key, defaultValue);
        if(_response.defaulted) return _response.value;
        else return type(_response.value);
    }
    /**
     * @param {string} key
     * @param {null|string} [defaultValue = null]
     * @return {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        let _response = await this._getPropertyOrDefault(key, defaultValue);
        return _response.value;
    }
    /**
     * @param {string} key
     * @param {null|string|RegExp} [defaultValue = false]
     * @return {Promise<null|RegExp>}
     */
    async getRegExp(key, defaultValue = /.*/g) {
        return this._getConvertProperty(key, defaultValue, RegExp);
    }
    /**
     * @param {string} key
     * @param {null|boolean} [defaultValue = false]
     * @return {Promise<null|boolean>}
     */
    async getBoolean(key, defaultValue = false) {
        return this._getConvertProperty(key, defaultValue, Boolean);
    }
    /**
     * @param {string} key
     * @param {null|number} [defaultValue = Number.NaN]
     * @return {Promise<null|number>}
     */
    async getNumber(key, defaultValue = Number.NaN) {
        return this._getConvertProperty(key, defaultValue, Number);
    }
    /**
     * @param {string} key
     * @param {null|Date} [defaultValue = new Date()]
     * @return {Promise<null|Date>}
     */
    async getDate(key, defaultValue = new Date()) {
        return this._getConvertProperty(key, defaultValue, PropertyManager._createDateFromString);
    }
    /**
     * @param {string} key
     * @param {Object} [defaultValue = null]
     * @param {function(*)} [factory]
     * @return {Promise<Object>}
     */
    async getObject(key, defaultValue = null, factory = null) {
        let _object = await this._getConvertProperty(key, defaultValue, JSON.parse);
        if(_object != null && factory != null) {
            if(Array.isArray(factory)) _object = factory[0](_object);
            else _object = factory(_object);
        }
        return _object;
    }
    /**
     * @param {string} key
     * @param {("property"|"string"|"date"|"regexp"|"number"|"boolean"|"object")} typename
     * @param {(null|*)} defaultValue
     * @param {function((null|*))} factory
     * @return {Promise<void>}
     */
    async getTypedProperty(key, typename = "property", defaultValue = null, factory = null) {
        switch(typename) {
            case "property":
                return this.getProperty(key, defaultValue);
            case "string":
                return this.getProperty(key, defaultValue);
            case "date":
                return this.getDate(key, defaultValue);
            case "regexp":
                return this.getRegExp(key, defaultValue);
            case "number":
                return this.getNumber(key, defaultValue);
            case "boolean":
                return this.getBoolean(key, defaultValue);
            case "object":
                return this.getObject(key, defaultValue, factory);
            default:
                throw CelastrinaError.newError("Property type '" + typename + "' is invalid.", 400);
        }
    }
    /**
     * @param {string} dateTimeString
     * @private
     * @return {Date}
     */
    static _createDateFromString(dateTimeString) {
        return new Date(dateTimeString);
    }
}
/**
 * AppSettingsPropertyManager
 * @author Robert R Murrell
 */
class AppSettingsPropertyManager extends PropertyManager {
    constructor(){super();}
    /**@return{string}*/get name() {return "AppSettingsPropertyManager";}
    /**
     * @param {string} key
     * @return {Promise<*>}
     */
    async _getProperty(key) {
        return process.env[key];
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
                label = "development", useVaultSecrets = true) {
        super();
        this._label = label;
        this._endpoint = "https://management.azure.com/subscriptions/" + subscriptionId +
                    "/resourceGroups/" + resourceGroupName + "/providers/Microsoft.AppConfiguration/configurationStores/" +
                    configStoreName + "/listKeyValue?api-version=2019-10-01";
        /** @type {ManagedIdentityResource} */this._auth = null;
        /** @type{boolean} */this._useVaultSecrets = useVaultSecrets;
        if(this._useVaultSecrets)
            /** @type{Vault} */this._vault = new Vault();
    }
    /**@return{string}*/name() {return "AppConfigPropertyManager";}
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
            azcontext.log.verbose("[AppConfigPropertyManager.initialize(azcontext, config)]: ManagedIdentityResource created.");
            this._auth = new ManagedIdentityResource();
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {
        azcontext.log.info("[AppConfigPropertyManager.ready(azcontext, config)]: Added ManagedIdentityResource to authorization context.");
        config[Configuration.CONFIG_RESOURCE].addResource(this._auth);
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
     * @return {Promise<*>}
     */
    async _getProperty(key) {
        try {
            return await this._getAppConfigProperty(key);
        }
        catch(exception) {
            if(exception.code === 404)
                return await super._getProperty(key);
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
     * @param {*} value
     * @param {number} [time=300]
     * @param {moment.DurationInputArg2} [unit="s"]
     */
    constructor(value, time = 300, unit = "s") {
        /**@type{*}*/this._value = value;
        this._time = time;
        /**@type{moment.DurationInputArg2} */this._unit = unit;
        /**@type{(null|moment.Moment)}*/this._expires = moment().add(this._time, this._unit);
        /**@type{(null|moment.Moment)}*/this._lastUpdate = moment();
    }
    /**@return{(null|moment.Moment)}*/get expires(){return this._expires;}
    /**@return{(null|moment.Moment)}*/get lastUpdated(){return this._lastUpdate;}
    /**@return{*}*/get value(){return this._value;}
    /**@param{*}value*/
    set value(value) {
        this._value = value;
        this._lastUpdate = moment();
        if(this._time === 0 || value == null) this._expires = null;
        else this._expires = moment().add(this._time, this._unit);
    }
    /**@return{boolean}*/
    get isExpired() {
        if(this._expires == null) return true;
        else return (moment().isSameOrAfter(this._expires));
    }
    /**@return{Promise<void>}*/
    async clear() {this._value = null; this._expires = null;}
}
/**
 * CachedPropertyManager
 * @author Robert R Murrell
 */
class CachedPropertyManager extends PropertyManager {
    /**
     * @param {PropertyManager} [manager=new AppSettingsPropertyManager()]
     * @param {number} [defaultTime=300]
     * @param {moment.DurationInputArg2} [defaultUnit="s"]
     */
    constructor(manager = new AppSettingsPropertyManager(), defaultTime = 300,
                defaultUnit = "s") {
        super();
        /**@type{PropertyManager}*/this._manager = manager;
        this._cache = {};
        this._defaultTime = defaultTime;
        /**@type{moment.DurationInputArg2}*/this._defaultUnit = defaultUnit;
    }
    /**@return{string}*/get name() {return "CachedPropertyManager(" + this._manager.name + ")";}
    /**@return{PropertyManager}*/get manager(){return this._manager;}
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
        azcontext.log.verbose("[CachedPropertyManager.ready(context, config, force)]: Caching ready.");
        return this._manager.ready(azcontext, config);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {
        azcontext.log.verbose("[CachedPropertyManager.initialize(context, config)]: Caching initialized.");
        return this._manager.initialize(azcontext, config);
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
     * @param {*} defaultValue
     * @param {string} func
     * @param {...*} args
     * @return {Promise<*>}
     * @private
     */
    async _getCache(key, defaultValue, func, ...args) {
        let cached  = this._cache[key];
        if(!(cached instanceof CachedProperty)) {
            let _value =await this._manager[func](key, defaultValue, args);
            if(_value != null) this._cache[key] =  new CachedProperty(_value, this._defaultTime, this._defaultUnit);
            return _value;
        }
        else if(cached.isExpired) {
            let _value =await this._manager[func](key, defaultValue, args);
            if(_value != null) cached.value = _value;
            return _value;
        }
        else
            return cached.value;
    }
    /**
     * @param {string} key
     * @param {*} [defaultValue = null]
     * @param {(null|StringConstructor|BooleanConstructor|NumberConstructor|ObjectConstructor|DateConstructor|
     *          RegExpConstructor|ErrorConstructor|ArrayConstructor|ArrayBufferConstructor|DataViewConstructor|
     *          Int8ArrayConstructor|Uint8ArrayConstructor|Uint8ClampedArrayConstructor|Int16ArrayConstructor|
     *          Uint16ArrayConstructor|Int32ArrayConstructor|Uint32ArrayConstructor|Float32ArrayConstructor|
     *          Float64ArrayConstructor|FunctionConstructor|function(...*))} [type = String]
     * @return {Promise<*>}
     */
    async _getConvertProperty(key, defaultValue = null, type) {
        return super._getConvertProperty(key, defaultValue, type);
    }
    /**
     * @param {string} key
     * @return {Promise<*>}
     * @abstract
     */
    async _getProperty(key) {
        return super._getProperty(key);
    }
    /**
     * @param {string} key
     * @param {null|string} [defaultValue = null]
     * @return {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        return this._getCache(key, defaultValue, "getProperty");
    }
    /**
     * @param {string} key
     * @param {null|string|RegExp} [defaultValue = false]
     * @return {Promise<null|RegExp>}
     */
    async getRegExp(key, defaultValue = /.*/g) {
        return this._getCache(key, defaultValue, "getRegExp");
    }
    /**
     * @param {string} key
     * @param {null|boolean} [defaultValue = false]
     * @return {Promise<null|boolean>}
     */
    async getBoolean(key, defaultValue = false) {
        return this._getCache(key, defaultValue, "getBoolean");
    }
    /**
     * @param {string} key
     * @param {null|number} [defaultValue = Number.NaN]
     * @return {Promise<null|number>}
     */
    async getNumber(key, defaultValue = Number.NaN) {
        return this._getCache(key, defaultValue, "getNumber");
    }
    /**
     * @param {string} key
     * @param {null|Date} [defaultValue = new Date()]
     * @return {Promise<null|Date>}
     */
    async getDate(key, defaultValue = new Date()) {
        return this._getCache(key, defaultValue, "getDate");
    }
    /**
     * @param {string} key
     * @param {Object} [defaultValue = null]
     * @param {function(*)} [construct]
     * @return {Promise<Object>}
     */
    async getObject(key, defaultValue = null, construct = null) {
        return this._getCache(key, defaultValue, "getObject", construct);
    }
    /**
     * @param {string} key
     * @param {("property"|"string"|"date"|"regexp"|"number"|"boolean"|"object")} typename
     * @param {(null|*)} defaultValue
     * @param {function((null|*))} factory
     * @return {Promise<void>}
     */
    async getTypedProperty(key, typename = "property", defaultValue = null, factory = null) {
        return super.getTypedProperty(key, typename, defaultValue, factory);
    }
}
/**
 * PropertyManagerFactory
 * @abstract
 * @author Robert R Murrell
 */
class PropertyManagerFactory extends ConfigurationItem {
    /**@param{(null|string)}[name=null]*/
    constructor(name = null) {
        super();
        this._name = name;
    }
    /**@type{string}*/get key() {return Configuration.CONFIG_PROPERTY};
    /**@return{string}*/get name(){return this._name}
    /**
     * @abstract
     * @return {PropertyManager}
     * @private
     */
    _createPropertyManager(source) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @abstract
     * @return {string}
     */
    getName() {return "PropertyManagerFactory";}
    /**
     * @param {PropertyManager} manager
     * @param {Object} source
     * @return {PropertyManager}
     * @private
     */
    _createCache(manager, source) {
        if(source.hasOwnProperty("cache") && typeof source.cache === "object" && source.cache != null) {
            /**@type{CachedProperty}*/let cache = source.cache;
            if(!cache.hasOwnProperty("ttl") || typeof cache.ttl !== "number")
                throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.ttl");
            if(!cache.hasOwnProperty("unit") || typeof cache.unit !== "string" || cache.unit.length === 0)
                throw CelastrinaValidationError.newValidationError("Invalid Cache Configuration.", "cache.unit");
            return new CachedPropertyManager(manager, cache.ttl, cache.unit);
        }
        else
            return manager;
    }
    /**
     * @return{PropertyManager}
     */
    createPropertyManager() {
        let lname = this._name;
        if(typeof lname === "undefined" || lname == null)
            lname = PropertyManagerFactory.CONFIG_PROPERTY;
        /**@type{string}*/let config = process.env[lname];
        if(typeof config === "string" && config.trim().length > 0) {
            /**@type{Object}*/let source = JSON.parse(config);
            return this._createCache(this._createPropertyManager(source), source);
        }
        else
            throw CelastrinaError.newError("Invalid Configuration for property '" + lname + "'.");
    }
}
/**
 * AppConfigPropertyManagerFactory
 * @author Robert R Murrell
 */
class AppConfigPropertyManagerFactory extends PropertyManagerFactory {
    constructor(name = "celastrinajs.core.property.appconfig.config"){super(name);}
    /**@return{string}*/getName() {return "AppConfigPropertyManagerFactory";}
    /**
     * @param {{subscriptionId:string, resourceGroupName:string, configStoreName:string, label:(null|undefined|string),
     *          useVault:(null|undefined|boolean)}} source
     * @return {PropertyManager}
     */
    _createPropertyManager(source) {
        if(!source.hasOwnProperty("subscriptionId") || typeof source.subscriptionId !== "string" ||
                source.subscriptionId.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigPropertyManagerFactory, missing 'subscriptionId'.", "subscriptionId");
        if(!source.hasOwnProperty("resourceGroupName") || typeof source.resourceGroupName !== "string" ||
                source.resourceGroupName.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigPropertyManagerFactory, missing 'resourceGroupName'.", "resourceGroupName");
        if(!source.hasOwnProperty("configStoreName") || typeof source.configStoreName !== "string" ||
                source.configStoreName.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid AppConfigPropertyManagerFactory, missing 'configStoreName'.", "configStoreName");
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
 * Configuration
 * @author Robert R Murrell
 */
class Configuration {
    /**@type{string}*/static CONFIG_NAME    = "celastrinajs.core.configuration.name";
    /**@type{string}*/static CONFIG_CONTEXT = "celastrinajs.core.configuration.context";
    /**@type{string}*/static CONFIG_PROPERTY = "celastrinajs.core.property.manager";
    /**@type{string}*/static PROP_LOCAL_DEV = "celastringjs.core.property.deployment.local.development";
    /**@type{string}*/static CONFIG_PERMISSION = "celastrinajs.core.permission";
    /**@type{string}*/static CONFIG_RESOURCE = "celastrinajs.core.resource";
    /**@type{string}*/static CONFIG_AUTHORIATION_OPTIMISTIC = "celastrinajs.core.authorization.optimistic";
    /**@type{string}*/static CONFIG_AUTHORIATION_ROLE_FACTORY = "celastrinajs.core.authorization.role.factory";
    /**@param{string} name*/
    constructor(name) {
        if(typeof name === "string") {
            if(name.trim().length === 0)
                throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else throw CelastrinaError.newError("Invalid configuration. Name must be string.");
        /**@type{Object}*/this._config = {};
        /**@type{boolean}*/this._loaded = false;
        this._config[Configuration.CONFIG_CONTEXT] = null;
        this._config[Configuration.CONFIG_PROPERTY] = new AppSettingsPropertyManager();
        this._config[Configuration.CONFIG_NAME] = name;
        this._config[Configuration.CONFIG_RESOURCE] = new ResourceManager();
        this._config[Configuration.CONFIG_PERMISSION] = new PermissionManager();
        this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = false;
        this._config[Configuration.CONFIG_AUTHORIATION_ROLE_FACTORY] = new BaseRoleFactory();
    }
    /**@return{string}*/get name(){return this._config[Configuration.CONFIG_NAME];}
    /**@return{PropertyManager}*/get properties() {return this._config[Configuration.CONFIG_PROPERTY];}
    /**@return{Object}*/get values(){return this._config;}
    /**@return{_AzureFunctionContext}*/get context(){return this._config[Configuration.CONFIG_CONTEXT];}
    /**@return{boolean}*/get loaded(){return this._loaded;}
    /**@return{PermissionManager}*/get permissions() {return this._config[Configuration.CONFIG_PERMISSION];}
    /**@return{RoleFactory}*/get roleFactory() {return this._config[Configuration.CONFIG_AUTHORIATION_ROLE_FACTORY];}
    /**@return{ResourceManager}*/get resources() {return this._config[Configuration.CONFIG_RESOURCE];}
    /**@return{boolean}*/get authorizationOptimistic() {return this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC];};
    /**
     * @param {boolean} optimistic
     * @return {Configuration}
     */
    setAuthorizationOptimistic(optimistic) {
        this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = optimistic;
        return this;
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
     * @return {boolean}
     * @private
     */
    _OverridePropertyManager() {
        let overridden = false;
        let development = /**@type{(null|undefined|string)}*/process.env[Configuration.PROP_LOCAL_DEV];
        if(typeof development === "string")
            overridden = (development.trim().toLowerCase() === "true");
        return overridden;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {PermissionManager}
     * @private
     */
    _getPermissionManager(azcontext) {
        /**@type{(undefined|null|PermissionManager)}*/let _manager = this._config[Configuration.CONFIG_PERMISSION];
        if(typeof _manager === "undefined" || _manager == null) {
            azcontext.log.info("[Configuration._getPermissionManager(azcontext)]: No permission manager specified, defaulting to PermissionManager.");
            _manager = new PermissionManager();
            this._config[Configuration.CONFIG_PERMISSION] = _manager;
        }
        return _manager;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {ResourceManager}
     * @private
     */
    _getResourceManager(azcontext) {
        /**@type{(undefined|null|ResourceManager)}*/let _manager = this._config[Configuration.CONFIG_RESOURCE];
        if(typeof _manager === "undefined" || _manager == null) {
            azcontext.log.info("[Configuration._getResourceManager(azcontext)]: No resource manager specified, defaulting to ResourceManager.");
            _manager = new ResourceManager();
            this._config[Configuration.CONFIG_RESOURCE] = _manager;
        }
        return _manager;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {PropertyManager}
     * @private
     */
    _getPropertyManager(azcontext) {
        if(this._OverridePropertyManager()) {
            azcontext.log.warn("[Configuration._getPropertyManager(azcontext)]: Local development override, using AppSettingsPropertyManager.");
            return new AppSettingsPropertyManager();
        }
        else {
            /**@type{(undefined|null|PropertyManager)}*/let _manager = this._config[Configuration.CONFIG_PROPERTY];
            if(typeof _manager === "undefined" || _manager == null) {
                azcontext.log.info("[Configuration._getPropertyManager(azcontext)]: No property manager specified, defaulting to AppSettingsPropertyManager.");
                _manager = new AppSettingsPropertyManager();
                this._config[Configuration.CONFIG_PROPERTY] = _manager;
            }
            else if(_manager instanceof PropertyManagerFactory) {
                azcontext.log.info("[Configuration._getPropertyManager(azcontext)]: Found PropertyManagerFactory " + _manager.name + ", creating PropertyManager.");
                _manager = _manager.createPropertyManager();
                azcontext.log.info("[Configuration._getPropertyManager(azcontext)]: PropertyManager " + _manager.name + " created.");
                this._config[PropertyManagerFactory.CONFIG_PROPERTY] = _manager;
            }
            return _manager;
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     */
    async initialize(azcontext) {
        azcontext.log.info("[Configuration.initialize(azcontext)]: Preparing configuration.");
        this._config[Configuration.CONFIG_CONTEXT] = azcontext;
        if(!this._loaded) {
            azcontext.log.info("[Configuration.initialize(azcontext)]: Configuration not loaded, initializing.");
            /**@type{PropertyManager}*/let _pm = this._getPropertyManager(azcontext);
            /**@type{ResourceManager}*/let _rm = this._getResourceManager(azcontext);
            /**@type{PermissionManager}*/let _prm = this._getPermissionManager(azcontext);
            let _name = this._config[Configuration.CONFIG_NAME];
            if(typeof _name !== "string" || _name.trim().length === 0) {
                azcontext.log.error("[Configuration.load(azcontext)]: Invalid Configuration. Name cannot be undefined, null, or 0 length.");
                throw CelastrinaValidationError.newValidationError("Name cannot be undefined, null, or 0 length.", Configuration.CONFIG_NAME);
            }
            await _pm.initialize(azcontext, this._config);
            azcontext.log.info("[Configuration.load(azcontext)]: PropertyManager Initialized.");
            await _pm.ready(azcontext, this._config);
            azcontext.log.info("[Configuration.initialize(azcontext)]: PropertyManager Ready.");

            // TODO: Run the configuration loader if its present.

            await _prm.initialize(azcontext, this._config);
            azcontext.log.info("[Configuration.load(azcontext)]: PermissionManager Initialized.");
            await _prm.ready(azcontext, this._config);
            azcontext.log.info("[Configuration.initialize(azcontext)]: PermissionManager Ready.");
            await _rm.initialize(azcontext, this._config);
            azcontext.log.info("[Configuration.load(azcontext)]: ResourceManager Initialized.");
            await _rm.ready(azcontext, this._config);
            azcontext.log.info("[Configuration.initialize(azcontext)]: ResourceManager Ready.");
            azcontext.log.info("[Configuration.initialize(azcontext)]: Initialization successful.");
        }
        else
            azcontext.log.info("[Configuration.initialize(azcontext)]: Configuration loaded, initilization not required.");
    }
    /**
     * @return{Promise<void>}
     */
    async ready() {this._loaded = true;}
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
 * @type {{TRACE: number, ERROR: number, VERBOSE: number, INFO: number, WARN: number, THREAT: number}}
 */
const LOG_LEVEL = {TRACE: 0, VERBOSE: 1, INFO: 2, WARN: 3, ERROR: 4, THREAT: 5};
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
 * ValueMatch
 * @abstract
 * @author Robert R Murrell
 */
class ValueMatch {
    /**
     * @brief
     * @param {string} [type]
     */
    constructor(type = "ValueMatch"){this._type = type}
    /** @return {string} */get type(){return this._type;}
    /**
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @return {Promise<boolean>}
     * @abstract
     */
    async isMatch(assertion, values) {
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
}
/**
 * MatchAny
 * @author Robert R Murrell
 */
class MatchAny extends ValueMatch {
    constructor(){super("MatchAny");}
    /**
     * @brief A role in assertion can match a role in values and pass.
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @return {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        let match = false;
        for(const role of assertion) {
            if((match = values.includes(role))) break;
        }
        return match;
    }
}
/**
 * MatchAll
 * @author Robert R Murrell
 */
class MatchAll extends ValueMatch {
    constructor(){super("MatchAll");}
    /**
     * @brief All roles in assertion must match all roles in values.
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @return {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        let match = false;
        for(const role of values) {
            if(!(match = assertion.includes(role))) break;
        }
        return match;
    }
}
/**
 * MatchNone
 * @author Robert R Murrell
 */
class MatchNone extends ValueMatch {
    constructor(){super("MatchNone");}
    /**
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @return {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        let match = false;
        for(const role of values) {
            if((match = assertion.includes(role))) break;
        }
        return !match;
    }
}
/**
 * Permission
 * @author Robert R Murrell
 */
class Permission {
    /**
     * @param {string} action
     * @param {Array.<string>} roles
     * @param {ValueMatch} [match]
     */
    constructor(action, roles = [], match = new MatchAny()) {
        this._roles = roles;
        this._action = action.toLowerCase();
        this._match = match;
    }
    /**@return{string}*/get action(){return this._action;}
    /**@return{Array<string>}*/get roles(){return this._roles;}
    /**
     * @param {string} role
     * @return {Permission}
     */
    addRole(role){this._roles.unshift(role); return this;}
    /**
     * @param {Array.<string>} roles
     * @return {Permission}
     */
    addRoles(roles){this._roles = roles.concat(this._roles); return this;}
    /**
     * @param {BaseSubject} subject
     * @return {Promise<boolean>}
     */
    async authorize(subject) {
        return this._match.isMatch(subject.roles, this._roles);
    }
}
/**
 * @author Robert R Murrell
 */
class PermissionManager {
    constructor() {
        /**@type{Object}*/this._permissions = {};
    }
    /**@return{Object}*/get permissions() {return this._permissions;}
    /**
     * @param {Permission} perm
     * @return {PermissionManager}
     */
    addPermission(perm) {
        this._permissions[perm.action] = perm;
        return this;
    }
    /**
     * @param {string} action
     * @return {Permission}
     */
    getPermission(action) {
        /**@type{Permission}*/let _perm = this._permissions[action];
        if(typeof _perm === "undefined") _perm = null;
        return _perm;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {}
}
/**
 * BaseRoleFactory
 * @abstract
 * @author Robert R Murrell
 */
class RoleFactory {
    constructor() {}
    /**
     * @param {BaseContext} context
     * @param {BaseSubject} subject
     * @abstract
     * @return {Promise<Array.<string>>}
     */
    async getSubjectRoles(context, subject) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async initialize(config) {};
}
/**
 * BaseRoleFactory
 * @author Robert R Murrell
 */
class BaseRoleFactory extends RoleFactory {
    constructor() {super()}
    /**
     * @param {BaseContext} context
     * @param {BaseSubject} subject
     * @return {Promise<Array.<string>>}
     */
    async getSubjectRoles(context, subject) {
        return [];
    }
}
/**
 * BaseSubject
 * @author Robert R Murrell
 */
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
    /**@param{Array.<string>}roles*/set roles(roles) {this._roles = roles;}
    /**
     * @param {string} role
     * @return {BaseSubject}
     */
    addRole(role){this._roles.unshift(role); return this;}
    /**
     * @param {Array.<string>} roles
     * @return {BaseSubject}
     */
    addRoles(roles){this._roles = roles.concat(this._roles); return this;}
    /**
     * @param {string} role
     * @return {Promise<boolean>}
     */
    async isInRole(role) {return this._roles.includes(role);}
}
/**
 * BaseSentry
 * @author Robert R Murrell
 */
class BaseSentry {
    constructor() {
        /**@type{boolean}*/this._optimistic = false;
        /**@type{PermissionManager}*/this._permissions = null;
        /**@type{RoleFactory}*/this._roleResolver = null;
    }
    /**
     * @param {BaseContext} context
     * @return {Promise<BaseSubject>}
     */
    async createSubject(context) {
        return new BaseSubject(context.requestId);
    }
    /**
     * @param {BaseContext} context
     * @return {Promise<BaseSubject>}
     */
    async authenticate(context) {
        let _subject = await this.createSubject(context)
        _subject.addRoles(await this._roleResolver.getSubjectRoles(context, _subject));
        return _subject;
    }
    /**
     * @param {BaseContext} context
     * @param {BaseSubject} subject
     * @return {Promise<void>}
     */
    async authorize(context, subject) {
        /**@type{Permission}*/let _permission = this._permissions.getPermission(context.action);
        if(typeof _permission === "undefined" || _permission == null) {
            if(!this._optimistic) {
                context.log("No permission found for action '" + context.action +
                                    "' and authorization was set to pessimistic, subject '" + subject.id + "' forbidden.",
                                    LOG_LEVEL.THREAT, "BaseSentry.authorize(context, subject)");
                throw CelastrinaError.newError("Forbidden.", 403);
            }
        }
        else {
            if(!(await _permission.authorize(subject))) {
                context.log(subject.id + "' does not satisfy any permission for action '" + context.action + "', forbidden.",
                                    LOG_LEVEL.THREAT, "BaseSentry.authorize(context, subject)");
                throw CelastrinaError.newError("Forbidden.", 403);
            }
        }
    }
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async initialize(config) {
        this._optimistic = config.authorizationOptimistic;
        this._permissions = config.permissions;
        this._roleResolver = config.roleFactory;
        return this._roleResolver.initialize(config);
    }
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
        /**@type{Configuration}*/this._config = config;
        /**@type{(null|string)}*/this._traceId = null;
        /**@type{boolean}*/this._monitor = false;
        /**@type{(null|MonitorResponse)}*/this._monitorResponse = null;
        /**@type{(null|BaseSubject)}*/this._subject = null;
        /**@type{string}*/this._action = "process";
        /**@type{(null|BaseSentry)}*/this._sentry = null;
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
    /**@return{(null|MonitorResponse)}*/get monitorResponse(){return this._monitorResponse;}
    /**@return{string}*/get invocationId(){return this._azfunccontext.bindingData.invocationId;}
    /**@return{string}*/get requestId(){return this._requestId;}
    /**@return{string}*/get traceId(){return this._traceId;}
    /**@return{BaseSentry}*/get sentry(){return this._sentry;}
    /**@param{BaseSentry} sentry*/set sentry(sentry){this._sentry = sentry;}
    /**@return{BaseSubject}*/get subject(){return this._subject;}
    /**@param{BaseSubject} subject*/set subject(subject){this._subject = subject;}
    /**@return{string}*/get action(){return this._action;}
    /**@return{PropertyManager}*/get properties(){return this._config.properties;}
    /**@return{ResourceManager}*/get authorizations(){return this._config.resources;}
    /**@return{_AzureFunctionContext}*/get azureFunctionContext(){return this._azfunccontext;}
    /**
     * @param{string} name
     * @param {*} [defaultValue=null]
     */
    getBinding(name, defaultValue = null) {
        let _value = this._azfunccontext.bindings[name];
        if(typeof _value === "undefined" || _value == null)
            _value = defaultValue;
        return _value;
    }
    /**
     * @param {string} name
     * @param {*} [value=null]
     */
    setBinding(name, value = null) {
        this._azfunccontext.bindings[name] = value;
    }
    /**
     * @param {string} message
     * @param {number} [level=LOG_LEVEL.INFO]
     * @param {(null|string)} [subject=null]
     */
    log(message, level = LOG_LEVEL.INFO, subject = null) {
        let out = "[" + this._config.name + "]";
        if(typeof subject === "string") out += "[" + subject + "]";
        out += "[" + this._azfunccontext.invocationId + "]" + "[" + this._requestId + "]: " + message.toString();
        if(level === LOG_LEVEL.THREAT) out = "[THREAT]" + out;
        switch(level) {
            case LOG_LEVEL.ERROR:this._azfunccontext.log.error(out); break;
            case LOG_LEVEL.INFO:this._azfunccontext.log.info(out); break;
            case LOG_LEVEL.WARN:this._azfunccontext.log.warn(out); break;
            case LOG_LEVEL.VERBOSE:this._azfunccontext.log.verbose(out); break;
            case LOG_LEVEL.THREAT: this._azfunccontext.log.warn(out); break;
            default:this._azfunccontext.log.verbose(out);
        }
    }
    /**
     * @param {Object} object
     * @param {number} [level=LOG_LEVEL.INFO]
     * @param {(null|string)} [subject=null]
     */
    logObjectAsJSON(object, level = LOG_LEVEL.INFO, subject = null) {
        this.log(JSON.stringify(object), level, subject);
    }
    /**@param{*}[value=null]*/
    done(value = null) {this._result = value;}
}
/**
 * BaseFunction
 * @abstract
 * @author Robert R Murrell
 */
class BaseFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration) {
        /**@type{Configuration}*/this._configuration = configuration;
        /**@type{BaseContext}*/this._context = null;
    }
    /**@return{BaseContext}*/get context() {return this._context;}
    /**@return{Configuration}*/get configuration() {return this._configuration;}
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
        /**@type{(null|BaseSentry)}*/let _sentry = await this.createSentry(azcontext, this._configuration);
        /**@type{(null|BaseContext)}*/let _context = await this.createContext(azcontext, this._configuration);
        await _context.initialize();
        await _sentry.initialize(this._configuration);
        this._context = _context;
        this._context.sentry = _sentry;
        await this._configuration.ready();
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
    async authenticate(context) {return context.sentry.authenticate(context);}
    /**
     * @param {BaseContext} context
     * @return {Promise<void>}
     */
    async authorize(context) {await context.sentry.authorize(context, context.subject);}
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
      * @param {_AzureFunctionContext} azcontext The azcontext of the function.
      */
    async execute(azcontext) {
        azcontext.log.info("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Lifecycle started.");
        try {
            await this.bootstrap(azcontext);
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
                azcontext.log.warn("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Exception Lifecycle.");
                await this.exception(this._context, exception);
            }
            catch(_exception) {
                let _ex = this._unhandled(azcontext, _exception);
                azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Exception thrown from Exception lifecycle: " +
                                  _ex  + ", caused by " + exception + ". ");
            }
        }
        finally {
            try {
                await this.terminate(this._context);
                azcontext.log.info("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Lifecycle completed.");
                if(this._context.result == null)
                    azcontext.done();
                else
                    azcontext.done(this._context.result);
            }
            catch(exception) {
                let _ex = this._unhandled(azcontext, exception);
                azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Exception thrown from Terminate lifecycle: " +
                                  _ex  + ". ");
                _ex.drop? azcontext.done() :  azcontext.done(_ex);
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} context
     * @param {(exception|Error|CelastrinaError|*)} exception
     * @private
     */
    _unhandled(context, exception) {
        /**@type{(exception|Error|CelastrinaError|*)}*/let ex = exception;
        if(typeof ex === "undefined" || ex == null) ex = CelastrinaError.newError("Unhandled server error.");
        else if(!(ex instanceof CelastrinaError)) {
            if(ex instanceof Error) ex = CelastrinaError.wrapError(ex);
            else ex = CelastrinaError.newError(ex);
        }
        context.log.error("[BaseFunction._unhandled(context, exception)][exception](MESSAGE:" + ex.message + ") \r\n (STACK:" + ex.stack + ") \r\n (CAUSE:" + ex.cause + ")");
        return ex;
    }
}
/**
 * ValueLoader
 * @abstract
 * @author Robert R Murrell
 */
class ContentLoader {
    /**
     * @param {string} type
     * @param {string} version
     * @param {ContentLoader} link
     */
    constructor(type = "application/json;utf-8", version = "1.0.0", link = null) {
        /**@type{string}*/this._type = type;
        /**@type{string}*/this._version = version;
        /**@type{ContentLoader}*/this._link = link;
    }
    /**
     * @param {ContentLoader} link
     */
    addLink(link) {
        (this._link == null)? this._link = link : this._link.addLink(link);
    }
    /**@return{string}*/get type() {return this._type;}
    /**@return{string}*/get version() {return this._version;}
    /**
     * @param {{_content:{type:string,version:string}}} _Object
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async load(_Object, azcontext, config) {
        if(_Object._content.type === this._type && _Object._content.version === this._version)
            return this._load(_Object, azcontext, config);
        else if(this._link != null)
            return this._link.load(_Object, azcontext, config);
        else
            throw CelastrinaError.newError("No ContentLoader found for type '" + _Object._content.type +
                                                   "'.", 404);
    }
    /**
     * @param {Object} _Object
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     * @abstract
     */
    async _load(_Object, azcontext, config) {throw CelastrinaError.newError("Not Implemented.", 501);}
}
/**
 * CoreContentLoader
 * @author Robert R Murrell
 */
class CoreContentLoader extends ContentLoader {
    constructor() {
        super("application/com.celastrinajs.core.configuration+json;utf-8");
    }
    /**
     * @typedef CoreAuthentication
     * @property {boolean} optimistic
     */
    /**
     * @typedef CoreContentLoader
     * @property {string} name
     * @property {CoreAuthentication} authentication
     */
    /**
     * @param {Object|CoreContentLoader} _Object
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     * @private
     */
    async _load(_Object, azcontext, config) {
        if(!_Object.hasOwnProperty("name") || (typeof _Object.name !== "string" ||
                _Object.name.trim().length === 0))
            throw CelastrinaError.newError("[" + this.type + "]: Property 'name' is required.", 400);
        config[Configuration.CONFIG_NAME] = _Object.name;

        if(_Object.hasOwnProperty("authentication") && (typeof _Object.authentication === "object" &&
                _Object.authentication != null )) {
            let _authentication = _Object.authentication;
            if(_authentication.hasOwnProperty("optimistic") && (typeof _authentication.optimistic === "boolean"))
                config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = _authentication.optimistic;
        }
    }
}
/**
 * ConfigurationLoader
 * @author Robert R Murrell
 */
class ConfigurationLoader {
    /**
     * @typedef _Content
     * @property {string} [type]
     * @property {string} [version]
     */
    /**
     * @typedef ContentType
     * @property {_Content} [_content]
     */
    /**
     * @typedef ConfigurationJson
     * @property {Array.<*>} [references]
     * @property {Array.<ContentType>} [configurations]
     */
    /**
     * @param {string} property
     */
    constructor(property) {
        if(typeof property !== "string" || property.trim().length === 0)
            throw CelastrinaError.newError("[ConfigurationLoader]: Argument 'property' is required.", 400);
        /**@type{string}*/this._property = property.trim();
        if(this._property.includes(' '))
            throw CelastrinaError.newError("[ConfigurationLoader]: Argument 'property' is required.", 400);
        this._loader = new CoreContentLoader();
    }
    /**@return{string}*/get property() {return this._property;}
    /**
     * @param {ContentLoader} loader
     * @return {ConfigurationLoader}
     */
    addContentLoader(loader) {
        this._loader.addLink(loader);
        return this;
    }
    /**
     * @param {PropertyManager} pm
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async load(pm, azcontext, config) {
        /**@type{(null|ConfigurationJson)}*/let _funcconfig = await pm.getObject(this._property);
        if(_funcconfig == null)
            throw CelastrinaError.newError("[ConfigurationLoader]: Invalid property '" + this._property + "'.", 400);
        if(!_funcconfig.hasOwnProperty("configurations") || !Array.isArray(_funcconfig.configurations))
            throw CelastrinaError.newError("[ConfigurationLoader]: Property 'configurations' is required and must be an array.", 400);
        /**@type{Array.<ContentType>}*/let _configurations = _funcconfig.configurations;
        if(!_funcconfig.hasOwnProperty("references") || !Array.isArray(_funcconfig.references))
            throw CelastrinaError.newError("[ConfigurationLoader]: Property 'references' must be an array.", 400);
        /**@type{Array.<ContentType>}*/let _references = _funcconfig.references;

        let promises = [];
        for(let _idx = 0; _idx < _references.length; ++_idx) {
            promises.unshift(ConfigurationLoader._validateContentObject(_idx, _references[_idx]));
        }
        await Promise.all(promises);
        promises = [];
        for(let _idx = 0; _idx < _configurations.length; ++_idx) {
            promises.unshift(ConfigurationLoader._validateContentObject(_idx, _configurations[_idx]));
        }
        await Promise.all(promises);
        await ConfigurationLoader._replaceReferences(_references, _configurations, pm);
        promises = [];
        for(let _idx = 0; _idx < _configurations.length; ++_idx) {
            promises.unshift(this._loader.load(_configurations[_idx], azcontext, config));
        }
        await Promise.all(promises);
    }
    /**
     * @param {*} index
     * @param {Object} _Object
     * @private
     */
    static async _validateContentObject(index, _Object) {
        if(typeof _Object === "undefined" || _Object == null)
            throw CelastrinaError.newError("[" + index + "]: Object was null or undefined.", 400);
        if(!_Object.hasOwnProperty("_content"))
            throw CelastrinaError.newError("[" + index + "]: Property '_content' is required.", 400);
        let _content = _Object._content;
        if(!_content.hasOwnProperty("type") || (typeof _content.type !== "string") || _content.type.trim().length === 0)
            throw CelastrinaError.newError("[" + index + "]: Property '_content.type' is required.", 400);
        if(!_content.hasOwnProperty("version") || (typeof _content.version !== "string") || _content.version.trim().length === 0)
            throw CelastrinaError.newError("[" + index + "]: Property '_content.version' is required.", 400);
    }
    /**
     * @param {Object} _object
     * @param {Object} references
     * @param {*} value
     * @param {Array.<Promise<*>>} promises
     * @return {void}
     * @private
     */
    static async _replace(_object, references, value, promises) {
        for(let _prop in _object) {
            if(_object.hasOwnProperty(_prop)) {
                let _value = _object[_prop];
                if(typeof _value === "object" && _value != null) {
                    if(_value.hasOwnProperty("reference")) {
                        let index = _object.constructor.name + "." + _prop;
                        await ConfigurationLoader._validateContentObject(index, _value);
                        if(_value._content.type === "application/com.celastrinajs.core._object.reference+json;utf-8") {
                            let _rv = references[_value.reference];
                            if(typeof _rv === "undefined" || _rv == null)
                                throw CelastrinaError.newError("[" + index + "]: Invalid property reference '" +
                                                                        _value.reference + "'.", 400);
                            else {
                                if(_value.hasOwnProperty("expand") && typeof _value.expand === "boolean" &&
                                        _value.expand && Array.isArray(_object))
                                     _object.splice(_prop, 1, ..._value);
                                else
                                    _object[_prop] = _value;
                            }
                        }
                        else
                            throw CelastrinaError.newError("[" + index + "]: Invalid content type.", 400);
                    }
                    else ConfigurationLoader._replace(_value, references, value, promises);
                }
            }
        }
    }
    /**
     * @param {Array.<Object>} references
     * @param {Array.<Object>} configurations
     * @param {PropertyManager} pm
     * @return {Promise<void>}
     * @private
     */
    static async _replaceReferences(references, configurations, pm) {
        let _propPromises = [];
        for(let _idx = 0; _idx < references.length; ++_idx) {
            /**@type{{reference:string,key:string,type:string}}*/let _property = references[_idx];
            _propPromises.unshift(pm.getTypedProperty(_property.key, _property.type));
        }
        _propPromises = await Promise.all(_propPromises);
        let _confPromises = [];
        // for(let _idx = 0; _idx < references.length; ++_idx) {
        //     ConfigurationLoader._replace(configurations, references[_idx].reference, _propPromises[_idx],
        //                                  _confPromises);
        // }
        await Promise.all(_confPromises);
    }
}
module.exports = {
    CelastrinaError: CelastrinaError,
    CelastrinaValidationError: CelastrinaValidationError,
    LOG_LEVEL: LOG_LEVEL,
    ConfigurationItem: ConfigurationItem,
    ResourceAuthorization: ResourceAuthorization,
    ManagedIdentityResource: ManagedIdentityResource,
    AppRegistrationResource: AppRegistrationResource,
    ResourceManager: ResourceManager,
    Vault: Vault,
    PropertyManager: PropertyManager,
    AppSettingsPropertyManager: AppSettingsPropertyManager,
    AppConfigPropertyManager: AppConfigPropertyManager,
    CachedProperty: CachedProperty,
    CachedPropertyManager: CachedPropertyManager,
    PropertyManagerFactory: PropertyManagerFactory,
    AppConfigPropertyManagerFactory: AppConfigPropertyManagerFactory,
    ContentLoader: ContentLoader,
    ConfigurationLoader: ConfigurationLoader,
    Configuration: Configuration,
    Algorithm: Algorithm,
    AES256Algorithm: AES256Algorithm,
    Cryptography: Cryptography,
    MonitorResponse: MonitorResponse,
    ValueMatch: ValueMatch,
    MatchAny: MatchAny,
    MatchAll: MatchAll,
    MatchNone: MatchNone,
    Permission: Permission,
    PermissionManager: PermissionManager,
    RoleFactory: RoleFactory,
    BaseSubject: BaseSubject,
    BaseSentry: BaseSentry,
    BaseContext: BaseContext,
    BaseFunction: BaseFunction
};
