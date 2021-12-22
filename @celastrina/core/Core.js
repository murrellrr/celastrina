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
const axios  = require("axios");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const {TokenResponse, AuthenticationContext} = require("adal-node");
const {TokenCredentials, AccessToken, GetTokenOptions} = require("@azure/identity");

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
 * @type {{TRACE: number, ERROR: number, VERBOSE: number, INFO: number, WARN: number, THREAT: number}}
 */
const LOG_LEVEL = {TRACE: 0, VERBOSE: 1, INFO: 2, WARN: 3, ERROR: 4, THREAT: 5};
/**
 * @brief Used to type-safe-check across node packages.
 * @description Uses static get attribute <code>static get celastrinaType</code> method to get the type string. Use this
 *              instead of instanceof for Celastrina types as this is a package-safe jecks for versions 4.x and up.
 * @param {(Error|Class)} _class The celastrinajs typestring.
 * @param {Object} _object The object instance you would like to check.
 * @return {boolean} True, if the target types is equalt to source type, false otherwise.
 */
function instanceOfCelastringType(_class, _object) {
    if(((typeof _class === "undefined" || _class === null)) || ((typeof _object !== "object") || _object == null)) return false;
    let _otype = _object.constructor.celastrinaType;
    let _ctype = _class.celastrinaType;
    if((typeof _otype !== "string") || (typeof _ctype !== "string")) return false;
    let _target = _object.constructor;
    do {
        if(_otype === _ctype) return true;
        _target = _target.__proto__;
        _otype = _target.celastrinaType;
    } while(typeof _otype !== "undefined");
    return false;
}
/**
 * CelastrinaError
 * @author Robert R Murrell
 */
