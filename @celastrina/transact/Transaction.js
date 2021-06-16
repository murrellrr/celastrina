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
 * @type {{STARTED: number, UPDATED: number, COMITTED: number, INVALID: number, DELETED: number, ROLLED_BACK: number}}
 */
const TRANSACTION_STATE = {
    INVALID: 0,
    STARTED: 1,
    UPDATED: 2,
    DELETED: 3,
    COMITTED: 4,
    ROLLED_BACK: 5
}
/**
 * AbstractTransaction
 * @author Robert R Murrell
 * @abstract
 */
class AbstractTransaction {
    /**
     * @param {BaseContext} context
     */
    constructor(context) {
        /**@type{*}*/this._id = null;
        /**@type{BaseContext}*/this._context = context;
        /**@type{null|{...}}*/this._config = null;
        /**@type{boolean}*/this._new = false;
        /**@type{number}*/this._state = TRANSACTION_STATE.INVALID;
        /**@type{Object}*/this._source = null; // The original
        /**@type{Object}*/this._target = null; // Copy of the original
    }
    /**@returns{null|{...}}*/get config() {return this._config;}
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
     * @param {*} id
     * @return {Promise<Object>}
     * @abstract
     */
    async _construct(id) {throw CelastrinaError.newError("Not Implemented.");}
    /**
     * @param {Object} _object
     * @return {Promise<object>}
     * @abstract
     */
    async _create(_object) {throw CelastrinaError.newError("Not Implemented.");}
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
    /**
     * @return {Promise<void>}
     * @abstract
     */
    async _rollback() {throw CelastrinaError.newError("Not Implemented.");}
    /**@returns{boolean}*/get isStarted() {return this._state === TRANSACTION_STATE.STARTED;}
    /**@returns{boolean}*/get isUpdated() {return this._state === TRANSACTION_STATE.UPDATED;}
    /**@returns{boolean}*/get isDeleted() {return this._state === TRANSACTION_STATE.DELETED;}
    /**@returns{boolean}*/get isCommitted() {return this._state === TRANSACTION_STATE.COMITTED;}
    /**@returns{boolean}*/get isRolledBack() {return this._state === TRANSACTION_STATE.ROLLED_BACK;}
    /**@returns{number}*/get state() {return this._state;}
    /**@returns{*}*/get id() {return this._id;}
    /**@returns{boolean}*/get isNew() {return this._new;}
    /**@returns{Object}*/get source() {return this._source;}
    /**@returns{Object}*/get target() {return this._target;}
    /**
     * @param {*} id
     * @param {Object} [config = null]
     * @return {Promise<*>}
     */
    async start(id = uuidv4(), config = null) {
        return new Promise((resolve, reject) => {
            if(typeof id === "undefined" || id == null)
                reject(CelastrinaError.newError("Invalid Object Id.", 400));
            else {
                this._config = config;
                this._new = false;
                this._state = TRANSACTION_STATE.STARTED;
                this._source = null;
                this._target = null;
                this._id = id;
                resolve(this._id);
            }
        });
    }
    /**
     * @return {Promise<Object>}
     */
    async create() {
        if(this._state === TRANSACTION_STATE.STARTED) {
            let _object = await this._construct(this._id);
            this._new = true;
            this._source = _object;
            this._target = await this._objectify(JSON.parse(JSON.stringify(await this._extract(this._source))));
            return this._target;
        }
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to create when '" +
                                                   this._state + "'.");
    }
    /**
     * @return {Promise<Object>}
     */
    async read() {
        if(this._state === TRANSACTION_STATE.STARTED){
            let _object = await this._read();
            this._new = true;
            this._source = await this._objectify(_object);
            this._target = await this._objectify(JSON.parse(JSON.stringify(await this._extract(this._source))));
            return this._target;
        }
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to read when '" +
                                                   this._state + "'.");
    }
    /**
     * @return {Promise<Object>}
     */
    async readOrCreate() {
        try {
            return await this.read();
        }
        catch(exception) {
            if(exception instanceof CelastrinaError) {
                if(exception.code === 404)
                    return await this.create();
                else
                    throw exception;
            }
            else throw exception;
        }
    }
    /**
     * @param {Object} _object
     * @return {Promise<Object>}
     */
    async update(_object) {
        return new Promise((resolve, reject) => {
            if(this._state === TRANSACTION_STATE.STARTED || this._state === TRANSACTION_STATE.UPDATED) {
                this._state = TRANSACTION_STATE.UPDATED;
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
            if(this._state === TRANSACTION_STATE.STARTED || this._state === TRANSACTION_STATE.UPDATED) {
                this._state = TRANSACTION_STATE.DELETED;
                resolve();
            }
            else if(this._state === TRANSACTION_STATE.DELETED)
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
        if(this._state === TRANSACTION_STATE.COMITTED) {
            await this._rollback();
            this._state = TRANSACTION_STATE.ROLLED_BACK;
        }
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to rollback when '" +
                                                    this._state + "'.");
    }
    /**
     * @return {Promise<void>}
     */
    async commit() {
        if(this._state === TRANSACTION_STATE.UPDATED) {
            let object = await this._extract(this._target);
            await this._update(object);
            this._state = TRANSACTION_STATE.COMITTED;
        }
        else if(this._state === TRANSACTION_STATE.DELETED) {
            await this._delete();
            this._target = null;
            this._state = TRANSACTION_STATE.COMITTED;
        }
        else
            throw CelastrinaError.newError("Invalid transaction state. Unable to commit when '" +
                                                   this._state + "'.");
    }
}
/**
 * @type {{COMMIT_LOCK: number, READ_UPDATE_LOCK: number, NONE: number}}
 */
const BLOB_LOCK_STRATEGY = {
    NONE: 2,
    READ_UPDATE_LOCK: 1,
    COMMIT_LOCK: 0
};
/**
 * @typedef Blob
 * @property {string} storage
 * @property {string} container
 * @property {string} path?
 * @property {number} lockStrategy?
 * @property {number} lockTimeOut?
 */
/**
 * @typedef BlobTransactionConfig
 * @property {Blob} blob
 */
/**
 * AbstractBlobStorageTransaction
 * @author Robert R Murrell
 * @abstract
 * @extends AbstractTransaction
 */
class AbstractBlobStorageTransaction extends AbstractTransaction {
    /**
     * @param {BaseContext} context
     */
    constructor(context) {
        super(context);
        /**@type{BlobSemaphore}*/this._semaphore = null;
        /**@type{null|string}*/this._blob = null;
        this._storage = null;
        this._container = null;
        /**@type{null|string}*/this._endpoint = null;
        /**@type{ResourceAuthorization}*/this._auth = null;

        /**@type{number}*/this._lockStrategy = BLOB_LOCK_STRATEGY.COMMIT_LOCK;
        /**@type{number}*/this._lockTimeout = 0;
    }
    /**@type{null|string}*/get blobName() {return this._blob;}
    /**@type{number}*/get lockingStrategy() {return this._lockStrategy;}
    /**@type{number}*/get lockTimeOut() {return this._lockTimeout;}
    /**
     * @param {Blob} config
     * @return {null|string}
     * @private
     */
    _getPath(config) {
        if(typeof config.path === "string" && config.path.trim().length > 0)
            return config.path;
        else
            return null;
    }
    /**
     * @param {Blob} config
     * @private
     */
    _setLockStrategy(config) {
        if(typeof config.lockStrategy === "number")
            this._lockStrategy = config.lockStrategy;
    }
    /**
     * @param {Blob} config
     * @private
     */
    _setLockTimeout(config) {
        if(typeof config.lockTimeOut === "number")
            this._lockTimeout = config.lockTimeOut;
    }
    /**
     * @param {*} id
     * @param {BlobTransactionConfig} config
     * @return {Promise<void>}
     */
    async start(id, config) {
        this._context.log("Starting transaction.", LOG_LEVEL.LEVEL_INFO,
                           "AbstractBlobStorageTransaction.start(id, config)");

        if(typeof config.blob === "undefined") {
            this._context.log("Invalid configuration, missing blob.", LOG_LEVEL.LEVEL_INFO,
                               "AbstractBlobStorageTransaction.start(id, config)");
            throw CelastrinaError.newError("Missing blob configuration.");
        }
        else {
            await super.start(id, config);
            let blob = config.blob;
            this._setLockStrategy(blob);
            this._setLockTimeout(blob);

            this._blob = id + ".json";
            this._storage = blob.storage;
            this._container = blob.container;

            let path = this._getPath(blob);
            if(path != null)
                this._blob = path + "/" + this._blob;
            this._endpoint = "https://" + this._storage + ".blob.core.windows.net/" +
                this._container + "/" + this._blob;

            this._auth = await this._context.authorizationContext.getAuthorization(
                ManagedIdentityAuthorization.SYSTEM_MANAGED_IDENTITY);
            this._semaphore = new BlobSemaphore(this._auth, this._storage, this._container, this._blob);

            this._context.log("Transaction '" + this._endpoint + "' started.", LOG_LEVEL.LEVEL_INFO,
                               "AbstractBlobStorageTransaction.start(id, config)");
        }
    }
    /**
     * @param {Object} _object
     * @return {Promise<Object>}
     */
    async _create(_object) {
        /**@type{number}*/let _lock = this.lockingStrategy;
        this._context.log("Creating '" + this._endpoint + "' using locking strategy " + _lock + ".", LOG_LEVEL.LEVEL_INFO,
                          "AbstractBlobStorageTransaction._create()");

        if(_lock < BLOB_LOCK_STRATEGY.NONE) {
            let token = await this._auth.getToken("https://storage.azure.com/");
            let response = await axios.put(this._endpoint, _object,
                            {headers: {
                                "Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                                "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                                "Content-Length": _object.length, "x-ms-blob-type": "BlockBlob"
                            }});
            if(response.status === 201) {
                this._context.log("Create '" + this._endpoint + " successful.", LOG_LEVEL.LEVEL_INFO,
                                  "BlobStorageTransaction._create()");
                try {
                    await this._semaphore.lock(this.lockTimeOut, this._context);
                    this._context.log("Lock of '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO,
                                      "AbstractBlobStorageTransaction._create()");
                    return _object;
                }
                catch(err) {
                    token = await this._auth.getToken("https://storage.azure.com/");
                    await axios.delete(this._endpoint, {headers: {
                        "Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                        "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                        "x-ms-blob-type": "BlockBlob"
                    }});
                    throw CelastrinaError.newError("Unable to lock '" + this._endpoint + "', blob deleted.");
                }
            }
            else
                throw CelastrinaError.newError("Unable to create '" + this._endpoint + "'. Response code " +
                                                response.status + ", " + response.statusText);
        }
        else {
            this._context.log("Create successful.", LOG_LEVEL.LEVEL_INFO, "AbstractBlobStorageTransaction._create()");
            return _object;
        }
    }
    /**
     * @return {Promise<Object>}
     */
    async _read() {
        let _lock = this.lockingStrategy;

        this._context.log("Reading using locking strategy " + _lock + ".", LOG_LEVEL.LEVEL_INFO,
                           "AbstractBlobStorageTransaction._read()");

        if((_lock < BLOB_LOCK_STRATEGY.NONE) && !this._semaphore.isLocked) {
            await this._semaphore.lock(this.lockTimeOut, this._context);
            this._context.log("Lock of '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO,
                               "BlobStorageTransaction._read()");
        }

        let token = await this._auth.getToken("https://storage.azure.com/");
        let _headers = {"Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                        "Accept": "application/json"};

        if(this._semaphore.isLocked)
            _headers["x-ms-lease-id"] = this._semaphore.leaseId;

        let exception = null;
        let response  = null;

        try {
            try {
                response = await axios.get(this._endpoint, {headers: _headers});
            }
            catch(error) {
                exception = CelastrinaError.newError("Unable to read '" + this._endpoint + "'. Response code " +
                                                      error.response.status + ", " + error.response.statusText + ". ",
                                                      error.response.status, error);
            }

            if(exception != null)
                throw exception;
            else if(response == null)
                throw CelastrinaError.newError("No response returned from '" + this._endpoint + "'.");
            else if(response.status === 200) {
                this._context.log("Read '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO,
                                  "AbstractBlobStorageTransaction._read()");
                return response.data;
            }
            else
                throw CelastrinaError.newError("Unable to read '" + this._endpoint + "'. Response code " +
                                                response.status + ", " + response.statusText);
        }
        finally {
            if(_lock > BLOB_LOCK_STRATEGY.COMMIT_LOCK && this._semaphore.isLocked)
                await this._semaphore.unlock();
        }
    }
    /**
     * @param {Object} _object
     * @return {Promise<Object>}
     */
    async _update(_object) {
        let _lock = this.lockingStrategy;

        this._context.log("Updating using locking strategy " + _lock + ".", LOG_LEVEL.LEVEL_INFO,
                           "AbstractBlobStorageTransaction._update()");

        if((_lock < BLOB_LOCK_STRATEGY.NONE) && !this._semaphore.isLocked) {
            await this._semaphore.lock(this.lockTimeOut, this._context);
            this._context.log("Lock of '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO,
                               "AbstractBlobStorageTransaction._update()");
        }

        let token = await this._auth.getToken("https://storage.azure.com/");
        let __object = JSON.stringify(_object);
        let header = {"Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                      "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                       "Content-Length": __object.length, "x-ms-blob-type": "BlockBlob"};

        if(this._semaphore.isLocked)
            header["x-ms-lease-id"] = this._semaphore.leaseId;

        let exception = null;
        let response  = null;

        try {
            response = await axios.put(this._endpoint, __object, {headers: header});
        }
        catch(error) {
            exception = CelastrinaError.newError("Unable to update '" + this._endpoint + "'. Response code " +
                                                 error.response.status + ", " + error.response.statusText + ". ");
        }

        if(exception != null)
            throw exception;
        else if(response == null)
            throw CelastrinaError.newError("No response returned from '" + this._endpoint + "'.");
        else if(response.status === 201) {
            this._context.log("Update '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO,
                              "AbstractBlobStorageTransaction._update()");
            if(this._semaphore.isLocked) {
                await this._semaphore.unlock();
                this._context.log("Ulock '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO,
                                   "AbstractBlobStorageTransaction._update()");
            }
        }
        else
            throw CelastrinaError.newError("Unable to update '" + this._endpoint + "'. Response code " +
                                            response.status + ", " + response.statusText);
    }
    /**
     * @return {Promise<void>}
     * @private
     */
    async _delete() {
        this._context.log("Delete " + this._endpoint, LOG_LEVEL.LEVEL_INFO, "AbstractBlobStorageTransaction._delete()");
        let token = await this._auth.getToken("https://storage.azure.com/");
        let header = {"Authorization": "Bearer " + token, "x-ms-version": "2020-06-12",
                      "Content-Type": "application/json", "x-ms-blob-content-type": "application/json",
                       "x-ms-blob-type": "BlockBlob"}

        if(this._semaphore.isLocked)
            header["x-ms-lease-id"] = this._semaphore.leaseId;

        let response = await axios.delete(this._endpoint, {headers: header});
        if(response.status === 202) {
            this._context.log("Delete '" + this._endpoint + "' successful.", LOG_LEVEL.LEVEL_INFO, "" +
                                      "AbstractBlobStorageTransaction._delete()");
        }
        throw CelastrinaError.newError("Unable to update '" + this._endpoint + "'. Response code " +
                                       response.status + ", " + response.statusText);
    }
    /**
     * @return {Promise<Object>}
     * @private
     */
    async _rollback() {
        this._context.log("Rollback " + this._endpoint, LOG_LEVEL.LEVEL_INFO, "AbstractBlobStorageTransaction._rollback()");
        if(!this._new) {
            this._context.log("'" + this._endpoint + "' is not new, updating record.", LOG_LEVEL.LEVEL_INFO,
                               "AbstractBlobStorageTransaction._rollback()");
            await this._update(this._source);
        }
        else {
            this._context.log("'" + this._endpoint + " is a new Blob, deleting record.", LOG_LEVEL.LEVEL_INFO,
                               "AbstractBlobStorageTransaction._rollback()");
            await this._delete();
            this._source = null;
            this._target = null;
            this._context.log("Rollback of new Blob '" + this._endpoint + "' successful, Blob deleted.", LOG_LEVEL.LEVEL_INFO,
                               "AbstractBlobStorageTransaction._rollback()");
        }
    }
}

module.exports = {
    TRANSACTION_STATE: TRANSACTION_STATE, BLOB_LOCK_STRATEGY: BLOB_LOCK_STRATEGY, AbstractTransaction: AbstractTransaction,
    AbstractBlobStorageTransaction: AbstractBlobStorageTransaction
}
