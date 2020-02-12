/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const moment = require("moment");
const jwt    = require("jsonwebtoken");
const crypto = require('crypto');
const axios  = require("axios").default;

const {TokenResponse, AuthenticationContext} = require("adal-node");
const {CelastrinaError, CelastrinaValidationError} = require("CelastrinaError");
const {LOG_LEVEL, JSONHTTPContext, JSONHTTPFunction} = require("HTTPFunction");

/**
 * @typedef _ApplicationClaim
 * @property {null|undefined|string} [accountId]
 * @property {null|undefined|string} [profileId]
 * @property {null|undefined|string} [franchiseId]
 * @property {string[]} [roles]
 */
/**
 * @typedef _XCLAToken
 * @property {string} aud
 * @property {string} sub
 * @property {string} oid
 * @property {string} iss
 * @property {string} given_name
 * @property {string} family_name
 * @property {string} country
 * @property {string} postalCode
 * @property {number} auth_time
 * @property {number} iat
 * @property {number} exp
 * @property {string[]} emails
 * @property {boolean} [newUser]
 * @property {string} [applicationId]
 */
/**
 * @typedef _ClaimsPayload
 * @property {string} objectId
 * @property {null|undefined|string} [accountId]
 * @property {null|undefined|string} [profileId]
 * @property {null|undefined|string} [franchiseId]
 * @property {null|undefined|ClaimName} [name]
 * @property {null|undefined|ClaimLocation} [location]
 * @property {moment.Moment} issued
 * @property {moment.Moment} expires
 * @property {string[]} [roles]
 * @property {null|undefined|string[]} [emails]
 * @property {null|undefined|boolean} [newUser]
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
 * @typedef _AxiosData
 * @property {string} access_token
 */
/**
 * @typedef {AxiosResponse<T>} _AxiosResponse
 * @property {_AxiosData} data
 */
/**
 * @typedef _ManagedToken
 * @property {string} access_token
 * @property {string} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */
/**
 * @brief Enumeration types for handling role matching roles, user ID matching rules, and system role overrides.
 *
 * @type {{OVERRIDE: {OVERRIDE_IF_ADMIN: string, OVERRIDE_NONE: string, OVERRIDE_IF_EMPLOYEE: string,
 *        OVERRIDE_IF_ADMIN_OR_SYSTEM: string, OVERRIDE_IF_INTERNAL: string, OVERRIDE_IF_SYSTEM: string},
 *        ROLE_MATCH: {ROLE_ANY: string, ROLE_ALL: string, ROLE_NONE: string}, USER_MATCH: {UID_EQUAL: string,
 *        UID_NOTEQUAL: string}}}
 */
const MATCH_TYPE = {
    ROLE_MATCH: {
        ROLE_ANY:  "role.match.any",
        ROLE_ALL:  "role.match.all",
        ROLE_NONE: "role.match.none"
    },
    USER_MATCH: {
        UID_EQUAL:    "object.match.equal",
        UID_NOTEQUAL: "object.match.notEqual"
    },
    OVERRIDE: {
        OVERRIDE_NONE:               "override.none",
        OVERRIDE_IF_ADMIN:           "override.ifAdmin",
        OVERRIDE_IF_SYSTEM:          "override.ifSystem",
        OVERRIDE_IF_EMPLOYEE:        "override.ifEmployee",
        OVERRIDE_IF_ADMIN_OR_SYSTEM: "override.ifAdminOrSystem",
        OVERRIDE_IF_INTERNAL:        "override.ifAdminOrSystemOrEmployee" // Admin, System, or Employee
    }
};

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{country: string, postalCode: string}}
 */
