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
 * EventHandler
 * @author Robert R Murrell
 */
class EventInvocation {
    constructor() {
        this._total = 0;
        this._failed = 0;
        /**@type{Object}*/this._failedEvents = {};
        this._rootCause = null;
    }
    /**
     * @param {CloudEvent} event
     */
    acceptEvent(event) {
        ++this._total;
    }
    rejectInvocation(cause) {
        this._rootCause = cause;
    }
    /**
     * @param {CloudEvent} event
     * @param {Object} cause
     */
    rejectEvent(event, cause) {
        this._failedEvents[event.id] = {event: event, cause: cause};
        ++this._total;
        ++this._failed;
    }
    /**
     * @param {CloudEvent} event
     * @return {{rejected:boolean, cause?:Object}}
     */
    isEventRejected(event) {
        let _response = {rejected: false};
        let _result = typeof this._failedEvents[event.id];
        (typeof _result === "object")? _response = {rejected: true, cause: _result.cause} : _response = {rejected: false};
        return _response;
    }
    /**@return{boolean}*/get invocationRejected() {return (this._rootCause != null);}
    /**@return{*}*/get rootCause() {return this._rootCause;}
    /**@return{number}*/get total() {return this._total;}
    /**@return{number}*/get failed() {return this._failed;}
    /**@return{Object}*/get failedEvents() {return this._failedEvents}
}
/**
 * @typedef CloudEventContext
 * @property {CloudEvent} event
 * @property {EventInvocation} invocation
 */
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
    /**@type{boolean}*/get abortOnReject() {return this._abortOnReject;}
}
/**
 * JSONHTTPEventAddOn
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventAddOn extends AddOn {
    static CONFIG_ADDON_CLOUDEVENT = "celastrinajs.addon.cloudevent";
    static CONFIG_CLOUDEVENT_BATCH = "celastrinajs.addon.cloudevent.batch";
    static CONFIG_CLOUDEVENT_EXPIRES = "celastrinajs.addon.cloudevent.expires";
    static CONFIG_CLOUDEVENT_TYPE = "celastrinajs.addon.cloudevent.type";
    static CONFIG_CLOUDEVENT_SUBJECT = "celastrinajs.addon.cloudevent.subject";
    static CONFIG_CLOUDEVENT_VERSION = "celastrinajs.addon.cloudevent.version";
    static CONFIG_CLOUDEVENT_ABORT_ON_REJECT = "celastrinajs.addon.cloudevent.abortOnReject";
    static CONFIG_CLOUDEVENT_CONTENTTYPE = "celastrinajs.addon.cloudevent.data.contentType";
    static CONFIG_CLOUDEVENT_EMPTY_DATA = "celastrinajs.addon.cloudevent.data.allowEmpty";
    static CONFIG_CLOUDEVENT_RESPONSE = "celastrinajs.addon.cloudevent.response";
    constructor() {
        super(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
    }
    wrap(config) {
        super.wrap(config);
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH] = null;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_ABORT_ON_REJECT] = false;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRES] = 86400; // 24 hours
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA] = true;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_RESPONSE] = 200;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE] = new RegExp("^.*$");
    }
    async initialize(azcontext, pm, rm, prm) {
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE].compile();
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT].compile();
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION].compile();
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE].compile();
    }
    /**@type{BatchConfig}*/get batch() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH];}
    /**@type{boolean}*/get allowBatch() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH] != null;}
    /**@type{number}*/get expires() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRES];}
    /**@type{RegExp}*/get type() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE];}
    /**@type{RegExp}*/get subject() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT];}
    /**@type{RegExp}*/get specversion() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION];}
    /**@type{RegExp}*/get contentType() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE];}
    /**@type{boolean}*/get allowEmpty() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA];}
    /**@type{boolean}*/get abortOnReject() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_ABORT_ON_REJECT];}
    /**@type{number}*/get responceCode() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_RESPONSE];}
}
/**
 * CloudEventEventEmitter
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventEmitter {
    constructor() {}
    /**
     * @param {CloudEventBaseFunction} func
     * @param {JSONHTTPContext & CloudEventContext} context
     * @param {CloudEventAddOn} config
     * @param {Object} body
     * @return {Promise<void>}
     * @abstract
     */
    async emit(func, context, config, body) {};
}
/**
 * AsyncEventHandler
 * @author Robert R Murrell
 */
