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

const moment    = require("moment");
const jwt       = require("jsonwebtoken");
const crypto    = require("crypto");
const axios     = require("axios").default;

const {TokenResponse, AuthenticationContext} = require("adal-node");
const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");
const {LOG_LEVEL} = require("./BaseFunction");
const {JSONHTTPContext, JSONHTTPFunction} = require("./HTTPFunction");

/**
 * @typedef _XCLAToken
 * @property {string} aud
 * @property {string} sub
 * @property {string} oid
 * @property {string} iss
 * @property {number} iat
 * @property {number} exp
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
 * @typedef {JSONHTTPContext} _SecureContext
 * @property {Sentry} sentry
 * @property {Vault} vault
 * @property {boolean} overridden
 */
/**
 * @typedef _ManagedResourceToken
 * @property {string} access_token
 * @property {string} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */
/**
 * @brief
 *
 * @type {{OVERRIDE: {OVERRIDE_NONE: number, OVERRIDE_IF_SYSTEM: number}, AUTHORIZATION: {MATCH_ALL: number,
 *         MATCH_NONE: number, MATCH_ANY: number}}}
 */
const MATCH_TYPE = {
    AUTHORIZATION: {
        MATCH_ANY:  1,
        MATCH_ALL:  2,
        MATCH_NONE: 3
    },
    OVERRIDE: {
        OVERRIDE_NONE:      4,
        OVERRIDE_IF_SYSTEM: 5
    }
};

/**
 * @brief JWT Claims from the Authorization header bearer token.
 *
 * @author Robert R Murrell
 *
 * @type {{audience: null|string, subject: null|string, issuer: null|string, issued: null|string, expires: null|string,
 *         roles: *[]|string[], token: null|string}}
 */
class ClaimsToken {
    constructor(source) {
        this._version    = "1.0";
        this.audience    = null;
        this.subject     = null;
        this.issuer      = null;
        this.issued      = null;
        this.expires     = null;
        this.token       = null;
        Object.assign(this, source);
    }

    /**
     * @brief
     *
     * @returns {{audience: null|string, subject: null|string, issuer: null|string, issued: null|string,
     *            expires: null|string, roles: *[]|string[]}}
     */
    toJSON() {
        return {audience: this.audience, subject: this.subject, issuer: this.issuer, issued: this.issued.format(),
                expires: this.expires.format(), roles: this.roles};
    }

    /**
     * @brief Returns the framework version of this claims token.
     *
     * @returns {string} the framework version of this claims token.
     */
    get version() {
        return this._version;
    }

    /**
     * @brief
     *
     * @param {string[]} headers
     */
    setAuthorizationHeader(headers) {
        if(typeof headers !== "undefined" && headers != null)
            headers["Authorization"] = "Bearer " + this.token;
    }

    /**
     * @brief
     *
     * @param {_XCLAToken|ClaimsToken} source
     *
     * @returns {ClaimsToken}
     */
    static copy(source) {
        if(typeof source === "undefined" || source == null)
            throw CelastrinaValidationError.newValidationError("Source is required.", "ClaimsToken.copy.source");

        let claims = new ClaimsToken(source);

        // Deep copy the objects and arrays.
        claims.issued   = moment(source.issued);
        claims.expires  = moment(source.expires);

        return claims;
    }

    /**
     * @brief
     *
     * @param {{null | {payload: string, signature: MSFIDOSignature | ArrayBuffer | string, header: *} | _XCLAToken} source
     * @param {string} claim
     *
     * @returns {ClaimsToken}
     *
     * @private
     */
    static _create(source, claim) {
        /** @type {_ClaimsPayload} */
        let xclatoken = {
            issued:   moment.unix(source.iat),
            expires:  moment.unix(source.exp),
            audience: source.aud,
            subject:  source.sub,
            issuer:   source.iss,
            token:    claim
        };

        return new ClaimsToken(xclatoken);
    }

