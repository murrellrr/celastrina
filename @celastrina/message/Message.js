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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, AddOn, instanceOfCelastringType} = require("@celastrina/core");
const {JSONHTTPContext, JSONHTTPFunction, HTTPAddOn} = require("@celastrina/http");
const {CloudEvent} = require("cloudevents");
const moment = require("moment");

/**
 * Response
 * @author Robert R Murrell
 */
class EventResult {
    constructor() {
        this._total = 0;
        this._failed = 0;
        /**@type{Object}*/this._failedEvents = {};
    }
    /**
     * @param {CloudEvent} event
     */
    accept(event) {
        ++this._total;
    }
    /**
     * @param {CloudEvent} event
     * @param {Object} cause
     */
    reject(event, cause) {
        this._failedEvents[event.id] = {event: event, cause: cause};
        ++this._total;
        ++this._failed;
    }
    /**
     * @param {CloudEvent} event
     * @return {{rejected:boolean, cause?:Object}}
     */
    rejected(event) {
        let _response = {rejected: false};
        let _result = typeof this._failedEvents[event.id];
        (typeof _result === "object")? _response = {rejected: true, cause: _result.cause} : _response = {rejected: false};
        return _response;
    }
}
/**
 * @typedef CloudEventContext
 * @property {CloudEvent} event
 * @property {EventResult} eventResult
 */
/**
 * EventHandler
 * @author Robert R Murrell
 */
class EventHandler {
    /**
     * @param {CloudEventHTTPFunction} event
     * @param {JSONHTTPContext & CloudEventContext} context
     * @param {CloudEventAddOn} config
     * @param {Object} body
     * @return {Promise<void>}
     * @abstract
     */
    async handleEvent(event, context, config, body) {};
}
/**
 * AsyncEventHandler
 * @author Robert R Murrell
 */
class AsyncEventHandler extends EventHandler {
    async handleEvent(event, context, config, body) {
        let _promises = [];
        for(let _event of body) {
            _promises.unshift(event._handleEvent(context, config, body));
        }
        await Promise.all(_promises);
    };
}
/**
 * AsyncEventHandler
 * @author Robert R Murrell
 */
class SyncEventHandler extends EventHandler {
    async handleEvent(event, context, config, body) {
        // TODO: Check to see if we need to order temporally
        await event._handleEvent(context, config, body);
    };
}
/**
 * EventFunction
 * @author Robert R Murrell
 */
