

const {CelastrinaError, CelastrinaValidationError} = require("@celastrina/core");
const {QueryIterator, CosmosClient, Container}  = require("@azure/cosmos");


class CosmosStatement {
    /**
     * @param {Object} container
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
                                        reject(CelastrinaError.newError("Not found.", 404));
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


class Connection {
    constructor(subscription, rg, account, database) {
        this._subscription = subscription;
        this._rg = rg;
        this._account = account;
        this._database = database;
    }
}




/**
 * @abstract
 */
class Entity {
    constructor(connection, type, version = "1.0") {
        this._source = {};
        this._connection = connection;
        this._source._object = {_type: type, _version: version};
    }

    async find() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    async create() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    async read() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    async update() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    async delete() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }
}
