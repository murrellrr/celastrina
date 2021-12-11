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

const {CelastrinaError, Context, CelastrinaEvent} = require("@celastrina/core");
const moment = require("moment");

// *****Storage Queue
// context.log('expirationTime =', context.bindingData.expirationTime);
// context.log('insertionTime =', context.bindingData.insertionTime);
// context.log('nextVisibleTime =', context.bindingData.nextVisibleTime);
// context.log('id =', context.bindingData.id);
// context.log('popReceipt =', context.bindingData.popReceipt);
// context.log('dequeueCount =', context.bindingData.dequeueCount);
// *****ServiceBus
// context.log('EnqueuedTimeUtc =', context.bindingData.enqueuedTimeUtc);
// context.log('DeliveryCount =', context.bindingData.deliveryCount);
// context.log('MessageId =', context.bindingData.messageId);
// *****EventGrid
// context.log("Subject: " + eventGridEvent.subject);
// context.log("Time: " + eventGridEvent.eventTime);
// context.log("Data: " + JSON.stringify(eventGridEvent.data));
// *****EventHub
// context.log('EnqueuedTimeUtc =', context.bindingData.enqueuedTimeUtc);
// context.log('SequenceNumber =', context.bindingData.sequenceNumber);
// context.log('Offset =', context.bindingData.offset);



class CelastrinaMessage {

}

/**
 * CelastrinaEventListener
 * @author Robert R Murrell
 * @abstract
 */
class CelastrinaMessageListener {
    constructor() {}
    /**
     * @param {CelastrinaMessage} message
     * @return {Promise<void>}
     */
    async onMessage(message) {throw CelastrinaError.newError("Not Implemented.", 501)};
    /**
     * @param {CelastrinaMessage} message
     * @return {Promise<void>}
     */
    async onReject(message) {};
    /**
     * @param {CelastrinaMessage} message
     * @return {Promise<void>}
     */
    async onAbort(message) {};
}





module.exports = {
    CelastrinaMessageListener: CelastrinaMessageListener
}