    /**
     * @brief Decodes a JWT token and records the claims values.
     *
     * @description This framework does not validate the signature of the token. Signature validation should be done by
     *              an API Manager, in Microsoft Azure's case, at least API Management.
     *
     * @param {string} bearerToken The bearer token from the request.
     *
     * @returns {ClaimsToken} A ClaimsToken representing the decoded claims from the JWT toke.
     */
    static parse(bearerToken) {
        /**@type {null | {payload: string, signature: MSFIDOSignature | ArrayBuffer | string, header: *} | _XCLAToken} */
        let source = jwt.decode(bearerToken, {complete: false});
        return ClaimsToken._create(source, bearerToken);
    }
}

/**
 * @brief Base class for matching authorization requests.
 *
 * @author Robert R Murrell
 */
class AuthorizationMatch {
    constructor() {};

    /**
     * @brief Compares the assertion to the authorizations an determines if the match according to the rules.
     *
     * @description Implementors, override this method an specify your own rules. The default in the class is to err on
     *              the side of caution an never match, always returning <code>false</code>.
     *
     * @param {string[]} assertion The role or subject the requester is asserting they are.
     * @param {string[]} authorizations The roles or subjects the assertion must match against to be considered a match
     *                   for this rule.
     *
     * @return {boolean} <code>True</code> if the assertion matches the rules, <code>false</code> otherwise.
     */
    match(assertion, authorizations) {
        return false;
    }
}

/**
 * @brief Matching scheme to ensure an assertion matches any of the authorizations specified.
 *
 * @author Robert R Murrell
 */
class MatchAny  extends AuthorizationMatch {
    constructor() {super()};

    /**
     * @brief Asserts <code>true</code> if the assertion matches any of the authorizations.
     *
     * @param {string[]} assertion The role or subject the requester is asserting they are.
     * @param {string[]} authorizations The roles or subjects the assertion must match against to be considered a match
     *                   for this rule.
     *
     * @return {boolean} <code>True</code> if the assertion matches any authorizations, <code>false</code> otherwise.
     */
    match(assertion, authorizations) {
        for(const index in assertion) {
            if(authorizations.includes(assertion[index]))
                return true;
        }
        return false;
    }
}

/**
 * @brief Matching scheme to ensure an assertion matches all of the authorizations specified.
 *
 * @author Robert R Murrell
 */
class MatchAll extends AuthorizationMatch {
    constructor() {super()};

    /**
     * @brief Asserts <code>true</code> if the assertion matches all of the authorizations.
     *
     * @param {string[]} assertion The role or subject the requester is asserting they are.
     * @param {string[]} authorizations The roles or subjects the assertion must match against to be considered a match
     *                   for this rule.
     *
     * @return {boolean} <code>True</code> if the assertion matches all authorizations, <code>false</code> otherwise.
     */
    match(assertion, authorizations) {
        for(const index in assertion) {
            if(!authorizations.includes(assertion[index]))
                return false;
        }
        return true;
    }
}

/**
 * @brief Matching scheme to ensure an assertion matches none of the authorizations specified.
 *
 * @author Robert R Murrell
 */
class MatchNone extends AuthorizationMatch {
    constructor() {super()};

    /**
     * @brief Asserts <code>true</code> if the assertion matches none of the authorizations.
     *
     * @param {string[]} assertion The role or subject the requester is asserting they are.
     * @param {string[]} authorizations The roles or subjects the assertion must match against to be considered a match
     *                   for this rule.
     *
     * @return {boolean} <code>True</code> if the assertion matches none of the authorizations, <code>false</code>
     *                   otherwise.
     */
    match(assertion, authorizations) {
        for(const index in assertion) {
            if(authorizations.includes(assertion[index]))
                return false;
        }
        return true;
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{roles: string[], matcher: null|AuthorizationMatch}}
 */
class AuthorizationQuery {
    /**
     * @brief
     *
     * @param {string[]} roles
     * @param {number|MATCH_TYPE.AUTHORIZATION} [match]
     */
    constructor(roles, match = MATCH_TYPE.AUTHORIZATION.MATCH_NONE) {
        this.roles   = roles;
        this.matcher = null;

        switch(match) {
            case MATCH_TYPE.AUTHORIZATION.MATCH_ANY:
                this.matcher = new MatchAny();
                break;
            case MATCH_TYPE.AUTHORIZATION.MATCH_ALL:
                this.matcher = new MatchAll();
                break;
            case MATCH_TYPE.AUTHORIZATION.MATCH_NONE:
                this.matcher = new MatchNone();
                break;
            default: // Be as restrictive if not declarative.
                throw CelastrinaError.newError("Invalid Authorization Match configuration.");
        }
    }

