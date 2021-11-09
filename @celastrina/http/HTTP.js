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
const {CelastrinaError, CelastrinaValidationError, PropertyManager, ResourceManager, PermissionManager, AddOn,
       LOG_LEVEL, Configuration, Subject, Sentry, Algorithm, AES256Algorithm, Cryptography, RoleFactory,
       RoleFactoryParser, Context, BaseFunction, ValueMatch, MatchAny, MatchAll, MatchNone,
       AttributeParser, ConfigParser, Authenticator, instanceOfCelastringType} = require("@celastrina/core");
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
    static CELASTRINAJS_TYPE = "celastrinajs.http.Cookie";
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
        this.__type = Cookie.CELASTRINAJS_TYPE;
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
class JwtSubject {
    static CELASTRINAJS_TYPE = "celastrinajs.http.JwtSubject";
    static PROP_JWT_HEADER = "celastrinajs.jwt.header";
    static PROP_JWT_SIGNATURE = "celastrinajs.jwt.signature";
    static PROP_JWT_NONCE = "nonce";
    static PROP_JWT_TOKEN = "celastrinajs.jwt";
    static PROP_JWT_AUD = "aud";
    static PROP_JWT_ISS = "iss";
    static PROP_JWT_ISSUED = "iat";
    static PROP_JWT_NOTBEFORE = "nbf";
    static PROP_JWT_EXP = "exp";
    /**
     * @param {Subject} subject
     */
    constructor(subject) {
        /**@type{Subject}*/this._subject = subject
        this.__type = JwtSubject.CELASTRINAJS_TYPE;
    }
    /**@return{Subject}*/get subject() {return this._subject;}
    /**@return{Object}*/get header() {return this._subject.getClaimSync(JwtSubject.PROP_JWT_HEADER);}
    /**@return{Object}*/get signature() {return this._subject.getClaimSync(JwtSubject.PROP_JWT_SIGNATURE);}
    /**@return{string}*/get token() {return this._subject.getClaimSync(JwtSubject.PROP_JWT_TOKEN);}
    /**@return{string}*/get nonce(){return this._subject.getClaimSync(JwtSubject.PROP_JWT_NONCE);}
    /**@return{string}*/get audience() {return this._subject.getClaimSync(JwtSubject.PROP_JWT_AUD);}
    /**@return{string}*/get issuer(){return this._subject.getClaimSync(JwtSubject.PROP_JWT_ISS);}
    /**@return{moment.Moment}*/get issued(){return moment.unix(this._subject.getClaimSync(JwtSubject.PROP_JWT_ISSUED));}
    /**@return{moment.Moment}*/get notBefore(){ //optional payload so we must check.
        let _nbf = this._subject.getClaimSync(JwtSubject.PROP_JWT_NOTBEFORE);
        if(_nbf != null) _nbf = moment.unix(_nbf);
        return _nbf;
    }
    /**@return{moment.Moment}*/get expires(){return moment.unix(this._subject.getClaimSync(JwtSubject.PROP_JWT_EXP));}
    /**@return{boolean}*/get expired(){ return moment().isSameOrAfter(this.expires);}
    /**
     * @param {undefined|null|object}headers
     * @param {string}[name="Authorization]
     * @param {string}[scheme="Bearer "]
     * @return {Promise<object>}
     */
    async setAuthorizationHeader(headers, name = "Authorization", scheme = "Bearer ") {
        if(typeof headers === "undefined" || headers == null) headers = {};
        headers[name] = scheme + this._subject.getClaimSync(JwtSubject.PROP_JWT_TOKEN);
        return headers;
    }
    /**
     * @param {string}name
     * @param {null|string}defaultValue
     * @return {Promise<number|string|Array.<string>>}
     */
    async getHeader(name, defaultValue = null) {
        let header = this.header[name];
        if(typeof header === "undefined" || header == null) header = defaultValue;
        return header;
    }
    /**
     * @param {Subject} subject
     * @param {string} token
     * @return {Promise<JwtSubject>}
     */
    static async decode(subject, token) {return JwtSubject.decodeSync(subject, token);}
    /**
     * @param {Subject} subject
     * @param {string} token
     * @return {JwtSubject}
     */
    static decodeSync(subject, token) {
        if(typeof token !== "string" || token.trim().length === 0)
            throw CelastrinaError.newError("Not Authorized.", 401);
        /** @type {null|Object} */let decoded = /** @type {null|Object} */jwt.decode(token, {complete: true});
        if(typeof decoded === "undefined" || decoded == null)
            throw CelastrinaError.newError("Not Authorized.", 401);
        subject.addClaims(decoded.payload);
        subject.addClaim(JwtSubject.PROP_JWT_HEADER, decoded.header);
        subject.addClaim(JwtSubject.PROP_JWT_SIGNATURE, decoded.signature);
        subject.addClaim(JwtSubject.PROP_JWT_TOKEN, token);
        return new JwtSubject(subject);
    }
    /**
     * @param {Subject} subject
     * @param {Object} decoded
     * @param {String} token
     * @return {Promise<JwtSubject>}
     */
    static async wrap(subject, decoded, token) {
        subject.addClaims(decoded.payload);
        subject.addClaim(JwtSubject.PROP_JWT_HEADER, decoded.header);
        subject.addClaim(JwtSubject.PROP_JWT_SIGNATURE, decoded.signature);
        subject.addClaim(JwtSubject.PROP_JWT_TOKEN, token);
        return new JwtSubject(subject);
    }
}

