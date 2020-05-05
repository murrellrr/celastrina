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
const validator = require("validator").default;
const uuidv4    = require("uuid/v4");

const {CelastrinaError, CelastrinaValidationError, BaseContext, BaseFunction} = require("@celastrina/core");

/**
 * @brief
 * @author Robert R Murrell
 * @type {{_uid:string, _timestamp: moment.Moment, _expires: moment.Moment, _environment: string, _domain: string,
 *         _topic: string, _action: string}}
 */
class Header {
    /**
     * @brief
     * @param {string} topic
     * @param {string} action
     * @param {null|string} [domain=null]
     * @param {string} [uid=uuidv4()]
     * @param {moment.Moment} [timestamp=moment()]
     * @param {null|moment.Moment} [expires=null]
     * @param {string} [environment="development"]
     */
    constructor(topic, action, domain = null, uid = uuidv4(),
                timestamp = moment(), expires = null,
                environment = "development") {
        if(typeof topic !== "string" || topic.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid Header. Topic is required.",
                                                               "Header._topic");
        if(typeof action !== "string" || action.trim().length === 0)
            throw CelastrinaValidationError.newValidationError("Invalid Header. Action is required.",
                                                               "Header._action");
        this._uid          = uid;
        this._timestamp    = timestamp;
        this._expires      = expires;
        this._environment  = environment;
        this._domain       = domain;
        this._topic        = topic;
        this._action       = action;
    }

    /**
     * @brief
     * @returns {boolean}
     */
    get development() {
        return this._environment === "development";
    }

    /**
     * @brief
     * @returns {string}
     */
    get uid() {
        return this._uid;
    }

    /**
     * @brief
     * @returns {moment.Moment}
     */
    get timestam() {
        return this._timestamp;
    }

    /**
     * @brief
     * @returns {null|moment.Moment}
     */
    get expires() {
        return this._expires;
    }

    /**
     * @brief
     * @param {null|moment.Moment} expires
     */
    set expires(expires) {
        this._expires = expires;
    }

    /**
     * @brief
     * @returns {string}
     */
    get environment() {
        return this._environment;
    }

    /**
     * @brief
     * @returns {null|string}
     */
    get domain() {
        return this._domain;
    }

    /**
     * @brief
     * @returns {string}
     */
    get topic() {
        return this._topic;
    }

    /**
     * @brief
     * @returns {string}
     */
    get action() {
        return this._action;
    }

    /**
     * @brief
     * @param {number} [amount=24]
     * @param {string} [increment="h"]
     */
    setExpiresIn(amount = 24, increment = "h") {
        if(this._expires == null)
            this._expires = moment(); // Make it now if it was null.
        this._expires.add(amount, increment);
    }

    /**
     * @brief
     * @returns {Promise<boolean>}
     */
    async isExpired() {
        return new Promise((resolve, reject) => {
            try {
                let now = moment();
                resolve(now.isSameOrAfter(this._expires));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
     * @param {null|string} domain
     * @returns {Promise<boolean>}
     */
    async isInDomain(domain) {
        return new Promise((resolve, reject) => {
            try {
                resolve(domain === this._domain);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
     * @param {null|string} topic
     * @returns {Promise<boolean>}
     */
    async isTopic(topic) {
        return new Promise((resolve, reject) => {
            try {
                resolve(topic === this._topic);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
     * @param {null|string} action
     * @returns {Promise<boolean>}
     */
    async isAction(action) {
        return new Promise((resolve, reject) => {
            try {
                resolve(action === this._action);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief
     * @param {string} topic
     * @param {string} action
     * @param {null|string} [domain=null]
     * @returns {Promise<boolean>}
     */
    async isMessage(topic, action, domain = null) {
        return new Promise((resolve, reject) => {
            Promise.all([this.isTopic(topic), this.isAction(action), this.isInDomain(domain)])
                .then((results) => {
                    resolve((results[0] && results[1] && results[2]));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @brief
     * @param {object} source
     */
    static create(source) {
        if(typeof source === "undefined" || source == null)
            throw CelastrinaValidationError.newValidationError("Invalid Header. Source is required.",
                                                               "Header");
        if(source instanceof Header)
            return source;

        if(source.hasOwnProperty("_action") && (typeof source._action !== "string"))
            throw CelastrinaValidationError.newValidationError("Invalid Header. _action is required.",
                                                               "Header._action");
        if(source.hasOwnProperty("_topic") && (typeof source._topic !== "string"))
            throw CelastrinaValidationError.newValidationError("Invalid Header. _topic is required.",
                                                               "Header._topic");

        return new Header(source._topic, source._action, source._action, source._uid, source._timestamp,
                          source._expires, source._environment);
    }
}


/**
 * @brief
 * @author Robert R Murrell
 */
class Message {
    constructor(body = null, header = null) {
        this._body   = body;
        this._header = header;
    }
}

/**
 * @brief
 * @author Robert R Murrell
 */
class MessageContext extends BaseContext {
    /**
     * @brief
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     */
    constructor(context, name, properties) {
        super(context, name, properties);
    }

    /**
     * @brief
     * @brief {Configuration} configration
     * @returns {Promise<BaseContext>}
     */
    async initialize(configuration) {
        return new Promise((resolve, reject) => {
            super.initialize(configuration)
                .then((context) => {
                    resolve(context);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}

/**
 * @brief
 * @author Robert R Murrell
 */
class MessageFunction extends BaseFunction {
    /**
     * @brief Creates an implementations of Base Context from the Azure Function context passed in.
     * @description Override this function to create the instance of BaseContext required for your function.
     * @param {_AzureFunctionContext} context
     * @param {string} name
     * @param {PropertyHandler} properties
     * @returns {Promise<MessageContext & BaseContext>} The base context for this function.
     */
    async createContext(context, name, properties) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new MessageContext(context, name, properties));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }
}