    /**
     * @brief
     *
     * @param {string[]} assertion
     *
     * @returns {boolean}
     */
    match(assertion) {
        return this.matcher.match(assertion, this.roles);
    }
}

/**
 * @brief Represents the issuer of a claim.
 *
 * @description <p>This class is used to match issuers from the JWT token and escalate to roles within your application.
 *              This is useful to distinguish between a user from an Microsoft Azure B2C tenant and a managed identity
 *              from a platform service such as the API Management Gateway or an Azure Function.</p>
 *
 *              <p>This allows your application to provide different responses based on who you are, or taking
 *              different actions if it is a user vs. an internal system function.</p>
 *
 * @author Robert R Murrell
 *
 * @type {{name: null|string, [issuer]: null|string, [audience]: null|string, match: number|MATCH_TYPE.AUTHORIZATION,
 *         query: null|AuthorizationQuery, [subjects]: string[], [roles]: string[]}}
 */
class Issuer {
    /**
     * @brief
     *
     * @param {Object|Issuer} source
     */
    constructor(source) {
        this.name     = null;
        this.issuer   = null;
        this.audience = null;
        this.match    = MATCH_TYPE.AUTHORIZATION.MATCH_NONE; // Heavily restrictive when lightly declarative.
        this.query    = null;
        this.subjects = null;
        this.roles    = null;
        Object.assign(this, source);
        
        this.matchSubjects = false;
        this.escalateRoles = false;
        
        // Checking the configs.
        if(typeof this.name !== "string" || this.name.trim().length === 0)
            throw CelastrinaError.newError("Invalid name for issuer.");
        if(typeof this.issuer !== "string" || this.issuer.trim().length === 0)
            throw CelastrinaError.newError("Invalid issuer name for issuer " + this.name + ".");
        if(typeof this.audience !== "string" || this.audience.trim().length === 0)
            throw CelastrinaError.newError("Invalid audience name for issuer " + this.name + ".");

        // Ensure subject integrity if specified
        if(typeof this.subjects !== "undefined" && this.subjects != null) {
            // Subjects were specified. Ensure its an array.
            if((this.matchSubjects = Array.isArray(this.subjects)))
                this.query = new AuthorizationQuery(this.subjects, this.match);
            else
                throw CelastrinaError.newError("Invalid subjects for Issuer '" + this.name + "'.");
        }
        
        // Ensure role integrity if specified.
        if(typeof this.roles !== "undefined" && this.roles != null) {
            if(!(this.escalateRoles = Array.isArray(this.roles)))
                throw CelastrinaError.newError("Invalid roles for issuer '" + this.name + "'.");
        }
    }

    /**
     * @brief Checks to see if this issuer configuration is the issuer of the JWT token.
     *
     * @description
     *
     * @param {ClaimsToken} claims The claims token representing the claims from JWT.
     *
     * @return boolean
     */
    isIssuer(claims) {
        let issuer = (claims.issuer === this.issuer && claims.audience === this.audience);
        if(issuer && (this.matchSubjects))
            return this.query.match([claims.subject]);
        return issuer;
    }

    /**
     * @brief Checks to see if this issuer configuration is the issuer of the JWT token.
     *
     * @description
     *
     * @param {ClaimsToken} claims The claims token representing the claims from JWT.
     * @param {string[]} roles
     *
     * @return boolean
     */
    setRoles(claims, roles) {
        let issuer = this.isIssuer(claims);
        if(issuer && this.escalateRoles) {
            for(const index in this.roles) {
                roles.push(this.roles[index]);
            }
        }
        return issuer;
    }