class ClaimLocation {
    /**
     * @brief
     *
     * @param {string} country
     * @param {string} postalCode
     */
    constructor(country, postalCode) {
        this.county     = country;
        this.postalCode = postalCode;
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{given: string, sur: string}}
 */
class ClaimName {
    /**
     * @brief
     *
     * @param {string} given
     * @param {string} sur
     */
    constructor(given, sur) {
        this.given = given;
        this.sur   = sur;
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{audience: string, subject: string, application: string, objectId: string, accountId: string, profileId: string, franchiseId: string,
 *         authorized: moment.Moment, issued: moment.Moment, expires: moment.Moment, roles: string[], emails: string[],
 *         name: ClaimName}}
 */
class ClaimsToken {
    constructor(source) {
        this._version    = "1.0";
        this.audience    = null;
        this.subject     = null;
        this.issuer      = null;
        this.token       = null;
        this.objectId    = null;
        this.accountId   = null;
        this.profileId   = null;
        this.franchiseId = null;
        this.issued      = null;
        this.expires     = null;
        this.name        = null;
        this.location    = null;
        this.roles       = [];
        this.emails      = [];
        this.newUser     = false;
        Object.assign(this, source);
    }

    toJSON() {
        return {objectId: this.objectId, accountId: this.accountId, profileId: this.profileId,
                franchiseId: this.franchiseId, issued: this.issued.format(), expires: this.expires.format(),
                name: this.name, location: this.location, roles: this.roles, emails: this.emails, newUser: this.newUser};
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get version() {
        return this._version;
    }

    /**
     * @brief Gets the first email in the array.
     *
     * @returns {string}
     */
    get email() {
        return this.emails[0];
    }

    /**
     * @brief
     *
     * @returns {boolean}
     */
    get isNewUser() {
        return this.newUser;
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
        claims.name     = new ClaimName(source.name.given, source.name.sur);
        claims.location = new ClaimLocation(source.location.country, source.location.postalCode);
        claims.roles    = JSON.parse(JSON.stringify(source.roles));
        claims.emails   = JSON.parse(JSON.stringify(source.emails));

        return claims;
    }

    /**
     * @brief
     *
     * @param {{null | {payload: string, signature: MSFIDOSignature | ArrayBuffer | string, header: *} | _XCLAToken} source
     * @param {string} claim
     * @returns {ClaimsToken}
     *
     * @private
     */
    static _create(source, claim) {
        /** @type {_ClaimsPayload} */
        let xclatoken = {
            objectId: source.oid,
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
     * @brief
     *
     * @param {string} bearerToken
     *
     * @returns {ClaimsToken}
     */
    static parse(bearerToken) {
        /**@type {null | {payload: string, signature: MSFIDOSignature | ArrayBuffer | string, header: *} | _XCLAToken} */
        let source = jwt.decode(bearerToken, {complete: false});
        return ClaimsToken._create(source, bearerToken);
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class RoleMatch {
    constructor() {};

    /**
     * @brief
     *
     * @param {string[]} assertion The roles of the user.
     * @param {string[]} roles The roles required to authorize.
     *
     * @return {boolean}
     */
    authorize(assertion, roles) {
        return false;
    }
}

/**
 * @brief Matching Scheme for matching any roles specified.
 *
 * @author Robert R Murrell
 */
class RoleMatchAny  extends RoleMatch {
    constructor() {super()};

    /**
     * @brief
     *
     * @param {string[]} assertion The roles of the user.
     * @param {string[]} roles The roles required to authorize.
     *
     * @return {boolean}
     */
    authorize(assertion, roles) {
        for(const index in assertion) {
            if(roles.includes(assertion[index]))
                return true;
        }
        return false;
    }
}

/**
 * @brief Matching Scheme for matching all roles specified.
 *
 * @author Robert R Murrell
 */
class RoleMatchAll extends RoleMatch {
    constructor() {super()};

    /**
     * @brief
     *
     * @param {string[]} assertion The roles of the user.
     * @param {string[]} roles The roles required to authorize.
     *
     * @return {boolean}
     */
    authorize(assertion, roles) {
        for(const index in assertion) {
            if(!roles.includes(assertion[index]))
                return false;
        }
        return true;
    }
}

/**
 * @brief Matching Scheme for matching no roles specified.
 *
 * @author Robert R Murrell
 */
class RoleMatchNone extends RoleMatch {
    constructor() {super()};

    /**
     * @brief
     *
     * @param {string[]} assertion The roles of the user.
     * @param {string[]} roles The roles required to authorize.
     *
     * @return {boolean}
     */
    authorize(assertion, roles) {
        for(const index in assertion) {
            if(roles.includes(assertion[index]))
                return false;
        }
        return true;
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class RoleQuery {
    /**
     * @brief
     *
     * @param {string[]} roles
     * @param {MATCH_TYPE.ROLE_MATCH} [match]
     */
    constructor(roles, match = MATCH_TYPE.ROLE_MATCH.ROLE_ALL) {
        this.roles   = roles;
        this.matcher = null;

        switch(match) {
            case MATCH_TYPE.ROLE_MATCH.ROLE_ANY:
                this.matcher = new RoleMatchAny();
                break;
            case MATCH_TYPE.ROLE_MATCH.ROLE_NONE:
                this.matcher = new RoleMatchNone();
                break;
            default: // ROLE_MATCH.MATCH_ALL: Be as restrictive as possible if not declarative enough.
                this.matcher = new RoleMatchAll();
                break;
        }
    }

    /**
     *
     * @param {string[]} assertion
     *
     * @returns {boolean}
     */
    authorize(assertion) {
        return this.matcher.authorize(assertion, this.roles);
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class ObjectQuery {
    /**
     * @brief
     *
     * @param {string} objectId
     * @param {MATCH_TYPE.USER_MATCH} [match]
     */
    constructor(objectId, match = MATCH_TYPE.USER_MATCH.UID_EQUAL) {
        this.objectId = objectId;
        this.match    = match;
    }

    /**
     * @brief
     *
     * @param {string} assertion
     *
     * @returns {boolean}
     */
    authorize(assertion) {
        let matched = assertion === this.objectId;
        if(this.match === MATCH_TYPE.USER_MATCH.UID_EQUAL)
            return matched;
        else
            return !matched;
    }
}

/**
 * @brief
 *
 * @type {{admin: string, employee: string, system: string}}
 */
class SystemRoles {
    /**
     * @brief
     *
     * @param {string[]} roles
     */
    constructor(roles) {
        this._admin    = roles[0];
        this._system   = roles[1];
        this._employee = roles[2];
    }

    /**
     * @brief
     *
     * @returns {string[]}
     */
    getRoles() {
        return [this._admin, this._system, this._employee];
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get admin() {
        return this._admin;
    }

    /**
     *
     * @returns {null|string}
     */
    get system() {
        return this._system;
    }

    /**
     *
     * @returns {string}
     */
    get employee() {
        return this._employee;
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{issuer: string, audience: string, escalate: boolean, claims: {subjects: [string]}}}
 */
class Issuer {
    constructor(source) {
        this.issuer   = null;
        this.audience = null;
        this.claims   = [];
        this.roles    = [];
        Object.assign(this, source);
    }

    /**
     * @brief
     *
     * @param {ClaimsToken} claims
     *
     * @return boolean
     */
    isIssuer(claims) {
        let issuer = (claims.issuer === this.issuer && claims.audience === this.audience);
        if(issuer) {
            // Check to see if there are secondary claims
            if(typeof this.claims !== "undefined" && this.claims != null && Array.isArray(this.claims)) {
                // Check if there are additional subjects.
                let subjects = this.claims.subjects;
                if (typeof subjects !== "undefined" && subjects != null && Array.isArray(subjects))
                    issuer = this._matchAny(claims.subject, subjects)
            }
        }
        return issuer;
    }

    /**
     * @brief
     *
     * @param {string} value
     * @param {string[]} claims
     * @private
     */
    _matchAny(value, claims) {
        for(const index in claims) {
            if(claims[index] === value)
                return true;
        }
        return false;
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
 * @typedef _SentryConfigClaim
 * @property {string} sub
 * @property {string} oid
 */
/**
 * @typedef _SentryConfig
 * @property {_SentryConfigApplication} application
 * @property {_SentryConfigCrypto} crypto
 * @property {string[]} system
 * @property {{user: Issuer, system: Issuer}} issuers
 */

/**
 * @brief
 *
 * @type {{authority: string, tenant: string, roles: SystemRoles}}
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
        this._application = _config.application;
        this._crypto      = _config.crypto;
        this._roles       = new SystemRoles(_config.system);
        this._msi         = {endpoint: msi_endpoint, secret: msi_secret};
        this._issuers     = [];

        // Create the issuer objects.
        for(const index in _config.issuers) {
            this._issuers.unshift(new Issuer(_config.issuers[index]));
        }
    }

    /**
     * @brief
     *
     * @returns {{authority: string, credentials: _SentryConfigCredential, tenant: string}|_SentryConfigApplication}
     */
    get application() {
        return this._application;
    }

    /**
     * @brief
     *
     * @returns {{iv: string, algorithm: string, key: string}|_SentryConfigCrypto}
     */
    get crypto() {
        return this._crypto;
    }

    /**
     * @brief
     *
     * @returns {SystemRoles}
     */
    get roles() {
        return this._roles;
    }

    /**
     * @brief
     *
     * @returns {{user: Issuer, system: Issuer}}
     */
    get issuers() {
        return this._issuers;
    }

    /**
     * @brief
     *
     * @returns {{endpoint: string, secret: string}}
     */
    get msi() {
        return this._msi;
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
        /**@type {null|ClaimsToken}*/
        this.claim         = null;
        this.appTokens     = {};
        this.managedTokens = {};
        this._config       = config;
    }

    /**
     * @brief
     *
     * @param {string} bearerToken
     *
     * @returns {Promise<void>}
     */
    async validate(bearerToken) {
        return new Promise(
            (resolve, reject) => {
                if(typeof bearerToken === "undefined" || bearerToken == null || !bearerToken.trim())
                    reject(CelastrinaError.newError("Not authorized.", 401));
                else {
                    this.claim  = ClaimsToken.parse(bearerToken);
                    let now = moment();
                    if(now.isSameOrAfter(this.claim.expires))
                        reject(CelastrinaError.newError("Not Authorized. Token expired.", 401));
                    else {
                        // Checking to see which issues match this claim.
                        let issuers = this.config.issuers;
                        let issuer  = null;
                        let matched = false;
                        // Loop through and find the correct issuer.
                        for(const index in issuers) {
                           /**@type Issuer*/
                           issuer = issuers[index];
                           if((matched = issuer.isIssuer(this.claim))) {
                               this.claim.roles = this.claim.roles.concat(issuer.roles);
                               break;
                           }
                        }

                        if(!matched)
                            reject(CelastrinaError.newError("Forbidden.", 403));
                        else
                            resolve();
                    }
                }
            });
    }

    /**
     * @brief
     *
     * @returns {SentryConfig}
     */
    get config() {
        return this._config;
    }

    /**
     * @brief Loads the application claim from the cookie and decripts it, setting the various application information.
     *
     * @description Loads the <code>cookie</code> parameter token and attempts to decrypt if. If it is
     *              successfully decrypted, the accountId, franchiseId, profileId, and roles will be set in the claim.
     *
     * @param {string} claim The claim to load. For NoDoubtShowcase, this should be from the cookie set to this domain.
     *
     * @returns {Promise<boolean>} <code>True</code> is the application specific claims was present, <code>false</code>
     *                             otherwise. An CelastrinaError will be thrown if there is an issue decrypting the application
     *                             claim.
     */
    async loadApplicationClaims(claim) {
        return new Promise(
            (resolve, reject) => {
                try {
                    if(typeof claim !== "undefined" && claim != null) {
                        let iv = new Buffer(this.config.crypto.iv);
                        let ivstring = iv.toString("hex");
                        let cipher = Buffer.from(claim, "base64").toString("hex");
                        let key = crypto.createHash("sha256").update(this.config.crypto.key).digest();
                        let decipher = crypto.createDecipheriv("aes256", key, ivstring);
                        let decrypted = decipher.update(cipher, "hex", "utf8");
                        decrypted += decipher.final("utf8");
                        resolve(decrypted);

                        /**@type {_ApplicationClaim}*/
                        let appobj = JSON.parse(decrypted);

                        this.claim.accountId = appobj.accountId;
                        this.claim.profileId = appobj.profileId;
                        this.claim.franchiseId = appobj.franchiseId;
                        this.claim.roles = this.claim.roles.concat(appobj.roles);
                    }

                    resolve();
                }
                catch (exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief
     *
     * @param {_ApplicationClaim} claims
     *
     * @returns {Promise<void>}
     */
    async createApplicationClaims(claims) {
        return new Promise(
            (resolve, reject) => {
                if(typeof claims === "undefined")
                    reject(CelastrinaValidationError.newValidationError("Claims cannot be null.", "claims"));
                else {
                    try {
                        let iv        = new Buffer(this.config.crypto.iv);
                        let ivstring  = iv.toString("hex");
                        let key       = crypto.createHash("sha256").update(this.config.crypto.key).digest();
                        let cipher    = crypto.createCipheriv("aes256", key, ivstring);
                        let encrypted = cipher.update(JSON.stringify(claims), "utf8", "hex");
                        encrypted += cipher.final("hex");
                        resolve(Buffer.from(encrypted, "hex").toString("base64"));
                    }
                    catch (exception) {
                        reject(exception);
                    }
                }
            });
    }

    /**
     * @brief
     *
     * @param {string} resource
     *
     * @returns {Promise<void>}
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
        /**@type {_ManagedToken}*/
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
        headers["Authorization"] = "Bearer " + this.claim.token;
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
            if (override !== MATCH_TYPE.OVERRIDE.OVERRIDE_NONE) {
                let overrideQuery = new RoleQuery([], MATCH_TYPE.ROLE_MATCH.ROLE_ANY);
                let sysroles      = this._config.roles;

                switch (override) {
                    case MATCH_TYPE.OVERRIDE.OVERRIDE_IF_INTERNAL:
                        overrideQuery.roles.push(sysroles.admin);
                        overrideQuery.roles.push(sysroles.employee);
                        if(sysroles.system != null)
                            overrideQuery.roles.push(sysroles.system);
                        break;
                    case MATCH_TYPE.OVERRIDE.OVERRIDE_IF_ADMIN_OR_SYSTEM:
                        overrideQuery.roles.push(sysroles.admin);
                        if(sysroles.system != null)
                            overrideQuery.roles.push(sysroles.system);
                        break;
                    case MATCH_TYPE.OVERRIDE.OVERRIDE_IF_SYSTEM:
                        if(sysroles.system != null)
                            overrideQuery.roles.push(sysroles.system);
                        break;
                    case MATCH_TYPE.OVERRIDE.OVERRIDE_IF_EMPLOYEE:
                        overrideQuery.roles.push(sysroles.employee);
                        break;
                    default: // MATCH_TYPE.USER_OVERRIDE.SKIP_ADMIN: Be as restrictive as possible if not declarative enough.
                        overrideQuery.roles.push(sysroles.admin);
                        break;
                }
                return overrideQuery.authorize(this.claim.roles);
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
     * @param {ObjectQuery} objectQuery The User ID to test against the token object.
     *
     * @returns {boolean} True if authorized by user ID or override role, false if not.
     */
    isAuthorizedByObjectId(objectQuery) {
        try {
            return objectQuery.authorize(this.claim.objectId);
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
     * @param {RoleQuery} roleQuery The matching scheme and roles to match.
     *
     * @returns {boolean} True if authorized by role or override role, false if not.
     */
    isAuthorizedByRole(roleQuery) {
        try {
            return roleQuery.authorize(this.claim.roles);
        }
        catch(exception) {
            throw CelastrinaError.wrapError(exception, 403);
        }
    }

    /**
     * @brief Checks to see if the asserted user ID and roles match the token user ID and roles in accordance to the
     *        <code>ObjectQuery</code> and <code>RoleQuery</code> matching schemes.
     *
     * If an override is specified in the <code>override</code> parameter, then the user is first checked for role
     * match in accordance with the override scheme specified. If the user matched the override scheme, then the user ID
     * check is skipped and returns true, otherwise, the user ID and role checks are made in accordance to the
     * <code>objectQuery</code> and <code>roleQuery</code> parameters schemes.
     *
     * @param {ObjectQuery} objectQuery The use ID and scheme to match.
     * @param {RoleQuery} roleQuery The roles and schemes to match.
     *
     * @return {boolean} True if authorized by user id and role, or override role, false if not.
     */
    isAuthorizedByObjectIdAndRole(objectQuery, roleQuery) {
        try {
            if(this.isAuthorizedByRole(roleQuery))
                return this.isAuthorizedByObjectId(objectQuery);
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
     * @param {ObjectQuery} objectQuery The use ID and scheme to match.
     * @param {RoleQuery} roleQuery The roles and schemes to match.
     *
     * @returns {Promise<boolean>}
     */
    async authorize(objectQuery, roleQuery) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(this.isAuthorizedByObjectIdAndRole(objectQuery, roleQuery));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Promise based version of <code>isAuthorizedByRole</code>.
     *
     * @param {RoleQuery} roleQuery The roles and schemes to match.
     *
     * @returns {Promise<boolean>}
     */
    async authorizeByRole(roleQuery) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(this.isAuthorizedByRole(roleQuery));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief Promise based version of <code>isAuthorizedByUserId</code>.
     *
     * @param {ObjectQuery} userQuery The use ID and scheme to match.
     *
     * @returns {Promise<boolean>}
     */
    async authorizeByObjectId(userQuery) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(this.isAuthorizedByObjectId(userQuery));
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
class AuthenticatedGroup {
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
 * @decription <strong>WARNING</strong>: This class uses {Sentry} which DOES NOT validate the JWT token. All secure
 *             services <strong>MUST</strong> be protected by an APIM Gateway that will validate the token prior to
 *             invoking this function.
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
                        Promise.all([context.getSecureEnvironmentProperty("CLA-SENTRY-CONFIG"),
                                            context.getEnvironmentProperty("MSI_ENDPOINT"),
                                            context.getEnvironmentProperty("MSI_SECRET")])
                            .then((resolved) => {
                                context.sentry = new Sentry(new SentryConfig(resolved[0], resolved[1], resolved[2]));
                                return context.sentry.validate(bearer);
                            })
                            .then(() => {
                                // Sentry requires a token thats decode-able so, if it can be created you are authenticated.
                                // WARNING: Sentry does NOT validate the token. That MUST be done by the APIM Gateway.
                                context.log("Request authenticated.", LOG_LEVEL.LEVEL_INFO,
                                            "AuthenticatedJSONFunction.authenticate(context)");
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
 *              <p>This class defaults to AuthenticatedGroup if no group is specified. This allows anyone with a
 *              valid JWT token to perform this task.</p>
 *
 * @author Robert R Murrell
 */
class AuthorizedJSONFunction extends AuthenticatedJSONFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     * @param {AuthenticatedGroup} [group]
     */
    constructor(config, group = new AuthenticatedGroup()) {
        super(config);
        this._group = group;
    }

    /**
     * @brief
     *
     * @returns {AuthenticatedGroup}
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
    async authenticate(context) {
        return new Promise((resolve, reject) => {
            context.log("Authorizing request.", LOG_LEVEL.LEVEL_INFO,
                        "AuthorizedJSONFunction.authenticate(context)");
            super.authenticate(context)
                .then(() => {
                    context.overridden = false;
                    // Checking to see if weve been overridden...
                    if(context.sentry.isAuthorizedByOverride(MATCH_TYPE.OVERRIDE.OVERRIDE_IF_ADMIN_OR_SYSTEM)) {
                        context.log("Request authorized by override.");
                        context.overridden = true;
                        resolve();
                    }
                    else
                        return this._group.authorize(context.sentry);
                })
                .then(() => {
                    return this._group.authorize(context.sentry);
                })
                .then((resolved) => {
                    if(resolved) {
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
        });
    }
}

module.exports = {
    ClaimName:             ClaimName,
    ClaimLocation:         ClaimLocation,
    ClaimsToken:           ClaimsToken,
    SystemRoles:           SystemRoles,
    SentryConfig:          SentryConfig,
    RoleQuery:             RoleQuery,
    ObjectQuery:           ObjectQuery,
    Sentry:                Sentry,
    MATCH_TYPE:            MATCH_TYPE,
    AuthenticatedGroup:    AuthenticatedGroup,
    AuthorizedJSONFunction:    AuthorizedJSONFunction,
    AuthenticatedJSONFunction: AuthenticatedJSONFunction
};