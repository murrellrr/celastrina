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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, JsonProperty, Configuration, BaseSubject, BaseSentry,
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
    /**@returns{object}*/get header() {return this._header;}
    /**@returns{object}*/get payload() {return this._payload;}
    /**@returns{object}*/get signature() {return this._signature}
    /**@returns{string}*/get nonce(){return this._payload.nonce;}
    /**@returns{string}*/get audience() {return this._payload.aud;}
    /**@returns{string}*/get issuer(){return this._payload.iss;}
    /**@returns{moment.Moment}*/get issued(){return this._issued;}
    /**@returns{moment.Moment}*/get expires(){return this._expires;}
    /**@returns{string}*/get token(){return this._token;}
    /**@returns{boolean}*/isExpired(){return moment().isSameOrAfter(this._expires);}
    /**
     * @param {undefined|null|object}headers
     * @param {string}[name="Authorization]
     * @param {string}[scheme="Bearer "]
     * @returns {Promise<object>}
     */
    async setAuthorizationHeader(headers, name = "Authorization", scheme = "Bearer ") {
        return new Promise((resolve, reject) => {
            if(typeof headers === "undefined" || headers == null)
                headers = {};
            headers[name] = scheme + this._token;
            resolve(headers);
        });
    }
    /**
     * @param {string}name
     * @param {null|string}defaultValue
     * @returns {Promise<number|string|Array.<string>>}
     */
    async getClaim(name, defaultValue = null) {
        return new Promise((resolve, reject) => {
            let claim = this._token[name];
            if(typeof claim === "undefined" || claim == null)
                claim = defaultValue;
            resolve(claim);
        });
    }
    /**
     * @param {string} token
     * @return {Promise<JwtSubject>}
     */
    static async decode(token) {
        return new Promise((resolve, reject) => {
            if(typeof token !== "string" || token.trim().length === 0)
                reject(CelastrinaError.newError("Not Authorized.", 401));
            else {
                try {
                    /** @type {null|Object} */let decoded = /** @type {null|Object} */jwt.decode(token, {complete: true});
                    if(typeof decoded === "undefined" || decoded == null)
                        reject(CelastrinaError.newError("Not Authorized.", 401));
                    else resolve(new JwtSubject(decoded.header, decoded.payload, decoded.signature, token));
                }
                catch (exception) {
                    reject(exception);
                }
            }
        });
    }
}
/**Issuer*/
class Issuer {
    /**
     * @param {string|StringProperty} name
     * @param {string|StringProperty} audience
     * @param {JsonProperty|Array.<string>} [roles=[]]
     * @param {(null|string|StringProperty)} [nonce=null]
     */
    constructor(name, audience, roles = [], nonce = null) {
        this._name = name;
        this._audience = audience;
        this._nonce = nonce;
        this._roles = roles;
    }
    /**@returns{string}*/get name(){return this._name;}
    /**@returns {string}*/get audience(){return this._audience;}
    /**@returns {Array<string>}*/get roles(){return this._roles;}
    /**
     * @param {JwtSubject} subject
     * @param {boolean} [validateNonce=false]
     * @returns {Promise<boolean>}
     */
    async authenticate(subject, validateNonce = false) {
        return new Promise((resolve, reject) => {
            try {
                if(subject.issuer === this._name && subject.audience === this._audience) {
                    if(validateNonce) {
                        if(this._nonce === subject.nonce) {
                            subject.addRoles(this._roles);
                            resolve(true);
                        }
                        else
                            reject(false);
                    }
                    else {
                        subject.addRoles(this._roles);
                        resolve(true);
                    }
                }
                else
                    resolve(false);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{JsonProperty}*/
class IssuerProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
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
                            if(!source.hasOwnProperty("_name")) reject(CelastrinaError.newError("Invalid Issuer, _name required."));
                            else if(!source.hasOwnProperty("_audience")) reject(CelastrinaError.newError("Invalid Issuer, _audience required."));
                            else if(!source.hasOwnProperty("_roles")) reject(CelastrinaError.newError("Invalid Issuer, _roles required."));
                            else if(!Array.isArray(source._roles)) reject(CelastrinaError.newError("Invalid Issuer, _roles must be an Array."));
                            else resolve(new Issuer(source._name, source._audience, source._roles, source._nonce));
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
/**@abstract*/
class HTTPParameterFetch {
    /**@param{string}[type]*/
    constructor(type = "HTTPParameterFetch") {this._type = type;}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async fetch(context, key, defaultValue = null) {
        return new Promise((resolve) => {resolve(defaultValue);});
    }
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<null|string>}
     */
    async get(context, key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            try {
                this.fetch(context, key, defaultValue)
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
/**@type {HTTPParameterFetch}*/
class HeaderParameterFetch extends HTTPParameterFetch {
    constructor(){super("header");}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue
     * @returns {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            try {
                resolve(context.getRequestHeader(key, defaultValue));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{HTTPParameterFetch}*/
class QueryParameterFetch extends HTTPParameterFetch {
    constructor(){super("query");}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue
     * @returns {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            try {
                resolve(context.getQuery(key, defaultValue));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{HTTPParameterFetch}*/
class BodyParameterFetch extends HTTPParameterFetch {
    constructor(key){super("body");}
    /**
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue
     * @returns {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            try {
                let body = context.requestBody;
                let value = body[key];
                if(typeof value === "undefined" || value == null) value = defaultValue;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**@type{JsonProperty}*/
class HTTPParameterFetchProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
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
                            if(!source.hasOwnProperty("_type"))
                                reject(CelastrinaError.newError("Invalid HTTPParameterFetch, _type required."));
                            else {
                                switch(source._type) {
                                    case "header": resolve(new HeaderParameterFetch()); break;
                                    case "query": resolve(new MatchAll()); break;
                                    case "body": resolve(new MatchNone());break;
                                    default: reject(CelastrinaError.newError("Invalid Match Type."));
                                }
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
 * JwtValidator
 * @author Robert R Murrell
 */
class JwtValidator {
    /**
     * @param {string} token
     * @returns {Promise<JwtSubject>}
     */
    async validate(token) {
        return new Promise((resolve, reject) => {
            JwtSubject.decode(token)
                .then((subject) => {});
        });
    }
}
/**
 * AzureADPJwtValidator
 * @extends {JwtValidator}
 * @author Robert R Murrell
 */
class AzureIDPJwtValidator extends JwtValidator {
    /**@param{null|string}subscriptionId*/
    constructor(subscriptionId = null) {
        super();
        let tenant = "common";
        if(subscriptionId != null) tenant = subscriptionId;
        this._endpoint = "https://login.microsoftonline.com/" + tenant + "/.well-known/openid-configuration";
    }
    async validate(token) {
        return new Promise((resolve, reject) => {
            /**@type{null|JwtSubject}*/let _subject = null;
            /**@type{null|string}*/let _kid = null;
            /**@type{null|Array.<string>}*/let _x5c = null;
            super.validate(token)
                .then((subject) => {
                    _subject = subject;
                    _kid = _subject.header.kid;
                    return axios.get(this._endpoint);
                })
                .then((response) => {
                    let jwks = response.data["jwks_uri"];
                    if(typeof jwks !== "string")
                        reject(CelastrinaError.newError("Invalid JWKS Key URI."));
                    else
                        return axios.get(jwks);
                })
                .then((response) => {
                    let keys = response.data.keys;
                    for(const key of keys) {
                        if(_kid === key.kid) {
                            _x5c = key["x5c"];
                            break;
                        }
                    }
                    if(typeof _x5c !== "undefined" && _x5c != null) {
                        for(const key of _x5c) {
                            let decoded = jwt.verify(_subject.token, "-----BEGIN CERTIFICATE-----\n" + key + "\n-----END CERTIFICATE-----");
                            if(typeof decoded !== "undefined" && decoded != null)
                                break;
                        }
                    }
                    else
                        reject(CelastrinaError.newError("0 ir Invalid X5C Keys."));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/**
 * JwtConfiguration
 * @author Robert R Murrell
 */
class JwtConfiguration {
    /** @type{string}*/static CONFIG_JWT = "celastrinajs.http.jwt";
    /**
     * @param {Array.<IssuerProperty|Issuer>} [issures=[]]
     * @param {(HTTPParameterFetchProperty|HTTPParameterFetch)} [param={HeaderParameterFetch}]
     * @param {(string|StringProperty)} [scheme="Bearer "]
     * @param {(boolean|BooleanProperty)} [remove=true]
     * @param {(string|StringProperty)} [token="authorization"]
     * @param {(boolean|BooleanProperty)} [validateNonce=false]
     */
    constructor(issures = [], param = new HeaderParameterFetch(), scheme = "Bearer ",
                remove = true, token = "authorization", validateNonce = false) {
        /** @type{Array.<(IssuerProperty|Issuer)>}*/this._issuers = issures;
        /** @type{null|HTTPParameterFetchProperty|HTTPParameterFetch}*/this._param  = param;
        /** @type{string|StringProperty}*/this._scheme = scheme;
        /** @type{boolean|BooleanProperty}*/this._remove = remove;
        /** @type{string|StringProperty}*/this._token  = token;
        /** @type{boolean|BooleanProperty}*/this._validateNonce = validateNonce;
    }
    /**@returns{Array.<Issuer>}*/get issuers(){return this._issuers;}
    /**@returns{HTTPParameterFetch}*/get param(){return this._param;}
    /**@returns{string}*/get scheme(){return this._scheme;}
    /**@returns{boolean}*/get removeScheme(){return this._remove;}
    /**@returns{string}*/get token(){return this._token;}
    /**@returns{boolean}*/get validateNonce(){return this._validateNonce;}
    /**
     * @param {IssuerProperty|Issuer} issuer
     * @returns {JwtConfiguration}
     */
    addIssuer(issuer){this._issuers.unshift(issuer); return this;}
    /**
     * @param {Array.<(IssuerProperty|Issuer)>} [issuers=[]]
     * @returns {JwtConfiguration}
     */
    setIssuers(issuers = []){this._issuers = issuers; return this;}
    /**
     * @param {HTTPParameterFetchProperty|HTTPParameterFetch} [param={HeaderParameterFetch}]
     * @return {JwtConfiguration}
     */
    setParam(param= new HeaderParameterFetch()){this._param = param; return this;}
    /**
     * @param {string|StringProperty} [scheme="Bearer "]
     * @return {JwtConfiguration}
     */
    setScheme(scheme = "Bearer "){this._scheme = scheme; return this;}
    /**
     * @param {boolean|BooleanProperty} [remove=true]
     * @return {JwtConfiguration}
     */
    setRemoveScheme(remove = true){this._remove = remove; return this;}
    /**
     * @param {string|StringProperty} [token="authorization"]
     * @return {JwtConfiguration}
     */
    setToken(token = "authorization"){this._token = token; return this;}
    /**
     * @param {(boolean|BooleanProperty)} [validateNonce=false]
     * @returns {JwtConfiguration}
     */
    setValidateNonce(validateNonce = false){this._validateNonce = validateNonce; return this;}
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
    /**@returns{string}*/get method(){return this._action;}
    /**@returns{string}*/get url(){return this._funccontext.req.originalUrl;}
    /**@returns{_AzureFunctionRequest}*/get request(){return this._funccontext.req;}
    /**@returns{_AzureFunctionResponse}*/get response(){return this._funccontext.res;}
    /**@returns{Object}*/get params(){return this._funccontext.req.params;}
    /**@returns{Object}*/get query(){return this._funccontext.req.query;}
    /**@returns{string}*/get raw(){return this._funccontext.req.rawBody;}
    /**@returns{_Body}*/get requestBody(){return this._funccontext.req.body;}
    /**@returns{_Body}*/get responseBody(){return this._funccontext.res.body;}
    /**
     * @returns {Promise<void>}
     * @private
     */
    async _setRequestId() {
        return new Promise((resolve, reject) => {
            try {
                let id = this._funccontext.req.query["requestId"];
                if(typeof id === "undefined" || id == null) id = this._funccontext.req.headers["x-celastrina-requestId"];
                if(typeof id === "string") this._requestId = id;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @returns {Promise<void>}
     * @private
     */
    async _setMonitorMode() {
        return new Promise((resolve, reject) => {
            try {
                let monitor;
                if(this.method === "trace")
                    monitor = true;
                else {
                    monitor = this._funccontext.req.query["monitor"];
                    if (typeof monitor === "undefined" || monitor == null) monitor = this._funccontext.req.headers["x-celastrina-monitor"];
                    monitor = (typeof monitor === "string") ? (monitor === "true") : false;
                }
                this._monitor = monitor;
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @returns {Promise<void>}
     * @private
     */
    async _parseCookies() {
        return new Promise((resolve, reject) => {
            try {
                let cookie = this.getRequestHeader("cookie");
                if(typeof cookie === "string" && cookie.trim().length > 0) {
                    let parts = cookie.split(";");
                    for(const part of parts) {
                        let peices = part.split("=");
                        this._cookies[peices.shift().trim()] = decodeURI(peices.join("="));
                    }
                }
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**@returns{Promise<void>}*/async initialize() {
        return new Promise((resolve, reject) => {
            this._setMonitorMode()
                .then(() => {
                    return this._setRequestId();
                })
                .then(() => {
                    return super.initialize();
                })
                .then(() => {
                    return this._parseCookies();
                })
                .then(() => {
                    let sessioResolver = this._config.getValue(CookieSessionResolver.CONFIG_HTTP_SESSION_RESOLVER, null);
                    if(sessioResolver instanceof CookieSessionResolver) {
                        sessioResolver.resolve(/**@type{HTTPContext}*/this)
                            .then((_context) => {
                                resolve();
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                    else resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
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
        if(!(error instanceof CelastrinaError)) error = CelastrinaError.newError("Server Error.");
        this.send(error, error.code);
    }
    /**@param{null|CelastrinaError}[error=null]*/
    sendNotAuthorizedError(error= null) {
        if(!(error instanceof CelastrinaError)) error = CelastrinaError.newError("Not Authorized.", 401);
        this.send(error, 401);
    }
    /**@param{null|CelastrinaError}[error=null]*/
    sendForbiddenError(error = null) {
        if(!(error instanceof CelastrinaError)) error = CelastrinaError.newError("Forbidden.", 403);
        this.send(error, 403);
    }
}
/**@type{BaseSentry}*/
class JwtSentry extends BaseSentry {
    /**@param{Configuration}config*/
    constructor(config) {
        super(config);
        /**@type{JwtConfiguration}*/this._jwtconfig = null;
    }
    /**
     * @param {Configuration} config
     * @returns {Promise<void>}
     */
    async initialize(config) {
        return new Promise((resolve, reject) => {
            super.initialize(config)
                .then(() => {
                    try {
                        // Going to initialize the acceptable issuers.
                        this._jwtconfig = this._configuration.getValue(JwtConfiguration.CONFIG_JWT);
                        if(this._jwtconfig == null) {
                            this._configuration.context.log.error("[JwtSentry.initialize(config)]: JwtConfiguration missing or invalid.");
                            reject(CelastrinaError.newError("Invalid configration."));
                        }
                        else resolve();
                    }
                    catch(exception) {
                        reject(exception);
                    }
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<string>}
     * @private
     */
    async _getToken(context) {
        return new Promise((resolve, reject) => {
            this._jwtconfig.param.fetch(context, this._jwtconfig.token)
                .then((auth) => {
                    if(typeof auth !== "string") {
                        context.log("Expected JWT token but none was found.", LOG_LEVEL.LEVEL_WARN, "JwtSentry._getToken(context)");
                        reject(CelastrinaError.newError("Not Authorized.", 401));
                    }
                    else {
                        let scheme = this._jwtconfig.scheme;
                        if(typeof scheme === "string" && scheme.length > 0) {
                            if(auth.startsWith(scheme)) {
                                if(this._jwtconfig.removeScheme) auth = auth.slice(scheme.length);
                                resolve(auth);
                            }
                            else {
                                context.log("Expected token scheme '" + scheme + "' but none was found.", LOG_LEVEL.LEVEL_WARN, "JwtSentry._getToken(context)");
                                reject(CelastrinaError.newError("Not Authorized.", 401));
                            }
                        }
                        else resolve(auth);
                    }
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            try {
                /**@type{JwtSubject}*/let subject = null;
                this._getToken(context)
                    .then((auth) => {
                        // WARNING: Only decodes, does not validate!
                        return JwtSubject.decode(auth);
                    })
                    .then((jwtsub) => {
                        subject = jwtsub;
                        if(subject.isExpired()) {
                            context.log("JWT Token expired.", LOG_LEVEL.LEVEL_VERBOSE, "JwtSentry.authenticate(context)");
                            reject(CelastrinaError.newError("Not Authorized.", 401));
                        }
                        else {
                            // No we check the issuers to see if we match any.
                            /** @type {Array.<Promise<boolean>>} */
                            let promises = [];
                            let issuers = this._jwtconfig.issuers;
                            for(const issuer of issuers) {
                                promises.unshift(issuer.authenticate(subject)); // Performs the role escalations too.
                            }
                            Promise.all(promises)
                                .then((results) => {
                                    let authenticated = false;
                                    for(const result of results) {
                                        if((authenticated = result)) break;
                                    }
                                    if(authenticated) resolve(subject);
                                    else reject(CelastrinaError.newError("Not Authorized.", 401));
                                })
                                .catch((exception) => {
                                    reject(exception);
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
}
/**@type{RoleResolver}*/
class CookieSessionResolver {
    /** @type{string}*/static CONFIG_HTTP_SESSION_RESOLVER = "celastrinajs.http.function.session.resolver";
    /**@param{string}[name="celastrina_session"]*/
    constructor(name = "celastrina_session"){this._name = name;}
    /**
     * @param {HTTPContext} context
     * @returns {Promise<string>}
     * @private
     */
    async _getCookie(context) {
        return new Promise((resolve, reject) => {
            let session = context.getCookie(this._name, null);
            if(typeof session !== "string" || session.trim().length === 0) {
                context.log("Cookie '" + this._name + "' not found.", LOG_LEVEL.LEVEL_VERBOSE, "CookieRoleResolver._getCookie(context)");
                reject(CelastrinaError.newError("Not Authorized.", 401));
            }
            else
                resolve(session);
        });
    }
    /**
     * @param {HTTPContext} context
     * @param {string} cookie
     * @returns {Promise<object>}
     */
    async _getSession(context, cookie) {
        return new Promise((resolve, reject) => {
            try {
                resolve(JSON.parse(cookie));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<HTTPContext>}
     */
    async resolve(context) {
        return new Promise((resolve, reject) => {
            this._getCookie(context)
                .then((cookie) => {
                    return this._getSession(context, cookie);
                })
                .then((session) => {
                    context.loadSessionProperties(session);
                    resolve(context);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
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
     * @returns {Promise<object>}
     * @private
     */
    async _getSession(context, cookie) {
        return new Promise((resolve, reject) => {
            this._crypto.decrypt(cookie)
                .then((decrypted) => {
                    return super._getSession(context, decrypted);
                })
                .then((session) => {
                    resolve(session);
                })
                .catch((exception) => {
                    reject(exception);
                })
        });
    }
}
/**@type{JsonProperty}*/
class CookieSessionResolverProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} [defaultValue=null]
     */
    constructor(name, defaultValue = null) {super(name, defaultValue);}
    /**
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            super.resolve(value)
                .then((obj) => {
                    if(!obj.hasOwnProperty("name")) reject(CelastrinaValidationError.newValidationError("Invalid CookieSessionResolver. _name is required.", "CookieSessionResolver._name"));
                    else resolve(new CookieSessionResolver(obj._name));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/**@type{JsonProperty}*/
class SecureCookieSessionResolverProperty extends JsonProperty {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null){super(name, defaultValue);}
    /**
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            super.resolve(value)
                .then((obj) => {
                    if(!obj.hasOwnProperty("_name")) reject(CelastrinaValidationError.newValidationError("Invalid SecureCookieSessionResolver. _name is required.", "SecureCookieSessionResolver._name"));
                    else if(!obj.hasOwnProperty("_key")) reject(CelastrinaValidationError.newValidationError("Invalid SecureCookieSessionResolver. _key is required.","SecureCookieSessionResolver._key"));
                    else if(!obj.hasOwnProperty("_iv")) reject(CelastrinaValidationError.newValidationError("Invalid SecureCookieSessionResolver. _iv is required.","SecureCookieSessionResolver._iv"));
                    else {
                        let crypto = new Cryptography(new AES256Algorithm(obj._key, obj._iv));
                        crypto.initialize()
                            .then(() => {
                                resolve(new SecureCookieSessionResolver(crypto, obj._name));
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
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
     * @returns {Promise<BaseContext & HTTPContext>}
     */
    async createContext(context, config) {
        return new Promise((resolve, reject) => {
                try {
                    resolve(new HTTPContext(context, config));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _get(context) {
        return new Promise((resolve) => {
            context.log("GET Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._get(context)");
            context.send(null, 204);
            resolve();
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _patch(context) {
        return new Promise((resolve, reject) => {
            context.log("PATCH Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._patch(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _put(context) {
        return new Promise((resolve, reject) => {
            context.log("PUT Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._put(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _post(context) {
        return new Promise((resolve, reject) => {
            context.log("POST Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._post(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _delete(context) {
        return new Promise((resolve, reject) => {
            context.log("DELETE Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._delete(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _options(context) {
        return new Promise((resolve, reject) => {
            context.log("OPTOINS Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._options(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _head(context) {
        return new Promise((resolve, reject) => {
            context.log("HEAD Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._head(context)");
            context.send(null, 204);
            resolve();
        });
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<void>}
     */
    async _trace(context) {
        return new Promise((resolve, reject) => {
            context.log("TRACE Method not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "HTTP._trace(context)");
            context.monitorResponse.addPassedDiagnostic("Default HTTP", "HTTP._trace(context): Not implemented.");
            resolve();
        });
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<void>}
     */
    async monitor(context) {
        return new Promise((resolve, reject) => {
            this._trace(context)
                .then(() => {
                    let response = [{test: context.name,passed: context.monitorResponse.passed,failed: context.monitorResponse.failed,result: context.monitorResponse.result}];
                    context.send(response, 200);
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @param {null|Error|CelastrinaError|*} exception
     * @returns {Promise<void>}
     */
    async exception(context, exception) {
        return new Promise((resolve, reject) => {
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
                ex = CelastrinaError.newError(ex.toString());
                context.sendServerError(ex);
            }

            context.log("Request failed to process. (NAME:" + ex.cause.name + ") (MESSAGE:" + ex.cause.message + ") (STACK:" + ex.cause.stack + ")", LOG_LEVEL.LEVEL_ERROR, "HTTP.exception(context, exception)");
            resolve();
        });
    }
    /**
     * @param {BaseContext & HTTPContext} context
     * @returns {Promise<void>}
     */
    async unhandledRequestMethod(context) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("HTTP Method '" + context.method + "' not supported.", 400));
        });
    }
    /**
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise((resolve, reject) => {
            let httpMethodHandler = this["_" + context.method];
            let promise;
            if(typeof httpMethodHandler === "undefined") promise = this.unhandledRequestMethod(context);
            else promise = httpMethodHandler(context);
            promise.then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
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
    async createSentry(context, config) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new JwtSentry(config));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
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
     * @returns {Promise<HTTPContext & JSONHTTPContext>}
     */
    async createContext(context, config) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new JSONHTTPContext(context, config));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {JSONHTTPFunction}
 * @abstract
 */
class JwtJSONHTTPFunction extends JSONHTTPFunction {
    /**@param{Configuration}configuration*/
    constructor(configuration){super(configuration);}
    async createSentry(context, config) {
        return new Promise((resolve, reject) => {
            try {
                resolve(new JwtSentry(config));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
module.exports = {
    JwtSubject: JwtSubject, Issuer: Issuer, IssuerProperty: IssuerProperty, JwtConfiguration: JwtConfiguration,
    HTTPContext: HTTPContext, HTTPParameterFetch: HTTPParameterFetch, HeaderParameterFetch: HeaderParameterFetch,
    QueryParameterFetch: QueryParameterFetch, BodyParameterFetch: BodyParameterFetch,
    HTTPParameterFetchProperty: HTTPParameterFetchProperty, CookieSessionResolver: CookieSessionResolver,
    CookieSessionResolverProperty: CookieSessionResolverProperty, SecureCookieSessionResolver: SecureCookieSessionResolver,
    SecureCookieSessionResolverProperty: SecureCookieSessionResolverProperty, JwtSentry: JwtSentry,
    HTTPFunction: HTTPFunction, JwtHTTPFunction: JwtHTTPFunction, JSONHTTPContext: JSONHTTPContext, JSONHTTPFunction: JSONHTTPFunction,
    JwtJSONHTTPFunction: JwtJSONHTTPFunction
};