    /**
     * @brief
     *
     * @param {Object|Issuer} source
     */
    static copy(source) {
        if(typeof source == "undefined" || source == null)
            throw CelastrinaError.newError("Source cannot be null.");
        let issuer = new Issuer(source);

        // Deep copy the elements for security reasons.
        issuer.roles    = JSON.parse(JSON.stringify(source.roles));
        issuer.subjects = JSON.parse(JSON.stringify(source.subjects));
        if(issuer.query != null)
            issuer.query = new AuthorizationMatch(issuer.subjects, issuer.match);

        return issuer;
    }

    /**
     * @brief Static Factory method for creating instances of Issuer.
     *
     * @param {string} name
     * @param {string} issuer
     * @param {string} audience
     * @param {number|MATCH_TYPE.AUTHORIZATION} match
     * @param {string} subject
     * @param {string[]} roles
     */
    static create(name, issuer, audience, match, subject,
                  roles) {
        let source = {
            name:     name,
            issuer:   issuer,
            audience: audience,
            match:    match,
            subject:  subject,
            roles:    roles
        };
        return Issuer.copy(source);
    }
}

/**
 * @typedef _SentryConfigCredential
 * @property {string} id
 * @property {string} secret
 */
/**
 * @typedef _SentryConfigApplication
 * @property {string} authority
 * @property {string} tenant
 * @property {_SentryConfigCredential} credentials
 */
/**
 * @typedef _SentryConfigCrypto
 * @property {string} key
 * @property {string} iv
 */
/**
 * @typedef _SentryConfigMSI
 * @property {string} endpoint
 * @property {string} secret
 */
/**
 * @typedef _SentryConfig
 * @property {_SentryConfigApplication} application
 * @property {_SentryConfigCrypto} crypto
 * @property {string[]} roles
 * @property {{user: Issuer, system: Issuer}} issuers
 * @property {boolean} useApplicationClaims
 */

/**
 * @brief
 *
 * @type {{authority: string, tenant: string, roles: string[]}}
 */
class SentryConfig {
    /**
     * @brief
     *
     * @param {string} config
     * @param {null|string} [msi_endpoint]
     * @param {null|string} [msi_secret]
     */
    constructor(config, msi_endpoint = null, msi_secret = null) {
        /**@type {_SentryConfig}*/
        let _config = JSON.parse(config);
        
        /** @type {_SentryConfigApplication} */
        this.application = _config.application;
        /** @type {_SentryConfigCrypto} */
        this.crypto      = _config.crypto;
        this.roles       = _config.roles;
        /** @type {Issuer[]} */
        this.issuers     = [];
        /** @type {boolean} */
        this.useApplicationClaims = _config.useApplicationClaims;
        /** @type {_SentryConfigMSI} */
        this.msi         = {endpoint: msi_endpoint, secret: msi_secret};
        
        // Create the issuer objects.
        for(const index in _config.issuers) {
            this.issuers.push(new Issuer(_config.issuers[index]));
        }
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{config: SentryConfig, claim: null|ClaimsToken, appTokens: Object, managedTokens: Object}}
 */
class Sentry {
    /**
     * @brief
     *
     * @param {SentryConfig} config
     */
    constructor(config) {
        if(!(config instanceof SentryConfig))
            throw CelastrinaError.newError("Not authorized.", 401);
        /** @type {null|ClaimsToken} */
        this.claims        = null;
        this.appTokens     = {};
        this.managedTokens = {};
        this.config        = config;
        this.roles         = []; // Not part of the claim but will be built by your application.
    }

    /**
     * @brief
     *
     * @param {string} bearerToken
     *
     * @returns {Promise<void>}
     */
    async authenticate(bearerToken) {
        return new Promise(
            (resolve, reject) => {
                if(typeof bearerToken === "undefined" || bearerToken == null || !bearerToken.trim())
                    reject(CelastrinaError.newError("Not authorized.", 401));
                else {
                    this.claims  = ClaimsToken.parse(bearerToken);
                    let now = moment();
                    if(now.isSameOrAfter(this.claims.expires))
                        reject(CelastrinaError.newError("Not Authorized. Token expired.", 401));
                    else {
                        let issuers = this.config.issuers;
                        let matched = false;
                        for(const index in issuers) {
                           /** @type Issuer */
                           if(issuers[index].setRoles(this.claims, this.roles) && !matched)
                                matched = true;
                        }

                        if(matched)
                            resolve();
                        else
                            reject(CelastrinaError.newError("Forbidden.", 403));
                    }
                }
            });
    }