class CloudEventHTTPFunction extends JSONHTTPFunction {
    /**
     * @param {Configuration} config
     */
    constructor(config) {super(config);}
    /**
     * @param {Configuration} config
     * @return {Promise<JSONHTTPContext & CloudEventContext>}
     */
    async createContext(config) {
        /**@type{JSONHTTPContext & CloudEventContext}*/
        let _context = /**@type{JSONHTTPContext & CloudEventContext}*/new JSONHTTPContext(config);
        _context.event = null;
        _context.eventResult = new EventResult();
        return _context;
    }
    /**
     * @param {(Context|CloudEventContext)} context
     * @param exception
     * @return {Promise<void>}
     */
    async exception(context, exception) {
        await super.exception(context, exception);
        if(context.event != null ) {
            // going to dead-letter it if its a "drop"
        }
    }
    /**
     * @param {JSONHTTPContext & CloudEventContext} context
     * @param {CloudEventAddOn} config
     * @param {Object} body
     * @return {Promise<void>}
     */
    async _handleEvent(context, config, body) {
        try {
            context.event = new CloudEvent(body);
            await this.onEvent(context);
            let _result = context.response.eventResult.rejected(context.event);
            if(_result.rejected) {
                if(config.abortOnReject) {
                    context.log("Event '" + context.event.id + "' caused abort. Cause: " + _result.cause, LOG_LEVEL.ERROR,
                                 "CloudEventHTTPFunction._handleEvent(context, config, body)");
                    // TODO: Finish message
                    throw CelastrinaError.newError("", 500, false, CelastrinaError.wrapError(_result.cause));
                }
            }
            // TODO: Check to see if we abort on failure
        }
        catch(exception) {
            if(instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, exception))
                throw exception;
            else {
                if(exception instanceof TypeError) {
                    // TODO: Get to a detailed set of causes for the rejection.
                }
                else
                    throw CelastrinaError.wrapError(exception);
            }
        }
    }
    /**
     * @param {JSONHTTPContext & CloudEventContext} context
     * @param {CloudEventAddOn} config
     * @param {Array<Object>} body
     * @return {Promise<void>}
     * @private
     */
    async _batchEvents(context, config, body) {
        if(config.allowBatch) {
            /**@type{BatchConfig}*/let _batchConfig = config.batch;
            if(Array.isArray(body)) {
                if (body.length < _batchConfig.limit) {
                    // Checking to see if they need to be syn processing?
                    /**@type{EventHandler}*/let _eventHandler;
                    (_batchConfig.processAsync) ? _eventHandler = new AsyncEventHandler() : _eventHandler = new SyncEventHandler();
                    await _eventHandler.handleEvent(this, context, config, body);
                }
                else {
                    context.log("Batch limit of Batch limit of '" + _batchConfig.limit + "' exceeded.", LOG_LEVEL.WARN,
                        "CloudEventHTTPFunction._post(context)");
                    context.sendValidationError(CelastrinaValidationError.newValidationError(
                        "Invalid Payload. Batch limit of '" + _batchConfig.limit + "' message(s) exceeded.", "body"));
                    context.done();
                }
            }
            else {
                context.log("Invalid body content. Content-Type indicates batch but body does not contain an array.", LOG_LEVEL.ERROR,
                    "CloudEventHTTPFunction._post(context)");
                context.sendValidationError(CelastrinaValidationError.newValidationError(
                    "Invalid body content. Content-Type indicates batch but body does not contain an array.", "body"));
                context.done();
            }
        }
        else {
            context.log("Batch messaging not supported.", LOG_LEVEL.WARN, "CloudEventHTTPFunction._post(context)");
            context.sendValidationError(CelastrinaValidationError.newValidationError("Batch messaging not supported.",
                "body", true));
            context.done();
        }

    }
    /**
     * @param {JSONHTTPContext & CloudEventContext} context
     * @return {Promise<void>}
     * @private
     */
    async _post(context) {
        /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
        let _body = context.requestBody;
        if(typeof _body === "undefined" || _body == null) {
            context.log("Received empty request body.", LOG_LEVEL.WARN, "CloudEventHTTPFunction._post(context)");
            context.sendValidationError(CelastrinaValidationError.newValidationError("Body is required.", "body", true));
            context.done();
        }
        else {
            let _ct = context.getRequestHeader("content-type");
            if(_ct === "application/cloudevents-batch+json")
                await this._batchEvents(context, _config, _body);
            else if(_ct === "application/cloudevents+json")
                await this._handleEvent(context, _config, _body);
            else {
                context.log("Invalid Content-Type '" + _ct + "' received.", LOG_LEVEL.ERROR,
                             "CloudEventHTTPFunction._post(context)");
                context.sendValidationError(CelastrinaValidationError.newValidationError(
                    "Invalid Payload.",
                        "body", true));
                context.done();
            }
        }
    }
    /**
     * @param {CloudEventContext & JSONHTTPContext} context
     * @return {Promise<void>}
     */
    async onEvent(context) {throw CelastrinaError.newError("Not Implemented.", 501);}
}
/**
 * BatchConfig
 * @author Robert R Murrell
 */
class BatchConfig {
    static CELASTRINAJS_EVENT_BATCH_CONFIG_TYPE = "celastrinajs.addon.cloudevent.config.batch";
    /**
     * @param {number} [limit=10]
     * @param {boolean} [abortOnReject=false]
     * @param {boolean} [processAsync=true]
     * @param {boolean} [orderTemporally=false] Order message by time, only followed if processAsync is false, set to false if
     *                                          processAsync is true.
     */
    constructor(limit = 10, abortOnReject = false, processAsync = true, orderTemporally = false) {
        this._limit = limit;
        this._abortOnReject = abortOnReject;
        this._processAsync = processAsync;
        (this._processAsync) ? this._orderTemporally = orderTemporally : this._orderTemporally = false;
        this.__type = BatchConfig.CELASTRINAJS_EVENT_BATCH_CONFIG_TYPE;
    }
    /**@type{number}*/get limit() {return this._limit;}
    /**@type{boolean}*/get processAsync() {return this._processAsync;}
}
/**
 * JSONHTTPEventAddOn
 * @author Robert R Murrell
 */
