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
const {CloudEvent, CloudEventV1, CloudEventV1Attributes} = require("cloudevents");
const moment = require("moment");
/**
 * CelastrinaEvent
 * @author Robert R Murrell
 */
class CelastrinaEvent {
    /**
     * @param {Context} context
     */
    constructor(context) {
        this._context = context;
    }
    /**2return{Context}*/get context() {return this._context}
}
/**
 * CelastrinaCloudEvent
 * @author Robert R Murrell
 */
class CelastrinaCloudEvent extends CelastrinaEvent {
    /**
     * @param {Context} context
     * @param {CloudEvent} event
     */
    constructor(context, event) {
        super(context);
        this._event = event;
        this._reject = false;
        this._cause = null;
    }
    /**@return{CloudEvent}*/get event() {return this._event;}
    /**@return{boolean}*/get rejected() {return this._reject}
    get cause() {return this._cause;}
    reject(cause = null) {
        this._reject = true;
        this._cause = cause;
    }
}
/**
 * CelastrinaCloudRollbackEvent
 * @author Robert R Murrell
 */
class CelastrinaCloudRollbackEvent extends CelastrinaEvent {
    /**
     * @param {Context} context
     * @param {Array<CloudEvent>} events
     */
    constructor(context, events) {
        super(context);
        this._events = events;
    }
    /**@return{Array<CloudEvent>}*/get events() {return this._event;}
}
/**
 * CloudEventListener
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventListener {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.CloudEventListener";}
    constructor() {}
    /**
     * @param {CelastrinaCloudEvent} event
     * @return {Promise<void>}
     * @abstract
     */
    async onEvent(event) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {CelastrinaCloudEvent} event
     * @return {Promise<void>}
     * @abstract
     */
    async onReject(event) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {CelastrinaCloudRollbackEvent} event
     * @return {Promise<void>}
     */
    async onRollBack(event) {throw CelastrinaError.newError("Not Implemented.", 501);}
}
/**
 * CloudEventInvocation
 * @author Robert R Murrell
 */