    /**
     * @brief Decrypts an application specific claims object.
     *
     * @param {string} claims The claims to decrypt. Typically a cookie shared with this domain.
     *
     * @returns {Promise<Object>} The application specific claims object.
     */
    async loadApplicationClaims(claims) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if(typeof claims !== "undefined" && claims != null) {
                        let iv        = new Buffer(this.config.crypto.iv);
                        let ivstring  = iv.toString("hex");
                        let cipher    = Buffer.from(claims, "base64").toString("hex");
                        let key       = crypto.createHash("sha256").update(this.config.crypto.key).digest();
                        let decipher  = crypto.createDecipheriv("aes256", key, ivstring);
                        let decrypted = decipher.update(cipher, "hex", "utf8");
                        decrypted += decipher.final("utf8");
                        resolve(decrypted);
                    }
                    else
                        reject(CelastrinaError.newError("Invalid application claims."));
                }
                catch (exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Encrypts an application specific claims object.
     *
     * @param {Object} claims The application specific claims object to encrypt.
     *
     * @returns {Promise<string>} Base64 encoded encrypted claims object.
     */
    async createApplicationClaims(claims) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if(typeof claims !== "undefined" && claims != null) {
                        let iv        = new Buffer(this.config.crypto.iv);
                        let ivstring  = iv.toString("hex");
                        let key       = crypto.createHash("sha256").update(this.config.crypto.key).digest();
                        let cipher    = crypto.createCipheriv("aes256", key, ivstring);
                        let encrypted = cipher.update(JSON.stringify(claims), "utf8", "hex");
                        encrypted += cipher.final("hex");
                        resolve(Buffer.from(encrypted, "hex").toString("base64"));
                    }
                    else
                        reject(CelastrinaError.newError("Invalid application claims."));
                }
                catch (exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Registers an application resource.
     *
     * @description <p>An application resources registration is the resource-based bearer token from a AZAD Domain
     *              registered application. Use the client ID (Application ID), AZAD tenant (domain name), and a
     *              resource ID (URL to a resource) will create a bearer token. Add that token to any REST API call
     *              when an app resources has been granted access.</p>
     *
     *              <p>This method uses the application authority,tenant, id, and secret from the {SentryConfig}
     *              object to create application resources.</p>
     *
     *              <p>Sentry also uses Microsoft adal-node to generate the token.</p>
     *
     * @param {string} resource The name of the resource.
     *
     * @returns {Promise<void>}
     *
     * @see SentryConfig
     */
    async registerAppResource(resource) {
        return new Promise(
            (resolve, reject) => {
                let adContext = new AuthenticationContext(this.config.application.authority + "/" +
                                                          this.config.application.tenant);
                adContext.acquireTokenWithClientCredentials(resource, this.config.application.credentials.id,
                                                            this.config.application.secret,
                    (err, response) => {
                        if(err)
                            reject(CelastrinaError.newError("Not authorized.", 401));
                        else {
                            this.appTokens[resource] = response;
                            resolve();
                        }
                    });
        });
    }

    /**
     * @brief Creates a resource authorization from a managed identity.
     *
     * @description For this function to work properly your azure function must have managed identities enabled.
     *
     * @param {string} resource
     * @param {string} endpoint
     * @param {string} secret
     *
     * @returns {Promise<void>}
     */
    async registerManagedResource(resource, endpoint, secret) {
        return new Promise(
            (resolve, reject) => {
                let params = new URLSearchParams();
                params.append("resource", resource);
                params.append("api-version", "2017-09-01");
                let config = {params: params,
                              headers: {"secret": this.config.msi.secret}};
                axios.get(this.config.msi.endpoint, config)
                    .then((/**@type {_AxiosResponse}*/response) => {
                        this.managedTokens[resource] = response.data;
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }

    /**
     * @brief
     *
     * @param {string} resource
     * @param {{}} headers
     */
    setAppResourceAuthorization(resource, headers) {
        /**@type {TokenResponse}*/
        let tokenObject = this.appTokens[resource];

        if(typeof tokenObject === "undefined" )
            throw CelastrinaError.newError("Not Authorized.", 401);
        else
            if(tokenObject.tokenType === "Bearer") {
                let now = moment();
                let exp = moment(tokenObject.expiresOn);

                if(now.isSameOrAfter(exp))
                    throw CelastrinaError.newError("Not Authorized.", 401);

                headers["Authorization"] = "Bearer " + tokenObject.accessToken;
            }
            else
                throw CelastrinaError.newError("Token type " + tokenObject.tokenType + " not supported.");
    }

    /**
     * @brief
     *
     * @param {string} resource
     * @param {{}} headers
     */
    setManagedResourceAuthorization(resource, headers) {
        /**@type {_ManagedResourceToken}*/
        let tokenObject = this.managedTokens[resource];

        if(typeof tokenObject === "undefined")
            throw CelastrinaError.newError("Not Authorized.", 401);
        else
        if(tokenObject.token_type === "Bearer") {
            let now = moment();
            let exp = moment(tokenObject.expires_on);

            if(now.isSameOrAfter(exp))
                throw CelastrinaError.newError("Not Authorized.", 401);

            headers["Authorization"] = "Bearer " + tokenObject.access_token;
        }
        else
            throw CelastrinaError.newError("Token type " + tokenObject.token_type + " not supported.");
    }

    /**
     * @brief
     *
     * @param {{}} headers
     */
    setUserAuthorization(headers) {
        headers["Authorization"] = "Bearer " + this.claims.token;
    }

    /**
     * @brief
     *
     * @param {MATCH_TYPE.OVERRIDE} override
     *
     * @returns {boolean}
     */
    isAuthorizedByOverride(override= MATCH_TYPE.OVERRIDE.OVERRIDE_NONE) {
        try {
            if(override !== MATCH_TYPE.OVERRIDE.OVERRIDE_NONE) {
                let query = new AuthorizationQuery(this.config.roles, MATCH_TYPE.AUTHORIZATION.MATCH_ANY);
                return query.match(this.roles);
            }
            else
                return false;
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception, 403);
        }
    }

    /**
     * @brief Checks to see if the User ID in the token matches the User ID in parameter <code>uid</code>.
     *
     * @param {AuthorizationQuery} query The User ID to test against the token object.
     *
     * @returns {boolean} True if authorized by user ID or override role, false if not.
     */
    isAuthorizedBySubject(query) {
        try {
            return query.match([this.claims.subject]);
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception, 403);
        }
    }

    /**
     * @brief Checks to see if the User is in the role specified by <code>roleQuery</code> by comparing the roles
     *        in the token.
     *
     * This method invokes the <code>authorize</code> function of the Role Match class specified.
     *
     * @param {AuthorizationQuery} query The matching scheme and roles to match.
     *
     * @returns {boolean} True if authorized by role or override role, false if not.
     */
    isAuthorizedByRole(query) {
        try {
            return query.match(this.roles);
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception, 403);
        }
    }

    /**
     * @brief Checks to see if the asserted user ID and roles match the token user ID and roles in accordance to the
     *        <code>SubjectQuery</code> and <code>RoleQuery</code> matching schemes.
     *
     * If an override is specified in the <code>override</code> parameter, then the user is first checked for role
     * match in accordance with the override scheme specified. If the user matched the override scheme, then the user ID
     * check is skipped and returns true, otherwise, the user ID and role checks are made in accordance to the
     * <code>objectQuery</code> and <code>roleQuery</code> parameters schemes.
     *
     * @param {AuthorizationQuery} subjectQuery The use ID and scheme to match.
     * @param {AuthorizationQuery} roleQuery The roles and schemes to match.
     *
     * @return {boolean} True if authorized by user id and role, or override role, false if not.
     */
    isAuthorizedBySubjectAndRole(subjectQuery, roleQuery) {
        try {
            if(this.isAuthorizedByRole(roleQuery))
                return this.isAuthorizedBySubject(subjectQuery);
            else
                return false;
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception, 403);
        }
    }

    /**
     * @brief Promise based version of <code>isAuthorizedByUserIdAndRole</code>.
     *
     * @param {AuthorizationQuery} subjectQuery The use ID and scheme to match.
     * @param {AuthorizationQuery} roleQuery The roles and schemes to match.
     *
     * @returns {Promise<boolean>}
     */
    async authorize(subjectQuery, roleQuery) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(this.isAuthorizedBySubjectAndRole(subjectQuery, roleQuery));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Promise based version of <code>isAuthorizedByRole</code>.
     *
     * @param {AuthorizationQuery} query The roles and schemes to match.
     *
     * @returns {Promise<boolean>}
     */
    async authorizeByRole(query) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(this.isAuthorizedByRole(query));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Promise based version of <code>isAuthorizedByUserId</code>.
     *
     * @param {AuthorizationQuery} query The use ID and scheme to match.
     *
     * @returns {Promise<boolean>}
     */
    async authorizeBySubject(query) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(this.isAuthorizedBySubject(query));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}

/**
 * @brief Allows anyone with a valid claim to perform a task.
 *
 * @description This group allows overrides for ADMIN or SYSTEM roles as well.
 *
 * @author Robert R Murrell
 */
class AuthorizationGroup {
    constructor() {}

