/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const axios       = require("axios").default;
const querystring = require("querystring");

const {CelastrinaValidationError, CelastrinaError} = require("CelastrinaError");
const {LOG_LEVEL, JSONHTTPContext, JSONHTTPFunction} = require("HTTPFunction");

/**
 * @typedef {_Body} _RecaptchaBody
 * @property {string} ndsRecaptchaToken
 */
/**
 * @typedef {JSONHTTPContext} _RecaptchaContext
 * @property {_RecaptchaBody} query
 * @property {number} recaptchaScore
 */

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{url: string, secret: string, score: number, timeout: number}}
 */
class Recaptcha {
    /**
     * @brief
     *
     * @param {string} url
     * @param {string} secret
     * @param {number} score
     * @param {number} timeout
     */
    constructor(url, secret, score = .8, timeout = 1500) {
        this.url     = url;
        this.secret  = secret;
        this.score   = score;
        this.timeout = timeout;
    }

    /**
     * @brief
     *
     * @param {string} token
     *
     * @returns {Promise<number>}
     */
    async validateToken(token) {
        return new Promise(
            (resolve, reject) => {
                if(typeof token !== "string" || !token.trim())
                    reject(CelastrinaValidationError.newValidationError("Token is required.",
                        "Recaptcha.validateToken.token"));
                else {
                    let config = {
                        timeout: this.timeout,
                        headers: {"accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
                        maxContentLength: 1000
                    };

                    axios.post(this.url, querystring.stringify({
                                    secret: this.secret,
                                    response: token
                                }), config)
                        .then((response) => {
                            if (response.status === 200) {
                                if (response.data.success && response.data.score >= this.score)
                                    resolve(response.data.score);
                                else
                                    reject(CelastrinaError.newError("You might be a bot, sorry.", 401));
                            }
                            else
                                reject(CelastrinaError.newError("Error validating Recaptcha: " + response.status +
                                    ", " + response.statusText));
                        })
                        .catch((rejected) => {
                            reject(CelastrinaError.newError("You might be a bot, sorry. " + rejected, 401));
                        });
                }
            });
    }
}

/**
 * @type {{QUERY: number, HEADER: number, BODY: number}}
 */
const RECAPTCHA_TOKEN_METHOD = {
    BODY:   0,
    QUERY:  1,
    HEADER: 2
};

/**
 * @brief Web Token Handler that also provides a recaptcha validation.
 *
 * @description A token must be included depending on your {RECATCHA_TOKEN_METHOD} setting:
 *              <ul><li>BODY: You must include a {string} property name ndsRecaptchaToken with the recaptcha token at
 *                      the root of the request body object.</li>
 *                  <li>QUERY: You must include a query parameter named ndsRecaptchaToken with the recaptcha token.</li>
 *                  <li>HEADER: You must include a X-nds-recaptcha-token header containing the recaptcha token.</li></ul>
 *
 *              <p>Implementors, DO NOT override the process method. To process your request on a successful validation
 *                 you must override the {RecaptchJSONRequest.validated(ndscontext)} function.</p>
 *
 * @author Robert R Murrell
 */
class RecaptchaJSONFunction extends JSONHTTPFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     * @param {RECAPTCHA_TOKEN_METHOD} [method] default is BODY.
     * @param {string} [secretKey]
     * @param {number} [score]
     * @param {number} [timeout]
     * @param {string} [url]
     */
    constructor(config = null,
                method = RECAPTCHA_TOKEN_METHOD.BODY,
                secretKey = "CLA-RECAPTCHA-SECRET",
                score = .8,
                timeout = 2000,
                url = "https://www.google.com/recaptcha/api/siteverify") {
        super(config);
        this._method    = method;
        this._score     = score;
        this._timeout   = timeout;
        this._url       = url;
        this._secretKey = secretKey;
        /** @type {Recaptcha} */
        this._recaptcha = null;
    }

    /**
     * @brief
     *
     * @param {_RecaptchaContext & JSONHTTPContext} context
     *
     * @returns {null|string}
     *
     * @private
     */
    _getToken(context) {
        let token;
        switch(this._method) {
            case RECAPTCHA_TOKEN_METHOD.BODY:
                token = context.requestBody.ndsRecaptchaToken;
                break;
            case RECAPTCHA_TOKEN_METHOD.QUERY:
                token = context.query.ndsRecaptchaToken;
                break;
            default:
                token = context.getRequestHeader("x-ndsRecaptchaToken");
        }
        return token;
    }

    /**
     * @brief Performs a RECAPTCHA validation and invokes the validated promise if successful.
     *
     * @param {BaseContext | HTTPContext | JSONHTTPContext} context
     *
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise(
            (resolve, reject) => {
                context.log("Performing a RECAPTCHA intellegence test. Getting secure secret.", this._topic);
                context.getSecureEnvironmentProperty(this._secretKey)
                    .then((value) => {
                        this._recaptcha = new Recaptcha(this._url, value, this._score, this._timeout);
                        return this._recaptcha.validateToken(this._getToken(context))
                    })
                    .then((score) => {
                        context.recaptchaScore = score;
                        return super.process(context);
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }
}

module.exports = {
    Recaptcha:              Recaptcha,
    RECAPTCHA_TOKEN_METHOD: RECAPTCHA_TOKEN_METHOD,
    RecaptchaJSONFunction:  RecaptchaJSONFunction
};