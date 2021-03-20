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

const axios  = require("axios").default;
const {AxiosError, AxiosResponse} = require("axios");
const moment = require("moment");
const {CelastrinaError, ResourceAuthorization} = require("@celastrina/core");

/**
 * Semaphore
 * @abstract
 * @author Robert R Murrell
 */
class Semaphore {
    /**
     * @param {number} [retryDelay=1500]
     * @param {number} [maxRetries=4]
     */
    constructor(retryDelay = 1500, maxRetries = 4) {
        this._retryDelay = retryDelay;
        this._maxRetries = maxRetries - 1;
    }
    /**
     * @param {number} [timeout=0]
     * @returns {Promise<boolean>}
     * @private
     */
    async _lock(timeout = 0) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
    /**
     * @param {number} [timeout=0]
     * @returns {Promise<void>}
     */
    async lock(timeout = 0) {
        return new Promise(async (resolve, reject) => {
            let intervalId = null;
            let counter = this._maxRetries;
            try {
                if (await this._lock())
                    resolve();
                else {
                    intervalId = setInterval(async () => {
                        try {
                            if(await this._lock()) {
                                clearInterval(intervalId);
                                resolve();
                            }
                            else {
                                if ((--counter) <= 0) {
                                    clearInterval(intervalId);
                                    reject(CelastrinaError.newError("Unable to lock semapthore after '" +
                                           this._maxRetries + "' retries.", 409));
                                }
                            }
                        }
                        catch(_exception) {
                            reject(_exception);
                        }
                    }, this._retryDelay);
                }
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**@returns{boolean}*/get isLocked() {return false;}
    /**
     * @returns {Promise<void>}
     */
    async unlock() {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented.", 501));
        });
    }
}
/**
 * @typedef _BlobSemaphoreConfig
 * @property {ResourceAuthorization} auth
 * @property {string} storage
 * @property {string} container
 * @property {string} blob
 * @property {null|string} [leaseId=null]
 */
/**
 * BlobSemaphore
 * @extends {Semaphore}
 * @author Robert R Murrell
 */
class BlobSemaphore extends Semaphore {
    /**
     * @param {ResourceAuthorization} auth
     * @param {string} storage
     * @param {string} container
     * @param {string} blob
     * @param {null|string} [leaseId=null]
     * @param {number} [retryDelay=1500]
     * @param {number} [maxRetries=4]
     */
    constructor(auth, storage, container, blob, leaseId = null,
                retryDelay= 1500, maxRetries= 4) {
        super(retryDelay, maxRetries);
        /**@type{ResourceAuthorization}*/this._auth = auth;
        /**@type{null|string}*/this._id = leaseId;
        /**@type{string}*/this._endpoint = "https://" + storage + ".blob.core.windows.net/" + container + "/" +
                                           blob + "?comp=lease";
    }
    /**@returns{boolean}*/get isLocked() {return this._id != null;}
    /**@returns{null|string}*/get leaseId() {return this._id;}
    /**@param{null|string} leaseId*/set leaseId(leaseId) {this._id = leaseId;}
    /**
     * @param {number} [timeout=0]
     * @returns {Promise<void>}
     * @private
     */
    async _lock(timeout = -1) {
        return new Promise((resolve, reject) => {
            if(timeout === 0 || timeout < -1)
                timeout = -1;
            else if(timeout > 60)
                timeout = 60;
            this._auth.getToken("https://storage.azure.com/")
                .then((token) => {
                    return axios.put(this._endpoint, null, {headers:
                                    {"Authorization": "Bearer "  + token,
                                     "x-ms-version": "2017-11-09",
                                     "x-ms-lease-action": "acquire",
                                     "x-ms-lease-duration": timeout}});
                })
                .then((response) => {
                    this._id = response.headers["x-ms-lease-id"];
                    resolve(true);
                })
                .catch((/**@type{*|AxiosError}*/exception) => {
                    if(exception instanceof AxiosError) {
                        if (exception.response.status === 409)
                            resolve(false);
                        else
                            reject(CelastrinaError.newError(exception.response.statusText, exception.response.status));
                    }
                    else
                        reject(CelastrinaError.wrapError(exception));
                });
        });
    }
    /**
     * @returns {Promise<void>}
     */
    async unlock() {
        return new Promise((resolve, reject) => {
            this._auth.getToken("https://storage.azure.com/")
                .then((token) => {
                    if(this._id != null) {
                        return axios.put(this._endpoint, null, {headers:
                                         {"Authorization": "Bearer "  + token,
                                          "x-ms-version": "2017-11-09",
                                          "x-ms-lease-action": "release",
                                          "x-ms-lease-id": this._id}});
                    }
                    else resolve();
                })
                .then((response) => {
                    this._id = null;
                    resolve();
                })
                .catch((exception) => {
                    reject(CelastrinaError.wrapError(exception, exception.code));
                });
        });
    }
}
module.exports = {
    Semaphore: Semaphore, BlobSemaphore: BlobSemaphore
};
