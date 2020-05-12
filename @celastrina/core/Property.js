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

/**
 * @author Robert R Murrell
 * @copyright Robert R Murrell
 * @license MIT
 */

"use strict";

const axios = require("axios").default;
const moment = require("moment");
const {CelastrinaError, CelastrinaValidationError} = require("./CelastrinaError");
const {Vault} = require("./Vault");

/**
 * @typedef _AzureFunctionContext
 * @property {Object & {req: Object, res: Object}} bindings
 * @property {Object & {invocationId: string}} bindingData
 * @property {_AzureLog} log
 * @property {function()|function(*)} done
 * @property {function(string)} log
 * @property {string} invocationId
 * @property {Object} traceContext
 */
/**
 * @typedef _ManagedResourceToken
 * @property {string} access_token
 * @property {moment.Moment} expires_on
 * @property {string} resource
 * @property {string} token_type
 * @property {string} client_id
 */
/**
 * @typedef _VaultProperty
 * @property {string} type
 * @property {string} resource
 * @property {string} ttl
 * @property {moment.Moment} expires
 * @property {null|string} value
 */

/**
 * @abstract
 */
class PropertyHandler {
    constructor() {}

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     */
    async initialize(context, config) {
        return new Promise((resolve, reject) => {
            context.log.error("[PropertyHandler.initialize(context)]: Not Implemented.");
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }

    /**
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            context.log.error("[PropertyHandler.getProperty(key, defaultValue)]: Not Implemented.");
            reject(CelastrinaError.newError("Not Implemented."));
        });
    }
}
/**
 * @type {PropertyHandler}
 */
class AppSettingsPropertyHandler extends PropertyHandler {
    constructor() {
        super();
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     */
    async initialize(context, config) {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    /**
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            let value = process.env[key];
            if(typeof value === "undefined" || value.trim().length === 0)
                value = defaultValue;
            resolve(value);
        });
    }
}
/**
 * @type {AppSettingsPropertyHandler}
 */
class AppConfigPropertyHandler extends PropertyHandler {
    constructor() {
        super();
    }
}
/**
 * @type {AppSettingsPropertyHandler}
 */
class VaultAppSettingPropertyHandler extends AppSettingsPropertyHandler {
    constructor() {
        super();
        /** @type {null|Vault} */
        this._vault    = null;
        this._endpoint = null;
        this._secret   = null;
        /** @type {null|_ManagedResourceToken} */
        this._auth     = null;
        this._cache    = {};
    }

    /**
     * @returns {Promise<string>}
     * @private
     */
    async _refreshAuthorization() {
        return new Promise((resolve, reject) => {

        });

        // /** @type {string} */
        // let endpoint = process.env["IDENTITY_ENDPOINT"];
        // /** @type {string} */
        // let secret = process.env["IDENTITY_HEADER"];
        //
        // let params = new URLSearchParams();
        // params.append("resource", "https://vault.azure.net");
        // params.append("api-version", "2019-08-01");
        // let config = {params: params,
        //     headers: {"X-IDENTITY-HEADER": secret}};
        //
        // axios.get(endpoint, config)
        //     .then((response) => {
        //         response.data.access_token;
        //
        //         resolve(response.data.access_token);
        //     })
        //     .catch((exception) => {
        //         reject(exception);
        //     });
        //
        // resolve();
    }

    /**
     * @param {_AzureFunctionContext} context
     * @param {object} config
     * @returns {Promise<void>}
     */
    async initialize(context, config) {
        return new Promise((resolve, reject) => {
            this._endpoint = process.env["IDENTITY_ENDPOINT"];
            this._secret   = process.env["IDENTITY_HEADER"];

            if((typeof this._endpoint !== "string" || this._endpoint.trim().length === 0) ||
               (typeof this._secret !== "string" || this._secret.trim().length === 0)) {
                context.log.error("[VaultAppSettingPropertyHandler.initialize(context)] IDENTITY_ENDPOINT and/or " +
                                  "IDENTITY_HEADER environment property missing. Are you sure this Azure Function " +
                                  "is using a Managed Identity?");
                reject(CelastrinaError.newError("Function not configured for Managed Identity."));
            }
            else {
                this._refreshAuthorization()
                    .then((token) => {
                        this._vault = new Vault(token);
                        resolve();
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
        });
    }

    /**
     * @param {string} key
     * @returns {Promise<{cached:boolean, expired:boolean, value:string}>}
     * @private
     */
    async _getCahcedProperty(key) {
        return new Promise((resolve, reject) => {
            /** @type {(null|undefined|_VaultProperty)} */
            let value = this._cache[key];
            if(typeof value === "undefined" || value == null)
                resolve({cached: false, expired: false, value: null});
            else {
                // Checking if we need to
                let now = moment();
                let expired = now.isSameOrAfter(value.expires);
                resolve({cached: true, expired: expired, value: value.value});
            }
        });
    }

    /**
     * @param {string} key
     * @param {string} resource
     * @returns {Promise<string>}
     * @private
     */
    async _setCachedProperty(key, resource) {
        return new Promise((resolve, reject) => {
            this._getVault()
                .then((vault) => {
                    return vault.getSecret(resource);
                })
                .then((value) => {
                    this._cache[key] = {}
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @returns {Promise<Vault>}
     * @private
     */
    async _getVault() {
        return new Promise((resolve, reject) => {
            // Checking to see if autorization has expired.
            let now = moment();
            if(now.isSameOrAfter(this._auth.expires_on)) {
                this._refreshAuthorization()
                    .then((token) => {
                        this._vault.token = token;
                        resolve(this._vault);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            }
            else
                resolve(this._vault);
        });
    }

    /**
     * @param {string} key
     * @param {null|string} [defaultValue]
     * @returns {Promise<string>}
     */
    async getProperty(key, defaultValue = null) {
        return new Promise((resolve, reject) => {
            this._getCahcedProperty(key)
                .then((result) => {
                    if(!result.cached) {
                        //
                    }
                    else if(result.expired) {
                        //
                    }
                    else
                        resolve(result.value);
                })
                .catch((exception) => {
                    reject(exception);
                })
        });
    }
}
/**
 * @type {{_name:string, _type:string, _secure:boolean, _defaultValue:null|*}}
 * @abstract
 */
class Property {
    /**
     * @param {string} name
     * @param {null|*} [defaultValue]
     */
    constructor(name, defaultValue = null) {
        this._name         = name;
        this._defaultValue = defaultValue;
    }

    /**
     * @returns {string}
     */
    get name() {
        return this._name;
    }

    /**
     * @returns {*}
     */
    get defaultValue() {
        return this._defaultValue;
    }

    /**
     * @param {PropertyHandler} handler
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    async lookup(handler) {
        return new Promise((resolve, reject) => {
            handler.getProperty(this._name, this._defaultValue)
                .then((value) => {
                    resolve(value);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }

    /**
     * @param {string} value
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            reject(CelastrinaError.newError("Property not supported."));
        });
    }

    /**
     * @param {PropertyHandler} handler
     * @returns {Promise<null|Object|string|boolean|number>}
     */
    load(handler) {
        return new Promise((resolve, reject) => {
            this.lookup(handler)
                .then((local) => {
                    return this.resolve(local);
                })
                .then((value) => {
                    resolve(value);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
/**
 * @type {Property}
 */
class JsonProperty extends Property {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

    /**
     * @param {string} value
     * @returns {Promise<null|Object>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve(JSON.parse(value));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {Property}
 */
class StringProperty extends Property {
    /**
     * @param {string} name
     * @param {null|string} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

    /**
     * @param {string} value
     * @returns {Promise<null|string>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve(value);
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {Property}
 */
class BooleanProperty extends Property {
    /**
     * @brief
     * @param {string} name
     * @param {null|boolean} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

    /**
     * @brief
     * @param {string} value
     * @returns {Promise<null|boolean>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve((value.toLowerCase() === "true"));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}
/**
 * @type {Property}
 */
class NumericProperty extends Property {
    /**
     * @param {string} name
     * @param {null|number} defaultValue
     */
    constructor(name, defaultValue = null) {
        super(name, defaultValue);
    }

    /**
     * @param {string} value
     * @returns {Promise<null|number>}
     */
    async resolve(value) {
        return new Promise((resolve, reject) => {
            try {
                resolve(Number(value));
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
}

module.exports = {
    PropertyHandler: PropertyHandler,
    AppSettingsPropertyHandler: AppSettingsPropertyHandler,
    VaultAppSettingPropertyHandler: VaultAppSettingPropertyHandler,
    AppConfigPropertyHandler: AppConfigPropertyHandler,
    Property: Property,
    StringProperty: StringProperty,
    BooleanProperty: BooleanProperty,
    NumericProperty: NumericProperty,
    JsonProperty: JsonProperty
};
