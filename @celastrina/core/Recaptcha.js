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

const axios       = require("axios").default;
const querystring = require("querystring");

const {CelastrinaValidationError, CelastrinaError} = require("./CelastrinaError");
const {JsonProperty} = require("./BaseFunction");
const {LOG_LEVEL, HTTPParameterFetch, JSONHTTPContext, JSONHTTPFunction} = require("./HTTPFunction");

/**
 * @typedef {_Body} _RecaptchaBody
 * @property {string} celastrinaRecaptchaToken
 */
/**
 * @typedef {JSONHTTPContext} _RecaptchaContext
 * @property {_RecaptchaBody} query
 * @property {number} recaptchaScore
 */

/**
 * @brief
 * @author Robert R Murrell
 * @type {{url: string, secret: string, score: number, timeout: number}}
 */
class Recaptcha {
    /**
     * @brief
     * @param {string} secret
     * @param {number} [score=.8]
     * @param {string} [url="https://www.google.com/recaptcha/api/siteverify"]
     * @param {number} [timeout=1500]
     */
    constructor(secret, score = .8, url = "https://www.google.com/recaptcha/api/siteverify",
                timeout = 1500) {
        this._url     = url;
        this._secret  = secret;
        this._score   = score;
        this._timeout = timeout;
    }

    /**
     * @brief
     * @param {string} token
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
                        timeout: this._timeout,
                        headers: {"accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
                        maxContentLength: 1000
                    };

                    axios.post(this._url, querystring.stringify({
                                    secret: this._secret,
                                    response: token
                                }), config)
                        .then((response) => {
                            if (response.data.success && response.data.score >= this._score)
                                resolve(response.data.score);
                            else
                                reject(CelastrinaError.newError("You might be a bot, sorry.", 401));
                        })
                        .catch((exception) => {
                            reject(CelastrinaError.newError("Exception validating RECAPTCHA token."));
                        });
                }
            });
    }
}

class RecaptchaConfiguration extends Configuration {
    static CONFIG_RECAPTCHA_SECRET  = "celastrinajs.recaptcha.secret";
    static CONFIG_RECAPTCHA_URL     = "celastrinajs.recaptcha.url";
    static CONFIG_RECAPTCHA_SCORE   = "celastrinajs.recaptcha.score";
    static CONFIG_RECAPTCHA_TIMEOUT = "celastrinajs.recaptcha.timeout";


}

/**
 * @brief Web Token Handler that also provides a recaptcha validation.
 * @author Robert R Murrell
 */
class RecaptchaJSONFunction extends JSONHTTPFunction {


    /**
     * @brief
     * @param {Configuration} configuration
     */
    constructor(configuration) {
        super(configuration);
        this._recaptcha = null;
        this._secret = configuration.getValue(RecaptchaConfiguration.CONFIG_RECAPTCHA_SECRET, null);
        if(this._secret == null || this._secret.trim().length === 0)
            throw CelastrinaError.newError("RECAPTCHA secret cannot be null or zero length.");
        this._url = configuration.getValue(RecaptchaConfiguration.CONFIG_RECAPTCHA_URL,
                                           "https://www.google.com/recaptcha/api/siteverify");
        this._score = configuration.getValue(RecaptchaConfiguration.CONFIG_RECAPTCHA_SCORE, .8);
        this._timeout = configuration.getValue(RecaptchaConfiguration.CONFIG_RECAPTCHA_TIMEOUT, 2000);
    }

    /**
     * @brief
     * @param {BaseContext} context
     * @returns {Promise<void>}
     */
    async initialize(context) {
        return new Promise((resolve, reject) => {
            super.initialize(context)
                .then(() => {
                    this._recaptcha = new Recaptcha(this._secret, this._score, this._url, this._timeout);
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief Performs a RECAPTCHA validation before performing the HTTP action.
     * @param {BaseContext | HTTPContext | JSONHTTPContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise(
            (resolve, reject) => {
                context.log("Performing a RECAPTCHA intelligence test.", LOG_LEVEL.LEVEL_TRACE, this._topic);
                this._recaptcha.validateToken(this._getToken(context))
                    .then((score) => {
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
    Recaptcha: Recaptcha,
    RecaptchaJSONFunction: RecaptchaJSONFunction
};
