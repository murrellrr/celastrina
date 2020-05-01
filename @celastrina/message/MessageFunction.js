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

const {CelastrinaError, CelastrinaValidationError} = require("../core/CelastrinaError");
const {BaseContext, BaseFunction} = require("../core/BaseFunction");
const {Header, Message} = require("./Message");

/**
 * @brief
 *
 *
 *
 * @author Robert R Murrell
 */
class MessageContext extends BaseContext {
    /**
     * @brief
     *
     * @param {_AzureFunctionContext} context
     * @param {string} [topic]
     */
    constructor(context, topic = "MessageFunction") {
        super(context, topic);
        /**@type {null|Message}*/
        this._reqmsg = null;
    }

    /**
     * @brief Converts the JSON string representing the context of this message to a {Message} object.
     *
     * @returns {Promise<Message>}
     */
    async unMarshall() {
        return new Promise((resolve, reject) => {
            try {
                this._reqmsg = Message.unMarshall(this._context.requestMessage);
                resolve(this._reqmsg);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }

    /**
     * @brief Gets the input message in context of this request.
     *
     * @returns {Message}
     */
    get message() {
        return this._reqmsg;
    }

    /**
     * @brief Gets the header of this message.
     *
     * @returns {Header}
     */
    get header() {
        return this._reqmsg.header;
    }

    /**
     * @brief Gets the body of this message.
     *
     * @returns {null|Object}
     */
    get body() {
        return this._reqmsg.body;
    }
}

/**
 * @brief
 *
 * @decription Implementors must create a queueTrigger input binding named <code>requestMessage</code> for this
 *             function to work.
 *
 * @author Robert R Murrell
 */
class MessageFunction extends BaseFunction {
    /**
     * @brief
     *
     * @param {null|string} [config]
     */
    constructor(config = null) {
        super(config);
    }

    /**
     * @brief
     *
     * @param {_AzureFunctionContext} context
     *
     * @returns {Promise<BaseContext & MessageContext>}
     */
    async createContext(context) {
        return new Promise(
            (resolve, reject) => {
                try {
                    resolve(new MessageContext(context, this._topic));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief
     *
     * @param {BaseContext | MessageContext} context
     *
     * @returns {Promise<void>}
     */
    async validateBody(context) {
        return new Promise(
            (resolve) => {
                resolve();
            });
    }

    /**
     * @brief Validated the message is a {Message} type for this framework before calling the payload
     *        validate lifecycle.
     *
     * @description
     *
     * @param {BaseContext | MessageContext} context
     *
     * @returns {Promise<void>}
     *
     * @see Message
     */
    async validate(context) {
        return new Promise(
            (resolve, reject) => {
                context.unMarshall()
                    .then((message) => {
                        if(message.isExpired())
                            reject(CelastrinaError.newError("Message expired.", 400, true));
                        else
                            return this.validateBody(context);
                    })
                    .then(() => {
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }
}

module.exports = {
    MessageContext:  MessageContext,
    MessageFunction: MessageFunction
};
