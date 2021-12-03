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
/**
 * @author Robert R Murrell
 * @copyright Robert R Murrell
 * @license MIT
 */
"use strict";
const {axios, AxiosError, AxiosResponse} = require("axios");
const {CelastrinaError, CelastrinaValidationError, Configuration, AddOn, ConfigParser, Authenticator,
       LOG_LEVEL} = require("@celastrina/core");
const {HTTPContext, HTTPAddOn, HTTPParameter, HeaderParameter} = require("@celastrina/http");

/***
 * @typedef GoogleRecaptchResponse
 * @property {boolean} success
 * @property {number} score
 * @property {string} action
 * @property {string} challenge_ts
 * @property {string} hostname
 * @property {Array<string>} [error-codes]
 */
/**
 * RecaptchaAuthenticator
 * @author Robert R Murrell
 */
class RecaptchaAuthenticator extends Authenticator {
    constructor(required = false, link = null) {
        super("RecaptchaAuthenticator", required, link);
    }
    /**
     * @param assertion
     * @return {Promise<void>}
     * @private
     */
    async _authenticate(assertion) {
        /**@type{RecaptchaAddOn}*/let _addon = /**@type{RecaptchaAddOn}*/assertion.context.config.getAddOn(RecaptchaAddOn);
        /**@type{(null|string)}*/let token = _addon.parameter.getParameter(/**@type{HTTPContext}*/assertion.context, _addon.name);
        if(typeof token !== "string" || !token.trim()) {
            assertion.context.log("Missing RECAPTCHA token.", LOG_LEVEL.THREAT, "RecaptchaAuthenticator._authenticate(assertion)");
            assertion.assert(this._name, false);
        }
        else {
            let config = {
                timeout: _addon.timeout,
                headers: {"accept": "application/json", "Content-Type": "application/x-www-form-urlencoded"},
                maxContentLength: 1000
            };
            let params = new URLSearchParams({secret: _addon.secret, response: token});
            try {
                /**@type{AxiosResponse<GoogleRecaptchResponse>}*/let _response = await axios.post(_addon.url, params.toString(), config);
                if(_response.status >= 200 && _response.data.success && _response.data.score >= _addon.threshold) {
                    assertion.assert(this._name, true, _addon.assignments);
                }
                else {
                    assertion.context.log(
                        "RECAPTCHA failed with response code " + _response.status + ", success value " + _response.data.success +
                                ", and score of " + _response.data.score + ", errors returned " + _response.data["error-codes"] + ".",
                                LOG_LEVEL.THREAT, "RecaptchaAuthenticator._authenticate(assertion)");
                    assertion.assert(this._name, false);
                }
            }
            catch(/**@type{AxiosError<GoogleRecaptchResponse>}*/ex) {
                assertion.context.log("RECAPTCHA failed with code " + ex.code + ", " + ex.response.status + ", " +
                                      ex.response.statusText + ". \r\n(MESSAGE:" + ex.message + ")\r\n(STACK:" + ex.stack +
                                      ")\r\n(RESPONSE:" + JSON.stringify(ex.response.data) + ")",
                                      LOG_LEVEL.ERROR, "RecaptchaAuthenticator._authenticate(assertion)");
                assertion.assert(this._name, false);
            }
        }
    }
}
/**
 * RecaptchaConfigurationParser
 * @author Robert R Murrell
 */
class RecaptchaConfigurationParser extends ConfigParser {
    /**
     * @param {ConfigParser} [link=null]
     * @param {string} [version="1.0.0"]
     */
    constructor(link = null, version = "1.0.0") {
        super("recaptcha", link, version);
    }
    async _create(_Object) {
        return Promise.resolve(undefined);
    }
}
/**
 * RecaptchaAddOn
 * @author Robert R Murrell
 */