class CelastrinaError extends Error {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CelastrinaError";}
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
        if(instanceOfCelastringType(CelastrinaError, ex))
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CelastrinaValidationError";}
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
        if(instanceOfCelastringType(CelastrinaValidationError, ex))
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
 * CelastrinaEvent
 * @author Robert R Murrell
 */
class CelastrinaEvent {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CelastrinaEvent";}
    /**
     * @param {Context} context
     * @param {*} [source=null]
     * @param {*} [data=null]
     * @param {moment.Moment} [time=moment()]
     * @param {boolean} [rejected=false]
     * @param {*} [cause=null]
     */
    constructor(context, source = null, data = null, time = moment(), rejected = false,
                cause = null) {
        this._context = context;
        this._source = source;
        this._data = data;
        this._time = time;
        /**@type{boolean}*/this._rejected = rejected;
        /**@type{*}*/this._cause = cause;
    }
    /**@return{Context}*/get context() {return this._context;}
    /**@return{*}*/get source() {return this._source;}
    /**@return{*}*/get data() {return this._data;}
    /**@return{moment.Moment}*/get time() {return new moment(this._time);}
    /**@return{boolean}*/get isRejected() {return this._rejected;}
    /**@return{*}*/get cause() {return this._cause;}
    reject(cause = null) {
        this._rejected = true;
        this._cause = cause;
    }
}
/**
 * ResourceAuthorization
 * @author Robert R Murrell
 * @abstract
 */
class ResourceAuthorization {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ResourceAuthorization";}
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
     * @param {(null|undefined|{principalId?:string,timeout?:number})} [options={}]
     * @return {Promise<_CelastrinaToken>}
     * @abstract
     */
    async _resolve(resource, options = {}) { throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {string} resource
     * @param {object} [options={}}]
     * @return {Promise<_CelastrinaToken>}
     * @private
     */
    async _refresh(resource, options = {}) {
        let token = await this._resolve(resource, options);
        if(this._skew !== 0) token.expires.add(this._skew, "seconds");
        this._tokens[resource] = token;
        return token;
    };
    /**
     * @param {string} resource
     * @param {object} [options=null]
     * @return {Promise<_CelastrinaToken>}
     * @private
     */
    async _getToken(resource, options = {}) {
        /** @type{_CelastrinaToken}*/let token = this._tokens[resource];
        if(typeof token !== "object" || moment().isSameOrAfter(token.expires))
            return await this._refresh(resource, options);
        else
            return token;
    }
    /**
     * Returns JUST the token string
     * @param {string} resource
     * @return {Promise<string>}
     */
    async getToken(resource) {
        /** @type{_CelastrinaToken}*/let token = await this._getToken(resource);
        return token.token;
    }
    /**
     * Returns the full token meta-data
     * @param {string} resource
     * @param {object} [options={}}]
     * @return {Promise<_CelastrinaToken>}
     */
    async getAccessToken(resource, options = {}) {
        return this._getToken(resource, options);
    }
}
/**
 * ManagedIdentityResource
 * @author Robert R Murrell
 */
class ManagedIdentityResource extends ResourceAuthorization {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ManagedIdentityResource";}
    /**@type{string}*/static MANAGED_IDENTITY = "celastrinajs.core.identity.managed";
    /**
     * @param {boolean}[stripDefaultRoleIdentifier=true]
     * @param {number}[skew=0]
     */
    constructor(stripDefaultRoleIdentifier = true, skew = 0) {
        super(ManagedIdentityResource.MANAGED_IDENTITY, skew);
        this._strip = stripDefaultRoleIdentifier;
        /**@type{(null|string)}*/this._default = null;
        this._mappings = {};
    }
    /**@return{boolean}*/get stripDefaultRoleIdentifier() {return this._strip;}
    /**@return{(null|string)}*/get defaultPrincipal() {return this._default;}
    /**@param{(null|string)}principalId*/set defaultPrincipal(principalId) {
        (typeof principalId === "string" && principalId.trim().length > 0) ? this._default = principalId.trim() : this._default = null;
    }
    /**
     * @param {string} principalId
     * @param {string} resource
     * @return {ManagedIdentityResource}
     */
    addResourceMapping(principalId, resource) {
        if(typeof principalId !== "string" || principalId.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'principalId' is required.", "principalId");
        if(typeof resource !== "string" || resource.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'resource' is required.", "resource");
        this._mappings[resource.trim()] = principalId.trim();
        return this;
    }
    /**
     * @param {{principal?:string, resource?:string}} mapping
     * @return {ManagedIdentityResource}
     */
    addResourceMappingObject(mapping) {
        this.addResourceMapping(mapping.principal, mapping.resource);
        return this;
    }
    /**
     * @param {string} resource
     * @return {Promise<(null|string)>}
     */
    async getPrincipalForResource(resource) {
        let _principalId = this._mappings[resource];
        if(typeof _principalId !== "string") _principalId = this._default;
        return _principalId;
    }
    /**
     * @param {string} resource
     * @param {(null|undefined|{principalId?:string,timeout?:number})} [options={}]
     * @return {Promise<_CelastrinaToken>}
     */
    async _resolve(resource, options = {}) {
        try {
            let _params = new URLSearchParams();
            _params.set("api-version", "2019-08-01");
            /**@type{boolean}*/let _strip = this._strip;
            /**@type{Object}*/let _config = {timeout: 2000};
            if(_strip) resource = resource.replace("/.default", "");
            _params.set("resource", resource);
            let _principal = null;
            if(typeof options === "object" && options != null) {
                if(typeof options.principalId === "string") _principal = options.principalId;
                if(typeof options.timeout === "number") _config.timeout = options.timeout;
            }
            if(typeof _principal !== "string") _principal = await this.getPrincipalForResource(resource);
            if(_principal != null) _params.set("principal_id", _principal);
            _config.params = _params;
            _config.headers = {"x-identity-header": process.env["IDENTITY_HEADER"]};
            let response = await axios.get(process.env["IDENTITY_ENDPOINT"], _config);
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
                throw CelastrinaError.newError("Exception getting resource '" + resource + "'.", 500, false, exception);
        }
    }
}
/**
 * AppRegistrationResource
 * @author Robert R Murrell
 */
class AppRegistrationResource extends ResourceAuthorization {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AppRegistrationResource";}
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
     * @param {(null|undefined|{principalId?:string,timeout?:number})} [options={}]
     * @return {Promise<_CelastrinaToken>}
     * @private
     */
    async _resolve(resource, options = {}) {
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
 * ResourceManagerTokenCredential
 * @author Robert R Murrell
 */
class ResourceManagerTokenCredential {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ResourceManagerTokenCredential";}
    /**
     * @param {ResourceAuthorization} ra
     */
    constructor(ra) {
        /**@type{ResourceAuthorization}*/this._ra = ra;
    };
    /**@return{ResourceAuthorization}*/get resourceAuthorization() {return this._ra;}
    /**
     * @param {(string|Array<string>)} scopes
     * @param {object} [options={}}]
     * @return {Promise<AccessToken>}
     */
    async getToken(scopes, options = {}) {
        let scope = scopes;
        if(Array.isArray(scopes)) {
            if(scopes.length >= 1) scope = scopes[0];
            else throw CelastrinaValidationError.newValidationError("Argument 'scopes' is required and must contain at least 1 scope.", "TokenCredential.[scopes]");
        }
        if(typeof scope !== "string" || scope.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'scope' is required.", "TokenCredential.scopes");
        let _at = await this._ra.getAccessToken(scope, options);
        return /**@type{AccessToken}*/{token: _at.token, expiresOnTimestamp: _at.expires.unix()};
    }
}
/**
 * ResourceManager
 * @author Robert R Murrell
 */
class ResourceManager {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ResourceManager";}
    constructor() {
        this._resources = {};
        if(typeof process.env["IDENTITY_ENDPOINT"] === "string")
            this._resources[ManagedIdentityResource.MANAGED_IDENTITY] = new ManagedIdentityResource();
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
    async getResource(id = ManagedIdentityResource.MANAGED_IDENTITY) {
        return this.getResourceSync(id);
    }
    /**
     * @param {string} id
     * @return {ResourceAuthorization}
     */
     getResourceSync(id = ManagedIdentityResource.MANAGED_IDENTITY) {
        let _auth = this._resources[id];
        if(!instanceOfCelastringType(ResourceAuthorization, _auth)) return null;
        else return _auth;
    }
    /**
     * @param {string} resource
     * @param {string} id
     * @return {Promise<string>}
     */
    async getToken(resource, id = ManagedIdentityResource.MANAGED_IDENTITY) {
        /**@type{ResourceAuthorization}*/let _auth = await this.getResource(id);
        if(_auth == null) return null;
        else return await _auth.getToken(resource);
    }
    /**
     * @param {string} id
     * @return {Promise<ResourceManagerTokenCredential>}
     */
    async getTokenCredential(id = ManagedIdentityResource.MANAGED_IDENTITY) {
        return this.getTokenCredentialSync(id);
    }
    /**
     * @param {string} id
     * @return {ResourceManagerTokenCredential}
     */
    getTokenCredentialSync(id = ManagedIdentityResource.MANAGED_IDENTITY) {
        /**@type{ResourceAuthorization}*/let _ra = this.getResourceSync(id);
        if(_ra == null) return null;
        else return new ResourceManagerTokenCredential(_ra);
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Vault";}
    /**
     * @param {number} [timeout=2000]
     */
    constructor(timeout = 2000) {
        this._params = new URLSearchParams();
        this._params.set("api-version", "7.1");
        this._timeout = timeout;
    }
    /**
     * @param {string} token
     * @param {string} identifier
     * @return {Promise<string>}
     */
    async getSecret(token, identifier) {
        try {
            let response = await axios.get(identifier,
                                    {params: this._params,
                                           headers: {"Authorization": "Bearer " + token},
                                           timeout: this._timeout});
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.PropertyManager";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AppSettingsPropertyManager";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AppConfigPropertyManager";}
    /**
     * @param {string} configStoreName
     * @param {string} [propResource = ManagedIdentityResource.MANAGED_IDENTITY]
     * @param {string} [vaultResource = ManagedIdentityResource.MANAGED_IDENTITY]
     * @param {string} [label="development"]
     * @param {boolean} [useVaultSecrets=true]
     * @param {number} [timeout=2000]
     */
    constructor(configStoreName, propResource = ManagedIdentityResource.MANAGED_IDENTITY,
                vaultResource = ManagedIdentityResource.MANAGED_IDENTITY, label = "development",
                useVaultSecrets = true, timeout = 2000) {
        super();
        this._configStore = "https://" + configStoreName + ".azconfig.io";
        this._endpoint = this._configStore + "/kv/{key}";
        this._timeout = timeout;
        if(typeof propResource !== "string" || propResource.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Arguemtn 'propResource' is required.", "propResource");
        if(typeof vaultResource !== "string" || vaultResource.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Arguemtn 'vaultResource' is required.", "vaultResource");
        this._propResource = propResource.trim();
        this._vaultResource = vaultResource.trim();
        this._params = new URLSearchParams();
        this._params.set("label", label);
        this._params.set("api-version", "1.0");
        /** @type {ResourceAuthorization} */this._authProp = null;
        /** @type {ResourceAuthorization} */this._authVault = null;
        /** @type{boolean} */this._useVaultSecrets = useVaultSecrets;
        if(this._useVaultSecrets)
            /** @type{Vault} */this._vault = new Vault(this._timeout);
    }
    /**@return{string}*/get name() {return "AppConfigPropertyManager";}
    /**@return{string}*/get configStore() {return this._configStore;}
    /**@return{number}*/get timeout() {return this._timeout;}
    /**@param{number}timeout*/set timeout(timeout) {this._timeout = timeout;}
    /**@return{boolean}*/get useVault() {return this._useVaultSecrets;}
    /**@param{boolean}useVault*/set useVault(useVault) {this._useVaultSecrets = useVault;}
    /**@return{string}*/get propertyResource() {return this._propResource;}
    /**@return{string}*/get label() {return this._params.get("label");}
    /**@return{string}*/get apiVersion() {return this._params.get("api-version");}
    /**@return{Vault}*/get vault() {return this._vault;}
    /**@param{string}label*/set label(label) {
        if(typeof label !== "string" || label.trim().length === 0) this._params.set("label", "development");
        else this._params.set("label", label.trim());
    }
    /**@param{string}resource*/set propertyResource(resource) {
        if(typeof resource !== "string" || resource.trim().length === 0)
            throw new CelastrinaValidationError.newValidationError("Argument 'resource' is required.", "resource");
        this._propResource = resource.trim();
    }
    /**@return{string}*/get vaultResource() {return this._vaultResource;}
    /**@param{string}resource*/set vaultResource(resource) {
        if(typeof resource !== "string" || resource.trim().length === 0)
            throw new CelastrinaValidationError.newValidationError("Argument 'resource' is required.", "resource");
        this._vaultResource = resource.trim();
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {
        if(this._propResource === ManagedIdentityResource.MANAGED_IDENTITY) {
            if(typeof process.env["IDENTITY_ENDPOINT"] !== "string")
                throw CelastrinaError.newError(
                    "AppConfigPropertyManager requires User or System Assigned Managed Identies to be enabled.");
        }
        /**@type{ResourceManager}*/let _rm = config[Configuration.CONFIG_RESOURCE];
        this._authProp = await _rm.getResource(this._propResource);
        if(!instanceOfCelastringType(ResourceAuthorization, this._authProp))
            throw CelastrinaError.newError(
                "Property resource authorization '" + this._propResource + "' not found. AppConfigPropertyManager initialization failed.");
        if(this._useVaultSecrets) {
            if(this._vaultResource === this._propResource) this._authVault = this._authProp;
            else {
                this._authVault = await _rm.getResource(this._vaultResource);
                if(!instanceOfCelastringType(ResourceAuthorization, this._authProp))
                    throw CelastrinaError.newError(
                        "Vault resource authorization '" + this._vaultResource + "' not found. AppConfigPropertyManager initialization failed.");
            }
        }
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async ready(azcontext, config) {}
    /**
     * @param _config
     * @return {Promise<*>}
     * @private
     */
    async _resolveVaultReference(_config) {
        /**@type{{uri?:string}}*/let _vlt = JSON.parse(_config.value);
        return await this._vault.getSecret(await this._authVault.getToken("https://vault.azure.net"), _vlt.uri);
    }
    /**
     * @param {{content_type?:string}} kvp
     * @return {boolean}
     * @private
     */
    _isVaultReference(kvp) {
        return (kvp.content_type === "application/vnd.microsoft.appconfig.keyvaultref+json;charset=utf-8" &&
                this._useVaultSecrets);
    }
    /**
     * @param {{value?:string}} kvp
     * @return {Promise<*>}
     * @private
     */
    async _resolveFeatureFlag(kvp) {
        return kvp.value;
    }
    /**
     * @param {{content_type?:string}} kvp
     * @return {boolean}
     * @private
     */
    _isFeatureFlag(kvp) {
        return kvp.content_type === "application/vnd.microsoft.appconfig.ff+json;charset=utf-8";
    }
    /**
     * @param {string} key
     * @return {Promise<*>}
     * @private
     */
    async _getAppConfigProperty(key) {
        try {
            let token = await this._authProp.getToken(this._configStore);
            let _endpoint = this._endpoint.replace("{key}", key);
            let response = await axios.get(_endpoint,
                                           {params: this._params,
                                                  headers: {"Authorization": "Bearer " + token,
                                                  timeout: this._timeout}});
            let _value = response.data;
            if(this._isVaultReference(_value))
                return await this._resolveVaultReference(_value);
            else if(this._isFeatureFlag(_value))
                return await this._resolveFeatureFlag(_value);
            else
                return _value.value;
        }
        catch(exception) {
            if(instanceOfCelastringType(CelastrinaError, exception))
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
 * CacheProperty
 * @author Robert R Murrell
 */
class CacheProperty {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CacheProperty";}
    /**
     * @param {*} [value = null]
     * @param {boolean} [cache = true]
     * @param {number} [time=5]
     * @param {moment.DurationInputArg2} [unit="minutes"]
     */
    constructor(value = null, cache = true, time = 5, unit = "minutes") {
        if(time < 0) time = 0;
        /**@type{*}*/this._value = value;
        /**@type{boolean}*/this._cache = cache;
        /**@type{(null|moment.Moment)}*/this._expires = null;
        /**@type{(null|moment.Moment)}*/this._lastUpdate = null;
        /**@type{number}*/this._time = time;
        /**@type{moment.DurationInputArg2} */this._unit = unit;
        if(this._cache) {
            if(this._time > 0) this._expires = moment().add(this._time, this._unit);
        }
        else this._time = 0;
        if(this._value != null) this._lastUpdate = moment();
    }
    setNoCache() {
        this._cache = false;
        this._lastUpdate = null;
    }
    setNoExpire() {
        this._cache = true;
        this._lastUpdate = null;
        this._time = 0;
    }
    /**@return{boolean}*/get cache() {return this._cache;}
    /**@return{number}*/get time() {return this._time;}
    /**@param{number}unit*/set time(unit) {
        if(this._cache) {
            if(this._time > 0) this._expires = moment().add(this._time, this._unit);
        }
        else this._time = 0;
    }
    /**@return{moment.DurationInputArg2}*/get unit() {return this._unit;}
    /**@param{moment.DurationInputArg2}unit*/set unit(unit) {this._unit = unit;}
    /**@return{(null|moment.Moment)}*/get expires(){return this._expires;}
    /**@return{(null|moment.Moment)}*/get lastUpdated(){return this._lastUpdate;}
    /**@return{*}*/get value(){return this._value;}
    /**@param{*}value*/
    set value(value) {
        this._value = value;
        this._lastUpdate = moment();
        if(this._time > 0) this._expires = this._lastUpdate.add(this._time, this._unit);
    }
    /**@return{boolean}*/get isExpired() {
        if(!this._cache || this._lastUpdate == null) return true;
        else if(this._expires == null) return false;
        else return moment().isSameOrAfter(this._expires);
    }
    /**@return{Promise<void>}*/
    async clear() {this._value = null; this._expires = null;}
}
/**
 * CachedPropertyManager
 * @author Robert R Murrell
 */
class CachedPropertyManager extends PropertyManager {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CachedPropertyManager";}
    /**
     * @param {PropertyManager} [manager=new AppSettingsPropertyManager()]
     * @param {number} [defaultTime=5]
     * @param {moment.DurationInputArg2} [defaultUnit="minutes"]
     * @param {Array<{key:string,cache:CacheProperty}>} [controls=[]]
     */
    constructor(manager = new AppSettingsPropertyManager(), defaultTime = 5,
                defaultUnit = "minutes", controls = []) {
        super();
        /**@type{PropertyManager}*/this._manager = manager;
        /**@type{Object}*/this._cache = {};
        /**@type{number}*/this._defaultTime = defaultTime;
        /**@type{moment.DurationInputArg2}*/this._defaultUnit = defaultUnit;
        for(/**@type{{key:string,cache:CacheProperty}}*/let _control of controls) {
            this._cache[_control.key] = _control.cache;
        }
    }
    /**@return{string}*/get name() {return "CachedPropertyManager(" + this._manager.name + ")";}
    /**@return{PropertyManager}*/get manager(){return this._manager;}
    /**@return{Object}*/get cache(){return this._cache;}
    /**@return{number}*/get defaultTimeout() {return this._defaultTime;}
    /**@param{number}timeout*/set defaultTimeout(timeout) {this._defaultTime = timeout;}
    /**@return{moment.DurationInputArg2}*/get defaultUnit() {return this._defaultUnit;}
    /**@param{moment.DurationInputArg2}unit*/set defaultUnit(unit) {this._defaultUnit = unit;}
    /**
     * @return{Promise<void>}
     */
    async clear() {
        /**@type{Array<Promise<void>>}*/let promises = [];
        for(let prop in this._cache) {
            if(this._cache.hasOwnProperty(prop)) {
                /**@type{CacheProperty}*/let cached = this._cache[prop];
                if(instanceOfCelastringType(CacheProperty, cached) && cached.cache) promises.unshift(cached.clear());
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
        await this._manager.ready(azcontext, config);
        azcontext.log.info("[CachedPropertyManager.ready(context, config, force)]: Cache ready.");
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {
        await this._manager.initialize(azcontext, config);
        azcontext.log.info("[CachedPropertyManager.initialize(context, config)]: Cache initialized.");
    }
    /**
     * @param {string} key
     * @return {Promise<CacheProperty>}
     */
    async getCacheInfo(key) {
        /**@type{CacheProperty}*/let cached = this._cache[key];
        if(!instanceOfCelastringType(CacheProperty, cached)) return null;
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
    async _getPropertyFromSource(key, defaultValue, func, construct) {
        return this._manager[func](key, defaultValue, construct);
    }
    /**
     * @param {string} key
     * @param {*} defaultValue
     * @param {string} func
     * @param {function(*)} [construct]
     * @return {Promise<*>}
     * @private
     */
    async _createCache(key, defaultValue, func, construct) {
        let _value = await this._getPropertyFromSource(key, defaultValue, func, construct);
        if(_value != null) this._cache[key] =  new CacheProperty(_value, true, this._defaultTime, this._defaultUnit);
        return _value;
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
        /**@type{CacheProperty}*/let cached  = this._cache[key];
        if(!instanceOfCelastringType(CacheProperty, cached))
            return this._createCache(key, defaultValue, func, construct);
        else if(!cached.cache)
            return this._getPropertyFromSource(key, defaultValue, func, construct);
        else if(cached.isExpired) {
            let _value = await this._getPropertyFromSource(key, defaultValue, func, construct);
            cached.value = _value;
            return _value;
        }
        else
            return cached.value;
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
     * @param {*} [value=null]
     * @return {Promise<void>}
     */
    async setProperty(key, value = null) {
        let _cache = await this.getCacheInfo(key);
        if(_cache != null && _cache.cache) _cache.value = value;
    }
}
/**
 * PropertyManagerFactory
 * @abstract
 * @author Robert R Murrell
 */
class PropertyManagerFactory {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.PropertyManagerFactory";}
    /**@param{(null|string)}[name=null]*/
    constructor(name = null) {
        this._name = name;
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
            let _cache = source.cache;
            let _ttl = 5;
            let _unit = "minutes";
            let _config = [];
            if(_cache.hasOwnProperty("active") && typeof _cache.active === "boolean" && _cache.active) {
                /**@type{CachedProperty}*/let cache = source.cache;
                if(_cache.hasOwnProperty("ttl") && typeof _cache.ttl === "number")
                    _ttl = _cache.ttl;
                if(_cache.hasOwnProperty("unit") && typeof _cache.unit === "string" && _cache.unit.trim().length > 0)
                    _unit = _cache.unit.trim();
                if(_cache.hasOwnProperty("controls") && Array.isArray(_cache.controls)) {
                    let _controls = _cache.controls;
                    for(let _control of _controls) {
                        if(!_control.hasOwnProperty("key") || typeof _control.key !== "string" || _control.key.trim().length === 0)
                            throw CelastrinaValidationError.newValidationError(
                                "Error creating cache control for '" + this.name + "'. Argment 'key' is required.", "key");
                        if(_control.hasOwnProperty("noCache") && typeof _control.noCache === "boolean" && _control.noCache)
                            _config.push({key: _control.key, cache: new CacheProperty(null, false)});
                        else if(_control.hasOwnProperty("noExpire") && typeof _control.noExpire === "boolean" && _control.noExpire)
                            _config.push({key: _control.key, cache: new CacheProperty(null, true, 0)});
                        else {
                            let _cttl = _ttl;
                            let _cunit = _unit;
                            if(_control.hasOwnProperty("ttl") && typeof _control.ttl === "number")
                                _cttl = _control.ttl;
                            if(_control.hasOwnProperty("unit") && typeof _control.unit === "string" && _control.unit.trim().length > 0)
                                _cunit = _control.unit.trim();
                            _config.push({key: _control.key, cache: new CacheProperty(null, true, _cttl, _cunit)});
                        }
                    }
                }
            }
            return new CachedPropertyManager(manager, _ttl, _unit, _config);
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AppConfigPropertyManagerFactory";}
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
        let _timeout = 2000;
        if(source.hasOwnProperty("label") && typeof source.label === "string" && source.label.trim().length > 0)
            _label = source.label;
        if(source.hasOwnProperty("useVault") && typeof source.useVault === "boolean")
            _useVault = source.useVault;
        if(source.hasOwnProperty("timeout") && typeof source.timeout === "number")
            _timeout = source.timeout;
        return new AppConfigPropertyManager(source.store, ManagedIdentityResource.MANAGED_IDENTITY,
                                            ManagedIdentityResource.MANAGED_IDENTITY, _label, _useVault, _timeout);
    }
}
/**
 * ParserChain
 * @author Robert R Murrell
 * @abstract
 */
class ParserChain {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ParserChain";}
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
        /**@type{AddOnManager}*/this._addons = null;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @param {AddOnManager} addons
     */
    initialize(azcontext, config, addons) {
        this._pm = config[Configuration.CONFIG_PROPERTY];
        this._azcontext = azcontext;
        this._config = config;
        this._addons = addons;
        if(this._link != null) this._link.initialize(azcontext, config, addons);
    }
    /**
     * @param {ParserChain} link
     */
    addLink(link) {
        if(instanceOfCelastringType(ParserChain, link)) {
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
    /**@return{AddOnManager}*/get addOns() {return this._addons;}
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
    static _CONFIG_PARSER_ATTRIBUTE_TYPE = "application/vnd.celastrinajs.attribute+json";
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AttributeParser";}
    /**
     * @param {string} [type="Object"]
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(type = "Object", link = null, version = "1.0.0") {
        super(AttributeParser._CONFIG_PARSER_ATTRIBUTE_TYPE, type, link, version);
    }
}
/**
 * PropertyParser
 * @author Robert R Murrell
 */
class PropertyParser extends AttributeParser {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.PropertyParser";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.PermissionParser";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AppRegistrationResourceParser";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.RoleFactoryParser";}
    /**
     * @param {AttributeParser} [link=null]
     * @param {string} [type="RoleFactory"]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, type = "RoleFactory" , version = "1.0.0") {
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
 * PrincipalMapping
 * @author Robert R Murrell
 */
class PrincipalMappingParser extends AttributeParser {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.PrincipalMappingParser";}
    /**
     * @param {AttributeParser} link
     * @param {string} [type="PrincipalMapping"]
     * @param {string} version
     */
    constructor(link = null, type = "PrincipalMapping", version = "1.0.0") {
        super(type, link, version);
    }
    /**
     * @param {Object} _PrincipalMapping
     * @return {Promise<{principal?:string, resource?:string}>}
     */
    async _create(_PrincipalMapping) {
        if(!_PrincipalMapping.hasOwnProperty("principal") || typeof _PrincipalMapping.principal !== "string" ||
                _PrincipalMapping.principal.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Attribute 'principal' is required.", "_PrincipalMapping.principal");
        if(!_PrincipalMapping.hasOwnProperty("resource") || typeof _PrincipalMapping.resource !== "string" ||
            _PrincipalMapping.resource.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Attribute 'resource' is required.", "_PrincipalMapping.resource");
        return {principal: _PrincipalMapping.principal, resource: _PrincipalMapping.resource};
    }
}
/**
 * ConfigParser
 * @author Robert R Murrell
 * @abstract
 */
class ConfigParser extends ParserChain {
    static _CONFIG_PARSER_TYPE = "application/vnd.celastrinajs.config+json";
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ConfigParser";}
    /**
     * @param {string} [type="Config"]
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(type = "Config", link = null, version = "1.0.0") {
        super(ConfigParser._CONFIG_PARSER_TYPE, type, link, version);
    }
}
/**
 * CoreConfigParser
 * @author Robert R Murrell
 */
class CoreConfigParser extends ConfigParser {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CoreConfigParser";}
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
    async _createPrincipalMappings(_Object) {
        /**@type{ResourceManager}*/let _rm = this._config[Configuration.CONFIG_RESOURCE];
        if(instanceOfCelastringType(ResourceManager, _rm)) {
            /**@type{ManagedIdentityResource}*/let _mi = /**@type{ManagedIdentityResource}*/await _rm.getResource(ManagedIdentityResource.MANAGED_IDENTITY);
            if(instanceOfCelastringType(ManagedIdentityResource, _mi)) {
                if(_Object.hasOwnProperty("resources") && (typeof _Object.resources === "object") &&
                    _Object.resources != null) {
                    let _resobj = _Object.resources;
                    if(_resobj.hasOwnProperty("identity") && (typeof _resobj.identity === "object") &&
                        _resobj.identity != null) {
                        let _idntty = _resobj.identity;
                        if(_idntty.hasOwnProperty("mappings") && Array.isArray(_idntty.mappings) &&
                                _idntty.mappings != null) {
                            for(let _mapping of _idntty.mappings) {
                                _mi.addResourceMappingObject(_mapping);
                            }
                        }
                    }
                }
            }
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
        _promises.unshift(this._createPrincipalMappings(_Object));
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AddOn";}
    /**@return{string}*/static get addOnName() {return "celastrinajs.core.AddOn";}
    /**
     * @param {Array<string>} [dependencies=[]]
     * @param {Array<number>} [lifecycles=[]]
     */
    constructor(dependencies = [], lifecycles = []) {
        /**@type{Set<string>}*/this._dependencies = new Set(dependencies);
        /**@type{Set<number>}*/this._lifecycles = new Set(lifecycles);
    }
    /**@return{Set<string>}*/get dependancies() {return this._dependencies;}
    /**@return{Set<number>}*/get lifecycles() {return this._lifecycles;}
    /**@return {ConfigParser}*/getConfigParser() {return null;}
    /**@return {AttributeParser}*/getAttributeParser() {return null;}
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {};
}
/**
 * LifeCycle
 * @author Robert R Murrell
 */
class LifeCycle {
    /**
     * @type {{AUTHENTICATE: number, TERMINATE: number, INITIALIZE: number, AUTHORIZE: number, LOAD: number,
     *         MONITOR: number, PROCESS: number, EXCEPTION: number, VALIDATE: number, SAVE: number}}
     */
    static STATE = {
        INITIALIZE: 0, AUTHENTICATE: 1, AUTHORIZE: 2, VALIDATE: 3, LOAD: 4, MONITOR: 5, PROCESS: 6,
        SAVE: 7, TERMINATE: 8, EXCEPTION: 9};
    /**
     * @param {Context} context
     * @param {BaseFunction} source
     * @param {number} [lifecycle=LifeCycle.STATE.EXCEPTION]
     * @param {*} [exception=null]
     */
    constructor(context, source, lifecycle = LifeCycle.STATE.EXCEPTION, exception = null) {
        /**@type{BaseFunction}*/this._source = source;
        /**@type{Context}*/this._context = context;
        /**@type{number}*/this._lifecycle = lifecycle;
        /**@type{*}*/this._exception = exception;
    }
    /**@return{BaseFunction}*/get source() {return this._source;}
    /**@return{Context}*/get context() {return this._context;}
    /**@return{number}*/get lifecycle() {return this._lifecycle;}
    /**@return{*}*/get exception() {return this._exception;}
}
/**
 * AddOnManager
 * @author Robert R Murrell
 * @private
 */
class AddOnManager {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AddOnManager";}
    static NOT_FOUND = -1;
    constructor() {
        /**@type{Object}*/this._addons = {};
        /**@type{Map<string, AddOn>}*/this._unresolved = new Map();
        /**@type{Array<AddOn>}*/this._target = [];
        /**@type{Map<number, Set<AddOn>>}*/this._listeners = new Map();
        /**@type{number}*/this._depth = 0;
        this._installed = false;
    }
    get target() {return this._target;}
    _indexOf(name, start = 0) {
        for(let i = start; i < this._target.length; ++i) {
            let _addon = this._target[i];
            if(name === _addon.constructor.addOnName) return i;
        }
        return AddOnManager.NOT_FOUND;
    }
    _allResolved(addon) {
        let _remaining = new Set();
        for(let _dep of addon.dependancies) {
            if(this._indexOf(_dep) === AddOnManager.NOT_FOUND) _remaining.add(_dep);
        }
        addon._dependencies = _remaining;
        return _remaining.size === 0;
    }
    /**
     * @param {AddOn} addon
     */
    add(addon) {
        if(this._installed) throw CelastrinaError.newError("Invalid state, AddOnManager alread installed.");
        this._addons[addon.constructor.addOnName] = addon;
        if(addon.dependancies.size === 0) this._target.unshift(addon);
        else if(this._target.length > 0 && this._allResolved(addon)) {
            this._target.push(addon);
            this._unresolved.delete(addon.constructor.addOnName);
        }
        else {
            if(addon.dependancies.size > this._depth) this._depth = addon.dependancies.size;
            this._unresolved.set(addon.constructor.addOnName, addon);
        }
    }
    /**
     * @param {(string|Class<AddOn>)} addon
     */
    get(addon) {
        /**@type{string}*/let _name;
        (typeof addon === "string") ? _name = addon : _name = addon.addOnName;
        let _addon = this._addons[_name];
        if(typeof _addon === "undefined") return null;
        else return _addon;
    }
    /**
     * @param {(string|Class<AddOn>)} addon
     */
    has(addon) {
        /**@type{string}*/let _name;
        (typeof addon === "string") ? _name = addon : _name = addon.addOnName;
        return (this._addons.hasOwnProperty(_name));
    }
    /**
     * @param {number} lifecycle
     * @param {BaseFunction} source
     * @param {Context} context
     * @param {*} [exception=null]
     * @return {Promise<void>}
     */
    async doLifeCycle(lifecycle, source, context, exception = null) {
        /**@type{Set<AddOn>}*/let _addons = this._listeners.get(lifecycle);
        if(typeof _addons !== "undefined") {
            if(_addons.size > 0) {
                let _lifecycle = new LifeCycle(context, source, lifecycle, exception);
                for(let _addon of _addons) {
                    await _addon.doLifeCycle(_lifecycle);
                }
            }
        }
    }
    /**
     * @param {Object} azcontext
     * @param {boolean} [parse=false]
     * @param {ConfigParser} [cfp=null]
     * @param {AttributeParser} [atp=null]
     */
    async install(azcontext, parse = false, cfp = null, atp = null) {
        if(this._target.length > 0 || this._unresolved.size > 0) {
            azcontext.log.info("[AddOnManager.install(azcontext, parse, cfp, atp)]: Installing Add-Ons, parser mode " + parse + ".");
            let _pass = 0;
            while(_pass < this._depth) {
                let _td = this._target.length;
                for(let _addon of this._unresolved.values()) {
                    this.add(_addon);
                }
                ++_pass;
            }
            this._installed = true;
            if(this._unresolved.size > 0) {
                let _sunrslvd = this._unresolved.size + " unresolved Add-On(s):\r\n";
                for(let _addon of this._unresolved.values()) {
                    _sunrslvd += "\tAdd-On '" + _addon.constructor.addOnName + "' could not resolve depentent(s):\r\n"
                    for(let _dep of _addon.dependancies) {
                        _sunrslvd += "\t\t Add-On '" + _dep + "'\r\n";
                    }
                }
                _sunrslvd += "Please resolve all dependencies or circular references.";
                azcontext.log.error("[AddOnManager.install(zacontext)]: " + _sunrslvd);
                throw CelastrinaError.newError(_sunrslvd);
            }
            else {
                for(let _addon of this._target) {
                    azcontext.log.info("[AddOnManager.install(azcontext, parse, cfp, atp)]: Installing Add-On '" + _addon.constructor.addOnName + "'.");
                    if(parse) {
                        let _acfp = _addon.getConfigParser();
                        if(_acfp != null) cfp.addLink(_acfp);
                        let _aatp = _addon.getAttributeParser();
                        if(_aatp != null) atp.addLink(_aatp);
                    }
                    if(typeof _addon["doLifeCycle"] === "function") {
                        let _listeners = _addon.lifecycles;
                        for(let _lifecycle of _listeners) {
                            let _addonListenerSet = this._listeners.get(_lifecycle);
                            if(typeof _addonListenerSet === "undefined") {
                                _addonListenerSet = new Set();
                                this._listeners.set(_lifecycle, _addonListenerSet);
                            }
                            _addonListenerSet.add(_addon);
                        }
                    }
                }
                // Clean up all the un-needed data.
                this._unresolved.clear();
                delete this._unresolved;
            }
        }
    }
    /**
     * @param {Object} azcontext
     * @param {Object} config
     */
    async initialize(azcontext, config) {
        if(this._target.length > 0) {
            azcontext.log.info("[AddOnManager.install(azcontext, parse, cfp, atp)]: Initializing Add-Ons.");
            let _promises = [];
            for(let _addon of this._target) {
                azcontext.log.info("[AddOnManager.initialize(azcontext, config)]: Initializing Add-On '" + _addon.constructor.addOnName + "'.");
                _promises.push(_addon.initialize(azcontext, config));
            }
            await Promise.all(_promises);
            // Clean up all the un-needed data.
            delete this._target;
        }
    }
}
/**
 * Configuration
 * @author Robert R Murrell
 */
class Configuration {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Configuration";}
    /**@type{string}*/static CONFIG_NAME    = "celastrinajs.core.name";
    /**@type{string}*/static CONFIG_CONTEXT = "celastrinajs.core.context";
    /**@type{string}*/static CONFIG_PROPERTY = "celastrinajs.core.property.manager";
    /**@type{string}*/static CONFIG_RESOURCE = "celastrinajs.core.resource.manager";
    /**@type{string}*/static CONFIG_PERMISSION = "celastrinajs.core.sentry.permission.manager";
    /**@type{string}*/static PROP_LOCAL_DEV = "celastringjs.core.property.deployment.local.development";
    /**@type{string}*/static CONFIG_SENTRY = "celastrinajs.core.sentry";
    /**@type{string}*/static CONFIG_ROLE_FACTORY = "celastrinajs.core.sentry.role.factory";
    /**@type{string}*/static CONFIG_AUTHORIATION_OPTIMISTIC = "celastrinajs.core.authorization.optimistic";
    /**
     * @param{string} name
     * @param {(null|string)} [property=null]
     */
    constructor(name, property = null) {
        if(typeof name === "string") {
            if(name.trim().length === 0)
                throw CelastrinaError.newError("Invalid configuration. Name cannot be undefined, null or 0 length.");
        }
        else throw CelastrinaError.newError("Invalid configuration. Name must be string.");
        /**@type{(null|string)}*/this._property = null;
        if(property != null) {
            property = property.trim();
            if(typeof property !== "string" || property.trim().length === 0)
                throw CelastrinaValidationError.newValidationError(
                    "[Configuration][property]: Invalid string. Argument cannot be null or zero length.",
                    "property");
            if(property.includes(" "))
                throw CelastrinaValidationError.newValidationError(
                    "[Configuration][property]: Invalid string. Argument cannot contain spaces.",
                    "property");
            this._property = property;
        }
        /**@type{Object}*/this._config = {};
        /**@type{AttributeParser}*/this._atp = null;
        /**@type{ConfigParser}*/this._cfp = null;
        /**@type{boolean}*/this._loaded = false;
        /**@type{AddOnManager}*/this._addons = new AddOnManager();
        this._config[Configuration.CONFIG_NAME] = name.trim();
        this._config[Configuration.CONFIG_CONTEXT] = null;
        this._config[Configuration.CONFIG_PROPERTY] = new AppSettingsPropertyManager();
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
    /**@return{AddOnManager}*/get addOns() {return this._addons;}
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
     * @param {ResourceManager} manager
     * @return {Configuration}
     */
    setResourceManager(manager) {
        this._config[Configuration.CONFIG_RESOURCE] = manager;
        return this;
    }
    /**
     * @param {PropertyManager} manager
     * @return {Configuration}
     */
    setPropertyManager(manager) {
        this._config[Configuration.CONFIG_PROPERTY] = manager;
        return this;
    }
    /**
     * @param {PermissionManager} manager
     * @return {Configuration}
     */
    setPermissionManager(manager) {
        this._config[Configuration.CONFIG_PERMISSION] = manager;
        return this;
    }
    /**
     * @param {AddOnManager} manager
     * @return {Configuration}
     */
    setAddOnManager(manager) {
        this._addons = manager;
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
     * @param {AttributeParser} ap
     * @return {Configuration}
     */
    addAttributeParser(ap) {
        if(this._atp == null) this._atp = ap;
        else this._atp.addLink(ap);
        return this;
    }
    /**
     * @param {ConfigParser} cp
     * @return {Configuration}
     */
    addConfigParser(cp) {
        if(this._cfp == null) this._cfp = cp;
        else this._cfp.addLink(cp);
        return this;
    }
    /**
     * @param {AddOn} addon
     * @return {Configuration}
     */
    addOn(addon) {
        if(!instanceOfCelastringType(AddOn, addon))
            throw CelastrinaValidationError.newValidationError("Argument 'addon' is required and must be of type '" +
                AddOn.celastrinaType + "'.", "addon");
        this._addons.add(addon);
        return this;
    }
    /**
     * @param {(Class<AddOn>|string)} addon
     * @return {Promise<boolean>}
     */
    async hasAddOn(addon) {
        return this.hasAddOnSync(addon);
    }
    /**
     * @param {(Class<AddOn>|string)} addon
     * @return {boolean}
     */
    hasAddOnSync(addon) {
        return this._addons.has(addon);
    }
    /**
     * @param {(Class<AddOn>|string)} name
     * @return {Promise<AddOn>}
     */
    async getAddOn(name) {
        return this.getAddOnSync(name);
    }
    /**
     * @param {(Class<AddOn>|string)} name
     * @return {AddOn}
     */
    getAddOnSync(name) {
        return this._addons.get(name);
    }
    /**
     * @param {AttributeParser} parser
     * @param {Object} _Object
     * @param {Object|{_content?:{expand?:true}}} _value
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
     * @return {Promise<void>}
     */
    async _load(azcontext) {
        this._atp.initialize(azcontext, this._config, this._addons);
        this._cfp.initialize(azcontext, this._config, this._addons);
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
        delete this._atp;
        delete this._cfp;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     */
    async _initLoadConfiguration(azcontext) {
        if(this._property != null) return this._load(azcontext);
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
                if(instanceOfCelastringType(PropertyManagerFactory, _manager)) {
                    /**@type{PropertyManagerFactory}*/let _factory = /**@type{PropertyManagerFactory}*/_manager;
                    _manager = _factory.createPropertyManager();
                    this._config[Configuration.CONFIG_PROPERTY] = _manager;
                }
                else if(!instanceOfCelastringType(PropertyManager, _manager)) {
                    azcontext.log.error("[Configuration._getPropertyManager(azcontext)]: Invalid property manager. Must be of type '" + PropertyManager.celastrinaType + "'");
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
     * @return {Promise<void>}
     * @private
     */
    async _initSentry() {
        /**@type{Sentry}*/let _sentry = this._config[Configuration.CONFIG_SENTRY];
        return _sentry.initialize(this);
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _initRoleFactory() {
        /**@type{RoleFactory}*/let _rolefactory = this._config[Configuration.CONFIG_ROLE_FACTORY];
        return _rolefactory.initialize(this);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     * @private
     */
    async _installAddOns(azcontext) {
        await this._addons.install(azcontext, this._property != null, this._cfp, this._atp);
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @return {Promise<void>}
     * @private
     */
    async _initAddOns(azcontext) {
        await this._addons.initialize(azcontext, this._config);
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _initPropertyLoader() {
        if(this._property != null) {
            /**@type{AttributeParser}*/this._atp = new PropertyParser(
                new PermissionParser(
                    new AppRegistrationResourceParser(
                        new RoleFactoryParser(
                            new PrincipalMappingParser()))));
            /**@type{ConfigParser}*/this._cfp = new CoreConfigParser();
        }
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
            azcontext.log.info("[" + azcontext.bindingData.invocationId + "][Configuration.initialize(azcontext)]: Initializing Celastrina.");
            let _name = this._config[Configuration.CONFIG_NAME];
            if(typeof _name !== "string" || _name.trim().length === 0 || _name.indexOf(" ") >= 0) {
                azcontext.log.error("[Configuration.load(azcontext)]: Invalid Configuration. Name cannot be undefined, null, or empty.");
                throw CelastrinaValidationError.newValidationError("Name cannot be undefined, null, or 0 length.", Configuration.CONFIG_NAME);
            }
            await this.beforeInitialize(azcontext);
            /**@type{PropertyManager}*/let _pm = this._getPropertyManager(azcontext);
            /**@type{PermissionManager}*/let _prm = this._getPermissionManager(azcontext);
            /**@type{ResourceManager}*/let _rm = this._getResourceManager(azcontext);
            await _pm.initialize(azcontext, this._config);
            await this._initPropertyLoader();
            await this._installAddOns(azcontext);
            await this._initLoadConfiguration(azcontext);
            await _pm.ready(azcontext, this._config); // Ready the property manager
            await _prm.initialize(azcontext, _prm);
            await _rm.initialize(azcontext, _rm);
            await _prm.ready(azcontext, this._config);
            await _rm.ready(azcontext, this._config);
            await this._initRoleFactory();
            await this._initSentry();
            await this._initAddOns(azcontext);
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Algorithm";}
    /**
     * @param {string} name
     */
    constructor(name) {
        if(typeof name === "undefined" || name == null || name.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'name' cannot be undefined, null, or zero length.", "name");
        this._name = name;
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.AES256Algorithm";}
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
/**
 * Cryptography
 * @author Robert R Murrell
 */
class Cryptography {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Cryptography";}
    /**@param{Algorithm}algorithm*/
    constructor(algorithm) {
        this._algorithm = algorithm;
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
 * MonitorResponse
 * @author Robert R Murrell
 */
class MonitorResponse {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.MonitorResponse";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.ValueMatch";}
    /**
     * @brief
     * @param {string} [type]
     */
    constructor(type = "ValueMatch"){
        this._type = type;
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.MatchAny";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.MatchAll";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.MatchNone";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Permission";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.PermissionManager";}
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
 * DefaultRoleFactory
 * @abstract
 * @author Robert R Murrell
 */
class RoleFactory {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.RoleFactory";}
    constructor() {}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.DefaultRoleFactory";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Subject";}
    /**
     * @param {string} id
     * @param {Array<string>} [roles=[]]
     * @param {Object} [claims={}]
     */
    constructor(id, roles = [], claims = {}) {
        this._claims = claims;
        this._claims.sub = id;
        /**@type{Set}*/this._roles = new Set(roles);
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Asserter";}
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Authenticator";}
    constructor(name = "Authenticator", required = false, link = null) {
        this._name = name;
        this._required = required;
        /**@type{Authenticator}*/this._link = link;
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Authorizor";}
    /**
     * @param {string} name
     * @param {Authorizor} link
     */
    constructor(name= "BaseAuthorizor", link = null) {
        this._name = name;
        this._link = link;
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
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Sentry";}
    constructor() {
        /**@type{Authenticator}*/this._authenticator = null; // no authentication by default.
        /**@type{Authorizor}*/this._authorizor = new Authorizor();
    }
    /**@return{Authenticator}*/get authenticatorChain() {return this._authenticator};
    /**@return{Authorizor}*/get authorizorChain() {return this._authorizor};
    /**
     * @param {Authenticator} authenticator
     * @return {Sentry}
     */
    addAuthenticator(authenticator) {
        if(!instanceOfCelastringType(Authenticator, authenticator))
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
        if(!instanceOfCelastringType(Authorizor, authorizor))
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
        let _asserter = new Asserter(context, _subject, context.config.permissions, context.config.authorizationOptimistic);
        /* Default behavior is to run un-authenticated and rely on authorization to enforce optimism
           when no authenticator is specified. This is to avoid scenarios where the default Authorizor by-default
           returns true but optimistic is true and next link fails, making it pass authentication when optimistic.
           Simply returning false from the Authenticator is not sufficient as it produces the wrong behavior, or a 401
           instead of a 403. */
        if(this._authenticator == null) {
            context.subject = _subject;
            return context.config.roleFactory.assignSubjectRoles(context, _subject); // assign roles from role factory.
        }
        else {
            await this._authenticator.authenticate(_asserter);
            let _authenticated = await _asserter.hasAffirmativeAssertion();
            if(_authenticated || context.config.authorizationOptimistic) {
                if(!_authenticated)
                    context.log("Subject '" + _subject.id + "' failed to authenticate any authenticators but security is optimistic.",
                        LOG_LEVEL.THREAT, "Sentry.authenticate(context)");
                await _asserter.assign(_subject); // assign roles from authenticators.
                context.subject = _subject;
                return context.config.roleFactory.assignSubjectRoles(context, _subject); // assign roles from role factory.
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
        let _asserter = new Asserter(context, context.subject, context.config.permissions, context.config.authorizationOptimistic);
        await this._authorizor.authorize(_asserter);
        let _authorized = await _asserter.hasAffirmativeAssertion();
        if(_authorized || context.config.authorizationOptimistic) {
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
    async initialize(config) {}
}
/**
 * @author Robert R Murrell
 */
class Context {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.Context";}
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
     * @param {string} resource
     * @param {string} [id = ManagedIdentityResource.MANAGED_IDENTITY]
     * @return {Promise<string>}
     */
    async getAuthorizationToken(resource, id = ManagedIdentityResource.MANAGED_IDENTITY) {
        return this._config.resources.getToken(resource, id);
    }
    /**
     * @param {string} key
     * @param {(null|string)} [defaultValue=null]
     * @return {Promise<(null|string)>}
     */
    async getProperty(key, defaultValue = null) {
        return this._config.properties.getProperty(key, defaultValue);
    }
    /**
     * @param {string} key
     * @param {Object} [defaultValue=null]
     * @return {Promise<Object>}
     */
    async getObject(key, defaultValue = null) {
        return this._config.properties.getObject(key, defaultValue);
    }
    /**
     * @param{string} name
     * @param {*} [defaultValue=null]
     * @return {Promise<*>}
     */
    async getBinding(name, defaultValue = null) {
        let _value = this._config.context.bindings[name];
        if(typeof _value === "undefined" || _value == null)
            _value = defaultValue;
        return _value;
    }
    /**
     * @param {string} name
     * @param {*} [value=null]
     * @return {Promise<void>}
     */
    async setBinding(name, value = null) {
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
 * CelastrinaFunction
 * @author Robert R Murrell
 * @abstract
 */
class CelastrinaFunction {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.CelastrinaFunction";}
    constructor(configuration) {}
    /**
     * @param {Configuration} config
     * @return {Promise<Context>}
     */
    async createContext(config) {return new Context(config);}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async initialize(context) {}
    /**
     * @param {Context} context
     * @return {Promise<Subject>}
     */
    async authenticate(context) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async authorize(context) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async validate(context) {}
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async monitor(context) {}
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
    async execute(azcontext) {}
}
/**
 * BaseFunction
 * @abstract
 * @author Robert R Murrell
 */
class BaseFunction extends CelastrinaFunction {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.core.BaseFunction";}
    /**@param{Configuration}configuration*/
    constructor(configuration) {
        super();
        /**@type{Configuration}*/this._configuration = configuration;
        /**@type{Context}*/this._context = null;
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
    async monitor(context) {
        context.monitorResponse.addPassedDiagnostic("default", "Monitor not implemented.");
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _initialize(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.INITIALIZE, this, context);
        return this.initialize(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<Subject>}
     */
    async _authenticate(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.AUTHENTICATE, this, context);
        return this.authenticate(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _authorize(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.AUTHORIZE, this, context);
        return this.authorize(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _validate(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.VALIDATE, this, context);
        return this.validate(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _load(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.LOAD, this, context);
        return this.load(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _monitor(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.MONITOR, this, context);
        return this.monitor(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _process(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.PROCESS, this, context);
        return this.process(context);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _save(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.SAVE, this, context);
        return this.save(context);
    }
    /**
     * @param {Context} context
     * @param {*} exception
     * @return {Promise<void>}
     */
    async _exception(context, exception) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.EXCEPTION, this, context, exception);
        return this.exception(context, exception);
    }
    /**
     * @param {Context} context
     * @return {Promise<void>}
     */
    async _terminate(context) {
        await context.config.addOns.doLifeCycle(LifeCycle.STATE.TERMINATE, this, context);
        return this.terminate(context);
    }
    /**
      * @brief Method called by the Azure Function to execute the lifecycle.
      * @param {_AzureFunctionContext} azcontext The azcontext of the function.
      */
    async execute(azcontext) {
        try {
            await this.bootstrap(azcontext);
            if((typeof this._context !== "undefined") && this._context != null) {
                await this._initialize(this._context);
                this._context.subject = await this._authenticate(this._context);
                await this._authorize(this._context);
                await this._validate(this._context);
                await this._load(this._context);
                if (this._context.isMonitorInvocation)
                    await this._monitor(this._context);
                else
                    await this._process(this._context);
                await this._save(this._context);
            }
            else {
                azcontext.log.error("[" + azcontext.bindingData.invocationId + "][BaseFunction.execute(azcontext)]: Catostrophic Error! Context was null after bootstrap, skipping all other life-cycles.");
                throw CelastrinaError.newError("Catostrophic Error! Context null.");
            }
        }
        catch(exception) {
            try {
                if((typeof this._context !== "undefined") && this._context != null)
                    await this._exception(this._context, exception);
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
                    await this._terminate(this._context);
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
        else if(!instanceOfCelastringType(CelastrinaError, ex)) {
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
    CelastrinaEvent: CelastrinaEvent,
    LOG_LEVEL: LOG_LEVEL,
    ResourceAuthorization: ResourceAuthorization,
    ManagedIdentityResource: ManagedIdentityResource,
    AppRegistrationResource: AppRegistrationResource,
    ResourceManagerTokenCredential: ResourceManagerTokenCredential,
    ResourceManager: ResourceManager,
    Vault: Vault,
    PropertyManager: PropertyManager,
    AppSettingsPropertyManager: AppSettingsPropertyManager,
    AppConfigPropertyManager: AppConfigPropertyManager,
    CacheProperty: CacheProperty,
    CachedPropertyManager: CachedPropertyManager,
    PropertyManagerFactory: PropertyManagerFactory,
    AppConfigPropertyManagerFactory: AppConfigPropertyManagerFactory,
    AttributeParser: AttributeParser,
    RoleFactoryParser: RoleFactoryParser,
    PrincipalMappingParser: PrincipalMappingParser,
    ConfigParser: ConfigParser,
    LifeCycle: LifeCycle,
    AddOnManager: AddOnManager,
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