/**
 * BaseIssuer
 * @abstract
 * @author Robert R Murrell
 */
class Issuer {
    static CELASTRINAJS_TYPE = "celastrinajs.http.Issuer";
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
        this.__type = Issuer.CELASTRINAJS_TYPE;
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
     * @param {JwtSubject} _jwt
     * @return {Promise<{verified:boolean,assignments?:(null|Array<string>)}>}
     */
    async verify(context, _jwt) {
        if(_jwt.issuer === this._issuer) {
            try {
                let decoded = jwt.verify(_jwt.token, await this.getKey(context, _jwt), {algorithm: "RSA"});
                if(typeof decoded === "undefined" || decoded == null) {
                    context.log("Failed to verify token.", LOG_LEVEL.THREAT,
                        "BaseIssuer.verify(context, _jwt)");
                    return {verified: false};
                }
                if(this._audiences != null) {
                    if(!this._audiences.includes(_jwt.audience)) {
                        context.log("'" + _jwt.subject.id + "' with audience '" + _jwt.audience +
                                     "' failed match audiences.", LOG_LEVEL.THREAT, "BaseIssuer.verify(context, _jwt)");
                        return {verified: false};
                    }
                }
                if(this._validateNonce) {
                    let nonce = await this.getNonce(context, _jwt);
                    if(typeof nonce === "string" && nonce.trim().length > 0) {
                        if(_jwt.nonce !== nonce) {
                            context.log("'" + _jwt.subject.id + "' failed to pass nonce validation.", LOG_LEVEL.THREAT,
                                        "BaseIssuer.verify(context, _jwt)");
                            return {verified: false};
                        }
                    }
                }
                return {verified: true, assignments: this._roles};
            }
            catch(exception) {
                context.log("Exception authenticating JWT: " + exception, LOG_LEVEL.THREAT,
                            "BaseIssuer.verify(context, _jwt)");
                return {verified: false};
            }
        }
        else return {verified: false};
    }
}
/**
 * LocalJwtIssuer
 * @author Robert R Murrell
 */