class CloudEventAddOn extends AddOn {
    static CONFIG_ADDON_CLOUDEVENT = "celastrinajs.addon.cloudevent";
    static CONFIG_CLOUDEVENT_BATCH = "celastrinajs.addon.cloudevent.batch";
    static CONFIG_CLOUDEVENT_EXPIRES = "celastrinajs.addon.cloudevent.expires";
    static CONFIG_CLOUDEVENT_TYPE = "celastrinajs.addon.cloudevent.type";
    static CONFIG_CLOUDEVENT_SUBJECT = "celastrinajs.addon.cloudevent.subject";
    static CONFIG_CLOUDEVENT_ABORT_ON_REJECT = "celastrinajs.addon.cloudevent.abortOnReject";
    static CONFIG_CLOUDEVENT_CONTENTTYPE = "celastrinajs.addon.cloudevent.data.contentType";
    static CONFIG_CLOUDEVENT_EMPTY_DATA = "celastrinajs.addon.cloudevent.data.allowEmpty";

    constructor() {
        super(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
    }
    wrap(config) {
        super.wrap(config);
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH] = null;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_ABORT_ON_REJECT] = false;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRES] = 86400; // 24 hours
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA] = true;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA] = false;
    }
    /**@type{BatchConfig}*/get batch() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH];}
    /**@type{boolean}*/get allowBatch() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH] != null;}
    /**@type{number}*/get expires() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRES];}
    /**@type{string}*/get type() {}
    /**@type{string}*/get subject() {}
    /**@type{string}*/get contentType() {}
    /**@type{boolean}*/get allowEmpty() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA];}
    /**@type{boolean}*/get abortOnReject() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_ABORT_ON_REJECT];}
}