class AsyncEventEmitter extends CloudEventEmitter {
    constructor() {super();}
    async emit(func, context, config, body) {
        let _promises = [];
        for(let _event of body) {
            _promises.unshift(func._handleEvent(context, config, body));
        }
        await Promise.all(_promises);
    }
}
/**
 * AsyncEventHandler
 * @author Robert R Murrell
 */
class SyncEventEmitter extends CloudEventEmitter {
    constructor() {super();}
    async emit(func, context, config, body) {
        // TODO: Check to see if we need to order temporally
        await func._handleEvent(context, config, body);
    }
}
/**
 * EventFunction
 * @author Robert R Murrell
 */
class CloudEventBaseFunction {
    constructor() {}
    /**
     * @param {Configuration} config
     * @return {Promise<JSONHTTPContext & CloudEventContext>}
     */
    async createContext(config) {
        /**@type{JSONHTTPContext & CloudEventContext}*/
        let _context = /**@type{JSONHTTPContext & CloudEventContext}*/new JSONHTTPContext(config);
        _context.event = null;
        _context.invocation = new EventInvocation();
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
     * @return {Promise<{rejected:boolean, event?:CloudEvent, cause?:Object}>}
     */
    async _createEvent(context, config, body) {
        let _event = new CloudEvent(body);
        if(!_event.specversion.match(config.specversion)) {
            //
        }
        else if(!_event.type.match(config.type)) {
            //
        }
        else if(!_event.subject.match(config.subject)) {
            //
        }
        else if(!_event.datacontenttype.match(config.contentType)) {
            //
        }
        else {
            (typeof _event.time === "undefined" || _event.time == null)? _event.time = moment() : _event.time = moment(_event.time);
            // TODO: Check if expired.
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

            let _result = await this._createEvent(context, config, body);
            if(!_result.rejected) {
                await this.onEvent(context);
            }

            // await this.onEvent(context);
            // _result = context.response.eventResult.rejected(context.event);
            //
            // if(_result.rejected) {
            //     if(config.abortOnReject) {
            //         context.log("Event '" + context.event.id + "' caused abort. Cause: " + _result.cause, LOG_LEVEL.ERROR,
            //                      "CloudEventHTTPFunction._handleEvent(context, config, body)");
            //         // TODO: Finish message
            //         throw CelastrinaError.newError("", 500, false, CelastrinaError.wrapError(_result.cause));
            //     }
            // }
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
        /**@type{BatchConfig}*/let _batchConfig = config.batch;
        /**@type{CloudEventEmitter}*/let _eventHandler;
        (_batchConfig.processAsync) ? _eventHandler = new AsyncEventEmitter() : _eventHandler = new SyncEventEmitter();
        await _eventHandler.emit(this, context, config, body);
    }
    /**
     * @param {JSONHTTPContext & CloudEventContext} context
     * @param {undefined|null|Object} body
     * @param {string} contentType
     * @return {Promise<void>}
     */
    async _emit(context, body, contentType) {
        /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
        if(contentType === "application/cloudevents-batch+json") return this._batchEvents(context, _config, body);
        else return this._handleEvent(context, _config, body);
    }
    /**
     * @param {Context & CloudEventContext} context
     * @param {undefined|null|Object} body
     * @param {string} contentType
     * @return {Promise<void>}
     */
    async _validateEvent(context, body, contentType) {
        /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
        if(typeof body === "undefined" || body == null) {
            context.log("Received empty request body.", LOG_LEVEL.WARN, "CloudEventHTTPFunction._doEvent(context, _body, contentType)");
            context.invocation.rejectInvocation(CelastrinaValidationError.newValidationError("Body is required.", "body", true));
        }
        else {
            if(contentType === "application/cloudevents-batch+json") {
                if(!_config.allowBatch) {
                    context.log("Batch messaging not supported.", LOG_LEVEL.WARN, "CloudEventHTTPFunction._batchEvents(context, config, body)");
                    context.invocation.rejectInvocation(CelastrinaValidationError.newValidationError("Batch messaging not supported.",
                        "body", true));
                }
                else if(!Array.isArray(body)) {
                    context.log("Invalid body content. Content-Type indicates batch but body does not contain an array.", LOG_LEVEL.ERROR,
                        "CloudEventHTTPFunction._batchEvents(context, config, body)");
                    context.invocation.rejectInvocation(CelastrinaValidationError.newValidationError(
                        "Invalid body content. Content-Type indicates batch but body does not contain an array.", "body",
                        true));
                }
                else if(body.length < _config.batch.limit) {
                    context.log("Batch limit of Batch limit of '" + _config.batch.limit + "' exceeded.", LOG_LEVEL.WARN,
                    "CloudEventHTTPFunction._batchEvents(context, config, body)");
                    context.invocation.rejectInvocation(CelastrinaValidationError.newValidationError(
                        "Invalid Payload. Batch limit of '" + _config.batch.limit + "' message(s) exceeded.", "body"));
                }
            }
            else if(contentType !== "application/cloudevents+json") {
                context.log("Invalid Content-Type '" + contentType + "' received.", LOG_LEVEL.ERROR,
                             "CloudEventHTTPFunction._doEvent(context, _body, contentType)");
                context.invocation.rejectInvocation(CelastrinaValidationError.newValidationError("Invalid Payload.",
                                                    "body", true));
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
 * HTTPCloudEventFunction
 * @author Robert R Murrell
 */
class HTTPCloudEventFunction extends JSONHTTPFunction {
    constructor(config) {
        super(config);
        this._base = new CloudEventBaseFunction();
    }
    /**
     * @param {Configuration} config
     * @return {Promise<JSONHTTPContext & CloudEventContext>}
     */
    async createContext(config) {
        return this._base.createContext(config);
    }
    /**
     * @param {(Context | JSONHTTPContext | CloudEventContext)} context
     * @return {Promise<void>}
     */
    async validate(context) {
        await this._base._validateEvent(context, context.responseBody, await context.getRequestHeader("content-type"));
        if(context.invocation.invocationRejected) throw context.invocation.rootCause;
    }
    /**
     * @param {(JSONHTTPContext | CloudEventContext)} context
     * @return {Promise<void>}
     * @private
     */
    async _post(context) {
        await this._base._emit(context, context.responseBody, await context.getRequestHeader("content-type"));
        /**@type{EventInvocation}*/let _incovation = context.invocation;
        if(context.invocation.invocationRejected) throw context.invocation.rootCause;
        else {
            /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
            let _code = _config.responceCode;
            if(_incovation.failed === 0) {
                context.send({accepted: _incovation.total}, _code);
            }
            else {
                let _response = {accepted: _incovation.total, rejected: _incovation.failed, events: []};
                for(let _event of _incovation.failedEvents) {
                    _response.events.unshift(_event);
                }
                context.send(_response, _code);
            }
            context.done();
        }
    }
}
/**
 * HTTPCloudEventAddOn
 * @author Robert R Murrell
 */
class HTTPCloudEventAddOn extends CloudEventAddOn {
    constructor() {super();}
    getDependancies() {return new Set([HTTPAddOn.CONFIG_ADDON_HTTP]);}
}
module.exports = {
    EventInvocation: EventInvocation,
    BatchConfig: BatchConfig,
    CloudEventAddOn: CloudEventAddOn,
    CloudEventEmitter: CloudEventEmitter,
    AsyncEventEmitter: AsyncEventEmitter,
    SyncEventEmitter: SyncEventEmitter,
    CloudEventBaseFunction: CloudEventBaseFunction,
    HTTPCloudEventFunction: HTTPCloudEventFunction,
    HTTPCloudEventAddOn: HTTPCloudEventAddOn
}
