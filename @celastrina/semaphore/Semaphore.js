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
const { v4: uuidv4 } = require('uuid');
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
     * @param {string} [id=uuidv4()]
     */
    constructor(name, container, blob, auth, id = uuidv4()) {
        super();
        /**@type{string}*/this._name = name;
        /**@type{string}*/this._container = container;
        /**@type{ResourceAuthorization}*/this._auth = auth;
        /**@type{string}*/this._id = id;
        /**@type{boolean}*/this._isLocked = false;
        let params = new URLSearchParams();
        params.append("comp", "lease");
        this._endpoint = "https://" + name + ".blob.core.windows.net/" + container + "/" + blob;
        this._config = {
            /**@type{URLSearchParams}*/params: params,
            headers: {"Authorization": "", "x-ms-date": "", "x-ms-lease-action": "",
                      "x-ms-client-request-id":id}
        }
    }
    /**@returns{boolean}*/get isLocked() {return this._isLocked;}
    /**
     * @param {number} [timeout=0]
     * @returns {Promise<void>}
     */
    async lock(timeout = 0) {
        return new Promise((resolve, reject) => {
            this._auth.getToken("")
                .then((token) => {
                    return axios.put(this._endpoint, this._config);
                })
                .then((response) => {
                    //
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
            this._auth.getToken("")
                .then((token) => {
                    //
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
