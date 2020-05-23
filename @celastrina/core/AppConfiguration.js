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
const axios  = require("axios").default;
const {CelastrinaError} = require("./CelastrinaError");
/**
 * @typedef _AppConfigKeyValue
 * @property {string} key
 * @property {string} label
 * @property {string} contentType
 * @property {string} eTag
 * @property {string} lastModified
 * @property {boolean} locked
 * @property {object} tags
 */
/** */
class AppConfiguration {
    /**
     * @param {string} token
     * @param {string} resourceId
     * @param {string} [label="development"]
     */
    constructor(token, resourceId, label = "development") {
        let params = new URLSearchParams();
        params.append("api-version", "2019-10-01");
        this.config = {params: params, headers: {"Authorization": "Bearer " + token}};
        this._url = "https://management.azure.com" + resourceId + "/listKeyValue";
        this._label = label;
    }
    /**@returns{string}*/get token(){return this.config.headers["Authorization"].slice(7);}
    /**@param {string} token*/set token(token){this.config.headers["Authorization"] = "Bearer " + token;}
    /**
     * @param {string} key
     * @returns {Promise<string>}
     */
    async getValue(key) {
        return new Promise((resolve, reject) => {
            let data = {key: key, label: this._label};
            axios.post(this._url, data, this.config)
                .then((response) => {
                    resolve(response.data.value);
                })
                .catch((exception) => {
                    reject(CelastrinaError.newError("Error '" + exception.response.status + "' getting value for '" + key + "'. " + JSON.stringify(exception)));
                });
        });
    }
}
module.exports = {AppConfiguration: AppConfiguration};
