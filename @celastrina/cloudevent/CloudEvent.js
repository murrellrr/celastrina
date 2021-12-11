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
const {CelastrinaError, CelastrinaValidationError, CelastrinaEvent, LOG_LEVEL, AddOn, instanceOfCelastringType,
       Configuration, Context, BaseFunction} = require("@celastrina/core");
const {JSONHTTPContext, JSONHTTPFunction, HTTPAddOn} = require("@celastrina/http");
const {CloudEvent, CloudEventV1, CloudEventV1Attributes} = require("cloudevents");
const moment = require("moment");

/**
 * CloudEventError
 * @author Robert R Murrell
 */
class CloudEventAbortError extends CelastrinaError {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.cloudevent.CloudEventAbortError";}
    /**
     * @param {string} message
     * @param {(Object|CloudEvent)} event
     * @param {(string|number)} id
     * @param {Array<string>} [causes=[]]
     * @param {number} [code=500]
     * @param {boolean} [drop=false]
     */
    constructor(message, event, id, causes = [], code = 500,
                drop = false) {
        super(message, code, drop);
        /**@type{string}*/this.name = this.constructor.name;
        /**@type{CloudEvent}*/this._event = event;
        /**@type{number}*/this._id = id;
        /**@type{Array<string>}*/this._causes = causes;
    }
    /**@return {string}*/toString() {
        return "[" + this.name + "][" + this.code + "][" + this.drop + "][" + this._id + "]: " + this.message;
    }
    /**@return{CloudEvent}*/get event() {return this._event;}
    /**@return{number}*/get id() {return this._id;}
    /**@return{Array<string>}*/get causes() {return this._causes;}
    /**
     * @param {string} message
     * @param {(Object|CloudEvent)} event
     * @param {(string|number)} id
     * @param {Array<string>} [causes=[]]
     * @param {number} [code=500]
     * @param {boolean} [drop=false]
     * @return CloudEventAbortError
     */
    static newAbortError(message, event, id, causes = [],
                         code = 500, drop = false) {
        return new CloudEventAbortError(message, event, id, causes, code, drop);
    }
}

/**
 * CloudEventReceived
 * @author Robert R Murrell
 */
class CloudEventReceived extends CelastrinaEvent {
    /**
     * @param {Context} context
     * @param {*} [source=null]
     * @param {*} [data=null]
     * @param {moment.Moment} [time=moment()]
     * @param {boolean} [rejected=false]
     * @param {*} [cause=null]
     */
    constructor(context, source = null, data = null, time = moment(), rejected = false,
                cause = null) {
        super(context, source, data , time, rejected, cause);
    }
}
/**
 * CloudEventAbort
 * @author Robert R Murrell
 */
class CloudEventAbort extends CelastrinaEvent {
    /**
     * @param {Context} context
     * @param {*} [source=null]
     * @param {*} [data=null]
     * @param {moment.Moment} [time=moment()]
     * @param {boolean} [rejected=false]
     * @param {*} [cause=null]
     */
    constructor(context, source = null, data = null, time = moment(), rejected = false,
                cause = null) {
        super(context, source, data , time, rejected, cause);
    }
}
/**
 * CloudEventListener
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventListener {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.cloudevent.CloudEventListener";}
    constructor() {}
    /**
     * @param {CloudEventReceived} event
     * @return {Promise<void>}
     * @abstract
     */
    async onEvent(event) {throw CelastrinaError.newError("Not Implemented.", 501);}
    /**
     * @param {CloudEventReceived} event
     * @return {Promise<void>}
     * @abstract
     */
    async onReject(event) {} // Override to do something
    /**
     * @param {CloudEventAbort} event
     * @return {Promise<void>}
     * @abstract
     */
    async onAbort(event) {} // Override to do something
}
/**
 * Invocation
 * @author Robert R Murrell
 */