module.exports = {

}
// const moment = require("moment");
// const { v4: uuidv4 } = require('uuid');
// const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, Configuration,
//       BaseContext, BaseFunction} = require("@celastrina/core");
//
// /**
//  * @typedef {_AzureFunctionContext} _AzureMessageContext
//  * @property {string} message
//  */
// /**
//  * @type {{TEST: number, MONITOR: number, DEVELOPMENT: number, PRODUCTION: number}}
//  */
// const MESSAGE_ENVIRONMENT = {
//     PRODUCTION: 0,
//     MONITOR: 1,
//     TEST: 2,
//     DEVELOPMENT: 3
// };
// /**
//  * Header
//  * @property {Object} _object
//  * @author Robert R Murrell
//  */
// class Header {
//     /**
//      * @param {null|string} resource
//      * @param {null|string} action
//      * @param {null|string} source
//      * @param {number} [environment=MESSAGE_ENVIRONMENT.PRODUCTION]
//      * @param {moment.Moment} [published=moment()]
//      * @param {null|moment.Moment} [expires=null]
//      * @param {string} [messageId=uuidv4()]
//      * @param {string} [traceId=uuidv4()]
//      */
//     constructor(resource = null, action = null, source = null, environment = MESSAGE_ENVIRONMENT.PRODUCTION,
//                 published = moment(), expires = null, messageId = uuidv4(), traceId = uuidv4()) {
//         /**@type{string}*/this._resource = resource;
//         /**@type{string}*/this._action = action;
//         /**@type{string}*/this._source = source;
//         /**@type{moment.Moment}*/this._published = published;
//         /**@type{string}*/this._messageId = messageId;
//         /**@type{string}*/this._traceId = traceId;
//         /**@type{number}*/this._environment = environment;
//         if(expires == null)
//             /**@type{moment.Moment}*/this._expires = moment(published).add(1, "year");
//         else
//             /**@type{moment.Moment}*/this._expires = expires;
//     }
//     /**@returns{string}*/get resource() {return this._resource;}
//     /**@returns{string}*/get action() {return this._action;}
//     /**@returns{string}*/get source() {return this._source;}
//     /**@type{moment.Moment}*/get published() {return this._published;}
//     /**@type{moment.Moment}*/get expires() {return this._expires;}
//     /**@returns{string}*/get messageId() {return this._messageId}
//     /**@returns{string}*/get traceId() {return this._traceId}
//     /**@type{number}*/get environment() {return this._environment;}
//     /**@type{boolean}*/get isExpired() {return moment().isSameOrAfter(this._expires);}
//     /**
//      * @param {Object} _oheader
//      * @returns {Header}
//      */
//     static create(_oheader) {
//         let _lheader = new Header();
//         Object.assign(_lheader, _oheader);
//         _lheader._published = moment(_lheader._published); // Convert from string to moment.
//         _lheader._expires = moment(_lheader._expires);
//         return _lheader;
//     }
// }
// /**
//  * Message
//  * @property {Object} _object
//  * @author Robert R Murrell
//  */
// class Message {
//     /**
//      * @param {Header} [header=null]
//      * @param {*} [payload=null]
//      */
//     constructor(header = null, payload = null) {
//         /**@type{Header}*/this._header = header;
//         /**@type{*}*/this._payload = payload;
//     }
//     /**@returns{Header}*/get header() {return this._header;}
//     /**@param{Header}header*/set header(header) {this._header = header;}
//     /**@returns{*}*/get payload() {return this._payload;}
//     /**@param{*}payload*/set payload(payload) {this._payload = payload;}
//     /**
//      * @param {Header} _header
//      * @param {*} _opayload
//      * @returns {Message}
//      */
//     static create(_header, _opayload) {
//         return new Message(_header, _opayload);
//     }
//     /**
//      * @param {Message} message
//      * @returns {Promise<string>}
//      */
//     static async marshall(message) {
//         return new Promise((resolve, reject) => {
//             if(typeof message === "undefined" || message == null)
//                 reject(CelastrinaValidationError.newValidationError("Invalid Message.", "Message"));
//             else if (typeof message._header === "undefined" || message._header == null)
//                 reject(CelastrinaValidationError.newValidationError("Invalid Message Header.", "Message._header"));
//             else {
//                 message._object = {_mime: "application/json; com.celastrinajs.message"};
//                 message._header._object = {_mime: "application/json; com.celastrinajs.message.header"};
//                 resolve(JSON.stringify(message));
//             }
//         });
//     }
//     /**
//      * @param {*} message
//      * @returns {Promise<Message>}
//      */
//     static async unmarshall(message) {
//         return new Promise((resolve, reject) => {
//             try {
//                 let msg;
//                 if(typeof message === "string")
//                     msg = JSON.parse(message);
//                 else msg = message;
//
//                 if(typeof msg !== "object" || msg == null)
//                     reject(CelastrinaValidationError.newValidationError("Invalid message.", "Message"));
//                 else {
//                     if(!msg.hasOwnProperty("_object") || typeof msg._object !== "object")
//                         reject(CelastrinaValidationError.newValidationError("Invalid Message object.", "Message._object"));
//                     if(!msg._object.hasOwnProperty("_mime") || msg._object._mime !== "application/json; com.celastrinajs.message")
//                         reject(CelastrinaValidationError.newValidationError("Invalid Message type.", "Message._object._mime"));
//                     if(!msg.hasOwnProperty("_header") || typeof msg._header !== "object")
//                         reject(CelastrinaValidationError.newValidationError("Invalid Header.", "Message._header"));
//                     if(!msg._header.hasOwnProperty("_object") || typeof msg._header._object !== "object")
//                         reject(CelastrinaValidationError.newValidationError("Invalid Header.", "Message._header._object"));
//                     if(!msg._header._object.hasOwnProperty("_mime") || msg._header._object._mime !== "application/json; com.celastrinajs.message.header")
//                         reject(CelastrinaValidationError.newValidationError("Invalid type.", "Message._header._object._mime"));
//                     resolve(Message.create(Header.create(msg._header), msg._payload));
//                 }
//             }
//             catch(exception) {
//                 reject(CelastrinaError.newError(exception));
//             }
//         });
//     }
// }
// /**
//  * MessageContext
//  * @extends {BaseContext}
//  * @author Robert R Murrell
//  */
// class MessageContext extends BaseContext {
//     /**
//      * @param {Object} azcontext
//      * @param {Configuration} config
//      */
//     constructor(azcontext, config) {
//         super(azcontext, config);
//         /**@type{null|Message}*/this._message = null;
//     }
//     /**@returns{string}*/get raw() {return this._funccontext.message;}
//     /**@returns{null|Message}*/get message() {return this._message;}
//     /**@param{Message}message*/set message(message) {this._message = message;}
// }
// /**
//  * MessageFunction
//  * @extends {BaseFunction}
//  * @abstract
//  * @author Robert R Murrell
//  */
// class MessageFunction extends BaseFunction {
//     /**@param {Configuration} configuration*/
//     constructor(configuration) {super(configuration);}
//     /**
//      * @param {_AzureMessageContext} azcontext
//      * @param {Configuration} config
//      * @returns {Promise<MessageContext>}
//      */
//     async createContext(azcontext, config) {
//         return new Promise((resolve, reject) => {
//             resolve(new MessageContext(azcontext, config));
//         });
//     }
//     /**
//      * @param {MessageContext} context
//      * @returns {Promise<void>}
//      * @private
//      */
//     async _onMonitor(context) {
//         return new Promise((resolve, reject) => {
//             context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "MessageFunction._onMessage(context)");
//             resolve();
//         });
//     }
//     /**
//      * @param {MessageContext} context
//      * @returns {Promise<void>}
//      * @private
//      */
//     async _onMessage(context) {
//         return new Promise((resolve, reject) => {
//             context.log("Not implemented.", LOG_LEVEL.LEVEL_VERBOSE, "MessageFunction._onMessage(context)");
//             reject(CelastrinaError.newError("Not Implemented.", 501));
//         });
//     }
//
//     /**
//      * @param {MessageContext} context
//      * @returns {Promise<void>}
//      * @private
//      */
//     async _onPoisonMessage(context) {
//         return new Promise((resolve, reject) => {
//             context.log("Dropping poison message: " + context.raw +"'. Override this method to take different action", LOG_LEVEL.LEVEL_WARN, "MessageFunction._onMessage(context)");
//             context.done();
//             resolve();
//         });
//     }
//     /**
//      * @param {BaseContext | MessageContext} context
//      * @returns {Promise<void>}
//      */
//     async process(context) {
//         return new Promise((resolve, reject) => {
//             Message.unmarshall(context.getBinding("message"))
//                 .then((message) => {
//                     context.message = message;
//                     /**@type{Promise<void>}*/let promise;
//                     if(context.message.header.isExpired) {
//                         context.log("Message '" + context.message.header.messageId + "' is expired.", LOG_LEVEL.LEVEL_WARN, "MessageFunction.process(context)");
//                         promise = this._onPoisonMessage(context);
//                     }
//                     else if (context.message.header.environment === MESSAGE_ENVIRONMENT.MONITOR) {
//                         context.log("Message '" + context.message.header.messageId + "' is a monitor message.", LOG_LEVEL.LEVEL_INFO, "MessageFunction.process(context)");
//                         promise = this._onMonitor(context);
//                     }
//                     else promise = this._onMessage(context);
//                     promise
//                         .then(() => {
//                             resolve();
//                         })
//                         .catch((exception) => {
//                             reject(exception);
//                         });
//                 })
//                 .catch((exception) => {
//                     this._onPoisonMessage(context)
//                         .then(() => {
//                             resolve();
//                         })
//                         .catch((exception) => {
//                             reject(exception);
//                         });
//                 });
//         });
//     }
// }
//
// module.exports = {
//     MESSAGE_ENVIRONMENT: MESSAGE_ENVIRONMENT, Header: Header, Message: Message, MessageContext: MessageContext,
//     MessageFunction: MessageFunction
// };
