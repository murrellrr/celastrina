/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";
const {QueryIterator, CosmosClient, Container}  = require("@azure/cosmos");
const {CelastrinaError} = require("./CelastrinaError");

/**
 * @typedef _CosmosDB
 * @property {null|CosmosClient} client
 * @property {null|Database} database
 * @property {null|Container} container
 */

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{_endpoint: string, _key: string, _database: string, _container: string, cosmos: _CosmosDB}}
 */
class CosmosDAOConfig {
    /**
     * @brief Creates a new Cosmos DB configuration.
     *
     * @description Loads the cosmos database connectivity config from JSON. The format of the config is:
     *              {"_endpoint":"endpoint-url", "_key":"secret key", "_database":"dabase name"}
     *
     * @param {string} config
     */
    constructor(config) {
        this._endpoint  = null;
        this._key       = null;
        this._database  = null;
        Object.assign(this, JSON.parse(config));
        /**@type {_CosmosDB}*/
        this._cosmos    = {};
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get endpoint() {
        return this._endpoint;
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get key() {
        return this._key;
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    get database() {
        return this._database;
    }

    /**
     * @brief
     *
     * @returns {_CosmosDB}
     */
    get cosmos() {
        return this._cosmos;
    }

    /**
     * @brief
     *
     * @param {string} container
     *
     * @returns {Promise<Container>}
     */
    async getContainer(container) {
        return new Promise(
            (resolve, reject) => {
                try {
                    let _container = this._cosmos.database.container(container);
                    if(_container)
                        resolve(_container);
                    else
                        reject(CelastrinaError.newError("Container was null: '" + container + "'."));
                }
                catch(exception) {
                    reject(exception);
                }
            });
    }

    /**
     * @brief
     *
     * @returns {Promise<void>}
     */
    async initialize() {
        return new Promise(
            (resolve, reject) => {
                const config = {
                    endpoint: this._endpoint,
                    key:      this._key
                };

                try {
                    this._cosmos.client    = new CosmosClient(config);
                    this._cosmos.database  = this._cosmos.client.database(this._database);
                    resolve();
                }
                catch(exception) {
                    reject(CelastrinaError.newError("Error creating client container for database " +
                        this._database + " and container " + ", cause: " +  exception));
                }
            });
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class CosmosStatement {
    /**
     * String
     *
     * @param {Container} container
     * @param {string} statement
     */
    constructor(container, statement) {
        this._container = container;
        this._query     = {
            query: statement,
            parameters: []
        };
    }

    get statement() {
        return this._query.query;
    }

    get container() {
        return this._container;
    }

    /**
     * @brief
     *
     * @param {string} parameter
     * @param {*} value
     */
    add(parameter, value) {
        this._query.parameters.push({name: parameter, value: value});
    }

    /**
     * @brief Clears out the parameters of the array.
     */
    clear() {
        this._query.parameters.length = 0;
    }

    /**
     * @brief
     *
     * @returns {QueryIterator<*>}
     */
    iterate() {
        return this._container.items.query(this._query)
    }

    /**
     * @brief Returns a single item from the query specified.
     *
     * @param {boolean} [allowNull] <code>True</code> to not throw reject the promise if the fetch contains no values,
     *        <code>false</code> otherwise.
     *
     * @returns {Promise<*>}
     */
    async fetch(allowNull = false) {
        return new Promise(
            (resolve, reject) => {
                try {
                    let iterator = this._container.items.query(this._query);
                    if (iterator.hasMoreResults()) {
                        iterator.fetchNext()
                            .then((resolved) => {
                                if(resolved.resources.length === 0)
                                    reject(CelastrinaError.newError("Item not found.", 404));
                                else {
                                    let value = resolved.resources[0];
                                    if((typeof value === "undefined" || value == null) && !allowNull)
                                        reject(CelastrinaError.newError("Item not found.", 404));
                                    else
                                        resolve(value);
                                }
                            })
                            .catch((rejected) => {
                                reject(rejected);
                            })
                    }
                    else
                        reject(CelastrinaError.newError("Item not found.", 404));
                }
                catch(exception) {
                    reject(CelastrinaError.newError("Exception fetching item: " + exception, 500));
                }
            });
    }
}

/**
 * @brief Base class for DAO"s in No Doubt Showcase.
 *
 * @author Robert R Murrell
 */
class DAO {
    /**
     * @brief
     *
     * @param {CosmosDAOConfig} config
     */
    constructor(config) {
        if(typeof config === "undefined" || config == null)
            throw CelastrinaError.newError("Configuration cannot be undefined or null.");
        this._config    = config;
        this._container = null;
    }

    /**
     * @brief Returns the config for this DAO.
     *
     * @returns {CosmosDAOConfig}
     */
    get config() {
        return this._config;
    }

    get container() {
        return this._container;
    }

    /**
     * @brief Initializes this DAO. This must be called before using the DAO.
     *
     * @param container
     *
     * @returns {Promise<void>}
     */
    async initialize(container) {
        return new Promise(
            (resolve, reject) => {
                this._config.getContainer(container)
                    .then((_container) => {
                        this._container = _container;
                        resolve();
                    })
                    .catch((reason) => {
                        reject(reason);
                    });
            });
    }

    /**
     * @brief
     *
     * @param {string} statement
     */
    createQuery(statement) {
        if(typeof statement !== "string")
            throw CelastrinaError.newError("Parameter 'statement' must be of type string.");
        return new CosmosStatement(this._container, statement);
    }
}

module.exports = {
    CosmosDAOConfig: CosmosDAOConfig,
    DAO: DAO
};