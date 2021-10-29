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
const {v4: uuidv4} = require("uuid");
const moment = require("moment");
const jwt = require("jsonwebtoken");
const jwkToPem = require("jwk-to-pem");
const cookie = require("cookie");
const {Decipher, Cipher} = require("crypto");
const {CelastrinaError, CelastrinaValidationError, PropertyManager, ResourceManager, PermissionManager, ConfigurationItem,
       LOG_LEVEL, ConfigurationLoader, BaseSubject, BaseSentry, Algorithm, AES256Algorithm, Cryptography, BaseRoleFactory,
       RoleFactoryParser, BaseContext, BaseFunction, ValueMatch, MatchAny, MatchAll, MatchNone,
       AttributeParser, ConfigParser} = require("@celastrina/core");
/**
 * @typedef __AzureRequestBinging
 * @property {string} originalUrl
 * @property {string} method
 * @property {Object} query
 * @property {Object} headers
 * @property {Object} params
 * @property {Object} body
 * @property {string} rawBody
 */
/**
 * @typedef __AzureResponseBinging
 * @property {Object} headers
 * @property {number} status
 * @property {Object} body
 * @property {string} rawBody
 * @property {Array.<Object>} cookies
 */
/**
 * @typedef __AzureFunctionContext
 * @property {__AzureRequestBinging} req
 * @property {__AzureResponseBinging} res
 */
/**
 * @typedef _jwtpayload
 * @property {string} aud
 * @property {string} sub
 * @property {string} oid
 * @property {string} iss
 * @property {number} iat
 * @property {number} exp
 * @property {string} nonce
 */
/**
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
/**
 * @typedef {Object} JWKSKEY
 * @property {string} [kid]
 * @property {string} [kty]
 * @property {string} [x5c]
 * @property {string} [e]
 * @property {string} [n]
 * @property {string} [x]
 * @property {string} [y]
 * @property {string} [crv]
 */
/**
 * @typedef {Object} JWKS
 * @property {(null|string)} [issuer]
 * @property {string} type
 * @property {JWKSKEY} key
 */
/**
 * Cookie
 * @author Robert R Murrell
 */
class Cookie {
    /**
     * @param {string} name
     * @param {(null|string)} [value=null]
     * @param {Object} [options={}]
     * @param {boolean} [dirty=false]
     */
    constructor(name, value = null, options = {}, dirty = false, ) {
        if(typeof name !== "string" || name.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid String. Attribute 'name' cannot be undefined, null, or zero length.", "cookie.name");
        this._name = name.trim();
        this._value = value;
        this._options = options;
        this._dirty = dirty;
    }
    /**@return{boolean}*/get doSetCookie() {return this._dirty};
    /**@return{string}*/get name() {return this._name;}
    /**@return{string}*/get parseValue() {
        if(this._value == null)
            return "";
        else
            return this._value;
    }
    /**@return{null|string}*/get value() {return this._value;}
    /**@param{null|string}value*/set value(value) {
        this._value = value;
        this._dirty = true;
    }
    /**@return{Object}*/get options() {return this._options;}
    /**@param{Object}options*/set options(options) {
        if(options == null || typeof options === "undefined")
            options = {};
        this._options = options;
        this._dirty = true;
    }
    /**
     * @param {string} name
     * @param {*} value
     */
    setOption(name, value) {
        this._options[name] = value;
        this._dirty = true;
    }
    /**
     * @returns {string}
     */
    serialize() {
        return cookie.serialize(this._name, this.parseValue, this._options);
    }
    /**
     * @return {Promise<{name: string, value: string}>}
     */
    async toAzureCookie() {
        let _obj = {name: this._name, value: this.parseValue};
        Object.assign(_obj, this._options);
        return _obj;
    }
    /**@param{number}age*/set maxAge(age) {this.setOption("maxAge", age);}
    /**@param{Date}date*/set expires(date) {this.setOption("expires", date);}
    /**@param{boolean}http*/set httpOnly(http) {this.setOption("httpOnly", http);}
    /**@param{string}domain*/set domain(domain) {this.setOption("domain", domain);}
    /**@param{string}path*/set path(path) {this.setOption("path", path);}
    /**@param{boolean}secure*/set secure(secure) {this.setOption("secure", secure);}
    /**@param("lax"|"none"|"strict")value*/set sameSite(value) {this.setOption("sameSite", value)};
    /**@return{number}*/get maxAge() {return this._options["maxAge"];}
    /**@return{Date}*/get expires() {return this._options["expires"];}
    /**@return{boolean}*/get httpOnly() {return this._options["httpOnly"];}
    /**@return{string}*/get domain() {return this._options["domain"];}
    /**@return{string}*/get path() {return this._options["path"];}
    /**@return{boolean}*/get secure() {return this._options["secure"];}
    /**@return("lax"|"none"|"strict")*/get sameSite() {return this._options["sameSite"];};
    /**@param {string} value*/encodeStringToValue(value) {this.value = Buffer.from(value).toString("base64");}
    /**@param {Object} _object*/encodeObjectToValue(_object) {this.encodeStringToValue(JSON.stringify(_object));}
    /**@return{string}*/decodeStringFromValue() {return Buffer.from(this.value).toString("ascii");}
    /**@return{any}*/decodeObjectFromValue() {return JSON.parse(this.decodeStringFromValue());}
    delete() {
        this.value = null;
        let _epoch = moment("1970-01-01T00:00:00Z");
        this.expires = _epoch.utc().toDate();
    }
    /**
     * @param {string} name
     * @param {(null|string)} [value=null]
     * @param {Object} [options={}]
     * @returns {Cookie} A new cookie whos dirty marker is set to 'true', such that doSerializeCookie will generte a value to
     *                   the Set-Cookie header.
     */
    static newCookie(name, value = null, options = {}) {
        return new Cookie(name, value, options, true);
    }
    /**
     * @param {string} name
     * @param {(null|string)} [value=null]
     * @param {Object} [options={}]
     * @returns {Promise<Cookie>} A new cookie whos dirty marker is set to 'false', such that doSerializeCookie will NOT generte a value to
     *                            the Set-Cookie header.
     */
    static async loadCookie(name, value = null, options = {}) {
        return new Cookie(name, value, options);
    }
    /**
     * @param {string} value
     * @param {Array.<Cookie>} [results=[]];
     * @returns {Promise<Array.<Cookie>>} A new cookie whos dirty marker is set to 'false', such that doSerializeCookie will NOT generte a value to
     *                                    the Set-Cookie header.
     */
    static async parseCookies(value,results = []) {
        let _cookies = cookie.parse(value);
        for(let _name in _cookies) {
            if(_cookies.hasOwnProperty(_name)) {
                results.unshift(new Cookie(_name, _cookies[_name]));
            }
        }
        return results;
    }
}
/**
 * JwtSubject
 * @author Robert R murrell
 */
class JwtSubject extends BaseSubject {
    /**
     * @param {Object} header
     * @param {Object} payload
     * @param {Object} signature
     * @param {(null|string)} [token=null]
     * @param {Array.<string>} [roles]
     */
    constructor(header, payload, signature, token = null, roles = []) {
        super(payload.sub, roles);
        this._header = header;
        this._payload = payload;
        this._signature = signature;
        /**@type{moment.Moment}*/this._issued = moment.unix(payload.iat);
        /**@type{moment.Moment}*/this._expires = moment.unix(payload.exp);
        /**@type{(null|string)}*/this._token = token;
    }
    /**@return{object}*/get header() {return this._header;}
    /**@return{object}*/get payload() {return this._payload;}
    /**@return{object}*/get signature() {return this._signature}
    /**@return{string}*/get nonce(){return this._payload.nonce;}
    /**@return{string}*/get audience() {return this._payload.aud;}
    /**@return{string}*/get issuer(){return this._payload.iss;}
    /**@return{moment.Moment}*/get issued(){return this._issued;}
    /**@return{moment.Moment}*/get expires(){return this._expires;}
    /**@return{(null|string)}*/get token(){return this._token;}
    /**@return{boolean}*/isExpired(){ return moment().isSameOrAfter(this._expires);}
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

