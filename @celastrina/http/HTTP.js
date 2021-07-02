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
const jwt = require("jsonwebtoken");
const {CelastrinaError, CelastrinaValidationError, ConfigurationItem, LOG_LEVEL, JsonPropertyType, Configuration, BaseSubject, BaseSentry,
       ValueMatch, MatchAll, MatchAny, MatchNone, Algorithm, AES256Algorithm, Cryptography, RoleResolver, BaseContext,
       BaseFunction} = require("@celastrina/core");
/**
 * @typedef _jwtpayload
 * @property {string} aud
 * @property {string} sub
 * @property {string} oid
 * @property {string} iss
 * @property {number} iat
 * @property {number} exp
 * @property {string} nonce
 * @typedef _jwt
 * @property {_jwtpayload} payload
 * @typedef _ClaimsPayload
 * @property {moment.Moment} issued
 * @property {moment.Moment} expires
 * @property {string} token
 * @property {string} audience
 * @property {string} subject
 * @property {string} issuer
 */
/**@type{BaseSubject}*/
class JwtSubject extends BaseSubject {
    /**
     * @param {Object} header
     * @param {Object} payload
     * @param {Object} signature
     * @param {string} token
     * @param {Array.<string>} [roles]
     */
    constructor(header, payload, signature, token, roles = []) {
        super(payload.sub, roles);
        this._header = header;
        this._payload = payload;
        this._signature = signature;
        /**@type{moment.Moment}*/this._issued = moment.unix(payload.iat);
        /**@type{moment.Moment}*/this._expires = moment.unix(payload.exp);
        /**@type{string}*/this._token = token;
    }
    /**@return{object}*/get header() {return this._header;}
    /**@return{object}*/get payload() {return this._payload;}
    /**@return{object}*/get signature() {return this._signature}
    /**@return{string}*/get nonce(){return this._payload.nonce;}
    /**@return{string}*/get audience() {return this._payload.aud;}
    /**@return{string}*/get issuer(){return this._payload.iss;}
    /**@return{moment.Moment}*/get issued(){return this._issued;}
    /**@return{moment.Moment}*/get expires(){return this._expires;}
    /**@return{string}*/get token(){return this._token;}
    /**@return{boolean}*/isExpired(){return moment().isSameOrAfter(this._expires);}
    /**
     * @param {undefined|null|object}headers
     * @param {string}[name="Authorization]
     * @param {string}[scheme="Bearer "]
     * @return {Promise<object>}
     */
    async setAuthorizationHeader(headers, name = "Authorization", scheme = "Bearer ") {
        if(typeof headers === "undefined" || headers == null) headers = {};
        headers[name] = scheme + this._token;
        return headers;
    }
    /**
     * @param {string}name
     * @param {null|string}defaultValue
     * @return {Promise<number|string|Array.<string>>}
     */
    async getClaim(name, defaultValue = null) {
        let claim = this._payload[name];
        if(typeof claim === "undefined" || claim == null)
            claim = defaultValue;
        return claim;
    }
    /**
     * @param {string}name
     * @param {null|string}defaultValue
     * @return {Promise<number|string|Array.<string>>}
     */
    async getHeader(name, defaultValue = null) {
        let header = this._header[name];
        if(typeof header === "undefined" || header == null)
            header = defaultValue;
        return header;
    }
    /**
     * @param {string} token
     * @return {Promise<JwtSubject>}
     */
    static async decode(token) {
        if(typeof token !== "string" || token.trim().length === 0)
            throw CelastrinaError.newError("Not Authorized.", 401);
        /** @type {null|Object} */let decoded = /** @type {null|Object} */jwt.decode(token, {complete: true});
        if(typeof decoded === "undefined" || decoded == null)
            throw CelastrinaError.newError("Not Authorized.", 401);
        return new JwtSubject(decoded.header, decoded.payload, decoded.signature, token);
    }
}
/**Issuer*/
class Issuer {
    /**
     * @param {string|StringPropertyType} name
     * @param {string|StringPropertyType} audience
     * @param {JsonPropertyType|Array.<string>} [roles=[]]
     * @param {(null|string|StringPropertyType)} [nonce=null]
     */
    constructor(name, audience, roles = [], nonce = null) {
        this._name = name;
        this._audience = audience;
        this._nonce = nonce;
        this._roles = roles;
    }
    /**@return{string}*/get name(){return this._name;}
    /**@return {string}*/get audience(){return this._audience;}
    /**@return {Array<string>}*/get roles(){return this._roles;}
    /**
     * @param {JwtSubject} subject
     * @param {boolean} [validateNonce=false]
     * @return {Promise<boolean>}
     */
    async authenticate(subject, validateNonce = false) {
        let _auth = false;
        if(subject.issuer === this._name && subject.audience === this._audience) {
            if(validateNonce) {
                if(this._nonce === subject.nonce) {
                    subject.addRoles(this._roles);
                    _auth = true;
                }
            }
            else {
                subject.addRoles(this._roles);
                _auth = true;
            }
        }
        return _auth;
    }
}
/**
 * IssuerProperty
 * @author Robert R Murrell
 */
