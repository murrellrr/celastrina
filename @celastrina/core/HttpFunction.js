/*
 * Copyright (c) 2020, Robert R Murrell.
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

"use strict";

const moment = require("moment");
const jwt    = require("jsonwebtoken");

const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");
const {LOG_LEVEL, JsonProperty, Configuration, BaseSubject, BaseSentry, BaseContext,
       BaseFunction} = require("./BaseFunction");

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
 */
/**
 * @typedef _ClaimsPayload
 * @property {moment.Moment} issued
 * @property {moment.Moment} expires
 * @property {string} token
 * @property {string} audience
 * @property {string} subject
 * @property {string} issuer
 */
/**
 * @brief
 * @author Robert R Murrell
 */
class JwtSubject extends BaseSubject {
    /**
     * @brief
     * @param {string} sub
     * @param {string} aud
     * @param {string} iss
     * @param {number} iat
     * @param {number} exp
     * @param {string} nonce
     * @param {string} token
     * @param {Array.<string>} [roles]
     */
    constructor(sub, aud, iss, iat, exp, nonce, token,
                roles = []) {
        super(sub, roles);
        this._nonce    = nonce;
        this._audience = aud;
        this._issuer   = iss;
        this._issued   = moment.unix(iat);
        this._expires  = moment.unix(exp);
        this._token    = token;
    }

    /**
     * @brief
     * @returns {string}
     */
    get nonce() {
        return this._nonce;
    }

    /**
     * @brief
     * @returns {string}
     */
    get audience() {
        return this._audience;
    }

    /**
     * @brief
     * @returns {string}
     */
    get issuer() {
        return this._issuer;
    }

    /**
     * @brief
     * @returns {moment.Moment}
     */
    get issued() {
        return this._issued;
    }

    /**
     * @brief
     * @returns {moment.Moment}
     */
    get expires() {
        return this._expires;
    }

    /**
     * @brief
     * @returns {string}
     */
    get token() {
        return this._token;
    }

    /**
     * @brief
     * @param {string[]} headers
     */
    setAuthorizationHeader(headers) {
        if(typeof headers !== "undefined" && headers != null)
            headers["Authorization"] = "Bearer " + this.token;
    }

    /**
     * @brief
     * @returns {{subject:string, roles: Array.<string>, nounce:string, audience: string, issuer: string,
     *            issued: string, expires: string}}
     */
    toJSON() {
        let json = super.toJSON();
        json.nonce    = this._nonce;
        json.audience = this._audience;
        json.issuer   = this._issuer;
        json.issued   = this._issued.format();
        json.expires  = this._expires.format();
        return json;
    }

    /**
     * @brief
     * @param {JwtSubject} source
     */
    copy(source) {
        //sub, aud, iss, iat, exp, nonce, token
        if(source instanceof JwtSubject)
            return new JwtSubject(source._id, source._audience, source._issuer, source._issued.unix(),
                                  source._expires.unix(), source._nonce, source._token);
        else
            throw CelastrinaError.newError("Source must be an instance of JwtUser.")
    }

