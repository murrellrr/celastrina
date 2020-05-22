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
 * @author Robert R Murrell
 */
class Vault {
    /**
     * @param {string} token
     */
    constructor(token) {
        let params = new URLSearchParams();
        params.append("api-version", "7.0");
        this.config = {params: params, headers: {"Authorization": "Bearer " + token}};
    }

    /**
     * @returns {string}
     */
    get token() {
        return this.config.headers["Authorization"].slice(7);
    }

    /**
     * @param {string} token
     */
    set token(token) {
        this.config.headers["Authorization"] = "Bearer " + token;
    }

    /**
     * @param {string} identifier
     * @returns {Promise<string>}
     */
    async getSecret(identifier) {
        return new Promise((resolve, reject) => {
            axios.get(identifier, this.config)
                .then((response) => {
                    resolve(response.data.value);
                })
                .catch((exception) => {
                    reject(CelastrinaError.newError("Error getting secret for '" + identifier + "'."));
                });
        });
    }
}
/*
 * *********************************************************************************************************************
 * EXPORTS
 * *********************************************************************************************************************
 */
module.exports = {
    Vault: Vault
};