class IssuerProperty extends JsonPropertyType {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}

    /**@return {string}*/get mime() {return "application/json; celastrinajs.html.property.IssuerProperty";}

    /**
     * @param {string} value
     * @return {Promise<null|Object>}
     */
    async resolve(value) {
        let source = await super.resolve(value);
        if(source != null) {
            if(!source.hasOwnProperty("_name")) throw CelastrinaError.newError("Invalid Issuer, _name required.");
            if(!source.hasOwnProperty("_audience")) throw CelastrinaError.newError("Invalid Issuer, _audience required.");
            if(!source.hasOwnProperty("_roles")) throw CelastrinaError.newError("Invalid Issuer, _roles required.");
            if(!Array.isArray(source._roles)) throw CelastrinaError.newError("Invalid Issuer, _roles must be an Array.");
            source = new Issuer(source._name, source._audience, source._roles, source._nonce);
        }
        return source;
    }
}
/**@abstract*/
class HTTPParameterFetch {
    /**@param{string}[type]*/
    constructor(type = "HTTPParameterFetch") {this._type = type;}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @return {Promise<string>}
     */
    async fetch(context, key, defaultValue = null) {
        return new Promise((resolve) => {resolve(defaultValue);});
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @return {Promise<null|string>}
     */
    async get(context, key, defaultValue = null) {
        return this.fetch(context, key, defaultValue);
    }
}
/**@type {HTTPParameterFetch}*/
class HeaderParameterFetch extends HTTPParameterFetch {
    constructor(){super("header");}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue
     * @return {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        return context.getRequestHeader(key, defaultValue);
    }
}
/**@type{HTTPParameterFetch}*/
class QueryParameterFetch extends HTTPParameterFetch {
    constructor(){super("query");}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue
     * @return {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        return context.getQuery(key, defaultValue);
    }
}
/**@type{HTTPParameterFetch}*/
class BodyParameterFetch extends HTTPParameterFetch {
    constructor(key){super("body");}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue
     * @return {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        let body = context.requestBody;
        let value = body[key];
        if(typeof value === "undefined" || value == null) value = defaultValue;
        return value;
    }
}
/**@type{JsonPropertyType}*/
class HTTPParameterFetchProperty extends JsonPropertyType {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**@return {string}*/get mime() {return "application/json; celastrinajs.html.property.HTTPParameterFetchProperty";}
    /**
     * @param {string} value
     * @return {Promise<null|Object>}
     */
    async resolve(value) {
        let source = await super.resolve(value);
        if(source != null) {
            if(!source.hasOwnProperty("_type"))
                throw CelastrinaError.newError("Invalid HTTPParameterFetch, _type required.");
            switch(source._type) {
                case "header": return new HeaderParameterFetch();
                case "query": return new MatchAll();
                case "body": return new MatchNone();
                default: throw CelastrinaError.newError("Invalid Match Type " + source._type + ".");
            }
        }
        else
            throw CelastrinaError.newError("Parameter Fetch Property cannot be null.");
    }
}
/**
 * JwtValidator
 * @author Robert R Murrell
 */
class JwtValidator {
    constructor(){}
    /**
     * @param {string} token
     * @param {HTTPContext} context
     * @return {Promise<JwtSubject>}
     */
    async validate(token, context) {
        let subject = await JwtSubject.decode(token);
        if(subject.isExpired()) {
            context.log("JWT Token expired.", LOG_LEVEL.LEVEL_WARN, "JwtValidator.authenticate(context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
        return subject;
    }
}
/**
 * AzureIDPJwtValidator
 * @extends {JwtValidator}
 * @author Robert R Murrell
 * @abstract
 */
class AzureIDPJwtValidator extends JwtValidator {
    constructor() {
        super();
    }
    /**
     * @param {JwtSubject} subject
     * @param {HTTPContext} context
     * @return{Promise<string>}
     * @private
     * @abstract
     */
    async _generateEndpointUrl(subject, context) {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @param {JwtSubject} subject
     * @param {HTTPContext} context
     * @return {Promise<{type:string, x5c?:string, e?:string, n?:string}>}
     * @private
     */
    async _getKey(subject, context) {
        return new Promise((resolve, reject) => {
            let _endpoint = null;
            this._generateEndpointUrl(subject, context)
                .then((endpoint) => {
                    _endpoint = endpoint;
                    return axios.get(_endpoint);
                })
                .then((response) => {
                    return axios.get(response.data["jwks_uri"])
                })
                .then((response) => {
                    /**@type{null|{type:string, x5c?:string, e?:string, n?:string}}*/let _key = null;
                    for(const key of response.data.keys) {
                        if (key.kid === subject.header.kid) {
                            _key = {type: key.kty, e: key.e, n: key.n};
                            break;
                        }
                    }
                    if(_key != null)
                        resolve(_key);
                    else
                        reject(CelastrinaError.newError("Key not found for configuration '" + _endpoint + "' on subject '" +
                                                                subject.id + "'."));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {{type:string, x5c?:string, e?:string, n?:string}} key
     * @param {HTTPContext} context
     * @return {Promise<string>}
     * @private
     */
    async _getPemX5C(key, context) {
        return "-----BEGIN CERTIFICATE-----\n" + key.x5c + "\n-----END CERTIFICATE-----\n";
    }
    /**
     * @param {{type:string, x5c?:string, e?:string, n?:string}} key
     * @param {HTTPContext} context
     * @return {Promise<string>}
     * @private
     */
    async _getPemModExp(key, context) {
        return this._rsaPublicKeyPem(key.n, key.e);
    }
    /**
     * @param {string} token
     * @param {HTTPContext} context
     * @return {Promise<JwtSubject>}
     */
    async validate(token, context) {
        let _subject = await super.validate(token, context);
        /**@type{{type:string, x5c?:string, e?:string, n?:string}}*/let key = await this._getKey(_subject, context);
        let pem;
        if(typeof key.x5c === "undefined" || key.x5c == null)
            pem = await this._getPemModExp(key, context);
        else
            pem = await this._getPemX5C(key, context);
        let decoded = jwt.verify(_subject.token, pem);
        if(typeof decoded === "undefined" || decoded == null) {
            context.log("Invalid Token Signature.", LOG_LEVEL.LEVEL_WARN, "AzureIDPJwtValidator.validate(token, context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
        return _subject;
    }
    _rsaPublicKeyPem(modulus_b64, exponent_b64) {
        let modulus = new Buffer(modulus_b64, "base64");
        let exponent = new Buffer(exponent_b64, "base64");
        let modulus_hex = modulus.toString("hex")
        let exponent_hex = exponent.toString("hex")
        modulus_hex = this._prepadSigned(modulus_hex)
        exponent_hex = this._prepadSigned(exponent_hex)
        let modlen = modulus_hex.length/2
        let explen = exponent_hex.length/2
        let encoded_modlen = this._encodeLengthHex(modlen)
        let encoded_explen = this._encodeLengthHex(explen)
        let encoded_pubkey = "30" +
            this._encodeLengthHex(
                modlen +
                explen +
                encoded_modlen.length/2 +
                encoded_explen.length/2 + 2
            ) +
            "02" + encoded_modlen + modulus_hex +
            "02" + encoded_explen + exponent_hex;
        let der_b64 = new Buffer(encoded_pubkey, "hex").toString("base64");
        return "-----BEGIN RSA PUBLIC KEY-----\n"
            + der_b64.match(/.{1,64}/g).join('\n')
            + "\n-----END RSA PUBLIC KEY-----\n";
    }
    _prepadSigned(hexStr) {
        let msb = hexStr[0]
        if (msb < '0' || msb > '7') {
            return '00' + hexStr;
        } else {
            return hexStr;
        }
    }
    /**
     * @param {Number} number
     * @return {string}
     * @private
     */
    _toHex(number) {
        let nstr = number.toString(16);
        if (nstr.length%2) return '0'+nstr;
        return nstr;
    }
    _encodeLengthHex(n) {
        if (n<=127) return this._toHex(n)
        else {
            let n_hex = this._toHex(n)
            let length_of_length_byte = 128 + n_hex.length/2 // 0x80+numbytes
            return this._toHex(length_of_length_byte)+n_hex
        }
    }
}
/**
 * AzureADJwtValidator
 * @extends {AzureIDPJwtValidator}
 * @author Robert R Murrell
 */
class AzureADJwtValidator extends AzureIDPJwtValidator {
    constructor() {
        super();
    }
    async _generateEndpointUrl(subject, context) {
        return "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration";
    }
}
/**
 * AzureADB2CJwtValidator
 * @extends {AzureIDPJwtValidator}
 * @author Robert R Murrell
 */
class AzureADB2CJwtValidator extends AzureIDPJwtValidator {
    constructor(tenantName) {
        super();
        /**@type{string}}*/
        this._url = "https://" + tenantName + ".b2clogin.com/" + tenantName + ".onmicrosoft.com/{policy}/v2.0/.well-known/openid-configuration";
    }
    async _generateEndpointUrl(subject, context) {
        let claim = await subject.getClaim("tfp");
        if(claim == null)
            throw CelastrinaError.newError("No TFP policy claim found for subject '" + subject.id + "'.");
        return this._url.replace("{policy}", claim);

    };
}
/**
 * AzureIDPJwtValidatorProperty
 * @author Robert R Murrell
 */
class AzureIDPJwtValidatorProperty extends JsonPropertyType {
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }
    /**@return{string}*/get mime() {return "application/json; celastrinajs.html.property.AzureIDPJwtValidatorProperty";}
    async resolve(value) {
        /**@type{{_type: string}}*/let source = /**@type{{_type: string}}*/await super.resolve(value);
        if(!source.hasOwnProperty("_type"))
            throw CelastrinaError.newError("Invalid AzureIDPJwtValidator, _type required.");
        if(source._type === "AD")
            return new AzureADJwtValidator();
        else if(source._type === "ADB2C") {
            if(!source.hasOwnProperty("_tenant"))
                throw CelastrinaError.newError("Invalid AzureIDPJwtValidator, _type specified AzureADB2CJwtValidator, " +
                                                       "but no tenant attribute was provided.");
            else
                return new AzureADB2CJwtValidator(source._tenant);
        }
        else
            throw CelastrinaError.newError("Invalid AzureIDPJwtValidator, _type unsupported type '" + source._type + ".");
    }
}
/**
 * JwtConfiguration
 * @author Robert R Murrell
 */
class JwtConfiguration extends ConfigurationItem {
    /** @type{string}*/static CONFIG_JWT = "celastrinajs.http.jwt";
    /**
     * @param {Array.<IssuerProperty|Issuer>} [issures=[]]
     * @param {JwtValidator} [validator=new JwtValidator()]
     * @param {(HTTPParameterFetchProperty|HTTPParameterFetch)} [param={HeaderParameterFetch}]
     * @param {(string|StringPropertyType)} [scheme="Bearer "]
     * @param {(boolean|BooleanPropertyType)} [remove=true]
     * @param {(string|StringPropertyType)} [token="authorization"]
     * @param {(boolean|BooleanPropertyType)} [validateNonce=false]
     */
    constructor(issures = [], validator = new JwtValidator(), param = new HeaderParameterFetch(), scheme = "Bearer ",
                remove = true, token = "authorization", validateNonce = false) {
        super();
        /**@type{Array.<(IssuerProperty|Issuer)>}*/this._issuers = issures;
        /**@type{null|HTTPParameterFetchProperty|HTTPParameterFetch}*/this._param  = param;
        /**@type{string|StringPropertyType}*/this._scheme = scheme;
        /**@type{boolean|BooleanPropertyType}*/this._remove = remove;
        /**@type{string|StringPropertyType}*/this._token  = token;
        /**@type{boolean|BooleanPropertyType}*/this._validateNonce = validateNonce;
        /**@type{JsonPropertyType|JwtValidator}*/this._validator = validator;
    }

    /**@return{string}*/get key() {return JwtConfiguration.CONFIG_JWT;}
    /**@return{Array.<Issuer>}*/get issuers(){return this._issuers;}
    /**@return{HTTPParameterFetch}*/get param(){return this._param;}
    /**@return{string}*/get scheme(){return this._scheme;}
    /**@return{boolean}*/get removeScheme(){return this._remove;}
    /**@return{string}*/get token(){return this._token;}
    /**@return{boolean}*/get validateNonce(){return this._validateNonce;}
    /**@return{JwtValidator}*/get validator() {return this._validator;}
    /**
     * @param {IssuerProperty|Issuer} issuer
     * @return {JwtConfiguration}
     */
    addIssuer(issuer){this._issuers.unshift(issuer); return this;}
    /**
     * @param {Array.<IssuerProperty|Issuer>} [issuers=[]]
     * @return {JwtConfiguration}
     */
    setIssuers(issuers = []){this._issuers = issuers; return this;}
    /**
     * @param {HTTPParameterFetchProperty|HTTPParameterFetch} [param={HeaderParameterFetch}]
     * @return {JwtConfiguration}
     */
    setParam(param= new HeaderParameterFetch()){this._param = param; return this;}
    /**
     * @param {string|StringPropertyType} [scheme="Bearer "]
     * @return {JwtConfiguration}
     */
    setScheme(scheme = "Bearer "){this._scheme = scheme; return this;}
    /**
     * @param {boolean|BooleanPropertyType} [remove=true]
     * @return {JwtConfiguration}
     */
    setRemoveScheme(remove = true){this._remove = remove; return this;}
    /**
     * @param {string|StringPropertyType} [token="authorization"]
     * @return {JwtConfiguration}
     */
    setToken(token = "authorization"){this._token = token; return this;}
    /**
     * @param {boolean|BooleanPropertyType} [validateNonce=false]
     * @return {JwtConfiguration}
     */
    setValidateNonce(validateNonce = false){this._validateNonce = validateNonce; return this;}
    /**
     * @param {JsonPropertyType|JwtValidator} [validator=null]
     * @return {JwtConfiguration}
     */
    setJwtValidator(validator = null) {if(validator != null) this._validator = validator; return this;}
}
/**@type{BaseContext}*/
class HTTPContext extends BaseContext {
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     */
    constructor(context, config) {
        super(context, config);
        this._funccontext.res = {status: 200,headers:{"Content-Type": "text/html; charset=ISO-8859-1"},body:"<html lang=\"en\"><head><title>" + config.name + "</title></head><body>200, Success</body></html>"};
        this._action = this._funccontext.req.method.toLowerCase();
        this._cookies = {};
    }
    /**@return{string}*/get method(){return this._action;}
    /**@return{string}*/get url(){return this._funccontext.req.originalUrl;}
    /**@return{Object}*/get request(){return this._funccontext.req;}
    /**@return{Object}*/get response(){return this._funccontext.res;}
    /**@return{Object}*/get params(){return this._funccontext.req.params;}
    /**@return{Object}*/get query(){return this._funccontext.req.query;}
    /**@return{string}*/get raw(){return this._funccontext.req.rawBody;}
    /**@return{Object}*/get requestBody(){return this._funccontext.req.body;}
    /**@return{Object}*/get responseBody(){return this._funccontext.res.body;}
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setRequestId() {
        let id = this._funccontext.req.query["requestId"];
        if(typeof id === "undefined" || id == null) id = this._funccontext.req.headers["x-celastrina-requestId"];
        if(typeof id === "string") this._requestId = id;
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setMonitorMode() {
        let monitor;
        if(this.method === "trace")
            monitor = true;
        else {
            monitor = this._funccontext.req.query["monitor"];
            if (typeof monitor === "undefined" || monitor == null) monitor = this._funccontext.req.headers["x-celastrina-monitor"];
            monitor = (typeof monitor === "string") ? (monitor === "true") : false;
        }
        this._monitor = monitor;
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _parseCookies() {
        let cookie = this.getRequestHeader("cookie");
        if(typeof cookie === "string" && cookie.trim().length > 0) {
            let parts = cookie.split(";");
            for(const part of parts) {
                let peices = part.split("=");
                this._cookies[peices.shift().trim()] = decodeURI(peices.join("="));
            }
        }
    }
    /**@return{Promise<void>}*/async initialize() {
        await this._setMonitorMode();
        await this._setRequestId();
        await super.initialize();
        await this._parseCookies();
        let sessioResolver = this._config.getValue(CookieSessionResolver.CONFIG_HTTP_SESSION_RESOLVER, null);
        if(sessioResolver instanceof CookieSessionResolver)
            await sessioResolver.resolve(/**@type{HTTPContext}*/this);
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getURIBinding(name, defaultValue = null) {
        let uirbinding = this._funccontext.bindingData[name];
        if(typeof uirbinding === "undefined" || uirbinding == null) return defaultValue
        else return uirbinding;
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getCookie(name, defaultValue = null) {
        let cookie = this._cookies[name];
        if(typeof cookie !== "string") return defaultValue
        else return cookie;
    }
    /**
     * @param {string} name
     * @param {string} value
     * @param {Object} [config=null]
     */
    setCookie(name, value, config = null) {
        this._cookies[name] = value;
        let _value = name + "=" + value;
        if(config != null) {
            if(config.hasOwnProperty("secure") && typeof config.secure === "boolean" && config.secure)
                _value += "; Secure";
            if(config.hasOwnProperty("httpOnly") && typeof config.httpOnly === "boolean" && config.httpOnly)
                _value += "; HttpOnly";
            if(config.hasOwnProperty("maxAge") && typeof config.maxAge === "number")
                _value += "; Max-Age=" + config.maxAge;
            if(config.hasOwnProperty("expires") && typeof config.expires === "string")
                _value += "; Expires=" + config.expires;
            if(config.hasOwnProperty("domain") && typeof config.domain === "string")
                _value += "; Domain=" + config.domain;
            if(config.hasOwnProperty("path") && typeof config.path === "string")
                _value += "; Path=" + config.domain;
            if(config.hasOwnProperty("sameSite") && typeof config.path === "string")
                _value += "; SameSite=" + config.sameSite;
        }
        this.setResponseHeader("Set-Cookie", _value);
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getQuery(name, defaultValue = null) {
        let qry = this._funccontext.req.query[name];
        if(typeof qry !== "string") return defaultValue;
        else return qry;
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getRequestHeader(name, defaultValue = null) {
        let header = this._funccontext.req.headers[name];
        if(typeof header !== "string") return defaultValue;
        else return header;
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {string}
     */
    getResponseHeader(name, defaultValue = null) {
        let header = this._funccontext.res.headers[name];
        if(typeof header !== "string") return defaultValue;
        else return header;
    }
    /**
     * @param {string} name
     * @param {string} value
     */
    setResponseHeader(name, value){this._funccontext.res.headers[name] = value;}
    /**
     * @param {*} [body]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        this._funccontext.res.status = status;
        this._funccontext.res.headers["X-celastrina-request-uuid"] = this._requestId;
        if(status !== 204) {
            if (body === null) {
                let content = this._name + ", " + status + ".";
                this._funccontext.res.body = "<html lang=\"en\"><head><title>" + content + "</title></head><body>" + content + "</body></html>";
            }
            else body = body.toString();
        }
        this._funccontext.res.body = body;
    }
    /**@param{null|Error|CelastrinaError|*}[error=null]*/
    sendValidationError(error = null) {
        if(!(error instanceof CelastrinaValidationError)) error = CelastrinaValidationError.newValidationError("Bad request.", this._requestId);
        this.send(error, error.code);
    }
    /**
     * @param {string} url
     * @param {null|Object} [body]
     */
    sendRedirect(url, body = null) {
        this._funccontext.res.headers["Location"] = url;
        this.send(body, 302);
    }
    /**@param{string}url*/
    sendRedirectForwardBody(url) {this.sendRedirect(url, this._funccontext.req.body);}
    /**@param{null|Error|CelastrinaError|*}[error=null]*/
    sendServerError(error = null) {
        if(error == null) error = CelastrinaError.newError("Internal Server Error.");
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 500);
        this.send(error, error.code);
    }
    /**@param{null|CelastrinaError}[error=null]*/
    sendNotAuthorizedError(error= null) {
        if(error == null) error = CelastrinaError.newError("Not Authorized.", 401);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 401);
        this.send(error, 401);
    }
    /**@param{null|CelastrinaError}[error=null]*/
    sendForbiddenError(error = null) {
        if(error == null) error = CelastrinaError.newError("Forbidden", 401);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 403);
        this.send(error, 403);
    }
}
/**@type{BaseSentry}*/
class JwtSentry extends BaseSentry {
    constructor() {
        super();
        /**@type{JwtConfiguration}*/this._jwtconfig = null;
    }
    /**
     * @param {Configuration} config
     * @return {Promise<void>}
     */
    async initialize(config) {
        await super.initialize(config);
        this._jwtconfig = config.getValue(JwtConfiguration.CONFIG_JWT);
        if(this._jwtconfig == null) {
            config.context.log.error("[JwtSentry.initialize(config)]: JwtConfiguration missing or invalid.");
            throw CelastrinaError.newError("Invalid configration.");
        }
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<string>}
     * @private
     */
    async _getToken(context) {
        /**@type{*|string}*/let auth = this._jwtconfig.param.fetch(context, this._jwtconfig.token);
        if(typeof auth !== "string") {
            context.log("Expected JWT token but none was found.", LOG_LEVEL.LEVEL_WARN, "JwtSentry._getToken(context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
        let scheme = this._jwtconfig.scheme;
        if(typeof scheme === "string" && scheme.length > 0) {
            if(!auth.startsWith(scheme)) {
                context.log("Expected token scheme '" + scheme + "' but none was found.", LOG_LEVEL.LEVEL_WARN, "JwtSentry._getToken(context)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            if(this._jwtconfig.removeScheme) auth = auth.slice(scheme.length);
        }
        return auth;
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<BaseSubject>}
     */
    async authenticate(context) {
        let auth = await this._getToken(context);
        let subject = await this._jwtconfig.validator.validate(auth, context);
        if(subject.isExpired()) {
            context.log("JWT Token expired.", LOG_LEVEL.LEVEL_VERBOSE, "JwtSentry.authenticate(context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
        let promises = [];
        let issuers = this._jwtconfig.issuers;
        for(const issuer of issuers) {
            promises.unshift(issuer.authenticate(subject)); // Performs the role escalations too.
        }
        let results = await Promise.all(promises);
        for(let authenticated of results) {
            if(authenticated) return subject;
        }
        throw CelastrinaError.newError("Not Authorized.", 401);
    }
}
/**@type{RoleResolver}*/
class CookieSessionResolver {
    /** @type{string}*/static CONFIG_HTTP_SESSION_RESOLVER = "celastrinajs.http.function.session.resolver";
    /**@param{string}[name="celastrina_session"]*/
    constructor(name = "celastrina_session"){this._name = name;}
    /**
     * @param {HTTPContext} context
     * @return {Promise<string>}
     * @private
     */
    async _getCookie(context) {
        let session = context.getCookie(this._name, null);
        if(typeof session !== "string" || session.trim().length === 0) {
            context.log("Cookie '" + this._name + "' not found.", LOG_LEVEL.LEVEL_ERROR, "CookieRoleResolver._getCookie(context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
        return session;
    }
    /**
     * @param {HTTPContext} context
     * @param {string} cookie
     * @return {Promise<object>}
     */
    async _getSession(context, cookie) {return JSON.parse(cookie);}
    /**
     * @param {HTTPContext} context
     * @return {Promise<HTTPContext>}
     */
    async resolve(context) {
        let cookie = await this._getCookie(context);
        let session = await this._getSession(context, cookie);
        context.loadSessionProperties(session);
        return context;
    }
}
/**@type{CookieSessionResolver}*/
class SecureCookieSessionResolver extends CookieSessionResolver {
    /**
     * @param {Cryptography} crypto
     * @param {string} [name="celastrina_session"]
     */
    constructor(crypto, name = "celastrina_session") {
        super(name);
        this._crypto = crypto;
    }
    /**
     * @param {HTTPContext} context
     * @param {string} cookie
     * @return {Promise<object>}
     * @private
     */
    async _getSession(context, cookie) {
        let decrypted = await this._crypto.decrypt(cookie);
        let session = super._getSession(context, decrypted);
        if(session.hasOwnProperty("expires") && session.expires != null) {
            context.log("Session contains an expire attribute, validating expiration date.", LOG_LEVEL.LEVEL_INFO,
                         "SecureCookieSessionResolver._getSession(context, cookie)");
            let _expires = moment(session.expires).utc();
            let _now = moment().utc();
            context.log("Session expires '" + _expires.format() + "'.", LOG_LEVEL.LEVEL_INFO,
                         "SecureCookieSessionResolver._getSession(context, cookie)");
            if(_now.isBefore(_expires))
                return session;
            context.log("Session has expired.", LOG_LEVEL.LEVEL_WARN, "SecureCookieSessionResolver._getSession(context, cookie)");
            throw CelastrinaError.newError("Forbidden.", 403);

        }
        else return session;
    }
}
/**@type{JsonPropertyType}*/
class CookieSessionResolverProperty extends JsonPropertyType {
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     */
    constructor(name, defaultValue = null) {super(name, defaultValue);}
    /**
     * @return {string}
     * @abstract
     */
    get mime() {return "application/json; celastrinajs.http.property.CookieSessionResolverProperty"}
    /**
     * @param {string} value
     * @return {Promise<null|Object>}
     */
    async resolve(value) {
        let obj = await super.resolve(value);
        if(!obj.hasOwnProperty("name"))
            throw CelastrinaValidationError.newValidationError("Invalid CookieSessionResolver. _name is required.", "CookieSessionResolver._name");
        return new CookieSessionResolver(obj._name);

    }
}
/**@type{JsonPropertyType}*/
class SecureCookieSessionResolverProperty extends JsonPropertyType {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**
     * @return {string}
     * @abstract
     */
    get mime() {return "application/json; celastrinajs.http.property.SecureCookieSessionResolverProperty"}
    /**
     * @param {string} value
     * @return {Promise<null|Object>}
     */
    async resolve(value) {
        let obj = await super.resolve(value);
        if(!obj.hasOwnProperty("_name"))
            throw CelastrinaValidationError.newValidationError("Invalid SecureCookieSessionResolver. _name is required.", "SecureCookieSessionResolver._name");
        if(!obj.hasOwnProperty("_key"))
            throw CelastrinaValidationError.newValidationError("Invalid SecureCookieSessionResolver. _key is required.","SecureCookieSessionResolver._key");
        if(!obj.hasOwnProperty("_iv"))
            throw CelastrinaValidationError.newValidationError("Invalid SecureCookieSessionResolver. _iv is required.","SecureCookieSessionResolver._iv");
        let crypto = new Cryptography(new AES256Algorithm(obj._key, obj._iv));
        await crypto.initialize();
        return new SecureCookieSessionResolver(crypto, obj._name);
    }
}
/**
 * @type {BaseFunction}
 * @abstract
 */
class HTTPFunction extends BaseFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration) {super(configuration);}
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     * @return {Promise<BaseContext & HTTPContext>}
     */
    async createContext(context, config) {return new HTTPContext(context, config);}
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _get(context) {
        context.log("GET Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._get(context)");
        context.send(null, 204);
        context.done();
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _patch(context) {
        context.log("PATCH Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._patch(context)");
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _put(context) {
        context.log("PUT Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._put(context)");
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _post(context) {
        context.log("POST Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._post(context)");
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _delete(context) {
        context.log("DELETE Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._delete(context)");
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _options(context) {
        context.log("OPTOINS Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._options(context)");
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async _head(context) {
        context.log("HEAD Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._head(context)");
        context.send(null, 204);
        context.done();
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async _trace(context) {
        context.log("TRACE Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._trace(context)");
        context.monitorResponse.addPassedDiagnostic("Default HTTP", "HTTP._trace(context): Not implemented.");
        context.done();
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async monitor(context) {
        await this._trace(context);
        let response = [{test: context.name, passed: context.monitorResponse.passed, failed: context.monitorResponse.failed,
                         result: context.monitorResponse.result}];
        context.send(response, 200);
        context.done();
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @param {null|Error|CelastrinaError|*} exception
     * @return {Promise<void>}
     */
    async exception(context, exception) {
        /**@type{null|Error|CelastrinaError|*}*/let ex = exception;
        if(ex instanceof CelastrinaValidationError)
            context.sendValidationError(ex);
        else if(ex instanceof CelastrinaError)
            context.sendServerError(ex);
        else if(ex instanceof Error) {
            ex = CelastrinaError.wrapError(ex);
            context.sendServerError(ex);
        }
        else if(typeof ex === "undefined" || ex == null) {
            ex = CelastrinaError.newError("Unhandled server error.");
            context.sendServerError(ex);
        }
        else {
            ex = CelastrinaError.wrapError(ex);
            context.sendServerError(ex);
        }
        context.log("Request failed to process. (MESSAGE:" + ex.message + ") (STACK:" + ex.stack + ")", LOG_LEVEL.LEVEL_ERROR, "HTTP.exception(context, exception)");
    }
    /**
     * @param {BaseContext & HTTPContext} context
     * @return {Promise<void>}
     */
    async unhandledRequestMethod(context) {
        throw CelastrinaError.newError("HTTP Method '" + context.method + "' not supported.", 400);
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async process(context) {
        let httpMethodHandler = this["_" + context.method];
        if(typeof httpMethodHandler === "undefined" || httpMethodHandler == null)
            await this.unhandledRequestMethod(context);
        else
            await httpMethodHandler(context);
    }
}
/**
 * @type {HTTPFunction}
 * @abstract
 */
class JwtHTTPFunction extends HTTPFunction {
    /**
     * @brief
     * @param {Configuration} configuration
     */
    constructor(configuration){super(configuration);}
    async createSentry(context, config) {return new JwtSentry(config);}
}
/**@type{HTTPContext}*/
class JSONHTTPContext extends HTTPContext {
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     */
    constructor(context, config) {
        super(context, config);
        this._funccontext.res = {status: 200, headers: {"Content-Type":"application/json; charset=utf-8","X-celastrina-requestId":this._requestId}, body: {name: this._config.name,code: 200,message:"success"}};
    }
    /**
     * @brief Sets the body of the response and invoked done on the context.
     * @param {*} [body]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        this._funccontext.res.status = status;
        this._funccontext.res.headers["X-celastrina-requestId"] = this._requestId;
        this._funccontext.res.body = body;
    }
}
/**
 * @type {HTTPFunction}
 * @abstract
 */
class JSONHTTPFunction extends HTTPFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration) {super(configuration);}
    /**
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     * @return {Promise<HTTPContext & JSONHTTPContext>}
     */
    async createContext(context, config) {return new JSONHTTPContext(context, config);}
}
/**
 * @type {JSONHTTPFunction}
 * @abstract
 */
class JwtJSONHTTPFunction extends JSONHTTPFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration){super(configuration);}
    async createSentry(context, config) {return new JwtSentry(config);}
}
module.exports = {
    JwtSubject: JwtSubject,
    Issuer: Issuer,
    IssuerProperty: IssuerProperty,
    AzureIDPJwtValidator: AzureIDPJwtValidator,
    AzureADJwtValidator: AzureADJwtValidator,
    AzureADB2CJwtValidator: AzureADB2CJwtValidator,
    JwtValidator: JwtValidator,
    AzureIDPJwtValidatorProperty: AzureIDPJwtValidatorProperty,
    JwtConfiguration: JwtConfiguration,
    HTTPContext: HTTPContext,
    HTTPParameterFetch: HTTPParameterFetch,
    HeaderParameterFetch: HeaderParameterFetch,
    QueryParameterFetch: QueryParameterFetch,
    BodyParameterFetch: BodyParameterFetch,
    HTTPParameterFetchProperty: HTTPParameterFetchProperty,
    CookieSessionResolver: CookieSessionResolver,
    CookieSessionResolverProperty: CookieSessionResolverProperty,
    SecureCookieSessionResolver: SecureCookieSessionResolver,
    SecureCookieSessionResolverProperty: SecureCookieSessionResolverProperty,
    JwtSentry: JwtSentry,
    HTTPFunction: HTTPFunction,
    JwtHTTPFunction: JwtHTTPFunction,
    JSONHTTPContext: JSONHTTPContext,
    JSONHTTPFunction: JSONHTTPFunction,
    JwtJSONHTTPFunction: JwtJSONHTTPFunction
};
