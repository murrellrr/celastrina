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
    static CELASTRINAJS_TYPE = "celastrinajs.message.CloudEventListener"
    constructor() {
        this.__type = CloudEventListener.CELASTRINAJS_TYPE;
    }
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
    /**
     * @param {Context} context
     * @param {CloudEventAddOn} config
     * @param {(Object|Array<Object>)} events
     * @param {string} [contentType="application/cloudevents+json"]
     */
    constructor(context, config, events, contentType = "application/cloudevents+json") {
        /**@type{Context}*/this._context = context;
        /**@type{CloudEventAddOn}*/this._config = config;
        /**@type{(Object|Array<Object>)}*/this._events = events;
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
    /**@return{(Object|Array<Object>)}*/get events() {return this._events;}
    /**@return{Array<CloudEvent>}*/get accepted() {return this._acceptedEvents;}
    /**@return{Array<(Object|CloudEvent)>}*/get rejected() {return this._rejectedEvents;}
    /**@return{number}*/get rejectedCount() {return this._rejectedEvents.length;}
    /**@return{number}*/get totalCount() {return this.rejectedCount + this._acceptedEvents.length;}
}
/**
 * CloudEventProxy
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventProxy {
    /**
     * @param {CloudEventListener} listener
     */
    constructor(listener) {
        this._listener = listener;
    };
    /**
     * @param {CloudEventInvocation} invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<void>}
     * @abstract
     */
    async fireCloudEvent(invocation, event) {}
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
 * BatchCloudEventProxy
 * @author Robert R Murrell
 * @abstract
 */
class BatchCloudEventProxy extends CloudEventProxy {
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
 * AsyncBatchCloudEventProxy
 * @author Robert R Murrell
 */
class AsyncBatchCloudEventProxy extends BatchCloudEventProxy {
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
 * AsyncBatchCloudEventProxy
 * @author Robert R Murrell
 */
class SyncBatchCloudEventProxy extends BatchCloudEventProxy {
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
 * AsyncBatchCloudEventProxy
 * @author Robert R Murrell
 */
class SyncBatchOrderedCloudEventProxy extends SyncBatchCloudEventProxy {
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
    static CONFIG_CLOUDEVENT_EMITTER = "celastrinajs.addon.cloudevent.emitter";
    static CONFIG_CLOUDEVENT_LISTNER = "celastrinajs.addon.cloudevent.listener";
    static CONFIG_CLOUDEVENT_BATCH = "celastrinajs.addon.cloudevent.batch";
    static CONFIG_CLOUDEVENT_TIME = "celastrinajs.addon.cloudevent.time.required";
    static CONFIG_CLOUDEVENT_EXPIRES = "celastrinajs.addon.cloudevent.expires";
    static CONFIG_CLOUDEVENT_EXPIRE_TIME = "celastrinajs.addon.cloudevent.expires.time";
    static CONFIG_CLOUDEVENT_TYPE = "celastrinajs.addon.cloudevent.type";
    static CONFIG_CLOUDEVENT_SUBJECT = "celastrinajs.addon.cloudevent.subject";
    static CONFIG_CLOUDEVENT_SUBJECT_REQUIRED = "celastrinajs.addon.cloudevent.subject.required";
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
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TIME] = false;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRE_TIME] = 86400; // 24 hours
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA] = true;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_RESPONSE] = 200;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT_REQUIRED] = false;
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE] = new RegExp("^.*$");
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMITTER] = new CloudEventEmitter();
    }
    async initialize(azcontext, pm, rm, prm) {
        if(!instanceOfCelastringType(CloudEventListener.CELASTRINAJS_TYPE, this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_LISTNER]))
            throw CelastrinaValidationError.newValidationError("Listener is required.", CloudEventAddOn.CONFIG_CLOUDEVENT_LISTNER);
        if(this.allowBatch) {
            // Set up the batch configuration.
        }
        else
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE].compile();
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT].compile();
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION].compile();
        this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE].compile();
        let _listener = this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMITTER];
        // TODO: Need to require time if we batch order temporally.
        if(!this.timeRequired && this.expires) this.timeRequired = true;
    }
    /**@return{CloudEventEmitter}*/get emitter() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMITTER];}
    /**@param{CloudEventEmitter}emitter*/set emitter(emitter) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMITTER] = emitter;}
    /**@return{CloudEventListener}*/get listener() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_LISTNER];}
    /**@param{CloudEventListener}listener*/set listener(listener) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_LISTNER] = listener;}
    /**@return{BatchConfig}*/get batch() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH];}
    /**@param{BatchConfig}batch*/set batch(batch) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH] = batch;}
    /**@return{boolean}*/get allowBatch() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_BATCH] != null;}
    /**@return{boolean}*/get timeRequired() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TIME];}
    /**@param{boolean}req*/set timeRequired(req) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TIME] = req;}
    /**@return{boolean}*/get expires() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRE_TIME];}
    /**@param{boolean}expires*/set expires(expires) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRE_TIME] = expires;}
    /**@return{number}*/get expireTime() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRE_TIME];}
    /**@param{number}time*/set expireTime(time) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EXPIRE_TIME] = time;}
    /**@return{RegExp}*/get type() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE];}
    /**@param{RegExp}type*/set type(type) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_TYPE] = type;}
    /**@return{boolean}*/get subjectRequired() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT_REQUIRED];}
    /**@param{boolean}req*/set subjectRequired(req) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT_REQUIRED] = req;}
    /**@return{RegExp}*/get subject() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT];}
    /**@param{RegExp}subject*/set subject(subject) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_SUBJECT] = subject;}
    /**@return{RegExp}*/get specversion() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION];}
    /**@param{RegExp}version*/set specversion(version) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_VERSION] = version;}
    /**@return{RegExp}*/get contentType() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE];}
    /**@param{RegExp}type*/set contentType(type) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_CONTENTTYPE] = type;}
    /**@return{boolean}*/get allowEmpty() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA];}
    /**@param{boolean}allow*/set allowEmpty(allow) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_EMPTY_DATA] = allow;}
    /**@return{boolean}*/get abortOnReject() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_ABORT_ON_REJECT];}
    /**@param{boolean}abort*/set abortOnReject(abort) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_ABORT_ON_REJECT] = abort;}
    /**@return{number}*/get responceCode() {return this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_RESPONSE];}
    /**@param{number}code*/set responceCode(code) {this._config[CloudEventAddOn.CONFIG_CLOUDEVENT_RESPONSE] = code;}
}
/**
 * EventFunction
 * @author Robert R Murrell
 */
