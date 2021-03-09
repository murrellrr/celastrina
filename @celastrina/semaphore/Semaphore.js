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
const moment = require("moment");
const {CelastrinaError, ResourceAuthorization} = require("@celastrina/core");

/**
 * Semaphore
 * @abstract
 * @author Robert R Murrell
 */
class Semaphore {
    constructor() {}
    /**
     * @param {number} [timeout=0]
     * @returns {Promise<void>}
     */
    async lock(timeout = 0) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Not Implemented.", 501));
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
 * BlobSemaphore
 * @extends {Semaphore}
 * @author Robert R Murrell
 */
class BlobSemaphore extends Semaphore {
    /**
     * @param {string} name
     * @param {string} container
     * @param {string} blob
     * @param {ResourceAuthorization} auth
     * @param {null|string} [leaseId=null]
     */
    constructor(name, container, blob, auth, leaseId = null) {
        super();
        /**@type{ResourceAuthorization}*/this._auth = auth;
        /**@type{null|string}*/this._id = leaseId;
        /**@type{string}*/this._endpoint = "https://" + name + ".blob.core.windows.net/" + container + "/" + blob + "?comp=lease";
    }
    /**@returns{boolean}*/get isLocked() {return this._id != null;}
    /**@returns{null|string}*/get leaseId() {return this._id;}
    /**@param{null|string} leaseId*/set leaseId(leaseId) {this._id = leaseId;}
    /**
     * @param {number} [timeout=0]
     * @returns {Promise<void>}
     */
    async lock(timeout = -1) {
        return new Promise((resolve, reject) => {
            if(timeout === 0 || timeout < -1)
                timeout = -1;
            else if(timeout > 60)
                timeout = 60;
            this._auth.getToken("https://storage.azure.com/")
                .then((token) => {
                    let headers = {};
                    headers["Authorization"] = "Bearer "  + token;
                    headers["x-ms-version"] = "2017-11-09";
                    headers["x-ms-lease-action"] = "acquire";
                    headers["x-ms-lease-duration"] = timeout;
                    return axios.put(this._endpoint, null, {headers: headers});
                })
                .then((response) => {
                    this._id = response.headers["x-ms-lease-id"];
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
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
                        let headers = {};
                        headers["Authorization"] = "Bearer "  + token;
                        headers["x-ms-version"] = "2017-11-09";
                        headers["x-ms-lease-action"] = "release";
                        headers["x-ms-lease-id"] = this._id;
                        return axios.put(this._endpoint, null, {headers: headers});
                    }
                    else reject(CelastrinaError.newError("Not locked.", 400));
                })
                .then((response) => {
                    this._id = null;
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
module.exports = {
    Semaphore: Semaphore, BlobSemaphore: BlobSemaphore
};
