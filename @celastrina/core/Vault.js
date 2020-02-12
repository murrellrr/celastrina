/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

const axios  = require("axios").default;

/**
 * @typedef _AxiosData
 * @property {string} value
 */
/**
 * @typedef {AxiosResponse<T>} _AxiosResponse
 * @property {_AxiosData} data
 */

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class Vault {
    /**
     * @brief
     *
     * @param {string} token
     */
    constructor(token) {
        let params = new URLSearchParams();
        params.append("api-version", "7.0");
        this.config = {params: params, headers: {"Authorization": "Bearer " + token}};
    }

    /**
     * @brief
     *
     * @param {string} identifier
     *
     * @returns {Promise<string>}
     */
    async getSecret(identifier) {
        return new Promise(
            (resolve, reject) => {
                axios.get(identifier, this.config)
                    .then((/**@type {_AxiosResponse} */response) => {
                        resolve(response.data.value);
                    })
                    .catch((exception) => {
                        reject(exception);
                    });
            });
    }
}

module.exports = {
    Vault: Vault
};