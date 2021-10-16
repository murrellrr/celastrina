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
const {CelastrinaError, CelastrinaValidationError, ConfigurationItem, LOG_LEVEL, Configuration,
       PermissionManager, BaseSubject, BaseSentry, Algorithm, AES256Algorithm, Cryptography, RoleResolver, BaseContext,
       BaseFunction, MatchAll, MatchNone} = require("@celastrina/core");
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
     */
    constructor(name, value = null, options = {}) {
        if(typeof name !== "string" || name.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid String. Attribute 'name' cannot be undefined, null, or zero length.", "cookie.name");
        this._name = name.trim();
        this._value = value;
        this._options = options;
        this._dirty = false;
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
     * @param {Array.<string>} value
     * @returns {Array.<string>}
     */
    doSerializeCookie(value = []) {
        if(this.doSetCookie)
            value.unshift(this.serialize());
        return value;
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
     * @returns {Promise<Cookie>} A new cookie whos dirty marker is set to 'true', such that doSerializeCookie will generte a value to
     *                   the Set-Cookie header.
     */
    static async newCookie(name, value = null, options = {}) {
        let _cookie = new Cookie(name);
        _cookie.value = value;
        _cookie.options = options;
        return _cookie;
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
     * @param {string} issuer
     * @param {(Array.<string>|null)} [audiences=null]
     * @param {(Array.<string>|null)} [assignments=[]] The roles to escalate to the subject if the JWT token is
     *        valid for this issuer.
     * @param {boolean} [validateNonce=false]
     */
    constructor(issuer, audiences = null, assignments = null,
                validateNonce = false) {
        this._issuer = issuer;
        this._audiences = audiences;
        this._roles = assignments;
        this._validateNonce = validateNonce;
    }
    /**@return{Array.<string>}*/get audience(){return this._audiences;}
    /**@return{Array<string>}*/get assignments(){return this._roles;}
    /**@return{boolean}*/get validatesNonce() {return this._validateNonce;}
    /**@param{boolean}validate*/set validatesNonce(validate) {return this._validateNonce = validate;}
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
                if(typeof decoded === "undefined" || decoded == null) return false;
                if(this._audiences != null) {
                    if(!this._audiences.includes(_subject.audience)) return false;
                }
                if(this._validateNonce) {
                    let nonce = await this.getNonce(context, _subject);
                    if(typeof nonce === "string" && nonce.trim().length > 0) {
                        if(_subject.nonce !== nonce) return false;
                    }
                }
                if(this._roles != null) _subject.addRoles(this._roles);
                return true;
            }
            catch (exception) {
                context.log("Exception authenticating JWT:" + exception, LOG_LEVEL.ERROR, "THREAT");
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
     * @param {string} issuer
     * @param {string} keyProperty
     * @param {(Array.<string>|null)} [audiences=null]
     * @param {(Array.<string>|null)} [assignments=[]] The roles to escalate to the subject if the JWT token is
     *        valid for this issuer.
     * @param {boolean} [validateNonce=false]
     */
    constructor(issuer, keyProperty, audiences = null,
                assignments = null, validateNonce = false) {
        super(issuer, audiences, assignments, validateNonce);
        this._keyProperty = keyProperty;
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} subject
     * @return {Promise<*>}
     */
    async getKey(context, subject) {
        return context.properties.getProperty(this._keyProperty);
    }
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
     * @param {string} issuer
     * @param {string} configUrl
     * @param {(Array.<string>|null)} [audiences=null]
     * @param {(Array.<string>|null)} [assignments=[]] The roles to escalate to the subject if the JWT token is
     *        valid for this issuer.
     * @param {boolean} [validateNonce=false]
     */
    constructor(issuer, configUrl, audiences = null,
                assignments = null, validateNonce = false) {
        super(issuer, audiences, assignments, validateNonce);
        this._configUrl = configUrl;
    }
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
                context.log("No claim'" + value + "' not found for subject '" + _subject.id + "'.",
                                    LOG_LEVEL.ERROR, "BaseIssuer._replaceURLEndpoint(context, subject, url)");
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
            context.log("HTTPFunction not configured for JWT.", LOG_LEVEL.ERROR, "OpenIDJwtIssuer._getKey(context, configUrl)");
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
            cookie = new Cookie(key, value)
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
    constructor(key){super("body");}
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
     * @param {HTTPParameter} [parameter = new CookieSession()]
     * @param {string} [name = "celastrinajs_session"]
     * @param {boolean} [createNew = true]
     */
    constructor(parameter = new CookieParameter(), name = "celastrinajs_session",
                createNew = true) {
        this._parameter = parameter;
        this._name = name;
        this._createNew = createNew;
        /**@type{Session}*/this._session = null;
    }
    async initialize(context) {}
    /**
     * @return {Promise<Session>}
     */
    async newSession() {return new Session({}, true);}
    /**@return{Session}*/get session() {return this._session;}
    /**
     * Gets session, creates new if null or undefined AND createNew true.
     * @return {Promise<Session>}
     */
    async getSession() {
        if((typeof this._session === "undefined" || this._session == null) && this._createNew)
            this._session = await this.newSession();
        return this._session;
    }
    /**
     * @param {*} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    _loadSession(session, context) {return session;}
    /**
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async loadSession(context) {
        let _session = await this._parameter.getParameter(context, this._name);
        if((typeof _session === "undefined" || _session == null) && this._createNew)
            this._session = await this.newSession();
        else {
            /**@type{string}*/let _obj = this._loadSession(_session, context);
            if(typeof _obj == "undefined" || _obj == null || _obj.trim().length === 0) {
                if(this._createNew) this._session = await this.newSession();
            }
            else
                this._session = Session.load(JSON.parse(_obj));
        }
    }
    /**
     * @param {string} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    _saveSession(session, context) {return session;}
    /**
     * @param {Session} [session = null]
     * @param {HTTPContext} context
     * @return {Promise<void>}
     */
    async saveSession(session = null, context) {
        if(typeof session !== "undefined" && session != null && session instanceof Session)
            this._session = session;
        if(this._session.doWriteSession && !this._parameter.readOnly)
            await this._parameter.setParameter(context, this._name, this._saveSession(JSON.stringify(this._session),
                                                                                      context));
    }
}
/**
 * SecureSessionManager
 * @author Robert R Murrell
 */
class SecureSessionManager extends SessionManager {
    /**
     * @param {Algorithm} algorithm
     * @param {HTTPParameter} [parameter = new CookieSession()]
     * @param {string} [name = "celastrinajs_session"]
     * @param {boolean} [createNew = true]
     */
    constructor(algorithm, parameter = new CookieParameter(), name = "celastrinajs_session",
                createNew = true) {
        super(parameter, name, createNew);
        this._algorithm = algorithm;
        /**@type{Cipher}*/this._cipher = null;
        /**@type{Decipher}*/this._decipher = null;
    }
    /**
     * @param context
     * @return {Promise<void>}
     */
    async initialize(context) {
        await super.initialize(context);
        await this._algorithm.initialize();
        /**@type{Cipher}*/this._cipher = await this._algorithm.createCipher();
        /**@type{Decipher}*/this._decipher = await this._algorithm.createDecipher();
    }
    /**
     * @param {*} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    _loadSession(session, context) {
        let decrypted = this._decipher.update(session, "base64", "utf8");
        decrypted += this._decipher.final("utf8");
        return decrypted;
    }
    /**
     * @param {string} session
     * @param {HTTPContext} context
     * @return {(null|string)}
     */
    _saveSession(session, context) {
        let _session = this._cipher.update(session, "utf8", "base64");
        _session += this._cipher.final("base64");
        return session;
    }
}
class AESSessionManager extends SecureSessionManager {
    /**
     * @param {{key:string,iv:string}} options
     * @param {HTTPParameter} [parameter = new CookieSession()]
     * @param {string} [name = "celastrinajs_session"]
     * @param {boolean} [createNew = true]
     */
    constructor(options, parameter = new CookieParameter(),
                name = "celastrinajs_session", createNew = true) {
        super(AES256Algorithm.create(options), parameter, name, createNew);
    }
}
/**
 * HTTPConfiguration
 * @author Robert R Murrell
 */
class HTTPConfiguration extends Configuration {
    static CONFIG_HTTP_SESSION_MANAGER = "celastrinajs.http.session";
    /**@param{string} name*/
    constructor(name) {
        super(name);
        this._config[HTTPConfiguration.CONFIG_HTTP_SESSION_MANAGER] = null;
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
    /**@param{string} name*/
    constructor(name) {
        super(name);
        let _anonname = "@celastrinajs/http/anonymous/" + name;
        this._config[JwtConfiguration.CONFIG_JWT_ISSUERS] = [];
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_PARAMETER] = new HeaderParameter();
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_NAME] = "authorization";
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME] = "Bearer";
        this._config[JwtConfiguration.CONFIG_JWT_TOKEN_SCHEME_REMOVE] = true;
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
     * @param {_AzureFunctionContext} context
     * @param {Configuration} config
     */
    constructor(context, config) {
        super(context, config);
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
     * @param {string} name
     * @param {*} [defaultValue=null]
     * @return {null|*}
     */
    getSessionProperty(name, defaultValue = null) {
        if(this._session != null) {
            let prop = this._session[name];
            if (typeof prop === "undefined" || prop == null) return defaultValue;
            else return prop;
        }
        else return defaultValue;
    }
    /**
     * @param {string} name
     * @param {*} value
     * @return {BaseContext}
     */
    setSessionProperty(name, value) {
        if(this._session != null) {
            this._session[name] = value;
            return this;
        }
    }
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
        await this._config.sessionManager.loadSession(this);
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
    setResponseHeader(name, value){this._azfunccontext.res.headers[name] = value;}
    /**
     * @param {*} [body=null]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        if((status >= 200 && status <= 299) && body == null) status = 204;
        this._azfunccontext.res.status = status;
        this._azfunccontext.res.headers["X-celastrina-request-uuid"] = this._requestId;
        this._azfunccontext.res.body = body;
    }
    /**@param{*}[error=null]*/
    sendValidationError(error = null) {
        if(error == null) error = CelastrinaValidationError.newValidationError("bad request");
        this.send(error, error.code);
    }
    /**
     * @param {string} url
     * @param {null|Object} [body]
     */
    sendRedirect(url, body = null) {
        this._azfunccontext.res.headers["Location"] = url;
        this.send(body, 302);
    }
    /**@param{string}url*/
    sendRedirectForwardBody(url) {this.sendRedirect(url, this._azfunccontext.req.body);}
    /**@param{*}[error=null]*/
    sendServerError(error = null) {
        if(error == null) error = CelastrinaError.newError("Internal Server Error.");
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 500);
        this.send(error, error.code);
    }
    /**@param{*}[error=null]*/
    sendNotAuthorizedError(error= null) {
        if(error == null) error = CelastrinaError.newError("Not Authorized.", 401);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 401);
        this.send(error, 401);
    }
    /**@param{*}[error=null]*/
    sendForbiddenError(error = null) {
        if(error == null) error = CelastrinaError.newError("Forbidden.", 403);
        else if(!(error instanceof CelastrinaError)) error = CelastrinaError.wrapError(error, 403);
        this.send(error, 403);
    }
}
/**
 * HTTPSentry
 * @author Robert R Murrell
 */