class LocalJwtIssuer extends Issuer {
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
class OpenIDJwtIssuer extends Issuer {
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
     * @param {JwtSubject} _jwt
     * @param {string} url
     * @return {Promise<string>}
     */
    static async _replaceURLEndpoint(context, _jwt, url) {
        /**@type {RegExp}*/let regex = RegExp(/{([^}]*)}/g);
        let match;
        let matches = new Set();
        while((match = regex.exec(url)) !== null) {
            matches.add(match[1]);
        }
        for(const match of matches) {
            let value = _jwt.subject.getClaimSync(match);
            if(value == null) {
                context.log("Claim '" + match + "' not found for subject '" + _jwt.subject.id + "' while building OpenID configuration URL.",
                                    LOG_LEVEL.THREAT, "OpenIDJwtIssuer._replaceURLEndpoint(context, _jwt, url)");
                throw CelastrinaError.newError("Not Authorized.", 401);
            }
            if(Array.isArray(value)) value = value[0];
            url = url.split("{" + match + "}").join(/**@type{string}*/value);
        }
        return url;
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtSubject} _jwt
     * @param {string} configUrl
     * @return {Promise<(null|JWKS)>}
     * @private
     */
    static async _getKey(context, _jwt, configUrl) {
        let _endpoint = await OpenIDJwtIssuer._replaceURLEndpoint(context, _jwt, configUrl);
        try {
            let _response = await axios.get(_endpoint);
            let _issuer = _response.data["issuer"];
            _endpoint = _response.data["jwks_uri"];
            _response = await axios.get(_endpoint);
            /**@type{(null|JWKS)}*/let _key = null;
            for (const key of _response.data.keys) {
                if(key.kid === _jwt.header.kid) {
                    _key = {issuer: _issuer, type: key.kty, key: key};
                    break;
                }
            }
            return _key;
        }
        catch(exception) {
            context.log("Exception getting OpenID configuration for subject " + _jwt.subject.id + ": " + exception,
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
     * @param {JwtSubject} _jwt
     * @return {Promise<void>}
     * @private
     */
    async getKey(context, _jwt) {
        /**@type{(null|JWKS)}*/let key = await OpenIDJwtIssuer._getKey(context, _jwt, this._configUrl);
        let pem;
        if(typeof key.key.x5c === "undefined" || key.key.x5c == null)
            pem = jwkToPem(key.key);
        else
            pem = await this._getPemX5C(key, context);
        return pem;
    }
}
/**
 * IssuerParser
 * @author Robert R Murrell
 * @abstract
 */
class IssuerParser extends AttributeParser {
    /**
     * @param {string} [type="Object"]
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(type = "BaseIssuer", link = null, version = "1.0.0") {
        super(type, link, version);
    }
    /**
     * @param {Object} _Issuer
     * @param {Issuer} _issuer
     */
    _loadIssuer(_Issuer, _issuer) {
        if(!(_Issuer.hasOwnProperty("issuer")) || (typeof _Issuer.issuer !== "string") || _Issuer.issuer.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[IssuerParser._loadIssuer(_Issuer, _issuer)][_Issuer.issuer]: Issuer cannot be null, undefined, or empty.", "_Issuer.issuer");
        if(!(_Issuer.hasOwnProperty("audiences")) || !(Array.isArray(_Issuer.audiences)) || _Issuer.audiences.length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[IssuerParser._loadIssuer(_Issuer, _issuer)][_Issuer.audiences]: Audiences cannot be null.", "_Issuer.audiences");
        let assignments = [];
        if((_Issuer.hasOwnProperty("assignments")) && (Array.isArray(_Issuer.assignments)) && _Issuer.assignments.length > 0)
            assignments = _Issuer.assignments;
        let _validate = false;
        if(_Issuer.hasOwnProperty("validateNonce") && (typeof _Issuer.validateNonce === "boolean"))
            _validate = _Issuer.validateNonce;
        _issuer.issuer = _Issuer.issuer.trim();
        _issuer.audiences = _Issuer.audiences;
        _issuer.assignments = assignments;
        _issuer.validateNonce = _validate;
    }
}
/**
 * LocalJwtIssuerParser
 * @author Robert R Murrell
 */
class LocalJwtIssuerParser extends IssuerParser {
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
class OpenIDJwtIssuerParser extends IssuerParser {
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
    static CELASTRINAJS_TYPE = "celastrinajs.http.HTTPParameter";
    /**
     * @param{string}[type]
     * @param{boolean}[readOnly]
     */
    constructor(type = "HTTPParameter", readOnly = false) {
        this._type = type;
        this._readOnly = readOnly
        this.__type = HTTPParameter.CELASTRINAJS_TYPE;
    }
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
class HTTPParameterParser extends AttributeParser {
    static CELASTRINAJS_TYPE = "celastrinajs.http.HTTPParameterParser";
    /**
     * @param {AttributeParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("HTTPParameter", link, version);
        this.__type = HTTPParameterParser.CELASTRINAJS_TYPE;
    }
    /**
     * @param {Object} _HTTPParameter
     * @return {Promise<HTTPParameter>}
     */
    async _create(_HTTPParameter) {
        let _parameter = "header";
        if(_HTTPParameter.hasOwnProperty("parameter") && (typeof _HTTPParameter.parameter === "string") && _HTTPParameter.parameter.trim().length > 0)
            _parameter = _HTTPParameter.parameter.trim();
        return HTTPParameterParser.createHTTPParameter(_parameter);
    }
    /**
     * @param {string} type
     * @return {HTTPParameter}
     */
    static createHTTPParameter(type) {
        switch(type) {
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
                    "[HTTPParameterParser.getHTTPParameter(type)][type]: '" + type + "' is not supported.",
                    "type");
        }
    }
}
/**
 * Session
 * @author Robert R Murrell
 */
class Session {
    static CELASTRINAJS_TYPE = "celastrinajs.http.Session";
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
        this.__type = Session.CELASTRINAJS_TYPE;
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
    static CELASTRINAJS_TYPE = "celastrinajs.http.SessionManager";
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
        this.__type = SessionManager.CELASTRINAJS_TYPE;
    }
    /**@return{HTTPParameter}*/get parameter() {return this._parameter;}
    /**@return{string}*/get name() {return this._name;}
    /**@return{boolean}*/get createNew() {return this._createNew;}
    /**
     * @param azcontext
     * @param pm
     * @param rm
     * @return {Promise<void>}
     */
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
        if(instanceOfCelastringType(Session.CELASTRINAJS_TYPE, session)) {
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
    /**@return{Cryptography}*/get cryptography() {return this._crypto;}
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
     * @param {(undefined|null|{key:string,iv:string})} options
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
class SessionRoleFactory extends RoleFactory {
    /**
     * @param {string} [key="roles"]
     */
    constructor(key = "roles") {
        super();
        this._key = key;
    }
    /**@return{string}*/get key() {return this._key;}
    /**
     * @param {Context|HTTPContext} context
     * @param {Subject} subject
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
     * @return {Promise<SessionRoleFactory>}
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
     * @param {Object} _AESSessionManager
     * @return {Promise<AESSessionManager>}
     */
    async _create(_AESSessionManager) {
        let _paramtype = "cookie";
        let _paramname = "celastrinajs_session";
        if(_AESSessionManager.hasOwnProperty("parameter") && (typeof _AESSessionManager.parameter === "string"))
            _paramtype = _AESSessionManager.parameter;
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
        if(!(_options.hasOwnProperty("iv")) || (typeof _options.iv !== "string") || _options.iv.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AESSessionManagerParser._create(_AESSessionManager)][AESSessionManager.options.iv]: Aregument 'iv' cannot be null or empty.",
                "AESSessionManager.options.iv");
        if(!(_options.hasOwnProperty("key")) || (typeof _options.key !== "string") || _options.key.trim().length === 0)
            throw CelastrinaValidationError.newValidationError(
                "[AESSessionManagerParser._create(_AESSessionManager)][AESSessionManager.options.key]: Argument 'key' cannot be null or empty.",
                "AESSessionManager.options.key");
        return new AESSessionManager(_options, HTTPParameterParser.createHTTPParameter(_paramtype), _paramname, _createnew);
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
            let _session = _Object.session;
            if(_session.hasOwnProperty("manager") && (instanceOfCelastringType(SessionManager.CELASTRINAJS_TYPE, _session.manager)))
                this._config[HTTPAddOn.CONFIG_HTTP_SESSION_MANAGER] = _session.manager;
        }
    }
}
/**
 * HTTPAddOn
 * @author Robert R Murrell
 */
class HTTPAddOn extends AddOn {
    static CONFIG_ADDON_HTTP = "celastrinajs.addon.http";
    static CONFIG_HTTP_SESSION_MANAGER = "celastrinajs.http.session";
    constructor() {
        super(HTTPAddOn.CONFIG_ADDON_HTTP);
    }
    getConfigParser() {return new HTTPConfigurationParser();}
    getAttributeParser() {return new AESSessionManagerParser(new SessionRoleFactoryParser())}
    wrap(config) {
        super.wrap(config);
        this._config[HTTPAddOn.CONFIG_HTTP_SESSION_MANAGER] = null;
    }
    async initialize(azcontext, pm, rm, prm) {
        /**@type{SessionManager}*/let _sm = this._config[HTTPAddOn.CONFIG_HTTP_SESSION_MANAGER];
        if(instanceOfCelastringType(SessionManager.CELASTRINAJS_TYPE, _sm))
            return _sm.initialize(azcontext, pm, rm);
    }
    /**@return{SessionManager}*/get sessionManager() {return this._config[HTTPAddOn.CONFIG_HTTP_SESSION_MANAGER];}
    /**
     * @param {SessionManager} [sm=null]
     * @return {HTTPAddOn}
     */
    setSessionManager(sm = null) {
        this._config[HTTPAddOn.CONFIG_HTTP_SESSION_MANAGER] = sm;
        return this;
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
            this._config[JwtAddOn.CONFIG_JWT_ISSUERS] = _Object.issuers;
        if(_Object.hasOwnProperty("parameter") && instanceOfCelastringType(HTTPParameter.CELASTRINAJS_TYPE, _Object.parameter))
            this._config[JwtAddOn.CONFIG_JWT_TOKEN_PARAMETER] = _Object.parameter;
        if(_Object.hasOwnProperty("name") && (typeof _Object.name === "string") && _Object.name.trim().length > 0)
            this._config[JwtAddOn.CONFIG_JWT_TOKEN_NAME] = _Object.name;
        if(_Object.hasOwnProperty("scheme") && (typeof _Object.scheme === "string") && _Object.scheme.trim().length > 0)
            this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME] = _Object.scheme;
        if(_Object.hasOwnProperty("removeScheme") && (typeof _Object.removeScheme === "boolean"))
            this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME_REMOVE] = _Object.removeScheme;
    }
}
/**
 * JwtAddOn
 * @author Robert R Murrell
 */
class JwtAddOn extends AddOn {
    static CONFIG_ADDON_JWT = "celastrinajs.http.jwt.addon";
    static CONFIG_JWT_ISSUERS = "celastrinajs.http.jwt.issuers";
    static CONFIG_JWT_TOKEN_PARAMETER = "celastrinajs.http.jwt.authorization.token.parameter";
    static CONFIG_JWT_TOKEN_NAME = "celastrinajs.http.jwt.authorization.token.name";
    static CONFIG_JWT_TOKEN_SCHEME = "celastrinajs.http.jwt.authorization.token.scheme";
    static CONFIG_JWT_TOKEN_SCHEME_REMOVE = "celastrinajs.http.jwt.authorization.token.scheme.remove";
    constructor() {
        super(JwtAddOn.CONFIG_ADDON_JWT);
    }
    wrap(config) {
        super.wrap(config);
        this._config[JwtAddOn.CONFIG_JWT_ISSUERS] = [];
        this._config[JwtAddOn.CONFIG_JWT_TOKEN_PARAMETER] = new HeaderParameter();
        this._config[JwtAddOn.CONFIG_JWT_TOKEN_NAME] = "authorization";
        this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME] = "Bearer";
        this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME_REMOVE] = true;
    }
    getConfigParser() {
        return new JwtConfigurationParser();
    }
    getAttributeParser() {
        return new OpenIDJwtIssuerParser(new LocalJwtIssuerParser(new HTTPParameterParser()));
    }
    async initialize(azcontext, pm, rm, prm) {
        /**@type{Sentry}*/let _sentry = this._config[Configuration.CONFIG_SENTRY];
        _sentry.addAuthenticator(new JwtAuthenticator());
    }
    /**@return{Array.<Issuer>}*/get issuers(){return this._config[JwtAddOn.CONFIG_JWT_ISSUERS];}
    /**@param{Array.<Issuer>} issuers*/
    set issuers(issuers) {
        if(typeof issuers === "undefined" || issuers == null) issuers = [];
        this._config[JwtAddOn.CONFIG_JWT_ISSUERS] = issuers;
    }
    /**@return{HTTPParameter}*/get parameter() {return this._config[JwtAddOn.CONFIG_JWT_TOKEN_PARAMETER]}
    /**@return{string}*/get token() {return this._config[JwtAddOn.CONFIG_JWT_TOKEN_NAME];}
    /**@return{string}*/get scheme() {return this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME];}
    /**@return{boolean}*/get removeScheme() {return this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME_REMOVE];}
    /**
     * @param {Array.<Issuer>} [issuers=[]]
     * @return {JwtAddOn}
     */
    setIssuers(issuers = []){this._config[JwtAddOn.CONFIG_JWT_ISSUERS] = issuers; return this;}
    /**
     * @param {Issuer} issuer
     * @return {JwtAddOn}
     */
    addIssuer(issuer){this._config[JwtAddOn.CONFIG_JWT_ISSUERS].unshift(issuer); return this;}
    /**
     * @param {HTTPParameter} token
     * @return {JwtAddOn}
     */
    setParameter(token) {this._config[JwtAddOn.CONFIG_JWT_TOKEN_PARAMETER] = token; return this;}
    /**
     * @param {string} token
     * @return {JwtAddOn}
     */
    setToken(token) {this._config[JwtAddOn.CONFIG_JWT_TOKEN_NAME] = token; return this;}
    /**
     * @param {string} scheme
     * @return {JwtAddOn}
     */
    setScheme(scheme) {this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME] = scheme; return this;}
    /**
     * @param {boolean} remove
     * @return {JwtAddOn}
     */
    setRemoveScheme(remove) {this._config[JwtAddOn.CONFIG_JWT_TOKEN_SCHEME_REMOVE] = remove; return this;}
}
/**
 * HTTPContext
 * @author Robert R Murrell
 */
