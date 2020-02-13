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

    /**
     *
     * @returns {null|Object}
     */
    get config() {
        return null;
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
                email: "",
                name: ""
            };
        this.reply = {
                email: "",
                name: ""
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