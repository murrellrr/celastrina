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
/**
 * @type {{TEST: number, MONITOR: number, DEVELOPMENT: number, PRODUCTION: number}}
 */
const MESSAGE_ENVIRONMENT = {
    PRODUCTION: 0,
    MONITOR: 1,
    TEST: 2,
    DEVELOPMENT: 3
};
/**
 * Header
 * @property {Object} _object
 * @author Robert R Murrell
 */
class Header {
    /**
     * @param {null|string} resource
     * @param {null|string} action
     * @param {null|string} source
     * @param {number} [environment=MESSAGE_ENVIRONMENT.PRODUCTION]
     * @param {moment.Moment} [published=moment()]
     * @param {null|moment.Moment} [expires=null]
     * @param {string} [messageId=uuidv4()]
     * @param {string} [traceId=uuidv4()]
     */
    constructor(resource = null, action = null, source = null, environment = MESSAGE_ENVIRONMENT.PRODUCTION,
                published = moment(), expires = null, messageId = uuidv4(), traceId = uuidv4()) {
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
    /**@type{boolean}*/get isExpired() {return moment().isSameOrAfter(this._expires);}
    /**
     * @param {Object} _oheader
     * @returns {Header}
     */
    static create(_oheader) {
        let _lheader = new Header();
        Object.assign(_lheader, _oheader);
        _lheader._published = moment(_lheader._published); // Convert from string to moment.
        _lheader._expires = moment(_lheader._expires);
        return _lheader;
    }
}
/**
 * Message
 * @property {Object} _object
 * @author Robert R Murrell
 */
class Message {
    /**
     * @param {Header} [header=null]
     * @param {*} [payload=null]
     */
    constructor(header = null, payload = null) {
        /**@type{Header}*/this._header = header;
        /**@type{*}*/this._payload = payload;
    }
    /**@returns{Header}*/get header() {return this._header;}
    /**@param{Header}header*/set header(header) {this._header = header;}
    /**@returns{*}*/get payload() {return this._payload;}
    /**@param{*}payload*/set payload(payload) {this._payload = payload;}
    /**
     * @param {Header} _header
     * @param {*} _opayload
     * @returns {Message}
     */
    static create(_header, _opayload) {
        return new Message(_header, _opayload);
    }
    /**
     * @param {Message} message
     * @returns {Promise<string>}
     */
    static async marshall(message) {
        return new Promise((resolve, reject) => {
            if(typeof message === "undefined" || message == null)
                reject(CelastrinaValidationError.newValidationError("Invalid Message.", "Message"));
            else if (typeof message._header === "undefined" || message._header == null)
                reject(CelastrinaValidationError.newValidationError("Invalid Message Header.", "Message._header"));
            else {
                message._object = {_mime: "application/json; com.celastrinajs.message"};
                message._header._object = {_mime: "application/json; com.celastrinajs.message.header"};
                resolve(JSON.stringify(message));
            }
        });
    }
    /**
     * @param {*} message
     * @returns {Promise<Message>}
     */
    static async unmarshall(message) {
        return new Promise((resolve, reject) => {
            try {
                let msg;
                if(typeof message === "string")
                    msg = JSON.parse(message);
                else msg = message;

                if(typeof msg !== "object" || msg == null)
                    reject(CelastrinaValidationError.newValidationError("Invalid message.", "Message"));
                else {
                    if(!msg.hasOwnProperty("_object") || typeof msg._object !== "object")
                        reject(CelastrinaValidationError.newValidationError("Invalid Message object.", "Message._object"));
                    if(!msg._object.hasOwnProperty("_mime") || msg._object._mime !== "application/json; com.celastrinajs.message")
                        reject(CelastrinaValidationError.newValidationError("Invalid Message type.", "Message._object._mime"));
                    if(!msg.hasOwnProperty("_header") || typeof msg._header !== "object")
                        reject(CelastrinaValidationError.newValidationError("Invalid Header.", "Message._header"));
                    if(!msg._header.hasOwnProperty("_object") || typeof msg._header._object !== "object")
                        reject(CelastrinaValidationError.newValidationError("Invalid Header.", "Message._header._object"));
                    if(!msg._header._object.hasOwnProperty("_mime") || msg._header._object._mime !== "application/json; com.celastrinajs.message.header")
                        reject(CelastrinaValidationError.newValidationError("Invalid type.", "Message._header._object._mime"));
                    resolve(Message.create(Header.create(msg._header), msg._payload));
                }
            }
            catch(exception) {
                reject(CelastrinaError.newError(exception));
            }
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
     */
    constructor(azcontext, config) {
        super(azcontext, config);
        /**@type{null|Message}*/this._message = null;
    }
    /**@returns{string}*/get raw() {return this._funccontext.message;}
    /**@returns{null|Message}*/get message() {return this._message;}
    /**@param{Message}message*/set message(message) {this._message = message;}
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
            resolve(new MessageContext(azcontext, config));
        });
    }
    /**
     * @param {MessageContext} context
     * @returns {Promise<void>}
     * @private
     */
    async _onMonitor(context) {
        return new Promise((resolve, reject) => {
            context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "MessageFunction._onMessage(context)");
            resolve();
        });
    }
    /**
     * @param {MessageContext} context
     * @returns {Promise<void>}
     * @private
     */
    async _onMessage(context) {
        return new Promise((resolve, reject) => {
            context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "MessageFunction._onMessage(context)");
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }

    /**
     * @param {MessageContext} context
     * @returns {Promise<void>}
     * @private
     */
    async _onPoisonMessage(context) {
        return new Promise((resolve, reject) => {
            context.log("Dropping poison message: " + context.raw +"'. Override this method to take different action", LOG_LEVEL.LEVEL_WARN, "MessageFunction._onMessage(context)");
            context.done();
            resolve();
        });
    }
    /**
     * @param {BaseContext | MessageContext} context
     * @returns {Promise<void>}
     */
    async process(context) {
        return new Promise((resolve, reject) => {
            Message.unmarshall(context.getBinding("message"))
                .then((message) => {
                    context.message = message;
                    /**@type{Promise<void>}*/let promise;
                    if(context.message.header.isExpired) {
                        context.log("Message '" + context.message.header.messageId + "' is expired.", LOG_LEVEL.LEVEL_WARN, "MessageFunction.process(context)");
                        promise = this._onPoisonMessage(context);
                    }
                    else if (context.message.header.environment === MESSAGE_ENVIRONMENT.MONITOR) {
                        context.log("Message '" + context.message.header.messageId + "' is a monitor message.", LOG_LEVEL.LEVEL_INFO, "MessageFunction.process(context)");
                        promise = this._onMonitor(context);
                    }
                    else promise = this._onMessage(context);
                    promise
                        .then(() => {
                            resolve();
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                })
                .catch((exception) => {
                    this._onPoisonMessage(context)
                        .then(() => {
                            resolve();
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                });
        });
    }
}

module.exports = {
    MESSAGE_ENVIRONMENT: MESSAGE_ENVIRONMENT, Header: Header, Message: Message, MessageContext: MessageContext,
    MessageFunction: MessageFunction
};