class CloudEventEmitter {
    constructor() {}
    /**
     * @param {CloudEventInvocation} invocation
     * @return {Promise<CloudEventInvocation>}
     */
    async fireCloudEvent(invocation) {
        // /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(CloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
        // if(contentType.search("application/cloudevents-batch\\+json") !== -1) return this._batchFireOnEvent(context, _config, body);
        // else return this._singleFireOnEvent(context, _config, body);
        return invocation;
    }
    /**
     * @param {CloudEventInvocation}invocation
     * @return {Promise<void>}
     */
    async validateEvent(invocation) {
        if(typeof invocation.events === "undefined" || invocation.events == null) {
            invocation.context.log("Received empty request body.", LOG_LEVEL.WARN, "CloudEventHTTPFunction._doEvent(context, _body, contentType)");
            throw CelastrinaValidationError.newValidationError("Body is required.", "body", true);
        }
        else {
            if(invocation.contentType.search("application/cloudevents-batch\\+json") !== -1) {
                if(!invocation.config.allowBatch) {
                    invocation.context.log("Batch messaging not supported.", LOG_LEVEL.WARN, "CloudEventHTTPFunction._batchEvents(context, config, body)");
                    throw CelastrinaValidationError.newValidationError("Batch messaging not supported.", "body", true);
                }
                else if(!Array.isArray(invocation.events)) {
                    invocation.context.log("Invalid body content. Content-Type indicates batch but body does not contain an array.", LOG_LEVEL.ERROR,
                        "CloudEventHTTPFunction._batchEvents(context, config, body)");
                    throw CelastrinaValidationError.newValidationError(
                         "Invalid body content. Content-Type indicates batch but body does not contain an array.", "body",
                         true);
                }
                else if(invocation.events.length < invocation.config.batch.limit) {
                    invocation.context.log("Batch limit of Batch limit of '" + invocation.config.batch.limit + "' exceeded.", LOG_LEVEL.WARN,
                    "CloudEventHTTPFunction._batchEvents(context, config, body)");
                    throw CelastrinaValidationError.newValidationError("Invalid Payload. Batch limit of '" +
                                 invocation.config.batch.limit + "' message(s) exceeded.", "body");
                }
            }
            else if(invocation.contentType.search("application/cloudevents\\+json") === -1) {
                invocation.context.log("Invalid Content-Type '" + invocation.contentType + "' received.", LOG_LEVEL.ERROR,
                             "CloudEventHTTPFunction._doEvent(context, _body, contentType)");
                throw CelastrinaValidationError.newValidationError("Invalid Payload.", "body", true);
            }
        }
    }
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
        /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(HTTPCloudEventAddOn.CONFIG_ADDON_CLOUDEVENT);
        context.invocation = new CloudEventInvocation(context, _config, context.requestBody, await context.getRequestHeader("content-type"));
    }
    /**
     * @param {(Context|JSONHTTPContext|{invocation?:CloudEventInvocation})} context
     * @return {Promise<void>}
     */
    async validate(context) {
        await context.invocation.config.emitter.validateEvent(context.invocation);
    }
    /**
     * @param {JSONHTTPContext|{invocation?:CloudEventInvocation}} context
     * @return {Promise<void>}
     * @private
     */
    async _post(context) {
        let _invocation = await context.invocation.config.emitter.fireCloudEvent(context.invocation);
        let _response = {
            accepted: _invocation.totalCount,
            rejected: _invocation.rejectedCount
        };
        let _code = _invocation.config.responceCode;
        if(_invocation.rejectedCount > 0) _response.events = _invocation.rejected;
        context.send(_response, _code);
        context.done();
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
    CloudEventListener: CloudEventListener,
    BatchConfig: BatchConfig,
    CloudEventAddOn: CloudEventAddOn,
    CloudEventEmitter: CloudEventEmitter,
    HTTPCloudEventFunction: HTTPCloudEventFunction,
    HTTPCloudEventAddOn: HTTPCloudEventAddOn
}