class Invocation {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.cloudevent.Invocation";}
    /**
     * @param {Context} context
     * @param {CloudEventAddOn} config
     * @param {string} [contentType="application/cloudevents+json"]
     */
    constructor(context, config, contentType = "application/cloudevents+json") {
        /**@type{Context}*/this._context = context;
        /**@type{CloudEventAddOn}*/this._config = config;
        /**@type{string}*/this._contentType = contentType;
        /**@type{Object}*/this._rejectedEvents = {};
        /**@type{number}*/this._rejectEventCount = 0;
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
     * @param {number} [id=0]
     * @return {Promise<boolean>}
     */
    async isRejected(event, id = 0) {
        let _id = id;
        if((typeof event === "object") && event != null)
            if(event.hasOwnProperty("id") && (typeof event.id === "string") && event.id.trim().length > 0)
                _id = event.id;
        return this._rejectedEvents.hasOwnProperty(_id);
    }
    /**
     * @param {undefined|null|Object|CloudEvent} event
     * @param {(Error|Array<Error>)} cause
     * @param {number} [id=0]
     */
    reject(event, cause, id = 0) {
        if((typeof event === "object") && event != null) {
            let _id = id;
            if(event.hasOwnProperty("id") && (typeof event.id === "string") && event.id.trim().length > 0)
                _id = event.id;
            /**@type{(null|undefined|{event:(Object|CloudEvent),causes:Array<{message:string,tag?:string}>})}*/
            let _rejected = this._rejectedEvents[_id];
            if(typeof _rejected === "undefined" || _rejected == null) {
                _rejected = {event: event, causes: []};
                this._rejectedEvents[_id] = _rejected;
            }
            (Array.isArray(cause)) ? _rejected.causes = _rejected.causes.concat(cause) : _rejected.causes.unshift(cause);
            ++this._rejectEventCount;
        }
    }
    /**@return{Array<CloudEvent>}*/get acceptedEvents() {return this._acceptedEvents;}
    /**@return{Array<(Object|CloudEvent)>}*/get rejectedEvents() {
        let _rejected = [];
        for(let _prop in this._rejectedEvents) {
            if(this._rejectedEvents.hasOwnProperty(_prop)) {
                _rejected.unshift(this._rejectedEvents[_prop]);
            }
        }
        return _rejected;
    }
    /**@return{number}*/get rejectedCount() {return this._rejectEventCount;}
    /**@return{number}*/get acceptedCount() {return this._acceptedEvents.length;}
    /**@return{number}*/get totalCount() {return this.rejectedCount + this.acceptedCount;}
}
/**
 * CloudEventEmitter
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventEmitter {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.cloudevent.CloudEventEmitter";}
    /**
     * @param {CloudEventListener} listener
     */
    constructor(listener) {
        this._listener = listener;
    }
    /**
     * @param {Invocation} invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<Invocation>}
     * @abstract
     */
    async fireCloudEvent(invocation, event) {}
    /**
     * @param {Invocation}invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<Invocation>}
     */
    async validateInvocation(invocation, event) {
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
     * @param {Invocation} invocation
     * @param {CloudEvent} event
     * @param {number} [id = 0]
     * @return {Promise<void>}
     */
    async validateCloudEvent(invocation, event, id = 0) {
        if(!event.specversion.match(invocation.config.specversion)) {
            invocation.context.log("Spec Version '" + event.specversion + "' not supported.", LOG_LEVEL.WARN,
                "CloudEventEmitter._createEvent(context, config, body)");
            invocation.reject(event, CelastrinaValidationError.newValidationError(
                "Spec Version '" + event.specversion + "' not supported.", "CloudEvent.specversion"), id);
        }
        if(!event.type.match(invocation.config.type)) {
            invocation.context.log("Type '" + event.type + "' not supported.", LOG_LEVEL.WARN,
                "CloudEventEmitter._createEvent(context, config, body)");
            invocation.reject(event, CelastrinaValidationError.newValidationError(
                "Type '" + event.type + "' not supported.", "CloudEvent.type"), id);
        }
        if((invocation.config.subjectRequired) || (typeof event.subject !== "undefined")){
            if(!event.subject.match(invocation.config.subject)) {
                invocation.context.log("Subject '" + event.subject + "' not supported.", LOG_LEVEL.WARN,
                    "CloudEventEmitter._createEvent(context, config, body)");
                invocation.reject(event, CelastrinaValidationError.newValidationError(
                    "Subject '" + event.subject + "' not supported.", "CloudEvent.subject"), id);
            }
        }
        if(!event.datacontenttype.match(invocation.config.dataContentType)) {
            invocation.context.log("Data Content Type '" + event.datacontenttype + "' not supported.", LOG_LEVEL.WARN,
                "CloudEventEmitter._createEvent(context, config, body)");
            invocation.reject(event, CelastrinaValidationError.newValidationError(
                "Data Content Type '" + event.datacontenttype + "' not supported.", "CloudEvent.datacontenttype"), id);
        }
        if((invocation.config.timeRequired) || (typeof event.time !== "undefined")) {
            if(invocation.config.expires) {
                // TODO: Check if expired.
            }
        }
    }
    /**
     * @param {Invocation} invocation
     * @param {(CloudEventV1|CloudEventV1Attributes)} event
     * @param {number} [id = 0]
     * @return {Promise<CloudEvent>}
     */
    async createCloudEvent(invocation, event, id = 0) {
        try {
            return new CloudEvent(event);
        }
        catch(exception) {
            invocation.context.log(exception, LOG_LEVEL.ERROR, "CloudEventEmitter.createCloudEvent(invocation, event)");
            if(instanceOfCelastringType(CelastrinaError, exception) || instanceOfCelastringType(CelastrinaValidationError, exception))
                throw exception;
            else if(exception instanceof TypeError) {
                let _errors = exception.errors;
                if(Array.isArray(_errors)) {
                    let _cause = [];
                    for(let _err of _errors) {
                        _cause.unshift(CelastrinaValidationError.newValidationError(_err.message, JSON.stringify(_err.params)));
                    }
                    invocation.reject(event, _cause);
                }
                else invocation.reject(event, new CelastrinaError.wrapError(exception));
                return null;
            }
            else
                throw CelastrinaError.wrapError(exception);
        }
    }
    /**
     * @param {Invocation} invocation
     * @param {(Object|CloudEvent)} event
     * @param {number} [id = 0]
     * @return {Promise<boolean>}
     * @private
     */
    async _accepted(invocation, event, id) {
        if(await invocation.isRejected(event, id)) {
            let _ccevent = new  CloudEventReceived(invocation.context, event);
            await this._listener.onReject(_ccevent);
            if(invocation.config.abortOnReject) {
                let _crevent = new CloudEventAbort(invocation.context, invocation.acceptedEvents);
                await this._listener.onAbort(_crevent);
                throw CelastrinaError.newError("ABORT!"); // todo: need to fill in message and cause.
            }
            else return false;
        }
        return true;
    }
    /**
     * @param {Invocation} invocation
     * @param {Object} event
     * @param {number} [id = 0]
     * @return {Promise<void>}
     */
    async _fireCloudEvent(invocation, event, id = 0) {
        let _cevent  = await this.createCloudEvent(invocation, /**@type{(CloudEventV1|CloudEventV1Attributes)}*/event);
        if(await this._accepted(invocation, event, id)) {
            await this.validateCloudEvent(invocation, _cevent);
            if(await this._accepted(invocation, event, id)) {
                let _ccevent = new CloudEventReceived(invocation.context, _cevent);
                await this._listener.onEvent(_ccevent);
                if(_ccevent.rejected) invocation.reject(_cevent, _ccevent.cause);
                if(await this._accepted(invocation, event, id)) invocation.accept(_cevent);
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
    /**
     * @param {CloudEventListener} listener
     */
    constructor(listener) {super(listener);}
    /**
     * @param {Invocation} invocation
     * @param {(Object|Array<Object>)} event
     * @return {Promise<Invocation>}
     */
    async fireCloudEvent(invocation, event) {
        if(Array.isArray(event))
            await this.fireBatchCloudEvent(invocation, event);
        else
            await this._fireCloudEvent(invocation, event);
        return invocation;
    }
    /**
     * @param {Invocation} invocation
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
    /**
     * @param {CloudEventListener} listener
     */
    constructor(listener) {super(listener);}
    /**
     * @param {Invocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<Invocation>}
     */
    async fireBatchCloudEvent(invocation, event) {
        let _promises = [];
        for(let index in event) {
            let _event = event[index];
            _promises.unshift(this._fireCloudEvent(invocation, _event, index));
        }
        await Promise.all(_promises);
        return invocation;
    }
}
/**
 * SyncBatchCloudEventEmitter
 * @author Robert R Murrell
 */
class SyncBatchCloudEventEmitter extends BatchCloudEventEmitter {
    /**
     * @param {CloudEventListener} listener
     */
    constructor(listener) {super(listener);}
    /**
     * @param {Invocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<Invocation>}
     */
    async fireBatchCloudEvent(invocation, event) {
        for(let index in event) {
            let _event = event[index];
            await this._fireCloudEvent(invocation, _event, index);
        }
        return invocation;
    }
}
/**
 * SyncBatchOrderedCloudEventEmitter
 * @author Robert R Murrell
 */
class SyncBatchOrderedCloudEventEmitter extends SyncBatchCloudEventEmitter {
    constructor(listener) {super(listener);}
    /**
     * @param {Invocation} invocation
     * @param {Array<Object>} event
     * @return {Promise<Invocation>}
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
        return invocation;
    }
}
/**
 * BatchConfig
 * @author Robert R Murrell
 */
class BatchConfig {
    /**@return{string}*/static get celastrinaType() {return "celastrinajs.message.cloudevent.BatchConfig";}
    /**
     * @param {number} [limit=10]
     * @param {boolean} [processAsync=true]
     * @param {boolean} [orderTemporally=false] Order message by time, only followed if processAsync is false, set to false if
     *                                          processAsync is true.
     */
    constructor(limit = 10, processAsync = true, orderTemporally = false) {
        this._limit = limit;
        this._processAsync = processAsync;
        (this._processAsync) ? this._orderTemporally = orderTemporally : this._orderTemporally = false;
    }
    /**@return{number}*/get limit() {return this._limit;}
    /**@param{number}limit*/set limit(limit) {this._limit = limit;}
    /**@return{boolean}*/get processAsync() {return this._processAsync;}
    /**@param{boolean}pasync*/set processAsync(pasync) {this._processAsync = pasync;}
    /**@return{boolean}*/get orderTemporally() {return this._orderTemporally;}
    /**@param{boolean}order*/set orderTemporally(order) {this._orderTemporally = order;}
    /**
     * @param {number} limit
     * @return {BatchConfig}
     */
    setLimit(limit) {
        this._limit = limit;
        return this;
    }
    /**
     * @param {boolean} pasync
     * @return {BatchConfig}
     */
    setProcessAsync(pasync) {
        this._processAsync = pasync;
        return this;
    }
    /**
     * @param {boolean} order
     * @return {BatchConfig}
     */
    setOrderTemporally(order) {
        this._orderTemporally = order;
        return this;
    }
}
/**
 * JSONHTTPEventAddOn
 * @author Robert R Murrell
 * @abstract
 */
class CloudEventAddOn extends AddOn {
    /**@type{string}*/static get addOnName() {return "celastrinajs.message.addon.cloudevent";}
    /**
     * @param {CloudEventListener} [listener=null]
     */
    constructor(listener = null) {
        super();
        this._batchConfig = null;
        this._listener = listener;
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
    /**
     * @param azcontext
     * @param {Object} config
     * @return {Promise<void>}
     */
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
    /**@param{boolean}required*/set subjectRequired(required) {this._requireSubject = required;}
    /**@return{RegExp}*/get subject() {return this._subject;}
    /**@param{RegExp}subject*/set subject(subject) {this._subject = subject;}
    /**@return{RegExp}*/get specversion() {return this._version;}
    /**@param{RegExp}version*/set specversion(version) {this._version = version;}
    /**@return{RegExp}*/get dataContentType() {return this._dataContentType;}
    /**@param{RegExp}type*/set dataContentType(type) {this._dataContentType = type;}
    /**@return{boolean}*/get allowEmpty() {return this._allowEmptyData;}
    /**@param{boolean}allow*/set allowEmpty(allow) {this._allowEmptyData = allow;}
    /**@return{boolean}*/get abortOnReject() {return this._abortOnReject;}
    /**@param{boolean}abort*/set abortOnReject(abort) {this._abortOnReject = abort;}
    /**@return{number}*/get responseCode() {return this._responseCode;}
    /**@param{number}code*/set responseCode(code) {this._responseCode = code;}
    /**
     * @param {BatchConfig} batch
     * @return {CloudEventAddOn}
     */
    setBatch(batch) {
        this._batchConfig = batch;
        return this;
    }
    /**
     * @param {boolean} required
     * @return {CloudEventAddOn}
     */
    setTimeRequired(required) {
        this._requireTime = required;
        return this;
    }
    /**
     * @param {boolean} expires
     * @return {CloudEventAddOn}
     */
    setExpires(expires) {
        this._expires = expires;
        return this;
    }
    /**
     * @param {number} time
     * @return {CloudEventAddOn}
     */
    setExpireTime(time) {
        this._expireTime = time;
        return this;
    }
    /**
     * @param {RegExp} type
     * @return {CloudEventAddOn}
     */
    setType(type) {
        this._type = type;
        return this;
    }
    /**
     * @param {string} pattern
     * @return {CloudEventAddOn}
     */
    setTypePattern(pattern) {
        this._type = new RegExp(pattern);
        return this;
    }
    /**
     * @param {boolean} req
     * @return {CloudEventAddOn}
     */
    setSubjectRequired(req) {
        this._requireSubject = req;
        return this;
    }
    /**
     * @param {RegExp} subject
     * @return {CloudEventAddOn}
     */
    setSubject(subject) {
        this._subject = subject;
        return this;
    }
    /**
     * @param {string} pattern
     * @return {CloudEventAddOn}
     */
    setSubjectPattern(pattern) {
        this._subject = new RegExp(pattern);
        return this;
    }
    /**
     * @param {RegExp} version
     * @return {CloudEventAddOn}
     */
    setSpecVersion(version) {
        this._version = version;
        return this;
    }
    /**
     * @param {string} pattern
     * @return {CloudEventAddOn}
     */
    setSpecVersionPattern(pattern) {
        this._version = new RegExp(pattern);
        return this;
    }
    /**
     * @param {RegExp} type
     * @return {CloudEventAddOn}
     */
    setDataContentType(type) {
        this._dataContentType = type;
        return this;
    }
    /**
     * @param {string} pattern
     * @return {CloudEventAddOn}
     */
    setDataContentTypePattern(pattern) {
        this._dataContentType = new RegExp(pattern);
        return this;
    }
    /**
     * @param {boolean} allow
     * @return {CloudEventAddOn}
     */
    setAllowEmpty(allow) {
        this._allowEmptyData = allow;
        return this;
    }
    /**
     * @param {boolean} abort
     * @return {CloudEventAddOn}
     */
    setAbortOnReject(abort) {
        this._abortOnReject = abort;
        return this;
    }
    /**
     * @param {number} code
     * @return {CloudEventAddOn}
     */
    setResponseCode(code) {
        this._responseCode = code;
        return this;
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
/**
 * HTTPCloudEventFunction
 * @author Robert R Murrell
 */
class HTTPCloudEventFunction extends JSONHTTPFunction {
    constructor(config) {
        super(config);
    }
    /**
     * @param {(Context|JSONHTTPContext|{invocation?:Invocation})} context
     * @return {Promise<void>}
     */
    async initialize(context) {
        /**@type{CloudEventAddOn}*/let _config = /**@type{CloudEventAddOn}*/await context.config.getAddOn(
                HTTPCloudEventAddOn);
        context.invocation = new Invocation(context, _config, await context.getRequestHeader("content-type"));
    }
    /**
     * @param {(Context|JSONHTTPContext|{invocation?:Invocation})} context
     * @return {Promise<void>}
     */
    async validate(context) {
        await context.invocation.config.emitter.validateInvocation(context.invocation, context.requestBody);
    }
    /**
     * @param {JSONHTTPContext|{invocation?:Invocation}} context
     * @return {Promise<void>}
     * @private
     */
    async _post(context) {
        let _invocation = await context.invocation.config.emitter.fireCloudEvent(context.invocation, context.requestBody);
        let _response = {
            id: context.invocationId,
            received: _invocation.totalCount,
            accepted: _invocation.acceptedCount
        };
        let _code = _invocation.config.responseCode;
        if(_invocation.rejectedCount > 0)
            _response.rejected = {count: _invocation.rejectedCount, events: _invocation.rejectedEvents};
        context.send(_response, _code);
        context.done();
    }
}

module.exports = {
    CloudEventAbortError: CloudEventAbortError,
    CloudEventReceived: CloudEventReceived,
    CloudEventAbort: CloudEventAbort,
    Invocation: Invocation,
    CloudEventListener: CloudEventListener,
    CloudEventEmitter: CloudEventEmitter,
    BatchConfig: BatchConfig,
    CloudEventAddOn: CloudEventAddOn,
    HTTPCloudEventAddOn: HTTPCloudEventAddOn,
    HTTPCloudEventFunction: HTTPCloudEventFunction
}