class CloudEventInvocation {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.CloudEventInvocation";}
    /**
     * @param {Context} context
     * @param {CloudEventAddOn} config
     * @param {string} [contentType="application/cloudevents+json"]
     */
    constructor(context, config, contentType = "application/cloudevents+json") {
        /**@type{Context}*/this._context = context;
        /**@type{CloudEventAddOn}*/this._config = config;
        /**@type{string}*/this._contentType = contentType;
        /**@type{(Array<(Object|CloudEvent)>)}*/this._rejectedEvents = [];
        /**@type{(Array<CloudEvent>)}*/this._acceptedEvents = [];
    };
    /**@return{Context}*/get context() {return this._context;};
    /**@return{CloudEventAddOn}*/get config() {return this._config;}
    /**@return{string}*/get contentType() {return this._contentType;};
    /**
     * @param {CloudEvent} event
     */
    accept(event) {
        this._acceptedEvents.unshift(event);
    }
    /**
     * @param {Object|CloudEvent} event
     * @param {*} cause
     */
    reject(event, cause) {
        this._rejectedEvents.unshift({event: event, cause: cause});
    }
    /**@return{Array<CloudEvent>}*/get accepted() {return this._acceptedEvents;}
    /**@return{Array<(Object|CloudEvent)>}*/get rejected() {return this._rejectedEvents;}
    /**@return{number}*/get rejectedCount() {return this._rejectedEvents.length;}
    /**@return{number}*/get totalCount() {return this.rejectedCount + this._acceptedEvents.length;}
}
/**
 * CloudEventEmitter
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventEmitter {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.CloudEventEmitter";}
    /**
     * @param {CloudEventListener} listener
     */
    constructor(listener) {
        this._listener = listener;
    }
    /**
     * @param {CloudEventInvocation} invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<CloudEventInvocation>}
     * @abstract
     */
    async fireCloudEvent(invocation, event) {}
    /**
     * @param {CloudEventInvocation}invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<CloudEventInvocation>}
     */
    async validateEvent(invocation, event) {
        if(typeof event === "undefined" || event == null) {
            invocation.context.log("Received empty request body.", LOG_LEVEL.WARN, "CloudEventEmitter.validateEvent(invocation, event)");
            throw CelastrinaValidationError.newValidationError("Body is required.", "body", true);
        }
        else {
            if(invocation.contentType.search("application/cloudevents-batch\\+json") !== -1) {
                if(!invocation.config.allowBatch) {
                    invocation.context.log("Batch messaging not supported.", LOG_LEVEL.WARN, "CloudEventEmitter.validateEvent(invocation, event)");
                    throw CelastrinaValidationError.newValidationError("Batch messaging not supported.", "body", true);
                }
                else if(!Array.isArray(event)) {
                    invocation.context.log("Invalid body content. Content-Type indicates batch but body does not contain an array.", LOG_LEVEL.ERROR,
                        "CloudEventEmitter.validateEvent(invocation, event)");
                    throw CelastrinaValidationError.newValidationError(
                        "Invalid body content. Content-Type indicates batch but body does not contain an array.", "body",
                        true);
                }
                else if(event.length < invocation.config.batch.limit) {
                    invocation.context.log("Batch limit of Batch limit of '" + invocation.config.batch.limit + "' exceeded.", LOG_LEVEL.WARN,
                        "CloudEventEmitter.validateEvent(invocation, event)");
                    throw CelastrinaValidationError.newValidationError("Invalid Payload. Batch limit of '" +
                        invocation.config.batch.limit + "' message(s) exceeded.", "body");
                }
            }
            else if(invocation.contentType.search("application/cloudevents\\+json") === -1) {
                invocation.context.log("Invalid Content-Type '" + invocation.contentType + "' received.", LOG_LEVEL.ERROR,
                    "CloudEventEmitter.validateEvent(invocation, event)");
                throw CelastrinaValidationError.newValidationError("Invalid Payload.", "body", true);
            }
        }
    }
    /**
     * @param {CloudEventInvocation} invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<void>}
     */
    async _fireCloudEvent(invocation, event) {
        let _response = await this._createCloudEvent(invocation, /**@type{(CloudEventV1|CloudEventV1Attributes)}*/event);
        if(_response.rejected) {
            // fire the rejected event.
        }
        else {
            let _event = new CelastrinaCloudEvent(invocation.context, _response.event);
            await this._listener.onEvent(_event);
            if(_event.rejected) {
                invocation.reject(_event.event, _event.cause);
                await this._listener.onReject(_event);
            }
        }
    };
    /**
     * @param {CloudEventInvocation} invocation
     * @param {(CloudEventV1|CloudEventV1Attributes)} event
     * @return {Promise<{rejected:boolean, event?:(CloudEvent|Object), cause?:Object}>}
     */
    async _createCloudEvent(invocation, event) {
        let _response = {rejected: true};
        try {
            let _event = new CloudEvent(event);
            _response.event = _event;
            if(!_event.specversion.match(invocation.config.specversion)) {
                invocation.context.log("Spec Version '" + _event.specversion + "' not supported.", LOG_LEVEL.WARN,
                    "CloudEventEmitter._createEvent(context, config, body)");
                _response.cause = CelastrinaValidationError.newValidationError(
                    "Spec Version '" + _event.specversion + "' not supported.", "CloudEvent.specversion");
            }
            else if(!_event.type.match(invocation.config.type)) {
                invocation.context.log("Type '" + _event.type + "' not supported.", LOG_LEVEL.WARN,
                    "CloudEventEmitter._createEvent(context, config, body)");
                _response.cause = CelastrinaValidationError.newValidationError(
                    "Type '" + _event.type + "' not supported.", "CloudEvent.type");
            }
            else if((invocation.config.subjectRequired) || (typeof _event.subject !== "undefined")){
                if(!_event.subject.match(invocation.config.subject)) {
                    invocation.context.log("Subject '" + _event.subject + "' not supported.", LOG_LEVEL.WARN,
                        "CloudEventEmitter._createEvent(context, config, body)");
                    _response.cause = CelastrinaValidationError.newValidationError(
                        "Subject '" + _event.subject + "' not supported.", "CloudEvent.subject");
                }
            }
            else if(!_event.datacontenttype.match(invocation.config.contentType)) {
                invocation.context.log("Data Content Type '" + _event.datacontenttype + "' not supported.", LOG_LEVEL.WARN,
                    "CloudEventEmitter._createEvent(context, config, body)");
                _response.cause = CelastrinaValidationError.newValidationError(
                    "Data Content Type '" + _event.datacontenttype + "' not supported.", "CloudEvent.datacontenttype");
            }
            else if((invocation.config.timeRequired) || (typeof _event.time !== "undefined")) {
                if(invocation.config.expires) {
                    // TODO: Check if expired.
                }
            }
            else _response.rejected = false;
            return _response;
        }
        catch(exception) {
            invocation.context.log(exception, LOG_LEVEL.ERROR, "CloudEventEmitter._createEvent(context, config, body)");
            if(instanceOfCelastringType(CelastrinaError.CELASTRINAJS_ERROR_TYPE, exception)) throw exception;
            else {
                if(exception instanceof TypeError) {
                    _response.event = event;
                    _response.cause = exception.params;
                    return _response;
                }
                else throw CelastrinaError.wrapError(exception);
            }
        }
    }
}
/**
 * BatchCloudEventEmitter
 * @author Robert R Murrell
 * @abstract
 */