    /**
     * @brief
     *
     * @param {Sentry} sentry
     *
     * @return {Promise<boolean>}
     */
    async authorize(sentry) {
        return new Promise((resolve, reject) => {
            try {
                if(typeof sentry !== "undefined") {
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
 * @brief Allows any authenticated request to be processed.
 *
 * @description <strong>WARNING</strong>: This class uses {Sentry} which <strong>DOES NOT</strong> validate the JWT
 *              token signature. All secure services <strong>MUST</strong> be protected by an APIM Gateway that will
 *              validate the token prior to invoking this function.
 *
 * @author Robert R Murrell
 */
class AuthenticatedJSONFunction extends JSONHTTPFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     */
    constructor(config = null) {
        super(config);
    }

    /**
     * @brief Overridden to initialize the sentry object. This is done so that its available during initialization to
     *        add any additional roles, issuers, etc prior to authentication or authorization.
     *
     * @param {_SecureContext & JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async bootstrap(context) {
        return new Promise(
            (resolve, reject) => {
                super.bootstrap(context)// Call super per the JS DOC.
                    .then(() => {
                        return Promise.all([context.getSecureEnvironmentProperty("CLA-SENTRY-CONFIG"),
                                                   context.getEnvironmentProperty("MSI_ENDPOINT"),
                                                   context.getEnvironmentProperty("MSI_SECRET")]);
                    })
                    .then((resolved) => {
                        context.sentry = new Sentry(new SentryConfig(resolved[0], resolved[1], resolved[2]));
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }

    /**
     * @brief Retrieves the application token for decryption.
     *
     * @param {_SecureContext & JSONHTTPContext} context
     *
     * @returns {Promise<null|string>} <code>null</code> or the encrypted application specific token
     */
    async getApplicationToken(context) {
        return new Promise(
            (resolve) => {
                resolve(null);
            });
    }
    
    /**
     * @brief
     *
     * @param {_SecureContext & JSONHTTPContext} context
     * @param {Object} token
     *
     * @returns {Promise<boolean>}
     */
    async authenticateApplicationToken(context, token) {
        return new Promise(
            (resolve) => {
                resolve(false);
            });
    }
    
    /**
     * @brief
     *
     * @param {_SecureContext & JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async authenticate(context) {
        return new Promise(
            (resolve, reject) => {
                context.log("Authenticating request.", LOG_LEVEL.LEVEL_INFO,
                            "AuthenticatedJSONFunction.authenticate(context)");
                try {
                    let bearer = context.getRequestHeader("authorization");
                    if(typeof bearer !== "string")
                        reject(CelastrinaError.newError("Not Authorized.", 401));
                    else {
                        // Cutting off "Bearer "
                        bearer = bearer.slice(7).trim();
                        context.sentry.authenticate(bearer)
                            .then(() => {
                                // Sentry requires a token that is decode-able so, if it can be decoded by jsonwebtoken
                                // the we assume you are authenticated.
                                // WARNING: Sentry does NOT validate the token signature. Validation should be done
                                //          further up the architecture like in the APIM.
                                context.log("Request authenticated by JWT.", LOG_LEVEL.LEVEL_INFO,
                                    "AuthenticatedJSONFunction.authenticate(context)");
                                
                                // Checking to see if there is an encrypted token
                                if(context.sentry.config.useApplicationClaims) {
                                    this.getApplicationToken(context)
                                        .then((encrypted) => {
                                            return context.sentry.loadApplicationClaims(encrypted);
                                        })
                                        .then((resolved) => {
                                            return this.authenticateApplicationToken(context, resolved);
                                        })
                                        .then((resolved) => {
                                            if(resolved)
                                                resolve();
                                            else
                                                reject(CelastrinaError.newError("Not Authorized.", 401));
                                        })
                                        .catch((exception) => {
                                            reject(exception);
                                        });
                                }
                                else
                                    resolve();
                            })
                            .catch((exception) => {
                                reject(exception);
                            });
                    }
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}

/**
 * @brief Allows any Authorized request to processed.
 *
 * @description <p>Asserts the roles specified against the extension roles in the JWT token. <strong>WARNING:</strong> This
 *              class <strong>DOES NOT</strong> validate the JWT token. All secure services <strong>MUST</strong> be
 *              protected by an APIM Gateway that will validate the token prior to invoking this function.</p>
 *
 *              <p>This class defaults to AuthorizationGroup if no group is specified. This allows anyone with a
 *              valid JWT token to perform this task.</p>
 *
 * @author Robert R Murrell
 */
class AuthorizedJSONFunction extends AuthenticatedJSONFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     * @param {AuthorizationGroup} [group]
     */
    constructor(config, group = new AuthorizationGroup()) {
        super(config);
        this._group = group;
    }

    /**
     * @brief
     *
     * @returns {AuthorizationGroup}
     */
    get group() {
        return this._group;
    }

    /**
     * @brief
     *
     * @param {_SecureContext & JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async authorize(context) {
        return new Promise((resolve, reject) => {
            context.log("Authorizing request.", LOG_LEVEL.LEVEL_INFO,
                        "AuthorizedJSONFunction.authenticate(context)");
            context.overridden = false;
            // Checking to see if we've been overridden...
            if(context.sentry.isAuthorizedByOverride(MATCH_TYPE.OVERRIDE.OVERRIDE_IF_SYSTEM)) {
                context.log("Request authorized by override.", LOG_LEVEL.LEVEL_TRACE,
                            "AuthorizedJSONFunction.authenticate(context)");
                context.overridden = true;
                resolve();
            }
            else {
                this._group.authorize(context.sentry)
                    .then((resolved) => {
                        if(resolved) {
                            context.log("Request authorized by role.", LOG_LEVEL.LEVEL_INFO,
                                "AuthorizedJSONFunction.authenticate(context)");
                            context.log("Authorization successful.", LOG_LEVEL.LEVEL_INFO,
                                "AuthorizedJSONFunction.authenticate(context)");
                            resolve();
                        }
                        else
                            reject(CelastrinaError.newError("Forbidden.", 403));
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
        });
    }
}

module.exports = {
    ClaimsToken:               ClaimsToken,
    SentryConfig:              SentryConfig,
    Sentry:                    Sentry,
    MATCH_TYPE:                MATCH_TYPE,
    AuthorizationMatch:        AuthorizationMatch,
    MatchAny:                  MatchAny,
    MatchAll:                  MatchAll,
    MatchNone:                 MatchNone,
    AuthorizationQuery:        AuthorizationQuery,
    Issuer:                    Issuer,
    AuthorizationGroup:        AuthorizationGroup,
    AuthorizedJSONFunction:    AuthorizedJSONFunction,
    AuthenticatedJSONFunction: AuthenticatedJSONFunction
};