class HTTPSentry extends BaseSentry {
    constructor() {
        super();
        /**@type{PermissionManager}*/this._permissions = null;
    }
    /**
     * @param {Configuration | HTTPConfiguration} config
     * @return {Promise<void>}
     */
    async initialize(config) {
        this._permissions = config.permissions;
    }
    /**
     * @param {BaseContext} context
     * @param {BaseSubject} subject
     * @return {Promise<void>}
     */
    async authorize(context, subject) {
        for(/**@type{Permission}*/let _permission of this._permissions) {
            await _permission.authorize(subject);
        }
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
                        LOG_LEVEL.WARN, "JwtSentry._getToken(context)");
            return null;
        }
        let _scheme = _config.scheme;
        if(typeof _scheme === "string" && _scheme.length > 0) {
            if(!_token.startsWith(_scheme)) {
                context.log("Expected token scheme '" + _scheme + "' but none was found.", LOG_LEVEL.WARN,
                             "JwtSentry._getToken(context)");
                return null;
            }
            if(_config.removeScheme) _token = _token.slice(_scheme.length).trim();
        }
        return _token;
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<BaseSubject | JwtSubject>}
     */
    async authenticate(context) {
        /**@type{JwtConfiguration}*/let _config  = /**@type{JwtConfiguration}*/context.config;
        let _token = await this._getToken(context, _config);
        if(_token != null) {
            let _subject = await JwtSubject.decode(_token);
            let _subjectid = _subject.id;
            if(typeof _subjectid === "undefined" || _subjectid == null) _subjectid = context.requestId;
            if (_subject.isExpired()) {
                context.log(_subjectid + " token expired.", LOG_LEVEL.WARN, "JwtSentry.authenticate(context)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            /**@type{Array.<Promise<boolean>>}*/let promises = [];
            /**@type{Array.<BaseIssuer>}*/let _issuers = _config.issuers;
            for(const _issuer of _issuers) {
                promises.unshift(_issuer.verify(context, _subject)); // Performs the role escalations too.
            }
            /**type{Array.<boolean>}*/let results = await Promise.all(promises);
            if(!results.includes(true)) {
                context.log(_subjectid + " not verified by any issuers.", LOG_LEVEL.WARN, "JwtSentry.authenticate(context)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            else
                return _subject;
        }
        else {
            context.log("No token found.", LOG_LEVEL.WARN,"JwtSentry.authenticate(context)");
            throw CelastrinaError.newError("Not Authorized.", 401);
        }
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
     * @param {_AzureFunctionContext} azcontext
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
     * @param {BaseContext | HTTPContext} context
     * @return {Promise<void>}
     */
    async terminate(context) {
        // Re-write session if we need to.
        if(context.session.doWriteSession) {
            /**@type{HTTPConfiguration}*/let _config = /**@type{HTTPConfiguration}*/context.config;
            /**@type{SessionManager}*/let _sm = _config.sessionManager;
            await _sm.setSession(context.session);
        }
        // Set any cookies that have changed.
        let _cookies = context.cookies;
        /**@type{Array.<string>}*/let _cookieHeaders = [];
        for(/**@type{Cookie}*/const _cookie of _cookies) {
            _cookie.doSerializeCookie(_cookieHeaders);
        }
        context.setResponseHeader("Set-Cookie", _cookieHeaders);
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
     * @return {Promise<HTTPContext>}
     */
    async createContext(context, config) {
        let _context = new HTTPContext(context, config);
        _context._azfunccontext.res.status = 200;
        _context._azfunccontext.res.headers["Content-Type"] = "application/json; charset=utf-8";
        _context._azfunccontext.res.body = {name: this._config.name, code: 200, message:"success"};
        return _context;
    }
}
module.exports = {
    Cookie: Cookie,
    JwtSubject: JwtSubject,
    HTTPContext: HTTPContext,
    BaseIssuer: BaseIssuer,
    LocalJwtIssuer: LocalJwtIssuer,
    OpenIDJwtIssuer: OpenIDJwtIssuer,
    HTTPParameter: HTTPParameter,
    HeaderParameter: HeaderParameter,
    QueryParameter: QueryParameter,
    BodyParameter: BodyParameter,
    Session: Session,
    SessionManager: SessionManager,
    SecureSessionManager: SecureSessionManager,
    AESSessionManager: AESSessionManager,
    HTTPConfiguration: HTTPConfiguration,
    JwtConfiguration: JwtConfiguration,
    JwtSentry: JwtSentry
};