    /**
     * @brief
     * @param {string} bearerToken
     * @return {Promise<JwtSubject>}
     */
    static async decode(bearerToken) {
        return new Promise((resolve, reject) => {
            if(typeof bearerToken !== "string" || bearerToken.trim().length === 0)
                reject(CelastrinaError.newError("Not Authorized.", 401));
            else {
                try {
                    /** @type {_jwt} */
                    let token   = jwt.decode(bearerToken);
                    let payload = token.payload;
                    resolve(new JwtSubject(payload.sub, payload.aud, payload.iss, payload.iat, payload.exp,
                                           payload.nonce, bearerToken));
                }
                catch (exception) {
                    reject(exception);
                }
            }
        });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 */
class Issuer {
    /**
     * @brief
     * @param {string} name
     * @param {string} audience
     * @param {Array.<string>} [roles]
     */
    constructor(name, audience, roles = []) {
        this._name     = name;
        this._audience = audience;
        this._roles    = roles;
    }

    /**
     * @brief
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @brief
     * @returns {string}
     */
    get audience() {
        return this._audience;
    }

    /**
     * @brief
     * @returns {Array<string>}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief
     * @param {JwtSubject} subject
     * @returns {Promise<boolean>}
     */
    async authenticate(subject) {
        return new Promise((resolve, reject) => {
            try {
                if (subject.issuer === this._name && subject.audience === this._audience) {
                    // Add roles to the subject if there are any specified.
                    subject.addRoles(this._roles);
                    resolve(true);
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
/**
 * @brief
 * @author Robert R Murrell
 */
class IssuerProperty extends JsonProperty {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} secure
     * @param {null|string} defaultValue
     */
    constructor(name, secure = false, defaultValue = null) {
        super(name, secure, defaultValue);
        this._type = "Issuer";
    }

    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                super.resolve(value)
                    .then((source) => {
                        if(source != null) {
                            if(!source.hasOwnProperty("_name"))
                                reject(CelastrinaError.newError("Invalid Issuer, _name required."));
                            else if(!source.hasOwnProperty("_audience"))
                                reject(CelastrinaError.newError("Invalid Issuer, _audience required."));
                            else if(!source.hasOwnProperty("_roles"))
                                reject(CelastrinaError.newError("Invalid Issuer, _roles required."));
                            else if(!Array.isArray(source._roles))
                                reject(CelastrinaError.newError("Invalid Issuer, _roles must be an Array."));
                            else
                                resolve(new Issuer(source._name, source._audience, source._roles));
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
 * @brief Gets a Parameter value from an HTTP Header, Query, or Body.
 * @author Robert R Murrell
 * @abstract
 */
class HTTPParameterFetch {
    /**
     * @brief
     * @param {string} [type]
     */
    constructor(type = "HTTPParameterFetch") {
        this._type = type;
    }

    /**
     * @brief
     * @param {HTTPContext} context
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<null|string>}
     */
    async fetch(context, key, defaultValue = null) {
        return new Promise((resolve) => {
            resolve(defaultValue);
        });
    }

    /**
     * @brief
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
/**
 * @brief Gets a Header Parameter.
 * @author Robert R Murrell
 */
class HeaderParameterFetch extends HTTPParameterFetch {
    /**
     * @brief
     */
    constructor() {
        super("header");
    }

    /**
     * @brief
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
/**
 * @brief Gets a Query Parameter.
 * @author Robert R Murrell
 */
class QueryParameterFetch extends HTTPParameterFetch {
    /**
     * @brief
     */
    constructor() {
        super("query");
    }

    /**
     * @brief
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
/**
 * @brief Gets an attribute of a Body object.
 * @author Robert R Murrell
 */
class BodyParameterFetch extends HTTPParameterFetch {
    /**
     * @brief
     */
    constructor(key) {
        super("body");
    }

    /**
     * @brief
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
                if(typeof value === "undefined" || value == null)
                    value = defaultValue;
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @brief
 * @author
 */
class HTTPParameterFetchProperty extends JsonProperty {
    /**
     * @brief
     * @param {string} name
     * @param {boolean} secure
     * @param {null|string} defaultValue
     */
    constructor(name, secure = false, defaultValue = null) {
        super(name, secure, defaultValue);
    }

    /**
     * @brief
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
                                reject(CelastrinaError.newError(
                                    "Invalid HTTPParameterFetch, _type required."));
                            else {
                                switch(source._type) {
                                    case "header":
                                        resolve(new HeaderParameterFetch());
                                        break;
                                    case "query":
                                        resolve(new MatchAll());
                                        break;
                                    case "body":
                                        resolve(new MatchNone());
                                        break;
                                    default:
                                        reject(CelastrinaError.newError("Invalid Match Type."));
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
 * @brief
 * @author Robert R Murrell
 */
class JwtConfiguration extends Configuration {
    /**
     * @brief
     * @param {StringProperty|string} name
     * @param {BooleanProperty|boolean} managed
     */
    constructor(name, managed = true) {
        super(name, managed);
        /** @type {Array.<IssuerProperty|Issuer>} */
        this._config["celastrinajs.jwt.issure"] = [];
        /** @type {HTTPParameterFetchProperty|HTTPParameterFetch} */
        this._config["celastrinajs.jwt.param"]  = new HeaderParameterFetch(); // Header or query param
        /** @type {string|StringProperty} */
        this._config["celastrinajs.jwt.scheme"] = "Bearer ";
        /** @type {boolean|BooleanProperty} */
        this._config["celastrinajs.jwt.scheme.remove"] = true;
        /** @type {string|StringProperty} */
        this._config["celastrinajs.jwt.token"]  = "authorization";
    }

    /**
     * @brief
     * @param {IssuerProperty|Issuer} issuer
     * @returns {JwtConfiguration}
     */
    addIssuer(issuer) {
        this._config["celastrinajs.jwt.issure"].unshift(issuer);
        return this;
    }

    /**
     * @brief
     * @returns {Array.<Issuer>}
     */
    get issuers() {
        return this._config["celastrinajs.jwt.issure"];
    }

    /**
     * @brief
     * @param {HTTPParameterFetchProperty|HTTPParameterFetch} param
     */
    set param(param) {
        this._config["celastrinajs.jwt.param"] = param;
    }

    /**
     * @brief
     * @returns {HTTPParameterFetch}
     */
    get param() {
        return this._config["celastrinajs.jwt.param"];
    }

    /**
     * @brief
     * @param {string|StringProperty} scheme
     */
    set scheme(scheme) {
        this._config["celastrinajs.jwt.scheme"] = scheme;
    }

    /**
     * @brief
     * @returns {string}
     */
    get scheme() {
        return this._config["celastrinajs.jwt.scheme"];
    }

    /**
     * @brief
     * @param {booleam|BooleanProperty} remove
     */
    set removeScheme(remove) {
        this._config["celastrinajs.jwt.scheme.remove"] = remove;
    }

    /**
     * @brief
     * @returns {boolean}
     */
    get removeScheme() {
        return this._config["celastrinajs.jwt.scheme.remove"];
    }

    /**
     * @brief
     * @returns {string}
     */
    get key() {
        return this._config["celastrinajs.jwt.token"];
    }

    /**
     * @brief
     * @param {string|StringProperty} key
     */
    set key(key) {
        this._config["celastrinajs.jwt.token"] = key;
    }
}
/**
 * @brief Base context for an HTTP Request/Response.
 * @description Used with the {HTTPFunction}
 * @author Robert R Murrell
 * @see HTTPFunction
 */
class HTTPContext extends BaseContext {
    /**
     * @brief
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     */
    constructor(context, name, properties) {
        super(context, name, properties);
        // Setting up the default response.
        this._context.res = {status: 200,
            headers: {"Content-Type": "text/html; charset=ISO-8859-1"},
            body: "<html lang=\"en\"><head><title>" + this._name +
                "</title></head><body>200, Success</body></html>"};
        this._action = this._context.req.method.toLowerCase();
    }

    async initialize(configuration) {
        return new Promise((resolve, reject) => {
            // Override the request ID if its there.
            let id = this._context.req.query["requestId"];
            if (typeof id === "undefined" || id == null)
                id = this._context.req.headers["x-celastrina-requestId"];
            if(typeof id === "string")
                this._requestId = id;

            // Checking to see if we are in monitoring mode
            let monitor;
            if(this.method === "trace")
                monitor = true;
            else {
                monitor = this._context.req.query["monitor"];
                if (typeof monitor === "undefined" || monitor == null)
                    monitor = this._context.req.headers["x-celastrina-monitor"];
                monitor = (typeof monitor === "string") ? (monitor === "true") : false;
            }
            this._monitor = monitor;

            super.initialize(configuration)
                .then((context) => {
                    resolve(context);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief Returns the HTTP request method used.
     * @returns {string}
     */
    get method() {
        return this._action;
    }

    /**
     * @brief Returns the url request.
     * @returns {string}
     */
    get url() {
        return this._context.req.originalUrl;
    }

    /**
     * @brief Gets the request
     * @returns {_AzureFunctionRequest}
     */
    get request() {
        return this._context.req;
    }

    /**
     * @brief Gets the response.
     * @returns {_AzureFunctionResponse}
     */
    get response() {
        return this._context.res;
    }

    /**
     * @brief
     * @returns {Object}
     */
    get params() {
        return this._context.req.params;
    }

    /**
     * @brief
     * @returns {Object}
     */
    get query() {
        return this._context.req.query;
    }

    /**
     * @brief The RAW request body.
     * @returns {string}
     */
    get raw() {
        return this._context.req.rawBody;
    }

    /**
     * @brief Gets a query string.
     * @param {string} name The name of the header.
     * @param {null|string} [defaultValue] The value to return if the header was undefined, null, or empty.
     * @return {null|string}
     */
    getQuery(name, defaultValue = null) {
        let qry = this._context.req.query[name];
        if(typeof qry !== "string")
            return defaultValue;
        else
            return qry;
    }

    /**
     * @brief Gets a request header.
     * @param {string} name The name of the header.
     * @param {null|string} [defaultValue] The value to return if the header was undefined, null, or empty.
     * @return {null|string}
     */
    getRequestHeader(name, defaultValue = null) {
        let header = this._context.req.headers[name];
        if(typeof header !== "string")
            return defaultValue;
        else
            return header;
    }

    /**
     * @brief Gets a response header.
     * @param {string} name The name of the header.
     * @param {null|string} [defaultValue] The value to return if the header was undefined, null, or empty.
     * @return {string}
     */
    getResponseHeader(name, defaultValue = null) {
        let header = this._context.res.headers[name];
        if(typeof header !== "string")
            return defaultValue;
        else
            return header;
    }

    /**
     * @brief Sets a response header.
     * @param {string} name The name of the header.
     * @param {string} value The value to set.
     */
    setResponseHeader(name, value) {
        this._context.res.headers[name] = value;
    }

    /**
     * @brief Returns the request body.
     * @returns {_Body}
     */
    get requestBody() {
        return this._context.req.body;
    }

    /**
     * @brief Returns the response body.
     * @returns {_Body}
     */
    get responseBody() {
        return this._context.res.body;
    }

    /**
     * @brief Sets the body of the response and invoked done on the context.
     * @param {*} [body]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        this._context.res.status = status;
        this._context.res.headers["X-celastrina-request-uuid"] = this._requestId;

        if(status !== 204) {
            if (body === null) {
                let content = this._name + ", " + status + ".";
                this._context.res.body = "<html lang=\"en\"><head><title>" + content +
                    "</title></head><body>" + content +
                    "</body></html>";
            }
            else
                body = body.toString();
        }

        this._context.res.body = body;
    }

    /**
     * @brief Sends an HTTP 400 error from an {CelastrinaValidationError}.
     * @param {null|CelastrinaValidationError} [error]
     */
    sendValidationError(error = null) {
        if(!(error instanceof CelastrinaValidationError))
            error = CelastrinaValidationError.newValidationError("Bad request.", this._requestId);
        this.send(error, error.code);
    }

    /**
     * @brief Sends a redirect to the calling end-point.
     * @param {string} url
     * @param {null|Object} [body]
     */
    sendRedirect(url, body = null) {
        this._context.res.headers["Location"] = url;
        this.send(body, 302);
    }

    /**
     * @brief Sends a redirect to the calling end-point and places the request bodt in the response body.
     * @param {string} url
     */
    sendRedirectForwardBody(url) {
        this.sendRedirect(url, this._context.req.body);
    }

    /**
     * @brief Sends an HTTP 400 error from an {CelastrinaValidationError}.
     * @param {null|CelastrinaError} [error]
     */
    sendServerError(error = null) {
        if(!(error instanceof CelastrinaError))
            error = CelastrinaError.newError("Server Error.");
        this.send(error, error.code);
    }

    /**
     * @brief Sends an HTTP 4001error from an {CelastrinaValidationError}.
     * @param {null|CelastrinaError} [error]
     */
    sendNotAuthorizedError(error= null) {
        if(!(error instanceof CelastrinaError))
            error = CelastrinaError.newError("Not Authorized.", 401);
        this.send(error, 401);
    }

    /**
     * @brief Sends an HTTP 400 error from an {CelastrinaValidationError}.
     * @param {null|CelastrinaError} [error]
     */
    sendForbiddenError(error = null) {
        if(!(error instanceof CelastrinaError))
            error = CelastrinaError.newError("Forbidden.", 403);
        this.send(error, 403);
    }
}
/**
 * @brief
 * @description
 * @author Robert R Murrell
 */
class JwtSentry extends BaseSentry {
    constructor() {
        super();
        /** @type {null|Array.<Issuer>} */
        this._issuers = null;
        /** @type {(null|HTTPParameterFetch)} */
        this._param     = null;
        /** @param {(null|string)} */
        this._scheme    = null;
        /** @param {(null|string)} */
        this._tokenKey  = null;
        /** @param {(null|boolean)} */
        this._removeScheme = null;
    }

    /**
     * @brief
     * @param {Configuration} configuration
     * @returns {Promise<(BaseSentry & JwtSentry)>}
     */
    async initialize(configuration) {
        return new Promise((resolve, reject) => {
            super.initialize(configuration)
                .then((sentry) => {
                    try {
                        // Going to initialize the acceptable issuers.
                        this._issuers = this._issuers.concat(configuration.getValue("celastrinajs.jwt.issuers", []));

                        // Load the Jwt config
                        this._param    = configuration.getValue("celastrinajs.jwt.param");
                        if(this._param == null)
                            this._param = new HeaderParameterFetch();
                        this._scheme   = configuration.getValue("celastrinajs.jwt.sceme", "Bearer ");
                        this._tokenKey = configuration.getValue("celastrinajs.jwt.token", "authorization");
                        this._removeScheme = configuration.getValue("celastrinajs.jwt.sceme.remove", true);

                        resolve(sentry);
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
     * @brief
     * @param {HTTPContext} context
     * @returns {Promise<string>}
     * @private
     */
    async _getToken(context) {
        return new Promise((resolve, reject) => {
            let auth;
            this._param.fetch(context, this._tokenKey)
                .then((token) => {
                    if(typeof auth !== "string") {
                        context.log("Expected JWT token but none was found.", LOG_LEVEL.LEVEL_WARN,
                                     "JwtSentry._getToken(context)");
                        reject(CelastrinaError.newError("Not Authorized.", 401));
                    }
                    else {
                        // Checking to see if we need to validate the scheme
                        if(typeof this._scheme === "string" && this._scheme.length > 0) {
                            if(auth.startsWith(this._scheme)) { // and that it starts with the scheme...
                                if(this._removeScheme)
                                    auth.slice(this._scheme.length); // and remove it...
                                resolve(auth);
                            }
                            else {
                                context.log("Expected token scheme '" + this._scheme + "' but none was found.",
                                             LOG_LEVEL.LEVEL_WARN, "JwtSentry._getToken(context)");
                                reject(CelastrinaError.newError("Not Authorized.", 401));
                            }
                        }
                        else
                            resolve(auth);
                    }
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief
     * @description <p><strong>WARNING:</strong>This function DOES NOT validate the JWT token, it only decodes it.
     *              Token validation should be performed by API Manager or Azure Front Door, prior to invoking this
     *              function.</p>
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<BaseSubject>}
     */
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            try {
                let subject = null;
                this._getToken(context)
                    .then((auth) => {
                        // WARNING: Only decodes, does not validate!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
                        return JwtSubject.decode(auth);
                    })
                    .then((jwtsub) => {
                        subject = jwtsub;
                        // No we check the issuers to see if we match any.
                        /** @type {Array.<Promise<boolean>>} */
                        let promises = [];
                        for(const issuer of this._issuers) {
                            promises.unshift(issuer.authenticate(subject)); // Performs the role escalations too.
                        }
                        return Promise.all(promises);
                    })
                    .then((results) => {
                        let authenticated = false;
                        for(const result of results) {
                            if((authenticated = result))
                                break;
                        }
                        if(authenticated)
                            resolve(subject);
                        else
                            reject(CelastrinaError.newError("Not Authorized.", 401));
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
 * @brief Extension of the {BaseFunction} that handles HTTP triggers.
 * @description Implementors must create a httpTrigger input binding named <code>red</code> and an output binding named
 *              res to handle the HTTP request and response objects respectively.
 * @author Robert R Murrell
 * @see BaseFunction
 * @abstract
 */
class HTTPFunction extends BaseFunction {
    /**
     * @brief
     * @param {Configuration} configuration
     */
    constructor(configuration) {
        super(configuration);
    }

    /**
     * @brief Converts an Azure function context to an {HTTPContext}.
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     * @returns {Promise<BaseContext & HTTPContext>}
     */
    async createContext(context, name, properties) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new HTTPContext(context, name, properties));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Handles an HTTP GET request.
     * @description Override this function to handle an HTTP GET request. Sends response 204 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _get(context) {
        return new Promise((resolve) => {
            context.log("WARNING: GET Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            context.send(null, 204);
            resolve();
        });
    }

    /**
     * @brief Handles an HTTP PATCH request.
     * @description Override this function to handle an HTTP PATCH request. Sends response 501 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _patch(context) {
        return new Promise((reject) => {
            context.log("WARNING: PATCH Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP PUT request.
     * @description Override this function to handle an HTTP PUT request. Sends response 501 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _put(context) {
        return new Promise((reject) => {
            context.log("WARNING: PUT Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP POST request.
     * @description Override this function to handle an HTTP POST request. Sends response 501 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _post(context) {
        return new Promise((reject) => {
            context.log("WARNING: POST Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP DELETE request.
     * @description Override this function to handle an HTTP DELETE request. Sends response 501 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _delete(context) {
        return new Promise((reject) => {
            context.log("WARNING: DELETE Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP OPTOINS request.
     * @description Override this function to handle an HTTP OPTOINS request. Sends response 501 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _options(context) {
        return new Promise((reject) => {
            context.log("WARNING: OPTOINS Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @brief Handles an HTTP HEAD request.
     * @description Override this function to handle an HTTP HEAD request. Sends response 501 by default.
     * @param {HTTPContext} context
     * @returns {Promise<void>}
     */
    async _head(context) {
        return new Promise((resolve) => {
            context.log("WARNING: HEAD Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            context.send(null, 204);
            resolve();
        });
    }

    /**
     * @brief Handles an HTTP TRACE request.
     * @description <p>Override this function to handle an HTTP TRACE request. Sends response 501 by default. This function
     *              is also called by {HTTPFunction.monitor(context)} function if a monitoring message is received.</p>
     *              <p>Do not invoke the {HTTPContext.send()} function from this promise. The monitor object will be
     *                 sent in the {HTTPFunction.monitor(context)} method.</p>
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<void>}
     */
    async _trace(context) {
        return new Promise((resolve) => {
            context.log("WARNING: TRACE Method not implemented.", this._topic, LOG_LEVEL.LEVEL_WARN);
            context.monitorResponse.addPassedDiagnostic("Default HTTPFunction",
                "HTTPFunction._trace(context): Not implemented.");
            resolve();
        });
    }

    /**
     * @brief Calls {HTTPFunction._trace(context)}
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<void>}
     */
    async monitor(context) {
        return new Promise((resolve, reject) => {
            this._trace(context)
                .then(() => {
                    let response = [{test: context.name, passed: context.monitorResponse.passed,
                        failed: context.monitorResponse.failed, result: context.monitorResponse.result}];
                    context.send(response, 200);
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief HTTP Exception handler.
     * @param {BaseContext | HTTPContext} context
     * @param {*} exception
     * @returns {Promise<void>}
     */
    async exception(context, exception) {
        return new Promise(
            (resolve) => {
                let ex = exception;
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

                context.log("Request failed to process. (NAME:" + ex.cause.name + ") (MESSAGE:" +
                    ex.cause.message + ") (STACK:" + ex.cause.stack + ")", LOG_LEVEL.LEVEL_ERROR,
                    "HTTPFunction.exception(context, exception)");
                resolve();
            });
    }

    /**
     * @brief Rejects this promoise with a HTTP Bad Request Response.
     * @description Override this method to handle and HTTP methods not handled by this Function. The default behavior
     *              is to respond with an HTTP 400.
     * @param {BaseContext & HTTPContext} context
     * @returns {Promise<void>}
     */
    async unhandledRequestMethod(context) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("HTTP Method '" + context.method + "' not supported.", 400));
        });
    }

    /**
     * @brief Dispatches the HTTP request to the corresponding handler method.
     * @param {BaseContext | HTTPContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        let httpMethodHandler = this["_" + context.method];
        let promise;

        if(typeof httpMethodHandler === "undefined")
            promise = this.unhandledRequestMethod(context);
        else
            promise = httpMethodHandler(context);

        return promise;
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @abstract
 */
class JwtHTTPFunction extends HTTPFunction {
    /**
     * @brief
     * @param {JwtConfiguration} configuration
     */
    constructor(configuration) {
        super(configuration);
    }

    async createSentry() {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new JwtSentry());
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 */
class JSONHTTPContext extends HTTPContext {
    /**
     * @brief
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     */
    constructor(context, name, properties) {
        super(context, name, properties);
        this._context.res.headers["Content-Type"] = "application/json; charset=utf-8";
    }

    /**
     * @brief Sets the body of the response and invoked done on the context.
     * @param {*} [body]
     * @param {number} [status] The HTTP status code, default is 200.
     */
    send(body = null, status = 200) {
        this._context.res.status = status;
        this._context.res.headers["X-celastrina-requestId"] = this._requestId;
        this._context.res.body = body;
    }
}
/**
 * @brief Implementation of the HTTPFunction designed to handle JSON.
 * @description Uses the {JSONHTTPContext} object to ensure the response Content-Type header is "application/json".
 * @author Robert R Murrell
 * @see HTTPFunction
 * @see JSONHTTPContext
 * @abstract
 */
class JSONHTTPFunction extends HTTPFunction {
    /**
     * @brief
     * @param {Configuration} configuration
     */
    constructor(configuration) {
        super(configuration);
    }

    /**
     * @brief Returns a {JSONHTTPContext}
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     * @returns {Promise<HTTPContext & JSONHTTPContext>}
     */
    async createContext(context, name, properties) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new JSONHTTPContext(context, name, properties));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}
/**
 * @brief
 * @author Robert R Murrell
 * @abstract
 */
class JwtJSONHTTPFunction extends JSONHTTPFunction {
    /**
     * @brief
     * @param {JwtConfiguration} configuration
     */
    constructor(configuration) {
        super(configuration);
    }

    async createSentry() {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new JwtSentry());
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}
/*
 * *********************************************************************************************************************
 * EXPORTS
 * *********************************************************************************************************************
 */
module.exports = {
    JwtSubject: JwtSubject,
    Issuer: Issuer,
    IssuerProperty: IssuerProperty,
    JwtConfiguration: JwtConfiguration,
    HTTPContext: HTTPContext,
    HTTPParameterFetch: HTTPParameterFetch,
    HeaderParameterFetch: HeaderParameterFetch,
    QueryParameterFetch: QueryParameterFetch,
    BodyParameterFetch: BodyParameterFetch,
    HTTPParameterFetchProperty: HTTPParameterFetchProperty,
    JwtSentry: JwtSentry,
    HTTPFunction: HTTPFunction,
    JwtHTTPFunction: JwtHTTPFunction,
    JSONHTTPContext: JSONHTTPContext,
    JSONHTTPFunction: JSONHTTPFunction,
    JwtJSONHTTPFunction: JwtJSONHTTPFunction
};