class RecaptchaAddOn extends AddOn {
    /**@type{string}*/static get addOnName() {return "celastrinajs.addon.recaptcha"};
    /**
     * @param {HTTPParameter} [parameter=new HeaderParameter()]
     * @param {string} [name="x-celastrinajs-recaptcha-token"]
     * @param {number} [threshold=.8]
     * @param {string} [url="https://www.google.com/recaptcha/api/siteverify"]
     * @param {number} [timeout=1500]
     * @param {Array<string>} [assignments=["human"]]
     */
    constructor(parameter = new HeaderParameter(), name = "x-celastrinajs-recaptcha-token",
                threshold = .8, url = "https://www.google.com/recaptcha/api/siteverify" ,
                timeout = 1500, assignments = ["human"]) {
        super();
        this._url = url;
        this._threshold = threshold;
        this._timeout = timeout;
        /**@type{(null|string)}*/this._secret = null;
        /**@type{Array<string>}*/this._assignments= assignments;
        this._parameter = parameter;
        this._name = name;
    }
    /**
     * @return {AttributeParser}
     */
    getAttributeParser() {
        return super.getAttributeParser();
    }
    /**
     * @return {ConfigParser}
     */
    getConfigParser() {
        return super.getConfigParser();
    }
    /**@return{Set<string>}*/getDependancies() {return new Set([HTTPAddOn.addOnName]);}
    /**
     * @param azcontext
     * @param config
     * @return {Promise<void>}
     */
    async initialize(azcontext, config) {
        if(typeof this._secret !== "string" || this._secret.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Secret is required.", "RecaptchaAddOn.secret");
        if(typeof this._threshold !== "number" || this._threshold <= 0 || this._threshold > 1)
            throw CelastrinaValidationError.newValidationError("Threshold must be a number > 0 and <= 1.", "RecaptchaAddOn.threshold");
        if(typeof this._url !== "string" || this._url.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("URL is required.", "RecaptchaAddOn.url");
        /**@type{Sentry}*/let _sentry = config[Configuration.CONFIG_SENTRY];
        _sentry.addAuthenticator(new RecaptchaAuthenticator());
    }
    /**@return{(null|string)}*/get secret() {return this._secret;}
    /**@param{(null|string)}secret*/set secret(secret) {this._secret = secret;}
    /**@return{string}*/get url() {return this._url;};
    /**@param{string}url*/set url(url) {this._url = url;}
    /**@return{number}*/get threshold() {return this._threshold;}
    /**@param{number}threshold*/set threshold(threshold) {this._threshold = threshold;}
    /**@return{number}*/get timeout() {return this._timeout;}
    /**@param{number}timeout*/set timeout(timeout) {this._timeout = timeout;}
    /**@return{Array<string>}*/get assignments() {return this._assignments;}
    /**@param{Array<string>}assignments*/set assignments(assignments) {this._assignments = assignments;}
    /**@return{HTTPParameter}*/get parameter() {return this._parameter;}
    /**@param{HTTPParameter}parameter*/set parameter(parameter) {this._parameter = parameter;}
    /**@return{string}*/get name() {return this._name;}
    /**@param{string}name*/set name(name) {this._name = name;}
    /**
     * @param url
     * @return {RecaptchaAddOn}
     */
    setUrl(url) {
        this._url = url;
        return this;
    }
    /**
     * @param threshold
     * @return {RecaptchaAddOn}
     */
    setThreshold(threshold) {
        this._threshold = threshold;
        return this;
    }
    /**
     * @param timeout
     * @return {RecaptchaAddOn}
     */
    setTimeout(timeout) {
        this._timeout = timeout;
        return this;
    }
    /**
     * @param {(null|string)} secret
     * @return {RecaptchaAddOn}
     */
    setSecret(secret) {
        this._secret = secret;
        return this;
    }
    /**
     * @param {Array<string>} assignments
     * @return {RecaptchaAddOn}
     */
    setAssignments(assignments) {
        this._assignments = assignments;
        return this;
    }
    /**
     * @param {HTTPParameter} parameter
     * @return {RecaptchaAddOn}
     */
    setParameter(parameter) {
        this._parameter = parameter;
        return this;
    }
    /**
     * @param {string} name
     * @return {RecaptchaAddOn}
     */
    setName(name) {
        this._name = name;
        return this;
    }
}