class HTTPContext extends Context {
    /**
     * @param {Configuration} config
     */
    constructor(config) {
        super(config);
        /**@type{Object}*/this._cookies = {};
        /**@type{Session}*/this._session = null;
    }
    /**@return{Object}*/get cookies() {return this._cookies;}
    /**@return{string}*/get method(){return this._action;}
    /**@return{string}*/get url(){return this._config.context.req.originalUrl;}
    /**@return{Object}*/get request(){return this._config.context.req;}
    /**@return{Object}*/get response(){return this._config.context.res;}
    /**@return{Object}*/get params(){return this._config.context.req.params;}
    /**@return{Object}*/get query(){return this._config.context.req.query;}
    /**@return{string}*/get raw(){return this._config.context.req.rawBody;}
    /**@return{Object}*/get requestBody(){return this._config.context.req.body;}
    /**@return{Object}*/get responseBody(){return this._config.context.res.body;}
    /**@return{Session}*/get session(){return this._session;}
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setRequestId() {
        let id = this._config.context.req.query["requestId"];
        if(typeof id === "undefined" || id == null) id = this._config.context.req.headers["x-celastrina-requestId"];
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
            monitor = this._config.context.req.query["monitor"];
            if (typeof monitor === "undefined" || monitor == null) monitor = this._config.context.req.headers["x-celastrina-monitor"];
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
        /**@type{HTTPAddOn}*/let _lconfig = /**@type{HTTPAddOn}*/await this._config.getAddOn(HTTPAddOn.CONFIG_ADDON_HTTP);
        if(instanceOfCelastringType(AddOn.CELASTRINAJS_TYPE, _lconfig)) {
            let _sm = _lconfig.sessionManager;
            if (instanceOfCelastringType(SessionManager.CELASTRINAJS_TYPE, _sm))
                this._session = await _sm.loadSession(this);
        }
    }
    /**
     * @return {Promise<void>}
     */
    async initialize() {
        await super.initialize();
        this._config.context.res.status = 200;
        this._config.context.res.headers["Content-Type"] = "text/html; charset=ISO-8859-1";
        this._config.context.res.body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body>200, Success</body></html>";
        /**@type{string}*/this._action = this._config.context.req.method.toLowerCase();
        await this._setMonitorMode();
        await this._setRequestId();
        await this._parseCookies();
        await this._setSession();
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _rewriteSession() {
        /**@type{HTTPAddOn}*/let _lconfig = /**@type{HTTPAddOn}*/this._config.getAddOn(HTTPAddOn.CONFIG_ADDON_HTTP);
        if(instanceOfCelastringType(AddOn.CELASTRINAJS_TYPE, _lconfig)) {
            let _sm = _lconfig.sessionManager;
            if (instanceOfCelastringType(SessionManager.CELASTRINAJS_TYPE, _sm)) {
                if (this.session != null && this.session.doWriteSession)
                    await _sm.saveSession(this.session, this);
            }
        }
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _setCookies() {
        let _cookies = this.cookies;
        let _setcookies = [];
        for(/**@type{Cookie}*/const _param in _cookies) {
            if(_cookies.hasOwnProperty(_param)) {
                let _cookie = _cookies[_param];
                if(instanceOfCelastringType(Cookie.CELASTRINAJS_TYPE, _cookie))
                    _setcookies.unshift(_cookie.toAzureCookie());
            }
        }
        _setcookies = await Promise.all(_setcookies);
        if(_setcookies.length > 0)
            this.azureFunctionContext.res.cookies = _setcookies;
    }
    /**
     * @return {Promise<void>}
     */
    async terminate() {
        await this._rewriteSession();
        await this._setCookies();
    }
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     * @return {null|string}
     */
    getURIBinding(name, defaultValue = null) {
        let uirbinding = this._config.context.bindingData[name];
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
        let qry = this._config.context.req.query[name];
        if(typeof qry !== "string") return defaultValue;
        else return qry;
    }
    /**
     * @param {string} name
     * @param {null|string|Array.<string>} [defaultValue=null]
     * @return {null|string|Array.<string>}
     */
    getRequestHeader(name, defaultValue = null) {
        let header = this._config.context.req.headers[name];
        if(typeof header !== "string") return defaultValue;
        else return header;
    }
    /**
     * @param {string} name
     */
    deleteResponseHeader(name) {
        try {
            delete this._config.context.res.headers[name];
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
        let header = this._config.context.res.headers[name];
        if(typeof header !== "string") return defaultValue;
        else return header;
    }
    /**
     * @param {string} name
     * @param {string|Array.<string>} value
     */
    setResponseHeader(name, value) {
        this._config.context.res.headers[name] = value;
    }
    /**
     * @param {*} [body=null]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        if((status >= 200 && status <= 299) && (body == null || (typeof body === "string" && body.length === 0))) status = 204;
        this._config.context.res.status = status;
        this._config.context.res.headers["X-celastrina-request-uuid"] = this._requestId;
        this._config.context.res.body = body;
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
        this._config.context.res.headers["Location"] = url;
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>302 - Redirect</header><main><p><h2>" + url + "</h2></main><footer>celastrinajs</footer></body></html>";
        this.send(body, 302);
    }
    /**@param{string}url*/
    sendRedirectForwardBody(url) {this.sendRedirect(url, this._config.context.req.body);}
    /**
     * @param {*} [error=null]
     * @param {*} [body=null]
     */
    sendServerError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Internal Server Error.");

        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, error)) error = CelastrinaError.wrapError(error, 500);
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
        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, error)) error = CelastrinaError.wrapError(error, 401);
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>401 - Not Authorized</header><main><p><h2>" + error.message + "</h2></main><footer>celastrinajs</footer></body></html>";
        this.send(body, 401);
    }
    /**
     * @param {*} [error=null]
     * @param {*} [body=null]
     */
    sendForbiddenError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Forbidden.", 403);
        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, error)) error = CelastrinaError.wrapError(error, 403);
        if(body == null) body = "<html lang=\"en\"><head><title>" + this._config.name + "</title></head><body><header>403 - Forbidden</header><main><p><h2>" + error.message + "</h2></main><footer>celastrinajs</footer></body></html>";
        this.send(body, 403);
    }
}
/**
 * JSONHTTPContext
 * @author Robert R Murrell
 */
