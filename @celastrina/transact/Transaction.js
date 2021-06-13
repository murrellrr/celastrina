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
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, BaseContext, ManagedIdentityAuthorization} = require("@celastrina/core");
const {BlobSemaphore} = require("@celastrina/semaphore");
const axios = require("axios").default;
const moment = require("moment");
const {v4: uuidv4} = require("uuid");

/**
 * @abstract
 */
class AbstractTransaction {
    constructor(context) {
        /**@type{*}*/this._id = null;
        /**@type{BaseContext}*/this._context = context;
        /**@type{boolean}*/this._new = false;
        /**@type{string}*/this._state = "invalid";
        /**@type{Object}*/this._source = null; // The original
        /**@type{Object}*/this._target = null; // Copy of the original
    }
    /**
     * @param {Object} source
     * @return {Promise<object>}
     * @abstract
     */
    async _objectify(source) {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @param {Object} source
     * @return {Promise<object>}
     * @abstract
     */
    async _extract(source) {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @return {Promise<Object>}
     * @abstract
     */
    async _construct() {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @return {Promise<object>}
     * @abstract
     */
    async _create() {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @return {Promise<Object>}
     * @abstract
     */
    async _read() {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @param {Object} _object
     * @return {Promise<void>}
     * @abstract
     */
    async _update(_object) {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @return {Promise<void>}
     * @abstract
     */
    async _delete() {throw CelastrinaError.newError("Not Implemented.");}
    /**@returns{*}*/get id() {return this._id;}
    /**@returns{boolean}*/get isNew() {return this._new;}
    /**@returns{Object}*/get source() {return this._source;}
    /**@returns{Object}*/get target() {return this._target;}
    async start(id = uuidv4()) {
        return new Promise((resolve, reject) => {
            if(typeof id === "undefined" || id == null)
                reject(CelastrinaError.newError("Invalid Object Id.", 400));
            else {
                this._new = false;
                this._state = "started";
                this._source = null;
                this._target = null;
                this._id = id;
                resolve(this._id);
            }
        });
    }
    /**
     * @param {Promise<Object>} promise
     * @param {boolean} [__new=false]
     * @return {Promise<Object>}
     * @private
     */
    async _load(promise, __new = false) {
        return new Promise((resolve, reject) => {
            promise.then((_object) => {
                    this._new = __new;
                    this._source = _object;
                    return this._objectify(JSON.parse(JSON.stringify(this._source)));
                })
                .then((_object) => {
                    this._target = _object;
                    resolve(this._target);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @return {Promise<Object>}
     */
    async create() {
        if(this._state === "started")
            return this._load(this._create(), true);
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to create when '" +
                                                   this._state + "'.");
    }
    /**
     * @return {Promise<Object>}
     */
    async read() {
        if(this._state === "started")
            return this._load(this._read());
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to read when '" +
                                                   this._state + "'.");
    }
    /**
     * @param _object
     * @return {Promise<Object>}
     */
    async update(_object) {
        return new Promise((resolve, reject) => {
            if(this._state === "started" || this._state === "updated") {
                this._state = "updated";
                this._target = _object;
                resolve(this._target);
            }
            else
                reject(CelastrinaError.newError("Invalid transaction state. Unable to update when '" + this._state + "'."));
        });
    }
    /**
     * @return {Promise<Object>}
     */
    async delete() {
        return new Promise((resolve, reject) => {
            if(this._state === "started" || this._state === "updated") {
                this._state = "deleted";
                resolve();
            }
            else if(this._state === "deleted")
                resolve();
            else
                reject(CelastrinaError.newError("Invalid transaction state. Unable to delete when '" +
                                                        this._state + "'."));
        });
    }
    /**
     * @return {Promise<void>}
     */
    async rollback() {
        if(this._state === "comitted") {
            if(!this._new)
                await this._load(this._update(this._source));
            else
                await this._delete();
            this._state = "rolled-back";
        }
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to rollback when '" +
                                                    this._state + "'.");
    }
    /**
     * @return {Promise<void>}
     */
    async commit() {
        if(this._state === "updated") {
            let object = await this._extract(this._target);
            await this._update(object);
            this._state = "comitted";
        }
        else if(this._state === "deleted") {
            await this._delete();
            this._target = null;
            this._state = "comitted";
        }
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to commit when '" +
                                                   this._state + "'.");
    }
}
/**
 * @abstract
 */
class BlobStorageTransaction extends AbstractTransaction {
    /**
     * @param {BaseContext} context
     * @param {string} storage
     * @param {string} container
     * @param {number} [defaultLockTimeout=0]
     */
    constructor(context, storage, container, defaultLockTimeout = 0) {
        super(context);
        /**@type{BlobSemaphore}*/this._semaphore = null;
        /**@type{null|string}*/this._blob = null;
        this._storage = storage;
        this._container = container;
        /**@type{null|string}*/this._endpoint = null;
        /**@type{ResourceAuthorization}*/this._auth = null;
        /**@type{number}*/this._lockTimeout = defaultLockTimeout;
    }
    /**@type{null|string}*/get blobName() {return this._blob;}
    /**
     * @param id
     * @param {null|string} [path=null]
     * @return {Promise<void>}
     */
    async start(id, path = null) {
        return new Promise((resolve, reject) => {
            super.start(id)
                .then((id) => {
                    this._blob = id + ".json";
                    this._context.authorizationContext.getAuthorization(ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY)
                        .then((auth) => {
                            if(path != null && path.trim().length > 0)
                                this._blob = path + "/" + this._blob;
                            this._endpoint = "https://" + this._storage + ".blob.core.windows.net/" + this._container + "/" + this._blob;
                            this._semaphore = new BlobSemaphore(auth, this._storage, this._container, this._blob);
                            resolve();
                        })
                        .catch((exception) => {
                            reject(exception);
                        });
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @return {Promise<Object>}
     */
    async _create() {
        return new Promise((resolve, reject) => {
            let _token  = null;
            let _object = null;
            this._auth.getToken("https://storage.azure.com/")
                .then((token) => {
                    _token = token;
                    return this._construct();
                })
                .then((object) => {
                    _object = JSON.stringify(this._extract(object));
                    return axios.put(this._endpoint, _object,
                        {headers: {"Authorization": "Bearer " + _token, "x-ms-version": "2020-06-12",
                                         "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                                         "Content-Length": _object.length, "x-ms-blob-type": "BlockBlob"}});
                })
                .then((response) => {
                    return this._semaphore.lock(this._lockTimeout, this._context);
                })
                .then(() => {
                    resolve(_object);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @return {Promise<Object>}
     * @private
     */
    async _read() {
        return new Promise((resolve, reject) => {
            this._semaphore.lock(this._lockTimeout, this._context)
                .then(() => {
                    return this._auth.getToken("https://storage.azure.com/")
                })
                .catch((token) => {
                    return axios.get(this._endpoint,
                        {headers: {"Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                                          "x-ms-lease-id": this._semaphore.leaseId, "Accept": "application/json"}});
                })
                .then((response) => {
                    resolve(response.data);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {Object} _object
     * @return {Promise<void>}
     * @private
     */
    async _update(_object) {
        return new Promise((resolve, reject) => {
            this._auth.getToken("https://storage.azure.com/")
                .then((token) => {
                    let __object = JSON.stringify(_object);
                    return axios.put(this._endpoint, __object,
                        {headers: {"Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                                         "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                                         "Content-Length": __object.length, "x-ms-blob-type": "BlockBlob",
                                         "x-ms-lease-id": this._semaphore.leaseId}});
                })
                .then((response) => {
                    return this._semaphore.unlock(this._context);
                })
                .then(() => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _delete() {
        return new Promise((resolve, reject) => {
            this._auth.getToken("https://storage.azure.com/")
                .then((token) => {
                    return axios.delete(this._endpoint,
                        {headers: {"Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                                         "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                                         "x-ms-blob-type": "BlockBlob", "x-ms-lease-id": this._semaphore.leaseId}});
                })
                .then((response) => {
                    resolve();
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