    /**
     * @param {Object} decoded
     * @return {Promise<JwtSubject>}
     */
    static async wrap(decoded) {
        return new JwtSubject(decoded.header, decoded.payload, decoded.signature, null);
    }
}

/**
 * BaseIssuer
 * @abstract
 * @author Robert R Murrell
 */
class BaseIssuer {
    /**
     * @param {null|string} issuer
     * @param {(Array.<string>|null)} [audiences=null]
     * @param {(Array.<string>|null)} [assignments=[]] The roles to escalate to the subject if the JWT token is
     *        valid for this issuer.
     * @param {boolean} [validateNonce=false]
     */
    constructor(issuer = null, audiences = null, assignments = null,
                validateNonce = false) {
        this._issuer = issuer;
        this._audiences = audiences;
        this._roles = assignments;
        this._validateNonce = validateNonce;
    }
    /**@return{string}*/get issuer(){return this._issuer;}
    /**@param{string}issuer*/set issuer(issuer){this._issuer = issuer;}
    /**@return{Array.<string>}*/get audiences(){return this._audiences;}
    /**@param{Array.<string>}audience*/set audiences(audience){this._audiences = audience;}
    /**@return{Array<string>}*/get assignments(){return this._roles;}
    /**@param{Array<string>}assignments*/set assignments(assignments){this._roles = assignments;}
    /**@return{boolean}*/get validateNonce() {return this._validateNonce;}
    /**@param{boolean}validate*/set validateNonce(validate) {return this._validateNonce = validate;}
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} subject
     * @return {Promise<*>}
     * @abstract
     */
    async getKey(context, subject) {throw CelastrinaError.newError("Not Implemented", 501);}
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} subject
     * @return {Promise<(null|string)>}
     */
    async getNonce(context, subject) {return null;}
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} _subject
     * @return {Promise<boolean>}
     */
    async verify(context, _subject) {
        if(_subject.issuer === this._issuer) {
            try {
                let decoded = jwt.verify(_subject.token, await this.getKey(context, _subject), {algorithm: "RSA"});
                if(typeof decoded === "undefined" || decoded == null) {
                    context.log("Failed to verify token.", LOG_LEVEL.THREAT,
                        "BaseIssuer.verify(context, _subject)");
                    return false;
                }
                if(this._audiences != null) {
                    if(!this._audiences.includes(_subject.audience)) {
                        context.log("'" + _subject.id + "' with audience '" + _subject.audience +
                                     "' failed match audiences.", LOG_LEVEL.THREAT, "BaseIssuer.verify(context, _subject)");
                        return false;
                    }
                }
                if(this._validateNonce) {
                    let nonce = await this.getNonce(context, _subject);
                    if(typeof nonce === "string" && nonce.trim().length > 0) {
                        if(_subject.nonce !== nonce) {
                            context.log("'" + _subject.id + "' failed to pass nonce validation.", LOG_LEVEL.THREAT,
                                        "BaseIssuer.verify(context, _subject)");
                            return false;
                        }
                    }
                }
                if(this._roles != null) _subject.addRoles(this._roles);
                return true;
            }
            catch(exception) {
                context.log("Exception authenticating JWT: " + exception, LOG_LEVEL.THREAT,
                            "BaseIssuer.verify(context, _subject)");
                return false;
            }
        }
        else return false;
    }
}
/**
 * LocalJwtIssuer
 * @author Robert R Murrell
 */
class LocalJwtIssuer extends BaseIssuer {
    /**
     * @param {(null|string)} issuer
     * @param {(null|string)} key
     * @param {(Array.<string>|null)} [audiences=null]
     * @param {(Array.<string>|null)} [assignments=[]] The roles to escalate the subject to if the JWT token is
     *        valid for this issuer.
     * @param {boolean} [validateNonce=false]
     */
    constructor(issuer = null, key = null, audiences = null,
                assignments = null, validateNonce = false) {
        super(issuer, audiences, assignments, validateNonce);
        this._key = key;
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} subject
     * @return {Promise<*>}
     */
    async getKey(context, subject) {
        return this._key;
    }
    /**@return{string}*/get key() {return this._key;}
    /**@param{string}key*/set key(key) {this._key = key;}
}
/**
 * OpenIDJwtValidator
 * @description Use the following OpenID IDP's for  OpenIDJwtValidator
 *              <ul>
 *                  <li>Microsoft Azure AD IDP: https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration</li>
 *                  <li>Microsoft Azure ADB2C IDP: https://[tenant name].b2clogin.com/[tenant name].onmicrosoft.com/{claim[tfp]}/v2.0/.well-known/openid-configuration</li>
 *              </ul>
 *              All values in curly-brace {} will be replaced with a value from the claim name {claim} in the decoded JWT.
 * @author Robert R Murrell
 */
