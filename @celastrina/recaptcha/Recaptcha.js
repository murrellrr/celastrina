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
// /**
//  * @author Robert R Murrell
//  * @copyright Robert R Murrell
//  * @license MIT
//  */
// "use strict";
// const axios = require("axios").default;
// const {CelastrinaValidationError, CelastrinaError} = require("../core");
"use strict";
const axios = require("axios").default;
const {CelastrinaError, CelastrinaValidationError, AddOn, ConfigParser} = require("@celastrina/core");
const {} = require("@celastrina/http");

class RecaptchaConfigurationParser extends ConfigParser {
    /**
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("HTTP", link, version);
    }

    async _create(_Object) {
        return Promise.resolve(undefined);
    }
}

class RecaptchaAddOn extends AddOn {
    static CELASTRINA_RECAPTCHA_ADDON = "celastrinajs.addon.http.recaptcha";
    static CONFIG_RECAPTCHA_URL = "celastrinajs.http.recaptcha.url";
    static CONFIG_RECAPTCHA_THRESHOLD = "celastrinajs.http.recaptcha.score.threshold";
    static CONFIG_RECAPTCHA_TIMEOUT = "celastrinajs.http.recaptcha.request.timeout";

    constructor() {
        super(RecaptchaAddOn.CELASTRINA_RECAPTCHA_ADDON);
    }
    wrap(config) {
        super.wrap(config);
        this._config[RecaptchaAddOn.CONFIG_RECAPTCHA_URL] = "https://www.google.com/recaptcha/api/siteverify";
        this._config[RecaptchaAddOn.CONFIG_RECAPTCHA_THRESHOLD] = .8;
        this._config[RecaptchaAddOn.CONFIG_RECAPTCHA_TIMEOUT] = 1500;
    }
    getAttributeParser() {
        return super.getAttributeParser();
    }
}

// const axios       = require("axios").default;
// const querystring = require("querystring");
// const {CelastrinaValidationError, CelastrinaError, BaseContext, FunctionRole, MatchAny} = require("../core");
// const {HTTPParameterFetch, HeaderParameterFetch, HTTPContext} = require("../http/HTTP");
// /**
//  * @typedef {_Body} _RecaptchaBody
//  * @property {string} celastrinaRecaptchaToken
//  * @typedef {JSONHTTPContext} _RecaptchaContext
//  * @property {_RecaptchaBody} query
//  * @property {number} recaptchaScore
//  */
// /** */
// class Recaptcha {
//     /**
//      * @param {string} secret
//      * @param {number} [score=.8]
//      * @param {string} [url="https://www.google.com/recaptcha/api/siteverify"]
//      * @param {number} [timeout=1500]
//      */
//     constructor(secret, score = .8, url = "https://www.google.com/recaptcha/api/siteverify",
//                 timeout = 1500) {
//         this._url = url;
//         this._secret = secret;
//         this._timeout = timeout;
//     }
//     /**
//      * @param {string} token
//      * @returns {Promise<number>}
//      */
//     async validateToken(token) {
//         return new Promise((resolve, reject) => {
//             if(typeof token !== "string" || !token.trim())
//                 reject(CelastrinaValidationError.newValidationError("Token is required.",
//                     "Recaptcha.validateToken.token"));
//             else {
//                 let config = {
//                     timeout: this._timeout,
//                     headers: {"accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
//                     maxContentLength: 1000
//                 };
//                 axios.post(this._url, querystring.stringify({secret: this._secret, response: token}), config)
//                     .then((response) => {
//                         resolve(/**@type{{response:{data:{score:number}}}}*/response.data.score);
//                     })
//                     .catch((exception) => {
//                         reject(CelastrinaError.newError("Exception validating RECAPTCHA token."));
//                     });
//             }
//         });
//     }
// }
// /**@type {FunctionRole}*/
// class RecaptchaFunctionRole extends FunctionRole {
//     /**
//      * @param {string} [action]
//      * @param {Array.<string>} roles
//      * @param {ValueMatch} [match]
//      */
//     constructor(action = "process", roles = [], match = new MatchAny()) {
//         super(action, roles, match);
//         /**@type{null|Recaptcha}*/this._recaptcha = null;
//         /**@type{null|HTTPParameterFetch}*/this._parameter = null;
//         this._key = "";
//         this._score = .8;
//     }
//     /**
//      * @param {string} action
//      * @param {BaseContext | HTTPContext} context
//      * @returns {Promise<boolean>}
//      */
//     async authorize(action, context) {
//         return new Promise((resolve, reject) => {
//             try {
//                 super.authorize(action, context)
//                     .then((authorized) => {
//                         if(authorized)
//                             return this._parameter.fetch(context, this._key)
//                                 .then((value) => {
//                                     return this._recaptcha.validateToken(value);
//                                 })
//                                 .then((score) => {
//                                     resolve(score >= this._score);
//                                 })
//                                 .catch((exception) => {
//                                     reject(exception);
//                                 });
//                         else
//                             resolve(false);
//                     })
//                     .catch((exception) => {
//                         reject(exception);
//                     });
//             }
//             catch(exception) {
//                 reject(exception);
//             }
//         });
//     }
// }
// module.exports = {
//     Recaptcha: Recaptcha, RecaptchaFunctionRole: RecaptchaFunctionRole
// };