class JSONHTTPContext extends HTTPContext {
    /**
     * @param {Configuration} config
     */
    constructor(config) {
        super(config);
    }
    async initialize() {
        await super.initialize();
        this._config.context.res.status = 200;
        this._config.context.res.headers["Content-Type"] = "application/json; charset=utf-8";
        this._config.context.res.body = {name: this._config.name, code: 200, message: "Success! Welcome to celastrinajs."};
    }
    /**
     * @param {*} error
     * @param {(null|number)} code
     */
    sendCelastrinaError(error, code = null) {
        let _tag = null;
        if(typeof error.tag === "string" && error.tag.trim().length > 0) _tag = error.tag;
        let _causeMessage = null;
        if(error.cause instanceof Error) _causeMessage = error.cause.message;
        let _code = error.code;
        if(code != null) _code = code;
        this.send({name: error.name, message: error.message, tag: _tag, code: _code, cause: _causeMessage,
                        drop: error.drop}, _code);
    }
    /**
     * @param {CelastrinaValidationError} [error=null]
     * @param {Object} [body=null]
     */
    sendValidationError(error = null, body = null) {
        if(error == null) error = CelastrinaValidationError.newValidationError("bad request");
        if(body == null)
            this.sendCelastrinaError(error, 400);
        else
            this.send(body, 400);
    }
    /**
     * @param {string} url
     * @param {Object} [body=null]
     */
    sendRedirect(url, body = null) {
        this._config.context.res.headers["Location"] = url;
        if(body == null) body = {code: 302, url: url};
        this.send(body, 302);
    }
    /**
     * @param {*} [error=null]
     * @param {Object} [body=null]
     */
    sendServerError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Internal Server Error.");
        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, error)) error = CelastrinaError.wrapError(error, 500);
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
        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, error)) error = CelastrinaError.wrapError(error, 401);
        if(body == null)
            this.sendCelastrinaError(error, 401);
        else
            this.send(body, 401);
    }
    /**
     * @param {*} [error=null]
     * @param {Object} [body=null]
     */
    sendForbiddenError(error = null, body = null) {
        if(error == null) error = CelastrinaError.newError("Forbidden.", 403);
        else if(!instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, error)) error = CelastrinaError.wrapError(error, 403);
        if(body == null)
            this.sendCelastrinaError(error, 403);
        else
            this.send(body, 403);
    }
}
/**
 * JwtAuthenticator
 * @author Robert R Murrell
 */