class BatchCloudEventEmitter extends CloudEventEmitter {
    constructor(listener) {super(listener);}
    /**
     * @param {CloudEventInvocation} invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<void>}
     */
    async fireCloudEvent(invocation, event) {
        if(Array.isArray(event))
            await this.fireBatchCloudEvent(invocation, event);
        else
            await this._fireCloudEvent(invocation, event);
        // TODO: Checking to see if we;ve rejected.
    }
    /**
     * @param {CloudEventInvocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<void>}
     * @abstract
     */
    async fireBatchCloudEvent(invocation, event) {};
}
/**
 * AsyncBatchCloudEventEmitter
 * @author Robert R Murrell
 */
class AsyncBatchCloudEventEmitter extends BatchCloudEventEmitter {
    constructor(listener) {super(listener);}
    /**
     * @param {CloudEventInvocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<void>}
     * @abstract
     */
    async fireBatchCloudEvent(invocation, event) {
        let _promises = [];
        for(let _event of event) {
            _promises.unshift(this._fireCloudEvent(invocation, _event));
        }
        await Promise.all(_promises);
    }
}
/**
 * SyncBatchCloudEventEmitter
 * @author Robert R Murrell
 */
class SyncBatchCloudEventEmitter extends BatchCloudEventEmitter {
    constructor(listener) {super(listener);}
    /**
     * @param {CloudEventInvocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<void>}
     * @abstract
     */
    async fireBatchCloudEvent(invocation, event) {
        for(let _event of event) {
            await this._fireCloudEvent(invocation, _event);
            if(invocation.rejectedCount > 0) break;
        }
    }
}
/**
 * SyncBatchOrderedCloudEventEmitter
 * @author Robert R Murrell
 */
class SyncBatchOrderedCloudEventEmitter extends SyncBatchCloudEventEmitter {
    constructor(listener) {super(listener);}
    /**
     * @param {CloudEventInvocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<void>}
     * @abstract
     */
    async fireBatchCloudEvent(invocation, event) {
        event = event.sort(
/**
          * @param{{time:string}} a
          * @param{{time:string}} b
          */
          (a, b) => {
            return a.time.localeCompare(b.time);
        });
        await super.fireBatchCloudEvent(invocation, event);
    }
}
/**
 * BatchConfig
 * @author Robert R Murrell
 */