class OpenIDJwtIssuer extends BaseIssuer {
    /**
     * @param {null|string} issuer
     * @param {null|string} configUrl
     * @param {(Array.<string>|null)} [audiences=null]
     * @param {(Array.<string>|null)} [assignments=[]] The roles to escalate to the subject if the JWT token is
     *        valid for this issuer.
     * @param {boolean} [validateNonce=false]
     */
    constructor(issuer = null, configUrl = null, audiences = null,
                assignments = null, validateNonce = false) {
        super(issuer, audiences, assignments, validateNonce);
        this._configUrl = configUrl;
    }
    get configURL() {return this._configUrl;}
    set configURL(url) {this._configUrl = url;}
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} _subject
     * @param {string} url
     * @return {Promise<string>}
     */
    static async _replaceURLEndpoint(context, _subject, url) {
        /**@type {RegExp}*/let regex = RegExp(/{([^}]*)}/g);
        let match;
        let matches = new Set();
        while((match = regex.exec(url)) !== null) {
            matches.add(match[1]);
        }
        for(const match of matches) {
            let value = await _subject.getClaim(match);
            if(value == null) {
                context.log("Claim '" + match + "' not found for subject '" + _subject.id + "' while building OpenID configuration URL.",
                                    LOG_LEVEL.THREAT, "OpenIDJwtIssuer._replaceURLEndpoint(context, _subject, url)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            if(Array.isArray(value)) value = value[0];
            url = url.split("{" + match + "}").join(/**@type{string}*/value);
        }
        return url;
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} _subject
     * @param {string} configUrl
     * @return {Promise<(null|JWKS)>}
     * @private
     */
    static async _getKey(context, _subject, configUrl) {
        if(!(_subject instanceof JwtSubject)) {
            context.log("OOOOOOPS! Keyboard Driver Error!Function not configured for JWT. Subject '" +
                         _subject.constructor.name + "' wrong type, expected JwtSubject.", LOG_LEVEL.ERROR,
                         "OpenIDJwtIssuer._getKey(context, _subject, configUrl)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
        let _endpoint = await OpenIDJwtIssuer._replaceURLEndpoint(context, _subject, configUrl);
        try {
            let _response = await axios.get(_endpoint);
            let _issuer = _response.data["issuer"];
            _endpoint = _response.data["jwks_uri"];
            _response = await axios.get(_endpoint);
            /**@type{(null|JWKS)}*/let _key = null;
            for (const key of _response.data.keys) {
                if(key.kid === _subject.header.kid) {
                    _key = {issuer: _issuer, type: key.kty, key: key};
                    break;
                }
            }
            return _key;
        }
        catch(exception) {
            context.log("Exception getting OpenID configuration for subject " + _subject.id + ": " + exception,
                                LOG_LEVEL.ERROR, "OpenIDJwtIssuer._getKey(subject, context)");
            CelastrinaError.newError("Exception authenticating user.", 401);
        }
    }
    /**
     * @param {(null|JWKS)} key
     * @param {HTTPContext} context
     * @return {Promise<string>}
     * @private
     */
    async _getPemX5C(key, context) {
        return "-----BEGIN PUBLIC KEY-----\n" + key.key.x5c + "\n-----END PUBLIC KEY-----\n";
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} subject
     * @return {Promise<void>}
     * @private
     */
    async getKey(context, subject) {
        /**@type{(null|JWKS)}*/let key = await OpenIDJwtIssuer._getKey(context, subject, this._configUrl);
        let pem;
        if(typeof key.key.x5c === "undefined" || key.key.x5c == null)
            pem = jwkToPem(key.key);
        else
            pem = await this._getPemX5C(key, context);
        return pem;
    }
}
/**
 * BaseIssuerParser
 * @author Robert R Murrell
 * @abstract
 */
class BaseIssuerParser extends AttributeParser {
    /**
     * @param {string} [type="Object"]
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(type = "BaseIssuer", link = null, version = "1.0.0") {
        super(type, link, version);
    }
    /**
     * @param {Object} _BaseIssuer
     * @param {BaseIssuer} _issuer
     */
    _loadIssuer(_BaseIssuer, _issuer) {
        if(!(_BaseIssuer.hasOwnProperty("issuer")) || (typeof _BaseIssuer.issuer !== "string") || _BaseIssuer.issuer.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[BaseIssuerParser._loadIssuer(_BaseIssuer, _issuer)][_BaseIssuer.issuer]: Issuer cannot be null, undefined, or empty.", "_BaseIssuer.issuer");
        if(!(_BaseIssuer.hasOwnProperty("audiences")) || !(Array.isArray(_BaseIssuer.audiences)) || _BaseIssuer.audiences.length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[BaseIssuerParser._loadIssuer(_BaseIssuer, _issuer)][_BaseIssuer.audiences]: Audiences cannot be null.", "_BaseIssuer.audiences");
        if(!(_BaseIssuer.hasOwnProperty("roles")) || !(Array.isArray(_BaseIssuer.roles)) || _BaseIssuer.roles.length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[BaseIssuerParser._loadIssuer(_BaseIssuer, _issuer)][_BaseIssuer.roles]: ", "_BaseIssuer.roles");
        let _validate = false;
        if(_BaseIssuer.hasOwnProperty("validateNonce") && (typeof _BaseIssuer.validateNonce === "boolean"))
            _validate = _BaseIssuer.validateNonce;
        _issuer.issuer = _BaseIssuer.issuer.trim();
        _issuer.audiences = _BaseIssuer.audiences;
        _issuer.assignments = _BaseIssuer.roles;
        _issuer.validateNonce = _validate;
    }
}
/**
 * LocalJwtIssuerParser
 * @author Robert R Murrell
 */
class LocalJwtIssuerParser extends BaseIssuerParser {
    /**
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("LocalJwtIssuer", link, version);
    }
    /**
     * @param {Object} _LocalJwtIssuer
     * @return {Promise<LocalJwtIssuer>}
     * @private
     */
    async _create(_LocalJwtIssuer) {
        let _issuer = new LocalJwtIssuer();
        await this._loadIssuer(_LocalJwtIssuer, _issuer);
        if(!(_LocalJwtIssuer.hasOwnProperty("key")) || (typeof _LocalJwtIssuer.key !== "string") ||  _LocalJwtIssuer.key.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[LocalJwtIssuerParser._create(_LocalJwtIssuer)][_LocalJwtIssuer.key]: ",
                    "_LocalJwtIssuer.key");
        _issuer.key = _LocalJwtIssuer.key.trim();
        return _issuer;
    }
}
/**
 * LocalJwtIssuerParser
 * @author Robert R Murrell
 */
class OpenIDJwtIssuerParser extends BaseIssuerParser {
    /**
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("OpenIDJwtIssuer", link, version);
    }
    /**
     * @param {Object} _OpenIDJwtIssuer
     * @return {Promise<OpenIDJwtIssuer>}
     * @private
     */
    async _create(_OpenIDJwtIssuer) {
        let _issuer = new OpenIDJwtIssuer();
        await this._loadIssuer(_OpenIDJwtIssuer, _issuer);
        if(!(_OpenIDJwtIssuer.hasOwnProperty("configURL")) || (typeof _OpenIDJwtIssuer.configURL !== "string") ||  _OpenIDJwtIssuer.configURL.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[OpenIDJwtIssuerParser._create(_OpenIDJwtIssuer)][_OpenIDJwtIssuer.configURL]: configURL cannot be null or empty.",
                    "_OpenIDJwtIssuer.configURL");
        _issuer.configURL = _OpenIDJwtIssuer.configURL.trim();
        return _issuer;
    }
}
/**
 * HTTPParameter
 * @abstract
 * @author Robert R Murrell
 */
class HTTPParameter {
    /**
     * @param{string}[type]
     * @param{boolean}[readOnly]
     */
    constructor(type = "HTTPParameterFetch", readOnly = false) {this._type = type; this._readOnly = readOnly}
    /**@return{string}*/get type() {return this._type;}
    /**@return{boolean}*/get readOnly() {return this._readOnly;}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @return {*}
     * @abstract
     */
    _getParameter(context, key) {
        throw CelastrinaError.newError("Not Implemented.", 501);
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {*} [defaultValue]
     * @return {Promise<*>}
     */
    async getParameter(context, key, defaultValue = null) {
        let _value = this._getParameter(context, key);
        if(typeof _value === "undefined" || _value == null) _value = defaultValue;
        return _value;
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {*} [value = null]
     * @abstract
     */
    _setParameter(context, key, value = null) {}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {*} [value = null]
     * @return {Promise<void>}
     */
    async setParameter(context, key, value = null) {
        if(this._readOnly)
            throw CelastrinaError.newError("Set Parameter not supported.");
        this._setParameter(context, key, value);
    }
}
/**
 * HeaderParameter
 * @author Robert R Murrell
 */
class HeaderParameter extends HTTPParameter {
    constructor(type = "header"){super(type);}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @return {(null|string)}
     */
    _getParameter(context, key) {
        return context.getRequestHeader(key);
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {(null|string)} [value = null]
     */
    _setParameter(context, key, value = null) {
        context.setResponseHeader(key, value);
    }
}
/**
 * CookieParameter
 * @author Robert R Murrell
 */
class CookieParameter extends HTTPParameter {
    constructor(type = "cookie"){super(type);}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @return {Cookie}
     */
    _getParameter(context, key) {
        let cookie = context.getCookie(key, null);
        if(cookie != null) cookie = cookie.value;
        return cookie;
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [value = null]
     */
    _setParameter(context, key, value = null) {
        let cookie = context.getCookie(key, null);
        if(cookie == null)
            cookie = Cookie.newCookie(key, value);
        else
            cookie.value = value;
        context.setCookie(cookie);
    }
}
/**
 * QueryParameter
 * @author Robert R Murrell
 */
class QueryParameter extends HTTPParameter {
    constructor(type = "query"){super(type, true);}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @return {(null|string)}
     */
    _getParameter(context, key) {
        return context.getQuery(key);
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {(null|string)} [value = null]
     */
    _setParameter(context, key, value = null) {
        throw CelastrinaError.newError("QueryParameter.setParameter not supported.", 501);
    }
}
/**
 * BodyParameter
 * @author Robert R Murrell
 */
class BodyParameter extends HTTPParameter {
    constructor(type = "body"){super(type);}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @return {*}
     */
    _getParameter(context, key) {
        let _value = context.requestBody;
        /**@type{Array<string>}*/let _attrs = key.split(".");
        for(const _attr of _attrs) {
            _value = _value[_attr];
        }
        return _value;
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {*} [value = null]
     */
    _setParameter(context, key, value = null) {
        let _value = context.responseBody;
        /**@type{Array<string>}*/let _attrs = key.trim().split(".");
        for(let idx = 0; idx < _attrs.length - 2; ++idx) {
            _value = _value[_attrs[idx]];
            if(typeof _value === "undefined" || _value == null)
                throw CelastrinaError.newError("Invalid object path '" + key + "'.");
        }
        _value[_attrs[_attrs.length - 1]] = value;
    }
}
/**
 * Session
 * @author Robert R Murrell
 */
class Session {
    /**
     * @param {Object} [values = {}]
     * @param {boolean} [isNew = false]
     * @param {(null|string)} [id = null]
     */
    constructor(values = {}, isNew = false, id = uuidv4()) {
        if(typeof values.id === "undefined" || values.id == null) values.id = id;
        this._values = values;
        /**@type{boolean}*/this._dirty = isNew;
        /**@type{boolean}*/this._new = isNew;
    }
    /**@return{string}*/get id() {return this._values.id;}
    /**@return{boolean}*/get isNew() {return this._new;}
    /**
     * @param {string} name
     * @param {*} defaultValue
     * @return {Promise<*>}
     */
    async getProperty(name, defaultValue = null) {
        let _value = this._values[name];
        if(typeof _value === "undefined" || _value == null)
            return defaultValue;
        else
            return _value;
    }
    /**
     * @param {string} name
     * @param {*} value
     * @return {Promise<void>}
     */
    async setProperty(name, value) {
        this._values[name] = value;
        this._dirty = true;
    }
    /**
     * @param {string} name
     * @return {Promise<void>}
     */
    async deleteProperty(name) {delete this._values[name]; this._dirty = true;}
    /**@type{boolean}*/get doWriteSession() {return this._dirty;}
    /**
     * @param {Object} values
     */
    static load(values) {
        return new Session(values);
    }
}
/**
 * SessionManager
 * @author Robert R Murrell
 */
class SessionManager {
    /**
     * @param {HTTPParameter} parameter
     * @param {string} [name = "celastrinajs_session"]
     * @param {boolean} [createNew = true]
     */
    constructor(parameter, name = "celastrinajs_session", createNew = true) {
        if(typeof parameter === "undefined" || parameter == null)
            throw CelastrinaValidationError.newValidationError("Argument 'parameter' cannot be null.", "parameter");
        if(typeof name !== "string" || name.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argument 'name' cannot be null or empty.", "name");
        this._parameter = parameter;
        this._name = name.trim();
        this._createNew = createNew;
    }
    async initialize(azcontext, pm, rm) {}
    /**
     * @return {Promise<Session>}
     */
    async newSession() {this._session = new Session({}, true); return this._session;}
    /**
     * @param {*} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    async _loadSession(session, context) {return session;}
    /**
     * @param {HTTPContext} context
     * @return {Promise<Session>}
     */
    async loadSession(context) {
        let _session = await this._parameter.getParameter(context, this._name);
        if((typeof _session === "undefined" || _session == null)) {
            if(this._createNew)
                _session = this.newSession();
            else
                return null;
        }
        else {
            /**@type{string}*/let _obj = await this._loadSession(_session, context);
            if(typeof _obj == "undefined" || _obj == null || _obj.trim().length === 0) {
                if(this._createNew)
                    _session = await this.newSession();
                else
                    return null;
            }
            else
                _session = Session.load(JSON.parse(_obj));
        }
        return _session;
    }
    /**
     * @param {string} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    async _saveSession(session, context) {return session;}
    /**
     * @param {Session} [session = null]
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async saveSession(session = null, context) {
        if(typeof session !== "undefined" && session != null && session instanceof Session) {
            if(session.doWriteSession && !this._parameter.readOnly)
                await this._parameter.setParameter(context, this._name, await this._saveSession(JSON.stringify(session), context));
        }
    }
}
/**
 * SecureSessionManager
 * @author Robert R Murrell
 */
class SecureSessionManager extends SessionManager {
    /**
     * @param {Algorithm} algorithm
     * @param {HTTPParameter} parameter
     * @param {string} [name = "celastrinajs_session"]
     * @param {boolean} [createNew = true]
     */
    constructor(algorithm, parameter, name = "celastrinajs_session", createNew = true) {
        super(parameter, name, createNew);
        this._crypto = new Cryptography(algorithm);
    }
    /**
     * @param azcontext
     * @param pm
     * @param rm
     * @return {Promise<void>}
     */
    async initialize(azcontext, pm, rm) {
        await super.initialize(azcontext, pm, rm);
        await this._crypto.initialize();
    }
    /**
     * @param {*} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    async _loadSession(session, context) {
        return this._crypto.decrypt(session);
    }
    /**
     * @param {string} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    async _saveSession(session, context) {
        return this._crypto.encrypt(session);
    }
}
/**
 * AESSessionManager
 * @author Robert R Murrell
 */
class AESSessionManager extends SecureSessionManager {
    /**
     * @param {{key:string,iv:string}} options
     * @param {HTTPParameter} parameter
     * @param {string} [name = "celastrinajs_session"]
     * @param {boolean} [createNew = true]
     */
    constructor(options, parameter, name = "celastrinajs_session", createNew = true) {
        if(typeof options === "undefined" || options == null)
            throw CelastrinaValidationError.newValidationError("Argement 'options' cannot be undefined or null", "options");
        if(typeof options.key !== "string" || options.key.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argement 'key' cannot be undefined, null or zero length.", "options.key");
        if(typeof options.iv !== "string" || options.iv.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Argement 'iv' cannot be undefined, null or zero length.", "options.iv");
        super(AES256Algorithm.create(options), parameter, name, createNew);
    }
}
/**
 * SessionRoleFactory
 * @author Robert R Murrell
 */
class SessionRoleFactory extends BaseRoleFactory {
    /**
     * @param {string} [key="roles"]
     */
    constructor(key = "roles") {
        super();
        this._key = key;
    }
    /**
     * @param {BaseContext|HTTPContext} context
     * @param {BaseSubject|JwtSubject} subject
     * @return {Promise<Array.<string>>}
     */
    async getSubjectRoles(context, subject) {
        let _roles = await context.session.getProperty(this._key, []);
        if(!Array.isArray(_roles)) throw CelastrinaError.newError("Invalid role assignments for session key '" + this._key + "'.");
        return _roles;
    }
}
/**
 * SessionRoleFactoryParser
 * @author Robert R Murrell
 */
class SessionRoleFactoryParser extends RoleFactoryParser {
    /**
     * @param {AttributeParser} link
     * @param {string} version
     */
    constructor(link = null, version = "1.0.0") {
        super("SessionRoleFactory", link, version);
    }
    /**
     * @param {Object} _SessionRoleFactory
     * @return {Promise<BaseRoleFactory>}
     */
    async _create(_SessionRoleFactory) {
        let _key = "roles";
        if(_SessionRoleFactory.hasOwnProperty("key") && (typeof _SessionRoleFactory.key === "string"))
            _key = _SessionRoleFactory.key;
        return new SessionRoleFactory(_key);
    }
}
/**
 * AESSessionManagerParser
 * @author Robert R Murrell
 */
class AESSessionManagerParser extends AttributeParser {
    /**
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("AESSessionManager", link, version);
    }
    /**
     * @param {string} name
     * @return {Promise<HTTPParameter>}
     * @private
     */
    async _createParameter(name) {
        switch(name) {
            case "header":
                return new HeaderParameter();
            case "cookie":
                return new CookieParameter();
            case "query":
                return new QueryParameter();
            case "body":
                return new BodyParameter();
            default:
                throw CelastrinaValidationError.newValidationError(
                    "[AESSessionManagerParser._createParameter(name)][AESSessionManager.parameter]: '" + name + "' is not supported.",
                    "AESSessionManager.parameter");
        }
    }
    /**
     * @param {Object} _AESSessionManager
     * @return {Promise<AESSessionManager>}
     */
    async _create(_AESSessionManager) {
        let _paramtype = "cookie";
        if(_AESSessionManager.hasOwnProperty("paramter") && (typeof _AESSessionManager.parameter === "string"))
            _paramtype = _AESSessionManager.parameter;
        let _paramname = "celastrinajs_session";
        if(_AESSessionManager.hasOwnProperty("name") && (typeof _AESSessionManager.name === "string"))
            _paramname = _AESSessionManager.name;
        let _createnew = true;
        if(_AESSessionManager.hasOwnProperty("createNew") && (typeof _AESSessionManager.createNew === "boolean"))
            _createnew = _AESSessionManager.createNew;
        let _options = null;
        if(_AESSessionManager.hasOwnProperty("options") && (typeof _AESSessionManager.options === "object") &&
                _AESSessionManager.options != null)
            _options = _AESSessionManager.options;
        else {
            throw CelastrinaValidationError.newValidationError(
                "[AESSessionManagerParser._create(_AESSessionManager)][AESSessionManager.options]: Argument 'optiosn' cannot be null or undefined.",
                "AESSessionManager.options");
        }
        if(!(_options.hasOwnProperty("iv")) || !(typeof _options.iv !== "string") || _options.iv.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AESSessionManagerParser._create(_AESSessionManager)][AESSessionManager.options.iv]: Aregument 'iv' cannot be null or empty.",
                "AESSessionManager.options.iv");
        if(!(_options.hasOwnProperty("key")) || !(typeof _options.key !== "string") || _options.key.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AESSessionManagerParser._create(_AESSessionManager)][AESSessionManager.options.key]: Argument 'key' cannot be null or empty.",
                "AESSessionManager.options.key");
        return new AESSessionManager(_options, await this._createParameter(_paramtype), _paramname, _createnew);
    }
}
/**
 * HTTPConfigurationParser
 * @author Robert R Murrell
 */
class HTTPConfigurationParser extends ConfigParser {
    /**
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("HTTP", link, version);
    }
    /**
     * @param _Object
     * @return {Promise<void>}
     * @private
     */
    async _create(_Object) {
        if(_Object.hasOwnProperty("session") && (typeof _Object.session === "object") && _Object.session != null) {
            if(_Object.hasOwnProperty("manager") && (_Object.manager instanceof SessionManager))
                this._config["celastrinajs.http.session"] = _Object.manager;
        }
    }
}
/**
 * HTTPConfiguration
 * @author Robert R Murrell
 */
class HTTPConfiguration extends ConfigurationLoader {
    static CONFIG_HTTP_SESSION_MANAGER = "celastrinajs.http.session";
    /**
     * @param {string} name
     * @param {(null|string)} [property = null]
     */
    constructor(name, property = null) {
        super(name, property);
        this._config[HTTPConfiguration.CONFIG_HTTP_SESSION_MANAGER] = null;
        if(this._property != null) {
            this._cfp.addLink(new HTTPConfigurationParser());
            this._ctp.addLink(new AESSessionManagerParser());
        }
    }
    /**@return{SessionManager}*/get sessionManager() {return this._config[HTTPConfiguration.CONFIG_HTTP_SESSION_MANAGER];}
    /**
     * @param {SessionManager} [sm=null]
     * @return {HTTPConfiguration}
     */
    setSessionManager(sm = null) {
        this._config[HTTPConfiguration.CONFIG_HTTP_SESSION_MANAGER] = sm;
        return this;
    }
    /**
     * @param {_AzureFunctionContext} azcontext
     * @param {PropertyManager} pm
     * @return {Promise<void>}
     */
    async _initLoadConfiguration(azcontext, pm) {
        await super._initLoadConfiguration(azcontext, pm);

    }
    /**
     * @param {Object} azcontext
     * @param {PropertyManager} pm
     * @param {ResourceManager} rm
     * @return {Promise<void>}
     * @private
     */
    async _postInitialize(azcontext, pm, rm) {
        await super._postInitialize(azcontext, pm, rm);
        /**@type{SessionManager}*/let _sm = this._config[HTTPConfiguration.CONFIG_HTTP_SESSION_MANAGER];
        if(typeof _sm !== "undefined" && _sm != null) {
            await _sm.initialize(azcontext, pm, rm);
        }
    }
}
/**
 * JwtConfigurationParser
 * @author Robert R Murrell
 */
class JwtConfigurationParser extends ConfigParser {
    /**
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("JWT", link, version);
    }
    /**
     * @param _Object
     * @return {Promise<void>}
     * @private
     */
    async _create(_Object) {
        if(_Object.hasOwnProperty("issuers") && Array.isArray(_Object.issuers))
            this._config["celastrinajs.http.jwt.issuers"] = _Object.issuers;
        if(_Object.hasOwnProperty("parameter") && (_Object.parameter instanceof HTTPParameter))
            this._config["celastrinajs.http.jwt.issuers"] = _Object.parameter;
        if(_Object.hasOwnProperty("name") && (typeof _Object.name === "string") && _Object.name.trim().length > 0)
            this._config["celastrinajs.http.jwt.authorization.token.name"] = _Object.name;
        if(_Object.hasOwnProperty("scheme") && (typeof _Object.scheme === "string") && _Object.scheme.trim().length > 0)
            this._config["celastrinajs.http.jwt.authorization.token.schem"] = _Object.scheme;
        if(_Object.hasOwnProperty("removeScheme") && (typeof _Object.removeScheme === "boolean"))
            this._config["celastrinajs.http.jwt.authorization.token.scheme.remove"] = _Object.removeScheme;
    }
}
/**
 * JwtConfiguration
 * @author Robert R Murrell
 */
class JwtConfiguration extends HTTPConfiguration {
    static CONFIG_JWT_ISSUERS = "celastrinajs.http.jwt.issuers";
    static CONFIG_JWT_TOKEN_PARAMETER = "celastrinajs.http.jwt.authorization.token.parameter";
    static CONFIG_JWT_TOKEN_NAME = "celastrinajs.http.jwt.authorization.token.name";
    static CONFIG_JWT_TOKEN_SCHEME = "celastrinajs.http.jwt.authorization.token.scheme";
    static CONFIG_JWT_TOKEN_SCHEME_REMOVE = "celastrinajs.http.jwt.authorization.token.scheme.remove";
    /**
     * @param{string} name
     * @param {(null|string)} [property = null]
     */
    constructor(name, property = null) {
        super(name, property);
        let _anonname = "@celastrinajs/http/anonymous/" + name;
        this._config[JwtConfiguration.CONFIG_JWT_ISSUERS] = [];
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_PARAMETER] = new HeaderParameter();
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_NAME] = "authorization";
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME] = "Bearer";
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME_REMOVE] = true;
        if(this._property != null) {
            this._cfp.addLink(new JwtConfigurationParser());
            this._ctp.addLink(new OpenIDJwtIssuerParser(new LocalJwtIssuerParser()));
        }
    }
    /**@return{Array.<BaseIssuer>}*/get issuers(){return this._config[JwtConfiguration.CONFIG_JWT_ISSUERS];}
    /**@param{Array.<BaseIssuer>} issuers*/
    set issuers(issuers) {
        if(typeof issuers === "undefined" || issuers == null) issuers = [];
        this._config[JwtConfiguration.CONFIG_JWT_ISSUERS] = issuers;
    }
    /**@return{HTTPParameter}*/get parameter() {return this._config[JwtConfiguration.CONFIG_JWT_TOKEN_PARAMETER]}
    /**@return{string}*/get token() {return this._config[JwtConfiguration.CONFIG_JWT_TOKEN_NAME];}
    /**@return{string}*/get scheme() {return this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME];}
    /**@return{boolean}*/get removeScheme() {return this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME_REMOVE];}
    /**
     * @param {Array.<BaseIssuer>} [issuers=[]]
     * @return {JwtConfiguration}
     */
    setIssuers(issuers = []){this._config[JwtConfiguration.CONFIG_JWT_ISSUERS] = issuers; return this;}
    /**
     * @param {BaseIssuer} issuer
     * @return {JwtConfiguration}
     */
    addIssuer(issuer){this._config[JwtConfiguration.CONFIG_JWT_ISSUERS].unshift(issuer); return this;}
    /**
     * @param {HTTPParameter} token
     * @return {JwtConfiguration}
     */
    setParameter(token) {this._config[JwtConfiguration.CONFIG_JWT_TOKEN_PARAMETER] = token; return this;}
    /**
     * @param {string} token
     * @return {JwtConfiguration}
     */
    setToken(token) {this._config[JwtConfiguration.CONFIG_JWT_TOKEN_NAME] = token; return this;}
    /**
     * @param {string} scheme
     * @return {JwtConfiguration}
     */
    setScheme(scheme) {this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME] = scheme; return this;}
    /**
     * @param {boolean} remove
     * @return {JwtConfiguration}
     */
    setRemoveScheme(remove) {this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME_REMOVE] = remove; return this;}
}
/**
 * HTTPContext
 * @author Robert R Murrell
 */
class HTTPContext extends BaseContext {
    /**
     * @param {__AzureFunctionContext} azcontext
     * @param {Configuration} config
     */
    constructor(azcontext, config) {
        super(azcontext, config);
        this._azfunccontext.res.status = 200;
        this._azfunccontext.res.headers["Content-Type"] = "text/html; charset=ISO-8859-1";
        this._azfunccontext.res.body = "<html lang=\"en\"><head><title>" + config.name + "</title></head><body>200, Success</body></html>";
        /**@type{string}*/this._action = this._azfunccontext.req.method.toLowerCase();
        /**@type{Object}*/this._cookies = {};
        /**@type{Session}*/this._session = null;
    }
    /**@return{Object}*/get cookies() {return this._cookies;}
    /**@return{string}*/get method(){return this._action;}
    /**@return{string}*/get url(){return this._azfunccontext.req.originalUrl;}
    /**@return{Object}*/get request(){return this._azfunccontext.req;}
    /**@return{Object}*/get response(){return this._azfunccontext.res;}
    /**@return{Object}*/get params(){return this._azfunccontext.req.params;}
    /**@return{Object}*/get query(){return this._azfunccontext.req.query;}
    /**@return{string}*/get raw(){return this._azfunccontext.req.rawBody;}
    /**@return{Object}*/get requestBody(){return this._azfunccontext.req.body;}
    /**@return{Object}*/get responseBody(){return this._azfunccontext.res.body;}
    /**@return{Session}*/get session(){return this._session;}
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setRequestId() {
        let id = this._azfunccontext.req.query["requestId"];
        if(typeof id === "undefined" || id == null) id = this._azfunccontext.req.headers["x-celastrina-requestId"];
        if(typeof id === "string") this._requestId = id;
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setMonitorMode() {
        let monitor;
        if(this.method === "trace") monitor = true;
        else {
            monitor = this._azfunccontext.req.query["monitor"];
            if (typeof monitor === "undefined" || monitor == null) monitor = this._azfunccontext.req.headers["x-celastrina-monitor"];
            monitor = (typeof monitor === "string") ? (monitor === "true") : false;
        }
        this._monitor = monitor;
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _parseCookies() {
        let cookies = cookie.parse(this.getRequestHeader("cookie", ""), "");
        for(let prop in cookies) {
            if(cookies.hasOwnProperty(prop)) {
                let local = cookies[prop];
                if(typeof local !== "undefined" && local != null)
                    this._cookies[prop] = new Cookie(prop, local);
            }
        }
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setSession() {
        this._session = await this._config.sessionManager.loadSession(this);
    }
    /**
     * @return {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        await this._setMonitorMode();
        await this._setRequestId();
        await this._parseCookies();
        await this._setSession();
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getURIBinding(name, defaultValue = null) {
        let uirbinding = this._azfunccontext.bindingData[name];
        if(typeof uirbinding === "undefined" || uirbinding == null) return defaultValue
        else return uirbinding;
    }
    /**
     * @param {string} name
     * @param {Cookie} [defaultValue=null]
     * @return {Cookie}
     */
    getCookie(name, defaultValue = null) {
        let cookie = this._cookies[name];
        if(typeof cookie === "undefined" || cookie == null)
            return defaultValue;
        else
            return cookie;
    }
    /**
     * @param {Cookie} cookie
     */
    setCookie(cookie) {
        this._cookies[cookie.name] = cookie;
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getQuery(name, defaultValue = null) {
        let qry = this._azfunccontext.req.query[name];
        if(typeof qry !== "string") return defaultValue;
        else return qry;
    }
    /**
     * @param {string} name
     * @param {null|string|Array.<string>} [defaultValue=null]
     * @return {null|string|Array.<string>}
     */
    getRequestHeader(name, defaultValue = null) {
        let header = this._azfunccontext.req.headers[name];
        if(typeof header !== "string") return defaultValue;
        else return header;
    }
    /**
     * @param {string} name
     */
    deleteResponseHeader(name) {
        try {
            delete this._azfunccontext.req.headers[name];
        }
        catch(exception) {
            this.log("Silent exception thrown while deleting response header: " + exception + ". \r\nNo action taken.",
                             LOG_LEVEL.ERROR, "HTTPContext.deleteResponseHeader(name)");
        }
    }
    /**
     * @param {string} name
     * @param {null|string|Array.<string>} [defaultValue=null]
     * @return {null|string|Array.<string>}
     */
    getResponseHeader(name, defaultValue = null) {
        let header = this._azfunccontext.res.headers[name];
        if(typeof header !== "string") return defaultValue;
        else return header;
    }
    /**
     * @param {string} name
     * @param {string|Array.<string>} value
     */
    setResponseHeader(name, value) {
        this._azfunccontext.res.headers[name] = value;
    }
    /**
     * @param {*} [body=null]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        if((status >= 200 && status <= 299) && (body == null || (typeof body === "string" && body.length === 0))) status = 204;
        this._azfunccontext.res.status = status;
        this._azfunccontext.res.headers["X-celastrina-request-uuid"] = this._requestId;
        this._azfunccontext.res.body = body;
    }
    /**
     * @param {CelastrinaValidationError} [error=null]
     * @param {*} [body=null]
     */
    sendValidationError(error = null, body = null) {
        if(error == null) error = CelastrinaValidationError.newValidationError("bad request");
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>400 - Bad Request</header><main><p><h2>" + error.message + "</h2><br />" + error.tag + "</p></main><footer>celastrinajs</footer></body></html>";
        this.send(body, error.code);
    }
    /**
     * @param {string} url
     * @param {*} [body=null]
     */
    sendRedirect(url, body = null) {
        this._azfunccontext.res.headers["Location"] = url;
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>302 - Redirect</header><main><p><h2>" + url + "</h2></main><footer>celastrinajs</footer></body></html>";
        this.send(body, 302);
    }
    /**@param{string}url*/
    sendRedirectForwardBody(url) {this.sendRedirect(url, this._azfunccontext.req.body);}
    /**
     * @param {*} [error=null]
     * @param {*} [body=null]
     */
    sendServerError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Internal Server Error.");
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 500);
        switch(error.code) {
            case 403:
                this.sendForbiddenError(error);
                break;
            case 401:
                this.sendNotAuthorizedError(error);
                break;
            case 400:
                this.sendValidationError(error);
                break;
            default:
                if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>" + error.code + " - Internal Server Error</header><main><p><h2>" + error.message + "</h2></main><footer>celastrinajs</footer></body></html>";
                this.send(body, error.code);
        }
    }
    /**
     * @param {*} [error=null]
     * @param {*} [body=null]
     */
    sendNotAuthorizedError(error= null, body = null) {
        if(error == null) error = CelastrinaError.newError("Not Authorized.", 401);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 401);
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>401 - Not Authorized</header><main><p><h2>" + error.message + "</h2></main><footer>celastrinajs</footer></body></html>";
        this.send(body, error.code);
    }
    /**
     * @param {*} [error=null]
     * @param {*} [body=null]
     */
    sendForbiddenError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Forbidden.", 403);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 403);
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>403 - Forbidden</header><main><p><h2>" + error.message + "</h2></main><footer>celastrinajs</footer></body></html>";
        this.send(body, error.code);
    }
}
/**
 * JSONHTTPContext
 * @author Robert R Murrell
 */
class JSONHTTPContext extends HTTPContext {
    /**
     * @param {__AzureFunctionContext} context
     * @param {Configuration} config
     */
    constructor(context, config) {
        super(context, config);
        this._azfunccontext.res.status = 200;
        this._azfunccontext.res.headers["Content-Type"] = "application/json; charset=utf-8";
        this._azfunccontext.res.body = {name: config.name, code: 200, message: "Success! Welcome to celastrinajs."};
    }
    sendCelastrinaError(error) {
        let _tag = null;
        if(typeof error.tag === "string" && error.tag.trim().length > 0) _tag = error.tag;
        let _causeMessage = null;
        if(error.cause instanceof Error) _causeMessage = error.cause.message;
        this.send({name: error.name, message: error.message, tag: _tag, code: error.code, cause: _causeMessage,
                        drop: error.drop}, error.code);
    }
    /**
     * @param {CelastrinaValidationError} [error=null]
     * @param {Object} [body=null]
     */
    sendValidationError(error = null, body = null) {
        if(error == null) error = CelastrinaValidationError.newValidationError("bad request");
        if(body == null)
            this.sendCelastrinaError(error);
        else
            this.send(body, 400);
    }
    /**
     * @param {string} url
     * @param {Object} [body=null]
     */
    sendRedirect(url, body = null) {
        this._azfunccontext.res.headers["Location"] = url;
        if(body == null) body = {code: 302, url: url};
        this.send(body, 302);
    }
    /**
     * @param {*} [error=null]
     * @param {Object} [body=null]
     */
    sendServerError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Internal Server Error.");
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 500);
        if(body == null)
            this.sendCelastrinaError(error);
        else
            this.send(body, 500);
    }
    /**
     * @param {*} [error=null]
     * @param {Object} [body=null]
     */
    sendNotAuthorizedError(error= null, body = null) {
        if(error == null) error = CelastrinaError.newError("Not Authorized.", 401);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 401);
        if(body == null)
            this.sendCelastrinaError(error);
        else
            this.send(body, 401);
    }
    /**
     * @param {*} [error=null]
     * @param {Object} [body=null]
     */
    sendForbiddenError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Forbidden.", 403);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 403);
        if(body == null)
            this.sendCelastrinaError(error);
        else
            this.send(body, 403);
    }
}
/**
 * HTTPSentry
 * @author Robert R Murrell
 */
class HTTPSentry extends BaseSentry {
    constructor() {
        super();
    }
}
/**
 * HTTPSentry
 * @author Robert R Murrell
 */
class OptimisticHTTPSentry extends HTTPSentry {
    constructor() {
        super();
    }
    /**
     * @param {Configuration | HTTPConfiguration} config
     * @return {Promise<void>}
     */
    async initialize(config) {
        config.setAuthorizationOptimistic(true);
        return super.initialize(config);
    }
}
/**
 * JwtSentry
 * @author Robert R Murrell
 */
class JwtSentry extends HTTPSentry {
    constructor() {
        super();
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtConfiguration} _config
     * @return {Promise<string>}
     * @private
     */
    async _getToken(context, _config) {
        /**@type{string}*/let _token = await _config.parameter.getParameter(context, _config.token);
        if(typeof _token !== "string") {
            context.log("JWT " + _config.parameter.type + " token " + _config.token + " but none was found.",
                        LOG_LEVEL.THREAT, "JwtSentry._getToken(context, _config)");
            return null;
        }
        let _scheme = _config.scheme;
        if(typeof _scheme === "string" && _scheme.length > 0) {
            if(!_token.startsWith(_scheme)) {
                context.log("Expected JWT token scheme '" + _scheme + "' but none was found.", LOG_LEVEL.THREAT,
                             "JwtSentry._getToken(context, _config)");
                return null;
            }
            if(_config.removeScheme) _token = _token.slice(_scheme.length).trim();
        }
        return _token;
    }

    /**
     * @param {(BaseContext | HTTPContext)} context
     * @return {Promise<JwtSubject>}
     */
    async createSubject(context) {
        /**@type{JwtConfiguration}*/let _config  = /**@type{JwtConfiguration}*/context.config;
        let _token = await this._getToken(context, _config);
        if(_token != null) {
            let _subject = null;
            try {
                _subject = await JwtSubject.decode(_token);
            }
            catch(exception) {
                context.log("JWT Token failed to decode.", LOG_LEVEL.THREAT,
                            "JwtSentry.createSubject(context)");
                throw exception;
            }
            let _subjectid = _subject.id;
            if(typeof _subjectid === "undefined" || _subjectid == null) _subjectid = context.requestId;
            if(_subject.isExpired()) {
                context.log(_subjectid + " token expired.", LOG_LEVEL.THREAT,
                            "JwtSentry.createSubject(context)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            /**@type{Array.<Promise<boolean>>}*/let promises = [];
            /**@type{Array.<BaseIssuer>}*/let _issuers = _config.issuers;
            for(const _issuer of _issuers) {
                promises.unshift(_issuer.verify(context, _subject)); // Performs the role escalations too.
            }
            /**type{Array.<boolean>}*/let results = await Promise.all(promises);
            if(!results.includes(true)) {
                context.log(_subjectid + " token did not match any issuers.", LOG_LEVEL.THREAT,
                            "JwtSentry.createSubject(context)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            else
                return _subject;
        }
        else {
            context.log("No JWT token found.", LOG_LEVEL.THREAT,"JwtSentry.createSubject(context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
    }
}
/**
 * @type {BaseFunction}
 */
class HTTPFunction extends BaseFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration) {super(configuration);}
    /**
     * @param {__AzureFunctionContext} context
     * @param {Configuration} config
     * @return {Promise<BaseContext & HTTPContext>}
     */
    async createContext(context, config) {
        return new HTTPContext(context, config);
    }
    /**
     * @param {__AzureFunctionContext} azcontext
     * @param {Configuration} config
     * @return {Promise<JwtSentry|BaseSentry>}
     */
    async createSentry(azcontext, config) {
        if(config instanceof JwtConfiguration)
            return new JwtSentry();
        else
            return new HTTPSentry();
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async monitor(context) {
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
        context.log("Request failed to process. (MESSAGE:" + ex.message + ") (STACK:" + ex.stack + ")", LOG_LEVEL.ERROR,
                     "HTTP.exception(context, exception)");
    }
    /**
     * @param {BaseContext & HTTPContext} context
     * @return {Promise<void>}
     */
    async unhandledRequestMethod(context) {
        throw CelastrinaError.newError("HTTP Method '" + context.method + "' not supported.", 501);
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async process(context) {
        let _handler = this["_" + context.method];
        if(typeof _handler === "undefined" || _handler == null)
            await this.unhandledRequestMethod(context);
        else
            await _handler(context);
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    static async _rewriteSession(context) {
        if(context.session != null && context.session.doWriteSession) {
            /**@type{HTTPConfiguration}*/let _config = /**@type{HTTPConfiguration}*/context.config;
            /**@type{SessionManager}*/let _sm = _config.sessionManager;
            await _sm.saveSession(context.session, context);
        }
    }
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    static async _setCookies(context) {
        let _cookies = context.cookies;
        let _setcookies = [];
        for(/**@type{Cookie}*/const _param in _cookies) {
            if(_cookies.hasOwnProperty(_param)) {
                let _cookie = _cookies[_param];
                if(_cookie instanceof Cookie)
                    _setcookies.unshift(_cookie.toAzureCookie());
            }
        }
        _setcookies = await Promise.all(_setcookies);
        if(_setcookies.length > 0)
            context.azureFunctionContext.res.cookies = _setcookies;
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async terminate(context) {
        await HTTPFunction._rewriteSession(context);
        await HTTPFunction._setCookies(context);
    }
}
/**
 * JSONHTTPFunction
 * @author Robert R Murrell
 */
class JSONHTTPFunction extends HTTPFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration) {super(configuration);}
    /**
     * @param {__AzureFunctionContext} context
     * @param {Configuration} config
     * @return {Promise<HTTPContext>}
     */
    async createContext(context, config) {
        return new JSONHTTPContext(context, config);
    }
}
/**
 * MatchAlways
 * @author Robert R Murrell
 */
class MatchAlways extends ValueMatch {
    constructor() {
        super("MatchAlways");
    }
    /**
     * @param {Array.<string>} assertion
     * @param {Array.<string>} values
     * @return {Promise<true>}
     */
    async isMatch(assertion, values) {
        return true;
    }
}
module.exports = {
    MatchAlways: MatchAlways,
    Cookie: Cookie,
    JwtSubject: JwtSubject,
    HTTPContext: HTTPContext,
    JSONHTTPContext: JSONHTTPContext,
    BaseIssuer: BaseIssuer,
    BaseIssuerParser: BaseIssuerParser,
    LocalJwtIssuer: LocalJwtIssuer,
    LocalJwtIssuerParser: LocalJwtIssuerParser,
    OpenIDJwtIssuer: OpenIDJwtIssuer,
    OpenIDJwtIssuerParser: OpenIDJwtIssuerParser,
    HTTPParameter: HTTPParameter,
    HeaderParameter: HeaderParameter,
    QueryParameter: QueryParameter,
    BodyParameter: BodyParameter,
    CookieParameter: CookieParameter,
    Session: Session,
    SessionManager: SessionManager,
    SecureSessionManager: SecureSessionManager,
    AESSessionManager: AESSessionManager,
    AESSessionManagerParser: AESSessionManagerParser,
    SessionRoleFactory: SessionRoleFactory,
    HTTPConfigurationParser: HTTPConfigurationParser,
    HTTPConfiguration: HTTPConfiguration,
    JwtConfigurationParser: JwtConfigurationParser,
    JwtConfiguration: JwtConfiguration,
    HTTPSentry: HTTPSentry,
    OptimisticHTTPSentry: OptimisticHTTPSentry,
    JwtSentry: JwtSentry,
    HTTPFunction: HTTPFunction,
    JSONHTTPFunction: JSONHTTPFunction
};