class JwtAuthenticator extends Authenticator {
    constructor(required = false, link = null) {
        super("JWT", required, link);
    }
    /**
     * @param {HTTPContext} context
     * @param {JwtAddOn} _config
     * @return {Promise<string>}
     * @private
     */
    async _getToken(context, _config) {
        /**@type{string}*/let _token = await _config.parameter.getParameter(context, _config.token);
        if(typeof _token !== "string") {
            context.log("JWT " + _config.parameter.type + " token " + _config.token + " but none was found.",
                        LOG_LEVEL.THREAT, "JwtAuthenticator._getToken(context, _config)");
            return null;
        }
        let _scheme = _config.scheme;
        if(typeof _scheme === "string" && _scheme.length > 0) {
            if(!_token.startsWith(_scheme)) {
                context.log("Expected JWT token scheme '" + _scheme + "' but none was found.", LOG_LEVEL.THREAT,
                             "JwtAuthenticator._getToken(context, _config)");
                return null;
            }
            if(_config.removeScheme) _token = _token.slice(_scheme.length).trim();
        }
        return _token;
    }

    /**
     * @param {Asserter} assertion
     * @return {Promise<boolean>}
     */
    async _authenticate(assertion) {
        /**@type{JwtAddOn}*/let _config  = /**@type{JwtAddOn}*/await assertion.context.config.getAddOn(JwtAddOn.CONFIG_ADDON_JWT);
        let _token = await this._getToken(assertion.context, _config);
        if(_token != null) {
            let _jwt = null;
            try {
                _jwt = JwtSubject.decodeSync(assertion.subject, _token);
            }
            catch(exception) {
                assertion.context.log("JWT Token failed to decode, invlid signature.", LOG_LEVEL.THREAT, "JwtAuthenticator.createSubject(context)");
                return assertion.assert(this._name, false, null, "Invalid Signature.");
            }
            let _subjectid = assertion.subject.id;
            if(typeof _subjectid === "undefined" || _subjectid == null) _subjectid = assertion.context.requestId;
            if(_jwt.expired) {
                assertion.context.log("'" +_subjectid + "' token expired.", LOG_LEVEL.THREAT,
                                      "JwtAuthenticator.createSubject(context)");
                return assertion.assert(this._name, false, null, "Token Expired.");
            }
            /**@type{Array.<Promise<boolean>>}*/let promises = [];
            /**@type{Array.<Issuer>}*/let _issuers = _config.issuers;
            for(const _issuer of _issuers) {
                promises.unshift(_issuer.verify(assertion.context, _jwt)); // Performs the role escalations too.
            }
            /**type{Array<{verified:boolean,assignments?:(null|Array<string>)}>}*/let results = await Promise.all(promises);
            let _verified = false;
            let _assignments = [];
            for(/**@type{{verified:boolean,assignments?:(null|Array<string>)}}*/let _verification of results) {
                if(_verification.verified && !_verified) _verified = true;
                _assignments = _assignments.concat(_verification.assignments);
            }
            return assertion.assert(this._name, _verified, new Set([..._assignments]));
        }
        else {
            assertion.context.log("No JWT token found.", LOG_LEVEL.THREAT,"JwtAuthenticator.createSubject(context)");
            return assertion.assert(this._name, false, null, "No Token Found.");
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
     * @param {Configuration} config
     * @return {Promise<Context & HTTPContext>}
     */
    async createContext(config) {
        return new HTTPContext(config);
    }
    /**
     * @param {Context | HTTPContext} context
     * @return {Promise<void>}
     */
    async monitor(context) {
        let response = [{test: context.name, passed: context.monitorResponse.passed, failed: context.monitorResponse.failed,
                         result: context.monitorResponse.result}];
        context.send(response, 200);
        context.done();
    }
    /**
     * @param {Context | HTTPContext} context
     * @param {null|Error|CelastrinaError|*} exception
     * @return {Promise<void>}
     */
    async exception(context, exception) {
        /**@type{null|Error|CelastrinaError|*}*/let ex = exception;
        if(instanceOfCelastringType(CelastrinaValidationError.CELASTRINAJS_VALIDATION_ERROR_TYPE, ex))
            context.sendValidationError(ex);
        else if(instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, ex))
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
        context.log("Request failed to process. \r\n (MESSAGE: " + ex.message + ") \r\n (STACK: " + ex.stack + ")" + " \r\n (CAUSE: " + ex.cause + ")", LOG_LEVEL.ERROR,
                     "HTTP.exception(context, exception)");
    }
    /**
     * @param {Context & HTTPContext} context
     * @return {Promise<void>}
     */
    async unhandledRequestMethod(context) {
        throw CelastrinaError.newError("HTTP Method '" + context.method + "' not supported.", 501);
    }
    /**
     * @param {Context | HTTPContext} context
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
     * @param {Context | HTTPContext} context
     * @return {Promise<void>}
     */
    async terminate(context) {
        await context.terminate();
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
     * @param {Configuration} config
     * @return {Promise<HTTPContext>}
     */
    async createContext(config) {
        return new JSONHTTPContext(config);
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
     * @param {Set<string>} assertion
     * @param {Set<string>} values
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
    Issuer: Issuer,
    IssuerParser: IssuerParser,
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
    SessionRoleFactoryParser: SessionRoleFactoryParser,
    HTTPConfigurationParser: HTTPConfigurationParser,
    HTTPAddOn: HTTPAddOn,
    JwtAuthenticator: JwtAuthenticator,
    JwtConfigurationParser: JwtConfigurationParser,
    JwtAddOn: JwtAddOn,
    HTTPFunction: HTTPFunction,
    JSONHTTPFunction: JSONHTTPFunction
};