class BatchConfig {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.addon.cloudevent.config.BatchConfig";}
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
    }
    /**@type{number}*/get limit() {return this._limit;}
    /**@type{boolean}*/get processAsync() {return this._processAsync;}
    /**@type{boolean}*/get abortOnReject() {return this._abortOnReject;}
    /**@type{boolean}*/get orderTemporally() {return this._orderTemporally;}
}
/**
 * JSONHTTPEventAddOn
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventAddOn extends AddOn {
    /**@type{string}*/static get addOnName() {return "celastrinajs.message.addon.cloudevent";}
    constructor() {
        super();
        this._batchConfig = null;
        this._listener = null;
        this._abortOnReject = false;
        this._requireTime = false;
        this._expires = false;
        this._expireTime = 86400; // 24 hours
        this._allowEmptyData = true;
        this._responseCode = 200;
        this._type = new RegExp("^.*$");
        this._requireSubject = false;
        this._subject = new RegExp("^.*$");
        this._version = new RegExp("^.*$");
        this._dataContentType = new RegExp("^.*$");
        this._emitter = null;
    }
    async initialize(azcontext, config) {
        if(!instanceOfCelastringType(CloudEventListener, this._listener))
            throw CelastrinaValidationError.newValidationError("Listener is required.", "_listener");
        if(this.allowBatch) {
            let _batch = this.batch;
            if(_batch.processAsync) this._emitter = new AsyncBatchCloudEventEmitter(this._listener);
            else if(_batch.orderTemporally) this._emitter = new SyncBatchOrderedCloudEventEmitter(this._listener);
            else this._emitter = new SyncBatchCloudEventEmitter(this._listener);
        }
        else
            this._emitter = new SyncBatchCloudEventEmitter(this._listener);
        this._type.compile();
        this._subject.compile();
        this._version.compile();
        this._dataContentType.compile();
        // TODO: Need to require time if we batch order temporally.
        if(!this.timeRequired && this.expires) this.timeRequired = true;
    }
    /**@return{CloudEventEmitter}*/get emitter() {return this._emitter;}
    /**@param{CloudEventEmitter}emitter*/set emitter(emitter) {this._emitter = emitter;}
    /**@return{CloudEventListener}*/get listener() {return this._listener;}
    /**@param{CloudEventListener}listener*/set listener(listener) {this._listener = listener;}
    /**@return{BatchConfig}*/get batch() {return this._batchConfig;}
    /**@param{BatchConfig}batch*/set batch(batch) {this._batchConfig = batch;}
    /**@return{boolean}*/get allowBatch() {return this._batchConfig != null;}
    /**@return{boolean}*/get timeRequired() {return this._requireTime;}
    /**@param{boolean}req*/set timeRequired(req) {this._requireTime = req;}
    /**@return{boolean}*/get expires() {return this._expires;}
    /**@param{boolean}expires*/set expires(expires) {this._expires = expires;}
    /**@return{number}*/get expireTime() {return this._expireTime;}
    /**@param{number}time*/set expireTime(time) {this._expireTime = time;}
    /**@return{RegExp}*/get type() {return this._type;}
    /**@param{RegExp}type*/set type(type) {this._type = type;}
    /**@return{boolean}*/get subjectRequired() {return this._requireSubject;}
    /**@param{boolean}req*/set subjectRequired(req) {this._requireSubject = req;}
    /**@return{RegExp}*/get subject() {return this._subject;}
    /**@param{RegExp}subject*/set subject(subject) {this._subject = subject;}
    /**@return{RegExp}*/get specversion() {return this._version;}
    /**@param{RegExp}version*/set specversion(version) {this.this._version = version;}
    /**@return{RegExp}*/get contentType() {return this._dataContentType;}
    /**@param{RegExp}type*/set contentType(type) {this._dataContentType = type;}
    /**@return{boolean}*/get allowEmpty() {return this._allowEmptyData;}
    /**@param{boolean}allow*/set allowEmpty(allow) {this._allowEmptyData = allow;}
    /**@return{boolean}*/get abortOnReject() {return this._abortOnReject;}
    /**@param{boolean}abort*/set abortOnReject(abort) {this._abortOnReject = abort;}
    /**@return{number}*/get responseCode() {return this._responseCode;}
    /**@param{number}code*/set responseCode(code) {this._responseCode = code;}
}
/**
 * HTTPCloudEventFunction
 * @author Robert R Murrell
 */
class HTTPCloudEventFunction extends JSONHTTPFunction {
    constructor(config) {
        super(config);
    }
    /**
     * @param {(Context|JSONHTTPContext|{invocation?:CloudEventInvocation})} context
     * @return {Promise<void>}
     */
    async initialize(context) {
        /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(
                HTTPCloudEventAddOn);
        context.invocation = new CloudEventInvocation(context, _config, await context.getRequestHeader("content-type"));
    }
    /**
     * @param {(Context|JSONHTTPContext|{invocation?:CloudEventInvocation})} context
     * @return {Promise<void>}
     */
    async validate(context) {
        //await context.invocation.config.emitter.validateEvent(context.invocation);
    }
    /**
     * @param {JSONHTTPContext|{invocation?:CloudEventInvocation}} context
     * @return {Promise<void>}
     * @private
     */
    async _post(context) {
        // let _invocation = await context.invocation.config.emitter.fireCloudEvent(context.invocation);
        // let _response = {
        //     accepted: _invocation.totalCount,
        //     rejected: _invocation.rejectedCount
        // };
        // let _code = _invocation.config.responceCode;
        // if(_invocation.rejectedCount > 0) _response.events = _invocation.rejected;
        // context.send(_response, _code);
        // context.done();
    }
}
/**
 * HTTPCloudEventAddOn
 * @author Robert R Murrell
 */
class HTTPCloudEventAddOn extends CloudEventAddOn {
    constructor() {super();}
    getDependancies() {return new Set([HTTPAddOn.addOnName]);}
}
module.exports = {
    CloudEventListener: CloudEventListener,
    BatchConfig: BatchConfig,
    CloudEventAddOn: CloudEventAddOn,
    CloudEventEmitter: CloudEventEmitter,
    HTTPCloudEventFunction: HTTPCloudEventFunction,
    HTTPCloudEventAddOn: HTTPCloudEventAddOn
}
