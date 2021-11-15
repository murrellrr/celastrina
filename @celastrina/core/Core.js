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
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
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
 * Use to type-safe-check across node packages.
 * @param {string} type The celastrinajs typestring.
 * @param {Object} source The object instance you would like to check
 * @return {boolean} True, if the types is equalt to source.__type, false otherwise.
 */
function instanceOfCelastringType(type, source) {
    if(((typeof source === "undefined") || source == null) || (typeof type !== "string")) return false;
    if(source.hasOwnProperty("__type") && (typeof source.__type === "string"))
        return type === source.__type;
    else
        return false;
}
/**
 * CelastrinaError
 * @author Robert R Murrell
 */
class CelastrinaError extends Error {
    static CELASTRINAJS_ERROR_TYPE = "celastrinajs.core.CelastrinaError";
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} [drop=false]
     * @param {Error} [cause=null]
     */
    constructor(message, code = 500, drop = false, cause = null) {
        super(message);
        /**@type{string}*/this.name = this.constructor.name;
        /**@type{Error}*/this.cause = cause;
        /**@type{number}*/this.code = code;
        /**@type{boolean}*/this.drop = drop;
        this.__type = CelastrinaError.CELASTRINAJS_ERROR_TYPE;
    }
    /**@return {string}*/toString() {
        return "[" + this.name + "][" + this.code + "][" + this.drop + "]: " + this.message;
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

        if(instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, ex))
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
    static CELASTRINAJS_VALIDATION_ERROR_TYPE = "celastrinajs.core.CelastrinaValidationError";
    /**
     * @param {string} message
     * @param {int} code
     * @param {boolean} [drop=false]
     * @param {string} [tag=""]
     * @param {Error} [cause=null]
     */
    constructor(message, code = 400, drop = false, tag = "", cause = null) {
        super(message, code, drop, cause);
        /**@type{string}*/this.tag = tag;
        this.__type = CelastrinaValidationError.CELASTRINAJS_VALIDATION_ERROR_TYPE;
    }
    /**@return {string}*/toString() {
        return "[" + this.name + "][" + this.code + "][" + this.drop + "][" + this.tag + "]: " + this.message;
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
        return new CelastrinaValidationError(message, code, drop, tag, cause);
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
        if(instanceOfCelastringType(CelastrinaValidationError.CELASTRINAJS_VALIDATION_ERROR_TYPE, ex))
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
 * ResourceAuthorization
 * @author Robert R Murrell
 * @abstract
 */
class ResourceAuthorization {
    static CELASTRINAJS_TYPE = "celastrinajs.core.ResourceAuthorization";
    /**
     * @param {string} id
     * @param {number} [skew=0]
     */
    constructor(id, skew = 0) {
        this._id = id;
        this._tokens = {};
        this._skew = skew;
        this.__type = ResourceAuthorization.CELASTRINAJS_TYPE;
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
                else {
                    let status = exception.response.statusText;
                    let msg = "Exception getting resource '" + resource + "'";
                    (typeof status !== "string") ? msg += "." : msg += ": " + status;
                    throw CelastrinaError.newError(msg, exception.response.status);
                }
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.ResourceManager";
    constructor() {
        this._resources = {};
        this.__type = ResourceManager.CELASTRINAJS_TYPE;
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
        if(!instanceOfCelastringType(ResourceAuthorization.CELASTRINAJS_TYPE, _auth)) return null;
        else return _auth;
    }
    /**
     * @param {string} resource
     * @param {string} id
     * @return {Promise<string>}
     */
    async getToken(resource, id = ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY) {
        /**@type{ResourceAuthorization}*/let _auth = await this.getResource(id);
        if(_auth == null) return null;
        else return await _auth.getToken(resource);
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
    async ready(azcontext, config) {
        let _identityEndpoint = process.env["IDENTITY_ENDPOINT"];
        if(typeof _identityEndpoint === "string") {
            let _auth = this._resources[ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY]; // Checking to see if it was already created during init
            if(!instanceOfCelastringType(ResourceAuthorization.CELASTRINAJS_TYPE, _auth)) {
                this._resources[ManagedIdentityResource.SYSTEM_MANAGED_IDENTITY] = new ManagedIdentityResource();
            }
        }
    }
}
/**
 * Vault
 * @author Robert R Murrell
 */
class Vault {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Vault";
    constructor() {
        this.__type = Vault.CELASTRINAJS_TYPE;
    }
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.PropertyManager";
    constructor(){
        this.__type = PropertyManager.CELASTRINAJS_TYPE;
    }
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
     * @return {Promise<{value: (null|*), defaulted: boolean}>}
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
     * @param {*} value
     * @return {Promise<void>}
     */
    async setProperty(key, value = null) {throw CelastrinaError.newError("Not Implemented.", 501);}
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
     * @param {function(*)} [factory = null]
     * @return {Promise<Object>}
     */
    async getObject(key, defaultValue = null, factory = null) {
        let _object = await this._getConvertProperty(key, defaultValue, JSON.parse);
        if(_object != null && factory != null) _object = factory(_object);
        return _object;
    }
    /**
     * @param {string} key
     * @param {function(*)} factory
     * @param {Object} [defaultValue = null]
     * @return {Promise<Object>}
     */
    async convertObject(key, factory, defaultValue = null) {
        let _object = await this.getObject(key, defaultValue, factory);
        if(_object != null)
            await this.setProperty(key, _object);
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
    constructor() {
        super();
    }
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
     * @param {string} configStoreName
     * @param {string} [label="development"]
     * @param {boolean} [useVaultSecrets=true]
     */
    constructor(configStoreName, label = "development", useVaultSecrets = true) {
        super();
        this._label = label;
        this._configStore = configStoreName;
        this._endpoint = "https://" + configStoreName + ".azconfig.io/kv/{key}?label=" + label + "&api-version=1.0";
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
        else
            this._auth = new ManagedIdentityResource();
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {
        config[Configuration.CONFIG_RESOURCE].addResource(this._auth);
    }
    /**
     * @param _config
     * @return {Promise<*>}
     * @private
     */
    async _resolveVaultReference(_config) {
        let _vlt = JSON.parse(_config.value);
        return await this._vault.getSecret(await this._auth.getToken("https://vault.azure.net"), _vlt.uri);
    }
    _isVaultReference(kvp) {
        return (kvp.content_type === "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8" &&
                this._useVaultSecrets);
    }
    /**
     * @param kvp
     * @return {Promise<*>}
     * @private
     */
    async _resolveFeatureFlag(kvp) {
        return kvp.value;
    }
    _isFeatureFlag(kvp) {
        return kvp.content_type === "application/vnd.microsoft.appconfig.ff+json;charset=utf-8"
    }
    /**
     * @param {string} key
     * @return {Promise<*>}
     * @private
     */
    async _getAppConfigProperty(key) {
        try {
            let token = await this._auth.getToken("https://" + this._configStore + ".azconfig.io");
            let _endpoint = this._endpoint.replace("{key}", key);
            let response = await axios.get(_endpoint, {headers: {"Authorization": "Bearer " + token}});
            let _value = response.data;
            if(this._isVaultReference(_value))
                return await this._resolveVaultReference(_value);
            else if(this._isFeatureFlag(_value))
                return await this._resolveFeatureFlag(_value);
            else
                return _value.value;
        }
        catch(exception) {
            if(instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, exception))
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.CachedProperty";
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
        this.__type = CachedProperty.CELASTRINAJS_TYPE;
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
        /**@type{Array<Promise<void>>}*/let promises = [];
        for(let prop in this._cache) {
            if(this._cache.hasOwnProperty(prop)) {
                let cached = this._cache[prop];
                if(instanceOfCelastringType(CachedProperty.CELASTRINAJS_TYPE, cached)) promises.unshift(cached.clear());
            }
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
        if(typeof cached === "undefined" || cached == null) return null;
        else return cached;
    }
    /**
     * @param {string} key
     * @param {*} defaultValue
     * @param {string} func
     * @param {function(*)} [construct]
     * @return {Promise<*>}
     * @private
     */
    async _getCache(key, defaultValue, func, construct) {
        let cached  = this._cache[key];
        if(!instanceOfCelastringType(CachedProperty.CELASTRINAJS_TYPE, cached)) {
            let _value =await this._manager[func](key, defaultValue, construct);
            if(_value != null) this._cache[key] =  new CachedProperty(_value, this._defaultTime, this._defaultUnit);
            return _value;
        }
        else if(cached.isExpired) {
            let _value =await this._manager[func](key, defaultValue, construct);
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
    /**
     * @param {string} key
     * @param {*} [value=null]
     * @return {Promise<void>}
     */
    async setProperty(key, value = null) {
        let _lcache = null;
        if(value != null) _lcache = new CachedProperty(value, this._defaultTime, this._defaultUnit);
        this._cache[key] = _lcache;
    }
}
/**
 * PropertyManagerFactory
 * @abstract
 * @author Robert R Murrell
 */
class PropertyManagerFactory {
    static CELASTRINAJS_TYPE = "celastrinajs.core.PropertyManagerFactory";
    /**@param{(null|string)}[name=null]*/
    constructor(name = null) {
        this._name = name;
        this.__type = PropertyManagerFactory.CELASTRINAJS_TYPE;
    }
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
            lname = Configuration.CONFIG_PROPERTY;
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
    static PROP_USE_APP_CONFIG = "celastrinajs.core.property.appconfig.config";
    constructor(name = AppConfigPropertyManagerFactory.PROP_USE_APP_CONFIG) {
        super(name);
    }
    /**@return{string}*/getName() {return "AppConfigPropertyManagerFactory";}
    /**
     * @param {{store:string, label:(null|undefined|string), useVault:(null|undefined|boolean)}} source
     * @return {PropertyManager}
     */
    _createPropertyManager(source) {
        if(!source.hasOwnProperty("store") || typeof source.store !== "string" ||
                source.store.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Attribute 'store' is required.", "store");
        let _label = "development";
        let _useVault = false;
        if(source.hasOwnProperty("label") && typeof source.label === "string" && source.label.trim().length > 0)
            _label = source.label;
        if(source.hasOwnProperty("useVault") && typeof source.useVault === "boolean")
            _useVault = source.useVault;
        return new AppConfigPropertyManager(source.store, _label, _useVault);
    }
}
/**
 * ParserChain
 * @author Robert R Murrell
 * @abstract
 */
class ParserChain {
    static CELASTRINAJS_TYPE = "celastrinajs.core.ParserChain";
    /**
     * @param {string} [mime="application/celastrinajs+json"]
     * @param {string} [type="Object"]
     * @param {ParserChain} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(mime = "application/vnd.celastrinajs+json", type = "Object", link = null,
                version = "1.0.0") {
        /**@type{string}*/this._mime = mime;
        /**@type{string}*/this._type = type;
        /**@type{string}*/this._version = version;
        /**@type{ParserChain}*/this._link = link;
        /**@type{PropertyManager}*/this._pm = null;
        /**@type{_AzureFunctionContext}*/this._azcontext = null;
        /**@type{Object}*/this._config = null;
        this.__type = ParserChain.CELASTRINAJS_TYPE;
    }
    /**
     * @param {Object} config
     * @param {_AzureFunctionContext} azcontext
     */
    initialize(azcontext, config) {
        this._pm = config[Configuration.CONFIG_PROPERTY];
        this._azcontext = azcontext;
        this._config = config;
        if(this._link != null)
            this._link.initialize(azcontext, config);
    }
    /**
     * @param {ParserChain} link
     */
    addLink(link) {
        if(typeof link !== "undefined" && link != null) {
            if((link._mime !== this._mime) || (link._type !== this._type) || (link._version !== this._version)) {
                (this._link == null) ? this._link = link : this._link.addLink(link);
            }
        }
    }
    /**@return{string}*/get mime() {return this._mime;}
    /**@return{string}*/get type() {return this._type;}
    /**@return{string}*/get version() {return this._version;}
    /**@return{PropertyManager}*/get propertyManager() {return this._pm;}
    /**@return{_AzureFunctionContext}*/get azureFunctionContext() {return this._azcontext;}
    /**@return{Object}*/get config() {return this._config;}
    /**
     * @param {Object} _Object
     * @return {Promise<*>}
     */
    async parse(_Object) {
        if(typeof _Object === "undefined" || _Object == null)
            throw CelastrinaValidationError.newValidationError(
                "[ParserChain.parse(_Object, config)][_Object]: Invalid argument. Argument cannot be 'undefined' or null.",
                "_Object");
        if(!_Object.hasOwnProperty("_content") || _Object._content == null)
            throw CelastrinaValidationError.newValidationError(
                "[ParserChain.parse(_Object, config)][_content]: Invalid object. Attribute cannot be undefined or null.",
                "_Object._content");
        let _content = _Object._content;
        if(!_content.hasOwnProperty("type") || (typeof _content.type !== "string") || _content.type.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[ParserChain.parse(_Object, config)][_content.type]: Invalid string. Attribute cannot be null or zero length.",
                "_Object._content.type");
        let _versioned = false;
        if(_content.hasOwnProperty("version")) {
            if((typeof _content.version !== "string") || _content.version.trim().length === 0)
                throw CelastrinaValidationError.newValidationError(
                    "[ParserChain.parse(_Object, config)][_content.version]: Invalid string. Attribute cannot be null or zero length.",
                    "_Object._content.version");
            _versioned = true;
        }
        let _types = _Object._content.type.trim();
        _types = _types.split(" ").join("");
        _types = _types.split(";");
        let _mime = _types[0];
        let _type = _types[1];
        let _subtypes = _type.split("+");
        /**@type{*}*/let _target = _Object;
        if(_mime === this._mime) {
            if(_versioned && _Object._content.version !== this._version)
                throw CelastrinaValidationError.newValidationError(
                    "[ParserChain.parse(_Object, config)][_content.version]: Unsupported version. Expected '" +
                    this._version + "', but got '" + _Object._content.version + "'.",
                    "_content.version");
            for (let _subtype of _subtypes) {
                if((typeof _target !== "undefined") && _target != null) {
                    let _expand = false;
                    if (_subtype.startsWith("[")) {
                        if (!_subtype.endsWith("]"))
                            throw CelastrinaValidationError.newValidationError(
                                "[ParserChain.parse(_Object, config)][_content.version]: Invalid subtype. Sub-type '" + _subtype +
                                "' indicated an array opening with '[' but is missing closing ']'.",
                                "_content.type+subtype");
                        else {
                            _expand = true;
                            _subtype = _subtype.substring(1);
                            _subtype = _subtype.substring(0, _subtype.length - 1);
                        }
                    } else if (_subtype.endsWith("]"))
                        throw CelastrinaValidationError.newValidationError(
                            "[ParserChain.parse(_Object, config)][_content.version]: Invalid subtype. Sub-type '" + _subtype +
                            "' indicated an array closing with ']' but is missing opening '['.",
                            "_content.type+subtype");
                    _target = await this._parse(_subtype, _target, _expand);
                }
            }
        }
        return _target;
    }
    /**
     * @param _Object
     * @return {Promise<Array<*>>}
     * @private
     */
    async _parseArray(_Object) {
        let promises = [];
        for(let index in _Object) {
            if(_Object.hasOwnProperty(index)) {
                promises.unshift(this._create(_Object[index]));
            }
        }
        return Promise.all(promises);
    }
    /**
     * @param {string} subtype
     * @param {Object} _Object
     * @param {boolean} [expand=false]
     * @return {Promise<*>}
     */
    async _parse(subtype, _Object, expand = false) {
        if(subtype === this._type) {
            if(Array.isArray(_Object) && expand)
                return this._parseArray(_Object);
            else
                return this._create(_Object);
        }
        else if(this._link != null)
            return this._link._parse(subtype, _Object, expand);
        else
            return _Object;
    }
    /**
     * @param {{_content:{type:string,version?:string}}} _Object
     * @return {Promise<*>}
     * @abstract
     */
    async _create(_Object) {
        throw CelastrinaError.newError("[ParserChain._create(_Object)]: Not Implemented.", 501);
    }
}
/**
 * AttributeParser
 * @abstract
 * @author Robert R Murrell
 */
class AttributeParser extends ParserChain {
    static CELASTRINAJS_TYPE = "celastrinajs.core.AttributeParser";
    static _CONFIG_PARSER_ATTRIBUTE_TYPE = "application/vnd.celastrinajs.attribute+json";
    /**
     * @param {string} [type="Object"]
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(type = "Object", link = null, version = "1.0.0") {
        super(AttributeParser._CONFIG_PARSER_ATTRIBUTE_TYPE, type, link, version);
        this.__type = AttributeParser.CELASTRINAJS_TYPE;
    }
}
/**
 * PropertyParser
 * @author Robert R Murrell
 */
class PropertyParser extends AttributeParser {
    /**
     * @param {AttributeParser} link
     * @param {string} version
     */
    constructor(link = null, version = "1.0.0") {
        super("Property", link, version);
    }
    /**
     * @param {string} key
     * @param {string} type
     * @param {(null|*)} [defaultValue=null]
     * @param {(null|function(*))} [factory = null]
     * @return {Promise<*>}
     */
    async getProperty(key, type, defaultValue = null, factory = null) {
        return this._pm.getTypedProperty(key, type, defaultValue, factory);
    }
    /**
     * @param {Object} _Object
     * @return {Promise<*>}
     * @abstract
     */
    async _create(_Object) {
        if(!_Object.hasOwnProperty("key") || (typeof _Object.key !== "string") || _Object.key.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[PropertyParser._load(_Object, azcontext, config)][key]: Invalid string. Attribute cannot be null or zero length.",
                "Property.key");
        if(!_Object.hasOwnProperty("type") || (typeof _Object.type !== "string") || _Object.type.trim().length === 0)
            _Object.type = "property";
        return this.getProperty(_Object.key, _Object.type);
    }
}
/**
 * PermissionParser
 * @author Robert R Murrell
 */
class PermissionParser extends AttributeParser {
    /**
     * @param {string} version
     * @param {AttributeParser} link
     */
    constructor(link = null, version = "1.0.0") {
        super("Permission", link, version);
    }
    /**
     * @param {Object} type
     * @return {ValueMatch}
     */
    static _getValueMatch(type) {
        switch(type) {
            case "MatchAny":
                return new MatchAny();
            case "MatchAll":
                return new MatchAll();
            case "MatchNone":
                return new MatchNone();
            default:
                throw CelastrinaValidationError.newValidationError(
                    "[PermissionParser._getValueMatch(type)][type]: Invalid object. Unhandled match-type '" +
                    type + "'.", "Permission.MatchType");
        }
    }
    /**
     * @param {Object} _Permission
     * @return {Promise<Permission>}
     */
    async _create(_Permission) {
        if(typeof _Permission === "undefined" || _Permission == null)
            throw CelastrinaValidationError.newValidationError(
                "[PermissionParser.create(_Permission)][permission]: Invalid object, Attribute cannot be 'undefined' or null.",
                "Permission.permission");
        if(!_Permission.hasOwnProperty("action") || typeof _Permission.action !== "string" ||
            _Permission.action.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[PermissionParser.create(_Permission)][action]: Invalid string. Attribute cannot be null or zero length.",
                "Permission.action");
        if(!_Permission.hasOwnProperty("roles") || !Array.isArray(_Permission.roles) ||
            _Permission.roles.length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[PermissionParser.create(_Permission)][roles]: Ivalid array. Attribute must be string array with at least one element.",
                "Permission.roles");
        if(!_Permission.hasOwnProperty("match") || _Permission.match == null)
            throw CelastrinaValidationError.newValidationError(
                "[PermissionParser.create(_Permission)][match]: Invalid object. Attribute cannot be 'undefined' or null.",
                "Permission.match");
        let _match = _Permission.match;
        if(!_match.hasOwnProperty("type")  || typeof _match.type !== "string" ||
            _match.type.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[PermissionParser.create(_Permission)][match.type]: Invalid string. Attribute cannot be null or zero length.",
                "Permission.match.type");
        return new Permission(_Permission.action, _Permission.roles, PermissionParser._getValueMatch(_match.type));
    }
}
/**
 * AppRegistrationResourceParser
 * @author Robert R Murrell
 */
class AppRegistrationResourceParser extends AttributeParser {
    /**
     * @param {AttributeParser} link
     * @param {string} version
     */
    constructor(link = null, version = "1.0.0") {
        super("AppRegistrationResource", link, version);
    }
    /**
     * @param {Object} _AppRegistrationResource
     * @return {Promise<AppRegistrationResource>}
     */
    async _create(_AppRegistrationResource) {
        if(!_AppRegistrationResource.hasOwnProperty("id") || typeof _AppRegistrationResource.id !== "string" ||
            _AppRegistrationResource.id.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AppRegistrationResourceParser._create(_AppRegistrationResource)][id]: Invalid string. Attribute cannot be null or zero length.",
                "Resource.id");
        if(!_AppRegistrationResource.hasOwnProperty("authority") || typeof _AppRegistrationResource.authority !== "string" ||
            _AppRegistrationResource.authority.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AppRegistrationResourceParser._create(_AppRegistrationResource)][authority]: Invalid string. Attribute cannot be null or zero length.",
                "Resource.authority");
        if(!_AppRegistrationResource.hasOwnProperty("tenant") || typeof _AppRegistrationResource.tenant !== "string" ||
            _AppRegistrationResource.tenant.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AppRegistrationResourceParser._create(_AppRegistrationResource)][tenant]: Invalid string. Attribute cannot be null or zero length.",
                "Resource.tenant");
        if(!_AppRegistrationResource.hasOwnProperty("secret") || typeof _AppRegistrationResource.secret !== "string" ||
            _AppRegistrationResource.secret.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AppRegistrationResourceParser._create(_AppRegistrationResource)][secret]: Invalid string. Attribute cannot be null or zero length.",
                "Resource.secret");
        return new AppRegistrationResource(_AppRegistrationResource.id, _AppRegistrationResource.authority,
            _AppRegistrationResource.tenant, _AppRegistrationResource.secret);
    }
}
/**
 * RoleFactoryParser
 * @author Robert R Murrell
 */
class RoleFactoryParser extends AttributeParser {
    /**
     * @param {string} [type="RoleFactory"]
     * @param {AttributeParser} link
     * @param {string} version
     */
    constructor(type = "RoleFactory", link = null, version = "1.0.0") {
        super(type, link, version);
    }
    /**
     * @param {Object} _RoleFactory
     * @return {Promise<DefaultRoleFactory>}
     */
    async _create(_RoleFactory) {
        return new DefaultRoleFactory();
    }
}
/**
 * ConfigParser
 * @author Robert R Murrell
 * @abstract
 */
class ConfigParser extends ParserChain {
    static _CONFIG_PARSER_TYPE = "application/vnd.celastrinajs.config+json";
    static CELASTRINAJS_TYPE = "celastrinajs.core.ConfigParser";
    /**
     * @param {string} [type="Config"]
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(type = "Config", link = null, version = "1.0.0") {
        super(ConfigParser._CONFIG_PARSER_TYPE, type, link, version);
        this.__type = ConfigParser.CELASTRINAJS_TYPE;
    }
}
/**
 * CoreConfigParser
 * @author Robert R Murrell
 */
class CoreConfigParser extends ConfigParser {
    /**
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("Core", link, version);
    }
    /**
     * @param _Object
     * @return {Promise<void>}
     * @private
     */
    async _createResources(_Object) {
        if(_Object.hasOwnProperty("resources") && (typeof _Object.resources === "object") &&
            _Object.resources != null) {
            let _resobj = _Object.resources;
            if(_resobj.hasOwnProperty("authorizations") && Array.isArray(_resobj.authorizations) &&
                _resobj.authorizations != null) {
                /**@type{ResourceManager}*/let _rm = this._config[Configuration.CONFIG_RESOURCE];
                /**@type{Array<ResourceAuthorization>}*/let _Authorizations = _resobj.authorizations;
                for (/**@type{ResourceAuthorization}*/let _ra of _Authorizations) {
                    _rm.addResource(_ra);
                }
            }
        }
    }
    /**
     * @param _Object
     * @return {Promise<void>}
     * @private
     */
    async _createAuthentication(_Object) {
        if(_Object.hasOwnProperty("authentication") && (typeof _Object.authentication === "object") &&
            _Object.authentication != null) {
            let _Authentication = _Object.authentication;
            let _optimistic = false;
            if(_Authentication.hasOwnProperty("optimistic") && (typeof _Authentication.optimistic === "boolean"))
                _optimistic = _Authentication.optimistic
            this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = _optimistic;
            if(_Authentication.hasOwnProperty("permissions") && Array.isArray(_Authentication.permissions)) {
                /**@type{PermissionManager}*/let _pm = this._config[Configuration.CONFIG_PERMISSION];
                /**@type{Array<Permission>}*/let _Permissions = _Authentication.permissions;
                for(/**@type{Permission}*/let _permission of _Permissions) {
                    _pm.addPermission(_permission);
                }
            }
        }
    }
    /**
     * @param _Object
     * @return {Promise<void>}
     * @private
     */
    async _createRoleFactory(_Object) {
        if(_Object.hasOwnProperty("roleFactory") && (typeof _Object.roleFactory === "object") &&
            _Object.roleFactory != null) {
            this._config[Configuration.CONFIG_ROLE_FACTORY] = _Object.roleFactory;
        }
    }
    /**
     * @param _Object
     * @return {Promise<void>}
     * @private
     */
    async _create(_Object) {
        let _promises = [];
        _promises.unshift(this._createResources(_Object));
        _promises.unshift(this._createAuthentication(_Object));
        _promises.unshift(this._createRoleFactory(_Object));
        await Promise.all(_promises);
    }
}
/**
 * Configuration
 * @author Robert R Murrell
 * @abstract
 */
class AddOn {
    static CELASTRINAJS_TYPE = "celastrinajs.core.AddOn";
    constructor(name = "AddOn") {
        this._name = name;
        this._config = null;
        this.__type = AddOn.CELASTRINAJS_TYPE;
    }
    /**@return{string}*/get name() {return this._name;}
    /**@return{boolean}*/get wrapping() {return this._config != null;}
    /**@return{Set<string>}*/getDependancies() {return null;}
    /**
     * @return {ConfigParser}
     */
    getConfigParser() {return null;}
    /**
     * @return {AttributeParser}
     */
    getAttributeParser() {return null;}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @param {ResourceManager} rm
     * @param {PermissionManager} prm
     * @return {Promise<void>}
     */
    async initialize(azcontext, pm, rm, prm) {};
    /**
     * @param {Object} config
     */
    wrap(config) {this._config = config;}
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
    /**@type{string}*/static CONFIG_SENTRY = "celastrinajs.core.sentry";
    /**@type{string}*/static CONFIG_PERMISSION = "celastrinajs.core.sentry.permission";
    /**@type{string}*/static CONFIG_ROLE_FACTORY = "celastrinajs.core.sentry.role.factory";
    /**@type{string}*/static CONFIG_RESOURCE = "celastrinajs.core.resource";
    /**@type{string}*/static CONFIG_AUTHORIATION_OPTIMISTIC = "celastrinajs.core.authorization.optimistic";
    /**
     * @param{string} name
     * @param {(null|string)} property
     */
    constructor(name, property = null) {
        if(typeof name === "string") {
            if(name.trim().length === 0)
                throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else throw CelastrinaError.newError("Invalid configuration. Name must be string.");
        /**@type{Object}*/this._config = {};
        /**@type{AttributeParser}*/this._atp = null;
        /**@type{ConfigParser}*/this._cfp = null;
        this._addOns = {};
        /**@type{(null|string)}*/this._property = property;
        if(this._property != null) {
            if(typeof property !== "string" || property.trim().length === 0)
                throw CelastrinaValidationError.newValidationError(
                    "[Configuration][property]: Invalid string. Argument cannot be null or zero length.",
                        "property");
            /**@type{string}*/this._property = property.trim();
            if(this._property.includes(" "))
                throw CelastrinaValidationError.newValidationError(
                    "[Configuration][property]: Invalid string. Argument cannot contain spaces.",
                        "property");
            /**@type{AttributeParser}*/this._atp = new PropertyParser(new PermissionParser(
                                                                      new AppRegistrationResourceParser(new RoleFactoryParser())));
            /**@type{ConfigParser}*/this._cfp = new CoreConfigParser();
            this.__type = "celastrinajs.core.Configuration";
        }
        /**@type{boolean}*/this._loaded = false;
        this._config[Configuration.CONFIG_CONTEXT] = null;
        this._config[Configuration.CONFIG_PROPERTY] = new AppSettingsPropertyManager();
        this._config[Configuration.CONFIG_NAME] = name.trim();
        this._config[Configuration.CONFIG_RESOURCE] = new ResourceManager();
        this._config[Configuration.CONFIG_PERMISSION] = new PermissionManager();
        this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = false;
        this._config[Configuration.CONFIG_ROLE_FACTORY] = new DefaultRoleFactory();
        this._config[Configuration.CONFIG_SENTRY] = new Sentry();
    }
    /**@return{string}*/get name(){return this._config[Configuration.CONFIG_NAME];}
    /**@return{PropertyManager}*/get properties() {return this._config[Configuration.CONFIG_PROPERTY];}
    /**@return{Object}*/get values(){return this._config;}
    /**@return{_AzureFunctionContext}*/get context(){return this._config[Configuration.CONFIG_CONTEXT];}
    /**@return{boolean}*/get loaded(){return this._loaded;}
    /**@return{Sentry}*/get sentry() {return this._config[Configuration.CONFIG_SENTRY];}
    /**@return{PermissionManager}*/get permissions() {return this._config[Configuration.CONFIG_PERMISSION];}
    /**@return{RoleFactory}*/get roleFactory() {return this._config[Configuration.CONFIG_ROLE_FACTORY];}
    /**@return{ResourceManager}*/get resources() {return this._config[Configuration.CONFIG_RESOURCE];}
    /**@return{boolean}*/get authorizationOptimistic() {return this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC];}
    /**@return{AttributeParser}*/get contentParser() {return this._atp;}
    /**@return{ConfigParser}*/get configParser() {return this._cfp;}
    /**
     * @param {boolean} optimistic
     * @return {Configuration}
     */
    setAuthorizationOptimistic(optimistic) {
        this._config[Configuration.CONFIG_AUTHORIATION_OPTIMISTIC] = optimistic;
        return this;
    }
    /**
     * @param {RoleFactory} factory
     * @return {Configuration}
     */
    setRoleFactory(factory) {
        this._config[Configuration.CONFIG_ROLE_FACTORY] = factory;
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
     * @param {AttributeParser} cp
     * @return {Configuration}
     */
    addAttributeParser(cp) {
        this._atp.addLink(cp);
        return this;
    }
    /**
     * @param {ConfigParser} cp
     * @return {Configuration}
     */
    addConfigParser(cp) {
        this._cfp.addLink(cp);
        return this;
    }
    /**
     * @param {AddOn} addOn
     * @return {Configuration}
     */
    addOn(addOn) {
        if(!instanceOfCelastringType(AddOn.CELASTRINAJS_TYPE, addOn))
            throw CelastrinaValidationError.newValidationError("Argument 'addOn' is required and must be of type '" +
                                                                       AddOn.CELASTRINAJS_TYPE + "'.", "addOn");
        this._addOns[addOn.name] = addOn;
        addOn.wrap(this._config);
        return this;
    }
    /**
     * @param {string} name
     * @return {Promise<AddOn>}
     */
    async getAddOn(name) {
        let _addon = this._addOns[name];
        if(typeof _addon !== "undefined") return _addon;
        else return null;
    }
    /**
     * @param {AttributeParser} parser
     * @param {Object} _Object
     * @param {Object} _value
     * @param {*} _prop
     * @return {Promise<void>}
     */
    static async _replace(parser, _Object, _value, _prop) {
        let _lvalue = await parser.parse(_value);
        if(typeof _lvalue === "undefined" || _lvalue == null)
            _Object[_prop] = null;
        else {
            if(Array.isArray(_lvalue) && Array.isArray(_Object) && _value._content.hasOwnProperty("expand") &&
                    (typeof _value._content.expand === "boolean") && _value._content.expand) {
                _Object.splice(_prop, 1, ..._lvalue);
            }
            else
                _Object[_prop] = _lvalue;
        }
    }
    /**
     * @param {AttributeParser} parser
     * @param {Object} _object
     * @return {Promise<void>}
     */
    static async _parseProperties(parser, _object) {
        for(let prop in _object) {
            if(_object.hasOwnProperty(prop)) {
                if(prop !== "_content") {
                    let value = _object[prop];
                    if(typeof value === "object" && value != null) {
                        if(value.hasOwnProperty("_content") && (typeof value._content === "object") &&
                            value._content != null) {
                            await this._parseProperties(parser, value);
                            await Configuration._replace(parser, _object, value, prop);
                        }
                        else
                            await this._parseProperties(parser, value);
                    }
                }
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @return {Promise<void>}
     */
    async _load(azcontext, pm) {
        this._atp.initialize(azcontext, this._config);
        this._cfp.initialize(azcontext, this._config);
        let _pm = this._config[Configuration.CONFIG_PROPERTY];
        /**@type{(null|undefined|Object)}*/let _funcconfig = await _pm.getObject(this._property);
        if (_funcconfig == null)
            throw CelastrinaValidationError.newValidationError(
                "[Configuration.load(azcontext, pm)][_funcconfig]: Invalid object. Property '" + this._property +
                        "' cannot be 'undefined' or null.", this._property);
        if (!_funcconfig.hasOwnProperty("configurations") || !Array.isArray(_funcconfig.configurations))
            throw CelastrinaValidationError.newValidationError(
                "[Configuration.load(azcontext, pm)][configurations]: Invalid object. Attribute 'configurations' is required and must be an array.",
                    "configurations");
        /**@type{Array<Object>}*/let _configurations = _funcconfig.configurations;
        await Configuration._parseProperties(this._atp, _configurations);
        let _promises = [];
        for (let _configuration of _configurations) {
            _promises.unshift(this._cfp.parse(_configuration));
        }
        await Promise.all(_promises);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @return {Promise<void>}
     */
    async _initLoadConfiguration(azcontext, pm) {
        if(this._property != null) return this._load(azcontext, pm);
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
     * @return {boolean}
     * @private
     */
    _devOverridePropertyManager() {
        let overridden = false;
        let development = /**@type{(null|undefined|string)}*/process.env[Configuration.PROP_LOCAL_DEV];
        if(typeof development === "string") overridden = (development.trim().toLowerCase() === "true");
        return overridden;
    }
    /**
     * @return {boolean}
     * @private
     */
    _appConfigOverridePropertyManager() {
        let overridden = false;
        let appconfig = /**@type{(null|undefined|string)}*/process.env[AppConfigPropertyManagerFactory.PROP_USE_APP_CONFIG];
        if(typeof appconfig === "string") {
            appconfig = appconfig.trim();
            overridden = (appconfig.startsWith("{") && appconfig.endsWith("}"));
        }
        return overridden;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {PropertyManager}
     * @private
     */
    _getPropertyManager(azcontext) {
        if(this._devOverridePropertyManager()) {
            azcontext.log.info("[Configuration._getPropertyManager(azcontext)]: Local development override, using AppSettingsPropertyManager.");
            return new AppSettingsPropertyManager();
        }
        else if(this._appConfigOverridePropertyManager()) {
            azcontext.log.info("[Configuration._getPropertyManager(azcontext)]: AppConfigPropertyManager override, using AppConfigPropertyManager.");
            let _factory = new AppConfigPropertyManagerFactory();
            let _manager = _factory.createPropertyManager();
            this._config[Configuration.CONFIG_PROPERTY] = _manager;
            return _manager;
        }
        else {
            /**@type{PropertyManager}*/let _manager = this._config[Configuration.CONFIG_PROPERTY];
            if(typeof _manager == "undefined" || _manager == null) {
                azcontext.log.info("[Configuration._getPropertyManager(azcontext)]: No property manager specified, defaulting to AppSettingsPropertyManager.");
                _manager = new AppSettingsPropertyManager();
                this._config[Configuration.CONFIG_PROPERTY] = _manager;
            }
            else {
                if(instanceOfCelastringType(PropertyManagerFactory.CELASTRINAJS_TYPE, _manager)) {
                    /**@type{PropertyManagerFactory}*/let _factory = /**@type{PropertyManagerFactory}*/_manager;
                    _manager = _factory.createPropertyManager();
                    this._config[Configuration.CONFIG_PROPERTY] = _manager;
                }
                else if(!instanceOfCelastringType(PropertyManager.CELASTRINAJS_TYPE, _manager)) {
                    azcontext.log.error("[Configuration._getPropertyManager(azcontext)]: Invalid property manager. Must be of type '" + PropertyManager.CELASTRINAJS_TYPE + "'");
                    throw CelastrinaError.newError("Invalid property manager.");
                }
            }
            return _manager;
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     */
    async beforeInitialize(azcontext) {}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @return {Promise<void>}
     * @private
     */
    async _initPropertyManager(azcontext, pm) {
        await pm.initialize(azcontext, this._config);
        await pm.ready(azcontext, this._config);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PermissionManager} prm
     * @return {Promise<void>}
     * @private
     */
    async _initPermissionManager(azcontext, prm) {
        await prm.initialize(azcontext, this._config);
        await prm.ready(azcontext, this._config);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {ResourceManager} rm
     * @return {Promise<void>}
     * @private
     */
    async _initResourceManager(azcontext, rm) {
        await rm.initialize(azcontext, this._config);
        await rm.ready(azcontext, this._config);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @param {ResourceManager} rm
     * @param {PermissionManager} prm
     * @return {Promise<void>}
     * @private
     */
    async _initSentry(azcontext, pm, rm, prm) {
        /**@type{Sentry}*/let _sentry = this._config[Configuration.CONFIG_SENTRY];
        return _sentry.initialize(this);
    }
    /**
     * @return {Set<string>}
     * @private
     */
    _createAddOnSet() {
        /**@type{Set<string>}*/let _set = new Set();
        for (let prop in this._addOns) {
            if(this._addOns.hasOwnProperty(prop)) {
                _set.add(prop);
            }
        }
        return _set;
    }
    /**
     * @param {Set<string>} source
     * @param {Set<string>} target
     * @return {Set<string>}
     * @private
     */
    _compareSets(source, target) {
        /**@type{Set<string>}*/let _delta = new Set();
        for(let _src of source) {
            if(!target.has(_src)) _delta.add(_src);
        }
        return _delta;
    }
    _getUnsatisfiedDependanciesString(_deltas) {
        let _unsatisfied = "";
        for(let _dep of _deltas) {
            _unsatisfied += "\r\n\tFailed to resolve Add-On '" + _dep + "'.";
        }
        return _unsatisfied;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     * @private
     */
    async _installAddOns(azcontext) {
        /**@type{Set<string>}*/let _target = this._createAddOnSet();
        if(_target.size > 0) { // Do we even have any addons...
            for (let prop in this._addOns) {
                if(this._addOns.hasOwnProperty(prop)) {
                    /**@type{AddOn}*/let _addon = this._addOns[prop];
                    /**@type{Set<string>}*/let _source = _addon.getDependancies();
                    if(_source instanceof Set) {
                        /**@type{Set<string>}*/let _deltas = this._compareSets(_source, _target);
                        if(_deltas.size > 0) {
                            let _unsatisfied = this._getUnsatisfiedDependanciesString(_deltas);
                            azcontext.log.error("[Configuration._installAddOns(azcontext)] Unresolved dependancies for Add-On '" +
                                                _addon.name + "': " + _unsatisfied + "\r\nPlease resolve dependancies, update configuration, and restart.");
                            throw CelastrinaError.newError("Unresolved dependancies for Add-On '" + _addon.name + "'.", 500, true);
                        }
                    }
                    if(this._property != null) {
                        let _acfp = _addon.getConfigParser();
                        if (_acfp != null) this._cfp.addLink(_acfp);
                        let _aatp = _addon.getAttributeParser();
                        if (_aatp != null) this._atp.addLink(_aatp);
                    }
                }
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @param {ResourceManager} rm
     * @param {PermissionManager} prm
     * @return {Promise<void>}
     * @private
     */
    async _initAddOns(azcontext, pm, rm, prm) {
        let _promises = [];
        for(let prop in this._addOns) {
            if(this._addOns.hasOwnProperty(prop)) {
                /**@type{AddOn}*/let _addon = this._addOns[prop];
                _promises.unshift(_addon.initialize(azcontext, pm, rm, prm));
            }
        }
        await Promise.all(_promises);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @param {ResourceManager} rm
     * @return {Promise<void>}
     */
    async afterInitialize(azcontext, pm, rm) {}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     */
    async initialize(azcontext) {
        this._config[Configuration.CONFIG_CONTEXT] = azcontext;
        if(!this._loaded) {
            azcontext.log.info("[" + azcontext.bindingData.invocationId + "][Configuration.initialize(azcontext)]: Initializing Configuration.");
            let _name = this._config[Configuration.CONFIG_NAME];
            if(typeof _name !== "string" || _name.trim().length === 0 || _name.indexOf(' ') >= 0) {
                azcontext.log.error("[Configuration.load(azcontext)]: Invalid Configuration. Name cannot be undefined, null, or empty.");
                throw CelastrinaValidationError.newValidationError("Name cannot be undefined, null, or 0 length.", Configuration.CONFIG_NAME);
            }
            await this.beforeInitialize(azcontext);
            /**@type{PropertyManager}*/let _pm = this._getPropertyManager(azcontext);
            /**@type{PermissionManager}*/let _prm = this._getPermissionManager(azcontext);
            /**@type{ResourceManager}*/let _rm = this._getResourceManager(azcontext);
            await this._initPropertyManager(azcontext, _pm);
            await this._installAddOns(azcontext);
            await this._initLoadConfiguration(azcontext, _pm);
            await this._initPermissionManager(azcontext, _prm);
            await this._initResourceManager(azcontext, _rm);
            await this._initSentry(azcontext, _pm, _rm, _prm);
            await this._initAddOns(azcontext, _pm, _rm, _prm);
            await this.afterInitialize(azcontext, _pm, _rm);
            azcontext.log.info("[" + azcontext.bindingData.invocationId + "][Configuration.initialize(azcontext)]: Initialization successful.");
        }
    }
    /**
     * @return{Promise<void>}
     */
    async ready() {this._loaded = true;}
}
/**@abstract*/
class Algorithm {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Algorithm";
    /**
     * @param {string} name
     */
    constructor(name) {
        if(typeof name === "undefined" || name == null || name.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'name' cannot be undefined, null, or zero length.", "name");
        this._name = name;
        this.__type = Algorithm.CELASTRINAJS_TYPE;
    }
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
        if(typeof key !== "string" || key.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argement 'key' cannot be undefined, null or zero length.", "key");
        if(typeof iv !== "string"  || iv.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argement 'iv' cannot be undefined, null or zero length.", "iv");
        this._key = key;
        this._iv  = iv;
    }
    /**@return{Promise<Cipher>}*/
    async createCipher() {
        try {
            return crypto.createCipheriv(this._name, this._key, this._iv);
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception);
        }
    }
    /**@return{Promise<Decipher>}*/
    async createDecipher() {
        try {
            return crypto.createDecipheriv(this._name, this._key, this._iv);
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception);
        }
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.Cryptography";
    /**@param{Algorithm}algorithm*/
    constructor(algorithm) {
        this._algorithm = algorithm;
        this.__type = Cryptography.CELASTRINAJS_TYPE;
    }
    /**@return{Promise<void>}*/
    async initialize() {
        return this._algorithm.initialize();
    }
    /**
     * @param {string} value
     * @return {Promise<string>}
     */
    async encrypt(value) {
        try {
            let cryp = await this._algorithm.createCipher();
            let encrypted = cryp.update(value, "utf8", "hex");
            encrypted += cryp.final("hex");
            encrypted = Buffer.from(encrypted, "hex").toString("base64");
            return encrypted;
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception);
        }
    }
    /**
     * @param {string} value Base64 encded HEX string.
     * @return {Promise<string>}
     */
    async decrypt(value) {
        try {
            let cryp = await this._algorithm.createDecipher();
            let encrypted = Buffer.from(value, "base64").toString("hex");
            let decrypted = cryp.update(encrypted, "hex", "utf8");
            decrypted += cryp.final("utf8");
            return decrypted;
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception);
        }
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.MonitorResponse";
    constructor() {
        this._passed = {};
        this._failed = {};
        this._passedCheck = false;
        this.__type = MonitorResponse.CELASTRINAJS_TYPE;
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.ValueMatch";
    /**
     * @brief
     * @param {string} [type]
     */
    constructor(type = "ValueMatch"){
        this._type = type;
        this.__type = ValueMatch.CELASTRINAJS_TYPE;
    }
    /** @return {string} */get type(){return this._type;}
    /**
     * @param {Set<string>} assertion
     * @param {Set<string>} values
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
     * @param {Set<string>} assertion
     * @param {Set<string>} values
     * @return {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        let match = false;
        for(const role of assertion) {
            if((match = values.has(role))) break;
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
     * @param {Set<string>} assertion
     * @param {Set<string>} values
     * @return {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        let match = false;
        for(const role of values) {
            if(!(match = assertion.has(role))) break;
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
     * @param {Set<string>} assertion
     * @param {Set<string>} values
     * @return {Promise<boolean>}
     */
    async isMatch(assertion, values) {
        let match = false;
        for(const role of values) {
            if((match = assertion.has(role))) break;
        }
        return !match;
    }
}
/**
 * Permission
 * @author Robert R Murrell
 */
class Permission {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Permission";
    /**
     * @param {string} action
     * @param {(Array<string>|Set<string>)} roles
     * @param {ValueMatch} [match]
     */
    constructor(action, roles = new Set(), match = new MatchAny()) {
        /**@type{Set<string>}*/this._roles = null;
        if(roles instanceof Set)
            this._roles = roles;
        else if(Array.isArray(roles))
            this._roles = new Set(roles);
        else
            this._roles = new Set();
        this._action = action.toLowerCase();
        this._match = match;
        this.__type = Permission.CELASTRINAJS_TYPE;
    }
    /**@return{string}*/get action(){return this._action;}
    /**@return{Set<string>}*/get roles(){return this._roles;}
    /**
     * @param {string} role
     * @return {Permission}
     */
    addRole(role){this._roles.add(role); return this;}
    /**
     * @param {(Array<string>|Set<string>)} roles
     * @return {Permission}
     */
    addRoles(roles){this._roles = new Set([...this._roles, ...roles]); return this;}
    /**
     * @param {Subject} subject
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.PermissionManager";
    constructor() {
        /**@type{Object}*/this._permissions = {};
        this.__type = PermissionManager.CELASTRINAJS_TYPE;
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
 * DefaultRoleFactory
 * @abstract
 * @author Robert R Murrell
 */
class RoleFactory {
    static CELASTRINAJS_TYPE = "celastrinajs.core.RoleFactory";
    constructor() {
        this.__type = RoleFactory.CELASTRINAJS_TYPE;
    }
    /**
     * @param {Context} context
     * @param {Subject} subject
     * @abstract
     * @return {Promise<Array<string>>}
     */
    async getSubjectRoles(context, subject) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {Context} context
     * @param {Subject} subject
     * @return {Promise<Subject>}
     */
    async assignSubjectRoles(context, subject) {
        let _roles = await this.getSubjectRoles(context, subject);
        if(Array.isArray(_roles)) subject.addRoles(_roles);
        return subject;
    }
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async initialize(config) {};
}
/**
 * DefaultRoleFactory
 * @author Robert R Murrell
 */
class DefaultRoleFactory extends RoleFactory {
    constructor() {super()}
    /**
     * @param {Context} context
     * @param {Subject} subject
     * @return {Promise<Array<string>>}
     */
    async getSubjectRoles(context, subject) {return [];}
}
/**
 * Subject
 * @author Robert R Murrell
 */
class Subject {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Subject";
    /**
     * @param {string} id
     * @param {Array<string>} [roles=[]]
     * @param {Object} [claims={}]
     */
    constructor(id, roles = [], claims = {}) {
        this._claims = claims;
        this._claims.sub = id;
        /**@type{Set}*/this._roles = new Set(roles);
        this.__type = Subject.CELASTRINAJS_TYPE;
    }
    /**@return{string}*/get id(){return this._claims.sub;}
    /**@return{Set<string>}*/get roles() {return this._roles;}
    /**@return{Object}*/get claims() {return this._claims;}
    /**
     * @param {string} role
     * @return {Subject}
     */
    addRole(role){this._roles.add(role); return this;}
    /**
     * Not doing a concat because we dont want to add the same role twice, thats sleezy.
     * @param {Array<string>} roles
     * @return {Subject}
     */
    addRoles(roles) {
        if(roles.length > 0)
            this._roles = new Set([...this._roles, ...roles]);
        return this;
    }
    /**
     * @param {string} key
     * @param {string} value
     * @return {Subject}
     */
    addClaim(key, value) {this._claims[key] = value; return this;}
    /**
     * @param {Object} claims
     */
    addClaims(claims) {Object.assign(this._claims, claims); return this;}
    /**
     * @param {string} role
     * @return {Promise<boolean>}
     */
    async isInRole(role) {return this.isInRoleSync(role);}
    /**
     * @param {string} role
     * @return {boolean}
     */
    isInRoleSync(role) {return this._roles.has(role);}
    /**
     * @param {string} claim
     * @return{boolean}
     * @return {Promise<boolean>}
     */
    async hasClaim(claim) {return this.hasClaimSync(claim);}
    /**
     * @param {string} claim
     * @return{boolean}
     * @return {boolean}
     */
    hasClaimSync(claim) {return this._claims.hasOwnProperty(claim);}
    /**
     * @param {string} key
     * @param {(null|string)} defaultValue
     * @return {Promise<*>}
     */
    async getClaim(key, defaultValue = null) {return this.getClaimSync(key, defaultValue);}
    /**
     * @param {string} key
     * @param {(null|string)} defaultValue
     * @return {*}
     */
    getClaimSync(key, defaultValue = null) {
        let _claim = this._claims[key];
        if(typeof _claim == "undefined" || _claim == null) _claim = defaultValue;
        return _claim;
    }
    /**
     * @param {Object} claims
     * @return {Promise<void>}
     */
    async getClaims(claims) {return this.getClaimsSync(claims);}
    /**
     * @param {Object} claims
     * @return {void}
     */
    getClaimsSync(claims) {
        for(let _prop in claims) {
            if(claims.hasOwnProperty(_prop)) {
                let _value = this._claims[_prop];
                if(typeof _value !== "undefined") claims[_prop] = _value;
            }
        }
    }
}
/**
 * Asserter
 * @author Robert R Murrell
 */
class Asserter {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Asserter";
    /**
     * @param {Context} context
     * @param {Subject} subject
     * @param {PermissionManager} permissions
     * @param {Boolean} [optimistic=false]
     */
    constructor(context, subject, permissions, optimistic = false) {
        if(typeof context === "undefined" || context == null)
            throw CelastrinaValidationError.newValidationError("Argument 'context' is required.", "Asserter.context");
        if(typeof subject === "undefined" || subject == null)
            throw CelastrinaValidationError.newValidationError("Argument 'subject' is required.", "Asserter.subject");
        if(typeof permissions === "undefined" || permissions == null)
            throw CelastrinaValidationError.newValidationError("Argument 'permissions' is required.", "Asserter.permissions");
        this._context = context;
        this._subject = subject;
        this._permissions = permissions;
        this._optimistic = optimistic;
        this._assertions = {};
        this._assignments = new Set();
        this.__type = Asserter.CELASTRINAJS_TYPE;
    }
    /**@return{Context}*/get context() {return this._context;}
    /**@return{Subject}*/get subject() {return this._subject;}
    /**@return{PermissionManager}*/get permissions() {return this._permissions;}
    /**@return{Boolean}*/get optimistic() {return this._optimistic;}
    /**
     * @param {string} name
     * @param {boolean} [result=false]
     * @param {Array<string>} [assignments=null]
     * @param {(null|string)} [remarks=null]
     * @return {boolean}
     */
    assert(name, result = false, assignments = null, remarks = null) {
        if(typeof name !== "string" || name.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'name' is required.", "Asserter.name");
        if(assignments != null) this._assignments = new Set([...this._assignments, ...assignments]);
        this._assertions[name.trim()] = {res: result, rmks: remarks};
        return result;
    }
    async getAssertion(name) {
        let _assertion = this._assertions[name];
        if(typeof _assertion === "undefined") return null;
        else return _assertion;
    }
    /**
     * @param {Subject} subject
     * @return {Promise<void>}
     */
    async assign(subject) {
        subject.addRoles([...this._assignments]);
    }
    /**
     * @return {Promise<boolean>}
     */
    async hasAffirmativeAssertion() {
        for(let name in this._assertions) {
            if(this._assertions.hasOwnProperty(name))
                if(this._assertions[name].res) return true;
        }
        return false;
    }
}
/**
 * Authenticator
 * @authro Robert R Murrell
 * @abstract
 */
class Authenticator {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Authenticator";
    constructor(name = "Authenticator", required = false, link = null) {
        this._name = name;
        this._required = required;
        /**@type{Authenticator}*/this._link = link;
        this.__type = Authenticator.CELASTRINAJS_TYPE;
    }
    /**@return{string}*/get name() {return this._name;}
    /**@return{boolean}*/get required() {return this._required;}
    /**
     * @param {Authenticator} link
     */
    addLink(link) {(this._link == null) ? this._link = link : this._link.addLink(link);}
    /**
     * @param {Asserter} assertion
     * @return {Promise<void>}
     */
    async authenticate(assertion) {
        /**@type{boolean}*/let _result = await this._authenticate(assertion);
        if(!_result) {
            assertion.context.log("Subject '" + assertion.subject.id + "' failed to authenticate '" +
                                          this._name + "'", LOG_LEVEL.THREAT, "Authenticator.authenticate(auth)");
            if(this._required) throw CelastrinaError.newError("Not Authorized.", 401);
        }
        if(this._link != null) return this._link.authenticate(assertion);
    }
    /**
     * @param {Asserter} assertion
     * @return {Promise<boolean>}
     * @abstract
     */
    async _authenticate(assertion) {
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
}
/**
 * Authorizor
 * @authro Robert R Murrell
 */
class Authorizor {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Authorizor";
    /**
     * @param {string} name
     * @param {Authorizor} link
     */
    constructor(name= "BaseAuthorizor", link = null) {
        this._name = name;
        this._link = link;
        this.__type = Authorizor.CELASTRINAJS_TYPE;
    }
    /**@return{string}*/get name() {return this._name;}
    /**
     * @param {Authorizor} link
     */
    addLink(link) {(this._link == null) ? this._link = link : this._link.addLink(link);}
    /**
     * @param {Asserter} assertion
     * @return {Promise<void>}
     */
    async authorize(assertion) {
        /**@type{boolean}*/let _result = await this._authorize(assertion);
        if(!_result)
            assertion.context.log("Subject '" + assertion.subject.id + "' failed to authorize '" +
                                          this._name + "'", LOG_LEVEL.THREAT, "Authorizor.authorize(context, subject, pm)");
        if(this._link != null) return this._link.authorize(assertion);
    }
    /**
     * @param {Asserter} assertion
     * @return {Promise<boolean>}
     */
    async _authorize(assertion) {
        /**@type{Permission}*/let _permission = assertion.permissions.getPermission(assertion.context.action);
        if(_permission == null)
            return assertion.assert(this._name, assertion.optimistic);
        let _auth = await _permission.authorize(assertion.subject);
        let _msg = null;
        if(!_auth) _msg = "403 - Forbidden.";
        return assertion.assert(this._name, _auth, null, _msg);
    }
}
/**
 * Sentry
 * @author Robert R Murrell
 */
class Sentry {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Sentry";
    constructor() {
        /**@type{boolean}*/this._optimistic = false;
        /**@type{Authenticator}*/this._authenticator = null; // no authentication by default.
        /**@type{Authorizor}*/this._authorizor = new Authorizor();
        /**@type{PermissionManager}*/this._permissions = null;
        /**@type{RoleFactory}*/this._roleFactory = null;
        this.__type = Sentry.CELASTRINAJS_TYPE;
    }
    /**@return{boolean}*/get optimistic() {return this._optimistic;}
    /**@return{Authenticator}*/get AuthenticatorChain() {return this._authenticator};
    /**@return{Authorizor}*/get AuthorizorChain() {return this._authorizor};
    /**@return{PermissionManager}*/get permissions() {return this._permissions;}
    /**@return{RoleFactory}*/get roleFactory() {return this._roleFactory;}
    /**
     * @param {Authenticator} authenticator
     * @return {Sentry}
     */
    addAuthenticator(authenticator) {
        if(!instanceOfCelastringType(Authenticator.CELASTRINAJS_TYPE, authenticator))
            throw CelastrinaValidationError.newValidationError("Argument 'authenticator' must be type Authenticator.", "authenticator");
        if(this._authenticator == null) this._authenticator = authenticator;
        else this._authenticator.addLink(authenticator);
        return this;
    }
    /**
     * @param {Authorizor} authorizor
     * @return {Sentry}
     */
    addAuthorizor(authorizor) {
        if(!instanceOfCelastringType(Authorizor.CELASTRINAJS_TYPE, authorizor))
            throw CelastrinaValidationError.newValidationError("Argument 'authorizor' must be type Authorizor.", "authorizor");
        if(this._authorizor == null) this._authorizor = authorizor;
        else this._authorizor.addLink(authorizor);
        return this;
    }
    /**
     * @param {Context} context
     * @return {Promise<Subject>}
     */
    async authenticate(context) {
        let _subject = new Subject(context.requestId);
        let _asserter = new Asserter(context, _subject, this._permissions, this._optimistic);

        /* Default behavior is to run un-authenticated and rely on authorization to enforce optimism
           when no authenticator is specified. This is to avoid scenarios where the default Authorizor by-default
           returns true but optimistic is true and next link fails, making it pass authentication when optimistic.
           Simply returning false from the Authenticator is not sufficient as it produces the wrong behavior, or a 401
           instead of a 403. */
        if(this._authenticator == null) {
            context.subject = _subject;
            return this._roleFactory.assignSubjectRoles(context, _subject); // assign roles from role factory.
        }
        else {
            await this._authenticator.authenticate(_asserter);
            let _authenticated = await _asserter.hasAffirmativeAssertion();
            if(_authenticated || this._optimistic) {
                if(!_authenticated)
                    context.log("Subject '" + _subject.id + "' failed to authenticate any authenticators but security is optimistic.",
                        LOG_LEVEL.THREAT, "Sentry.authenticate(context)");
                await _asserter.assign(_subject); // assign roles from authenticators.
                context.subject = _subject;
                return this._roleFactory.assignSubjectRoles(context, _subject); // assign roles from role factory.
            }
            else {
                context.log("Subject '" + _subject.id + "' failed to authenticate any authenticators and security is not optimistic.",
                    LOG_LEVEL.THREAT, "Sentry.authenticate(context)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
        }
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async authorize(context) {
        let _asserter = new Asserter(context, context.subject, this._permissions, this._optimistic);
        await this._authorizor.authorize(_asserter);
        let _authorized = await _asserter.hasAffirmativeAssertion();
        if(_authorized || this._optimistic) {
            if(!_authorized)
                context.log("Subject '" + context.subject.id + "' failed to authorize any authorizors but security is optimistic.",
                                   LOG_LEVEL.THREAT, "Sentry.authorize(context)");
        }
        else {
            context.log("Subject '" + context.subject.id + "' failed to authorize any authorizors and security is not optimistic.",
                                LOG_LEVEL.THREAT, "Sentry.authorize(context)");
            throw CelastrinaError.newError("Forbidden.", 403);
        }
    }
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async initialize(config) {
        this._optimistic = config.authorizationOptimistic;
        this._permissions = config.permissions;
        this._roleFactory = config.roleFactory;
        return this._roleFactory.initialize(config);
    }
}
/**
 * @author Robert R Murrell
 */
class Context {
    static CELASTRINAJS_TYPE = "celastrinajs.core.Context";
    /**
     * @param {Configuration} config
     */
    constructor(config) {
        /**@type{string}*/this._requestId = uuidv4();
        /**@type{Configuration}*/this._config = config;
        /**@type{(null|string)}*/this._traceId = null;
        /**@type{boolean}*/this._monitor = false;
        /**@type{MonitorResponse}*/this._monitorResponse = null;
        /**@type{Subject}*/this._subject = null;
        /**@type{string}*/this._action = "process";
        /**@type{*}*/this._result = null;
        this.__type = Context.CELASTRINAJS_TYPE;
    }
    /**
     * @return {Promise<void>}
     */
    async initialize() {
        if(this._monitor)
            this._monitorResponse = new MonitorResponse();
        /** @type {{traceparent: string}} */
        let _traceContext = this._config.context.traceContext;
        if(typeof _traceContext !== "undefined")
            this._traceId = _traceContext.traceparent;
    }
    /**@return{string}*/get name() {return this._config.name;}
    /**@return{Configuration}*/get config(){return this._config;}
    /**@return{*}*/get result() {return this._result;}
    /**@return{boolean}*/get isMonitorInvocation(){return this._monitor;}
    /**@return{(null|MonitorResponse)}*/get monitorResponse(){return this._monitorResponse;}
    /**@return{string}*/get invocationId(){return this._config.context.bindingData.invocationId;}
    /**@return{string}*/get requestId(){return this._requestId;}
    /**@return{string}*/get traceId(){return this._traceId;}
    /**@param{Sentry} sentry*/set sentry(sentry){this._sentry = sentry;}
    /**@return{Subject}*/get subject(){return this._subject;}
    /**@param{Subject} subject*/set subject(subject){this._subject = subject;}
    /**@return{string}*/get action(){return this._action;}
    /**@return{PropertyManager}*/get properties(){return this._config.properties;}
    /**@return{Sentry}*/get sentry() {return this._config.sentry;}
    /**@return{ResourceManager}*/get authorizations(){return this._config.resources;}
    /**@return{_AzureFunctionContext}*/get azureFunctionContext(){return this._config.context;}
    /**
     * @param{string} name
     * @param {*} [defaultValue=null]
     */
    getBinding(name, defaultValue = null) {
        let _value = this._config.context.bindings[name];
        if(typeof _value === "undefined" || _value == null)
            _value = defaultValue;
        return _value;
    }
    /**
     * @param {string} name
     * @param {*} [value=null]
     */
    setBinding(name, value = null) {
        this._config.context.bindings[name] = value;
    }
    /**
     * @param {string} message
     * @param {number} [level=LOG_LEVEL.INFO]
     * @param {(null|string)} [subject=null]
     */
    log(message, level = LOG_LEVEL.INFO, subject = null) {
        let out = "[" + this._config.name + "]";
        if(typeof subject === "string") out += "[" + subject + "]";
        out += "[" + this._config.context.bindingData.invocationId + "]" + "[" + this._requestId + "]: " + message.toString();
        if(level === LOG_LEVEL.THREAT) out = "[THREAT]" + out;
        switch(level) {
            case LOG_LEVEL.ERROR:this._config.context.log.error(out); break;
            case LOG_LEVEL.INFO:this._config.context.log.info(out); break;
            case LOG_LEVEL.WARN:this._config.context.log.warn(out); break;
            case LOG_LEVEL.VERBOSE:this._config.context.log.verbose(out); break;
            case LOG_LEVEL.THREAT: this._config.context.log.warn(out); break;
            default:this._config.context.log.verbose(out);
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
    static CELASTRINAJS_TYPE = "celastrinajs.core.BaseFunction";
    /**@param{Configuration}configuration*/
    constructor(configuration) {
        /**@type{Configuration}*/this._configuration = configuration;
        /**@type{Context}*/this._context = null;
        this.__type = BaseFunction.CELASTRINAJS_TYPE;
    }
    /**@return{Context}*/get context() {return this._context;}
    /**@return{Configuration}*/get configuration() {return this._configuration;}
    /**
     * @param {Configuration} config
     * @return {Promise<Context>}
     */
    async createContext(config) {return new Context(config);}
    /**
      * @param {_AzureFunctionContext} azcontext
      * @return {Promise<void>}
      * @throws {CelastrinaError}
      */
    async bootstrap(azcontext) {
        await this._configuration.initialize(azcontext);
        /**@type{Sentry}*/let _sentry = await this._configuration.sentry;
        if(typeof _sentry === "undefined" || _sentry == null) {
            azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.bootstrap(azcontext)]: Catostrophic Error! Sentry is null or undefined.");
            throw CelastrinaError.newError("Catostrophic Error! Sentry invalid.");
        }
        /**@type{Context}*/let _context = await this.createContext(this._configuration);
        if(typeof _context === "undefined" || _context == null) {
            azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.bootstrap(azcontext)]: Catostrophic Error! Context is null or undefined.");
            throw CelastrinaError.newError("Catostrophic Error! Context invalid.");
        }
        await _context.initialize();
        this._context = _context;
        await this._configuration.ready();
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async initialize(context) {}
    /**
     * @param {Context} context
     * @return {Promise<Subject>}
     */
    async authenticate(context) {return context.sentry.authenticate(context);}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async authorize(context) {await context.sentry.authorize(context);}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async validate(context) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async monitor(context) {
        context.monitorResponse.addPassedDiagnostic("default", "Monitor not implemented.");
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async load(context) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async process(context) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async save(context) {}
    /**
     * @param {Context} context
     * @param {*} exception
     * @return {Promise<void>}
     */
    async exception(context, exception) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async terminate(context) {}
    /**
      * @brief Method called by the Azure Function to execute the lifecycle.
      * @param {_AzureFunctionContext} azcontext The azcontext of the function.
      */
    async execute(azcontext) {
        try {
            await this.bootstrap(azcontext);
            if((typeof this._context !== "undefined") && this._context != null) {
                await this.initialize(this._context);
                this._context.subject = await this.authenticate(this._context);
                await this.authorize(this._context);
                await this.validate(this._context);
                await this.load(this._context);
                if (this._context.isMonitorInvocation)
                    await this.monitor(this._context);
                else
                    await this.process(this._context);
                await this.save(this._context);
            }
            else {
                azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Catostrophic Error! Context was null after bootstrap, skipping all other life-cycles.");
                throw CelastrinaError.newError("Catostrophic Error! Context null.");
            }
        }
        catch(exception) {
            try {
                if((typeof this._context !== "undefined") && this._context != null)
                    await this.exception(this._context, exception);
                else
                    azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Catostrophic Error! Context was null, skipping exception life-cycle.");
            }
            catch(_exception) {
                let _ex = this._unhandled(azcontext, _exception);
                azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Exception thrown from Exception life-cycle: " +
                                  _ex  + ", caused by " + exception + ". ");
            }
        }
        finally {
            try {
                if((typeof this._context !== "undefined") && this._context != null) {
                    await this.terminate(this._context);
                    if (this._context.result == null)
                        azcontext.done();
                    else
                        azcontext.done(this._context.result);
                }
                else {
                    azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Catostrophic Error! Context was null, skipping terminate life-cycle.");
                    throw CelastrinaError.newError("Catostrophic Error! Context null.");
                }
            }
            catch(exception) {
                let _ex = this._unhandled(azcontext, exception);
                azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Exception thrown from Terminate life-cycle: " +
                                    _ex);
                azcontext.res.status = _ex.code;
                azcontext.done(_ex);
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
        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, ex)) {
            if(ex instanceof Error) ex = CelastrinaError.wrapError(ex);
            else ex = CelastrinaError.newError(ex);
        }
        context.log.error("[BaseFunction._unhandled(context, exception)][exception]: \r\n (MESSAGE:" + ex.message + ") \r\n (STACK:" + ex.stack + ") \r\n (CAUSE:" + ex.cause + ")");
        return ex;
    }
}
module.exports = {
    instanceOfCelastringType: instanceOfCelastringType,
    CelastrinaError: CelastrinaError,
    CelastrinaValidationError: CelastrinaValidationError,
    LOG_LEVEL: LOG_LEVEL,
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
    AttributeParser: AttributeParser,
    RoleFactoryParser: RoleFactoryParser,
    ConfigParser: ConfigParser,
    AddOn: AddOn,
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
    DefaultRoleFactory: DefaultRoleFactory,
    Subject: Subject,
    Asserter: Asserter,
    Authenticator: Authenticator,
    Authorizor: Authorizor,
    Sentry: Sentry,
    Context: Context,
    BaseFunction: BaseFunction
};
