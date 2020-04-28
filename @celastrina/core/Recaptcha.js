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
/*
 * *********************************************************************************************************************
 * EXPORTS
 * *********************************************************************************************************************
 */
module.exports = {
    Recaptcha: Recaptcha
};
