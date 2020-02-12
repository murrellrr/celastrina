/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const validator = require("validator").default;

const {CelastrinaValidationError} = require("./CelastrinaError");

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{delivery: string, template: string, data: Object}}
 */
class NotificationBody {
    /**
     * @brief
     *
     * @param {Object} source
     */
    constructor(source) {
        this.delivery = null;
        this.template = null;
        this.data     = null;
        Object.assign(this, source);
    }

    get config() {
        return {};
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{delivery: string, template: string, email: string, name: string, data: Object}}
 */
class EmailNotificationBody extends NotificationBody {
    /**
     * @brief
     *
     * @param {Object} source
     */
    constructor(source) {
        super(source);
        this.delivery = "email";
        this.email    = null;
        this.name     = null;
        this.from = {
                email: 'no-reply@nodoubtshowcase.com',
                name: 'No Doubt Showcase'
            };
        this.reply = {
                email: 'no-reply@nodoubtshowcase.com',
                name: 'No Doubt Showcase'
            };
    }

    get config() {
        return {personalizations:
            [{
                to: [{
                    email: this.email,
                    name:  this.name
                }],
                dynamic_template_data: this.data
            }],
            from: this.from,
            reply_to: this.reply,
            template_id: this.template};
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
            if(!source.hasOwnProperty("delivery"))
                return false;
            if(!source.hasOwnProperty("template"))
                return false;
            if(!source.hasOwnProperty("data"))
                return false;
            if(!source.hasOwnProperty("email"))
                return false;
            if(!source.hasOwnProperty("from"))
                return false;
            if(!source.hasOwnProperty("reply"))
                return false;
            return source.hasOwnProperty("name");
        }
        else
            return false;
    }

    /**
     * @brief
     *
     * @source {Object}
     */
    static copy(source) {
        if(typeof source == "undefined" || source == null)
            throw CelastrinaValidationError.newValidationError("Source cannot be null.",
                                                         "EmailNotificationBody.copy.source");
        if(!(source instanceof EmailNotificationBody)) {
            if(EmailNotificationBody._isObject(source)) {
                if(validator.isEmpty(source.template))
                    throw CelastrinaValidationError.newValidationError("Template is required",
                        "EmailNotificationBody.template");
                if(validator.isEmpty(source.name))
                    throw CelastrinaValidationError.newValidationError("Name is required",
                        "EmailNotificationBody.name");
                if(validator.isEmail(source.email))
                    throw CelastrinaValidationError.newValidationError("Email is required",
                        "EmailNotificationBody.email");
            }
            else
                throw CelastrinaValidationError.newValidationError(
                    "source is not compatible with EmailNotificationBody.",
                    "EmailNotificationBody.copy.source");
        }

        let notification = new EmailNotificationBody(source);
        notification.data = JSON.parse(JSON.stringify(source.data));

        return notification;
    }

    /**
     * @brief
     *
     * @param {string} template
     * @param {string} email
     * @param {string} name
     * @param {Object} data
     *
     * @returns {EmailNotificationBody}
     */
    static create(template, email, name, data) {
        let source = {
            template: template,
            email:    email,
            name:     name,
            data:     data
        };

        return new EmailNotificationBody(source);
    }
}

module.exports = {
    EmailNotificationBody: EmailNotificationBody
};