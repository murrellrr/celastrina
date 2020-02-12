/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const moment    = require("moment");
const validator = require("validator").default;
const uuidv4    = require("uuid/v4");

const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{uid:string, timestamp: moment.Moment, expires: moment.Moment, environment: string, type: string,
 *         topic: string, action: string}}
 */
class Header {
    /**
     * @brief
     *
     * @param {Object} source
     */
    constructor(source) {
        this.uid          = null;
        this.timestamp    = null;
        this.expires      = null;
        this.environment  = "development";
        this.domain       = null; // The logical domain for this message, maybe you are multi-tenant.
        this.topic        = null; // The Noun, what is this about.
        this.action       = null; // The verb, what action to take.
        Object.assign(this, source);
    }

    /**
     * @brief
     *
     * @returns {boolean}
     */
    isDevelopment() {
        return this.environment === "development";
    }

    /**
     * @brief
     *
     * @param {Object} source
     *
     * @returns {boolean}
     */
    static _isObject(source) {
        if(typeof source !== "undefined" && source != null) {
            if(!source.hasOwnProperty("uid"))
                return false;
            if(!source.hasOwnProperty("timestamp"))
                return false;
            if(!source.hasOwnProperty("expires"))
                return false;
            if(!source.hasOwnProperty("environment"))
                return false;
            if(!source.hasOwnProperty("domain"))
                return false;
            if(!source.hasOwnProperty("topic"))
                return false;
            if(!source.hasOwnProperty("action"))
                return false;
            return source.hasOwnProperty("signiture");
        }
        else
            return false;
    }

    /**
     * @brief
     *
     * @param source
     */
    static copy(source) {
        if(typeof source == "undefined" || source == null)
            throw CelastrinaValidationError.newValidationError("Source cannot be null.", "Message.copy.source");

        if(!(source instanceof Header)) {
            if (Header._isObject(source)) {
                if (validator.isEmpty(source.type))
                    throw CelastrinaValidationError.newValidationError("Profile ID is required.", "Header.type");
                if (validator.isEmpty(source.topic))
                    throw CelastrinaValidationError.newValidationError("Profile ID is required.", "Header.topic");
                if (validator.isEmpty(source.action))
                    throw CelastrinaValidationError.newValidationError("Profile ID is required.", "Header.action");
            }
            else
                throw CelastrinaValidationError.newValidationError("source is not compatible with Header.",
                    "Header.copy.source");
        }

        let header = new Header(source);

        if(typeof source.timestamp === "string")
            header.timestamp = moment(source.timestamp);
        else
            header.timestamp = source.timestamp.clone();
        if(typeof source.expires === "string")
            header.expires = moment(source.expires);
        else
            header.expires = source.expires.clone();

        return header;
    }

    /**
     * @brief
     *
     * @param {string} domain
     * @param {string} topic
     * @param {string} action
     * @param {string} [uid]
     * @param {string} [environment]
     * @param {moment.Moment} [timestamp]
     * @param {moment.Moment} [expires]
     *
     * @returns {Header}
     */
    static create(domain, topic, action, uid = uuidv4(), environment = "development",
                  timestamp = moment(), expires = moment().add("30m")) {
        let source = {
            uid:         uid,
            timestamp:   timestamp,
            expires:     expires,
            environment: environment,
            type:        type,
            topic:       topic,
            action:      action
        };

        return Header.copy(source);
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{header: Header, body: Object}}
 */
class Message {
    /**
     * @brief
     *
     * @param {Object} source
     */
    constructor(source) {
        this.header = null;
        this.body   = null;
        Object.assign(this, source);
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get uid() {
        return this.header.uid;
    }

    /**
     * @brief
     *
     * @param {string} uid
     */
    set uid(uid) {
        this.header.uid = uid;
    }

    /**
     * @brief
     *
     * @return {boolean}
     */
    isExpired() {
        return moment().isSameOrAfter(this.header.expires);
    }

    /**
     * @brief
     *
     * @returns {boolean}
     */
    isDevelopment() {
        return this.header.isDevelopment();
    }

    /**
     * @brief
     *
     * @param {Object} source
     *
     * @returns {boolean}
     */
    static _isObject(source) {
        if(typeof source !== "undefined" && source != null) {
            if(!source.hasOwnProperty("header"))
                return Header._isObject(source.header);
            return source.hasOwnProperty("body");
        }
        else
            return false;
    }

    /**
     * @brief
     *
     * @param {Object} source
     */
    static copy(source) {
        if(typeof source == "undefined" || source == null)
            throw CelastrinaValidationError.newValidationError("Source cannot be null.", "Message.copy.source");

        if(!(source instanceof Message)) {
            if (Message._isObject(source)) {
                if(typeof source.header === "undefined" || source.header == null)
                    throw CelastrinaValidationError.newValidationError("Header is required.", "Message.header");
            }
            else
                throw CelastrinaValidationError.newValidationError("source is not compatible with Message.",
                    "Message.copy.source");
        }

        let message = new Message(source);

        message.header = Header.copy(source.header);

        return message;
    }

    /**
     * @brief
     *
     * @param {string} type
     * @param {string} topic
     * @param {string} action
     * @param {Object} [body]
     * @param {string} [uid]
     * @param {string} [environment]
     * @param {moment.Moment} [timestamp]
     * @param {moment.Moment} [expires]
     *
     * @returns {Message}
     */
    static create(type, topic, action, body = {}, uid = uuidv4(),
                  environment = "dev", timestamp = moment(),
                  expires = moment().add("24h")) {
        let source = {
            header: Header.create(type, topic, action, uid, environment, timestamp, expires),
            body:   body
        };

        return Message.copy(source);
    }

    /**
     * @brief
     *
     * @param {string} message The incoming message to decode and parse.
     *
     * @return {Message}
     */
    static unMarshall(message) {
        if(typeof message !== "string" || message.trim().length === 0)
            throw CelastrinaValidationError.newError("Message is required.");

        let buff          = new Buffer(message, "base64");
        let unmarshalled  = JSON.parse(buff.toString("ascii"));

        if(!Message._isObject(unmarshalled))
            throw CelastrinaValidationError.newError("Message is required.");

        return Message.copy(unmarshalled);
    }

    /**
     * @brief
     *
     * @param {Message} message The incoming message to decode and parse.
     *
     * @return {string}
     */
    static marshall(message) {
        if(typeof message === "undefined" || message == null)
            throw CelastrinaValidationError.newError("Argument message is undefined.");

        return Buffer.from(JSON.stringify(message)).toString("base64");
    }
}

module.exports = {
    Message: Message,
    Header:  Header
};