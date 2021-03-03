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

const moment = require("moment");
const { v4: uuidv4 } = require('uuid');
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, JsonProperty, Configuration,
      BaseContext, BaseFunction} = require("@celastrina/core");

/**
 * @typedef {_AzureFunctionContext} _AzureMessageContext
 * @property {string} message
 */

const MESSAGE_ENVIRONMENT = {
    PRODUCTION: 0,
    MONITOR: 1,
    TEST: 2,
    DEVELOPMENT: 3
};
/**
 * Header
 * @author Robert R Murrell
 */
class Header {
    /**
     * @param {string} resource
     * @param {string} action
     * @param {string} source
     * @param {moment.Moment} [published=moment()]
     * @param {null|moment.Moment} [expires=null]
     * @param {string} [messageId=uuidv4()]
     * @param {string} [traceId=uuidv4()]
     * @param {number} [environment=MESSAGE_ENVIRONMENT.PRODUCTION]
     */
    constructor(resource, action, source, published = moment(), expires = null,
                messageId = uuidv4(), traceId = uuidv4(), environment = MESSAGE_ENVIRONMENT.PRODUCTION) {
        /**@type{string}*/this._resource = resource;
        /**@type{string}*/this._action = action;
        /**@type{string}*/this._source = source;
        /**@type{moment.Moment}*/this._published = published;
        /**@type{string}*/this._messageId = messageId;
        /**@type{string}*/this._traceId = traceId;
        /**@type{number}*/this._environment = environment;
        if(expires == null)
            /**@type{moment.Moment}*/this._expires = moment(published).add(1, "year");
        else
            /**@type{moment.Moment}*/this._expires = expires;
    }
    /**@returns{string}*/get resource() {return this._resource;}
    /**@returns{string}*/get action() {return this._action;}
    /**@returns{string}*/get source() {return this._source;}
    /**@type{moment.Moment}*/get published() {return this._published;}
    /**@type{moment.Moment}*/get expires() {return this._expires;}
    /**@returns{string}*/get messageId() {return this._messageId}
    /**@returns{string}*/get traceId() {return this._traceId}
    /**@type{number}*/get environment() {return this._environment;}
    /**@type{boolean}*/get isExpired() {
        let now = moment();
        return now.isBefore(this._expires);
    }
}
/**
 * Message
 * @author Robert R Murrell
 */
class Message {
    /**
     * @param {Header} header
     * @param {*} payload
     */
    constructor(header, payload) {
        /**@type{Header}*/this._header = header;
        this._payload = payload;
    }
    /**@returns{Header}*/get header() {return this._header;}
    /**@returns{*}*/get payload() {return this._payload;}
    /**
     * @param {Message} message
     * @returns {Promise<Message>}
     */
    static async marshall(message) {
        return new Promise((resolve, reject) => {
            //
        });
    }
    /**
     * @param {string} message
     * @returns {Promise<Message>}
     */
    static async unmarshall(message) {
        return new Promise((resolve, reject) => {
            let msg = JSON.stringify(message);
        });
    }
}
/**
 * MessageContext
 * @extends {BaseContext}
 * @author Robert R Murrell
 */
class MessageContext extends BaseContext {
    /**
     * @param {Object} azcontext
     * @param {Configuration} config
     * @param {null|Message} message
     */
    constructor(azcontext, config, message) {
        super(azcontext, config);
        /**@type{null|Message}*/this._message = message;
    }
    /**@type{string}*/get raw() {return this._funccontext.message;}
    /**@type{null|Message}*/get message() {return this._message;}
}
/**
 * MessageFunction
 * @extends {BaseFunction}
 * @abstract
 * @author Robert R Murrell
 */
class MessageFunction extends BaseFunction {
    /**@param {Configuration} configuration*/
    constructor(configuration) {super(configuration);}
    /**
     * @param {_AzureMessageContext} azcontext
     * @param {Configuration} config
     * @returns {Promise<MessageContext>}
     */
    async createContext(azcontext, config) {
        return new Promise((resolve, reject) => {
            Message.unmarshall(azcontext.message)
                .then((message) => {
                    resolve(new MessageContext(azcontext, config, message));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {BaseContext | MessageContext} context
     * @returns {Promise<void>}
     * @private
     */
    async _onMessage(context) {
        return new Promise((resolve, reject) => {
            context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "Timer._tick(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {BaseContext | MessageContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise((resolve, reject) => {
            if(context.message.header.isExpired) {
                context.log("Message " + context.message.header.messageId + " is expired, dropping.", LOG_LEVEL.LEVEL_WARN, "MessageFunction.process(context)");
                resolve();
            }
            else {
                this._onMessage(context)
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
        });
    }
}

module.exports = {
    MESSAGE_ENVIRONMENT: MESSAGE_ENVIRONMENT, Header: Header, Message: Message, MessageContext: MessageContext,
    MessageFunction: MessageFunction
};
