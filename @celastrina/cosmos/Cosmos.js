

const axios = require("axios").default;
const {CelastrinaError, CelastrinaValidationError, LOG_LEVEL, BaseContext, ModuleContext, Module} = require("@celastrina/core");
const {QueryIterator, CosmosClient, Container}  = require("@azure/cosmos");
/**
 * @typedef _CosmosQueryParameter
 * @property {string} name
 * @property {string} value
 */
/**
 * @typedef _CosmosQuery
 * @property {string} query
 * @property {Array.<_CosmosQueryParameter>} parameters
 */
/**@type{ModuleContext}*/
class CosmosModuleContext extends ModuleContext {
    constructor(context) {
        super(context);
    }
    /**
     * @param {object} entity
     * @returns {Promise<EntityManager>}
     */
    register(entity) {
        return new Promise((resolve, reject) => {
            if(typeof entity !== "object") {
                this._context.log("Parameter 'entity' cannot be null.", LOG_LEVEL.LEVEL_WARN, "CosmosModuleContext.register(entity)");
                reject(CelastrinaError.newError("Parameter 'entity' must be an instance of Entity."));
            }
            else {
                resolve();
            }
        });
    }
}


/**@type{{readOnly:boolean}}*/
class CosmosCredential {
    constructor(readOnly = false) {
        this.readOnly = readOnly;
    }
}
/**@type{CosmosCredential}*/
class CosmosKeyCredential extends CosmosCredential {
    /**
     * @param {string} endpoint
     * @param {string} primaryKey
     * @param {null|string} [secondaryKey=null]
     * @param {boolean} [readOnly=false]
     */
    constructor(endpoint, primaryKey, secondaryKey = null, readOnly = false) {
        super(readOnly);
        this.endpoint = endpoint;
        this.primaryKey = primaryKey;
        this.secondaryKey = secondaryKey;
    }
}
/**@type{CosmosCredential}*/
class ResourceManagerCredential extends CosmosCredential {
    /**
     * @param {string} subscription
     * @param {string} rg
     * @param {string} account
     * @param {boolean} [readOnly=false]
     */
    constructor(subscription, rg, account, readOnly = false) {
        super(readOnly);
        this.subscription = subscription;
        this.rg = rg;
        this.account = account;
    }
}
/**@type{{type:string,credential:CosmosCredential,version:string}}*/
class EntityConfig {
    constructor(type, credential, partition, keys = ["id"], versions = ["1.0"]) {
        this.type = type;
        this.partition = partition;
        this.keys = keys;
        //this.credential = credential;
        //this.versions = versions;
    }
}






/**@type{Module}*/
class CosmosModule extends Module {
    /**@type{string}*/static MODULE_COSMOS = "celestrinajs.cosmos.module.CosmosModule";
    constructor() {
        super(CosmosModule.MODULE_COSMOS);
        /**@type{object}*/this._entityconfig = null;
        /**@type{Array.<CosmosCredential>}*/this._connections = [];
    }
    /**
     * @param {CosmosCredential} credential
     * @returns {Promise<ConnectionManager>}
     * @private
     */
    async _createClientUsingKey(credential) {
        return new Promise((resolve, reject) => {
            let config = {
                //
            };
            resolve(new ConnectionManager(config.endpoint, new CosmosClient(config)));
        });
    }
    /**
     * @param {CosmosCredential} credential
     * @returns {Promise<ConnectionManager>}
     * @private
     */
    async _createClientUsingAccount(credential) {
        return new Promise((resolve, reject) => {
            //
        });
    }
    /**
     * @param {object} configuration
     * @param {_AzureFunctionContext} context
     * @param {PropertyHandler} properties
     * @returns {Promise<void>}
     */
    async initialize(configuration, context, properties) {
        return new Promise((resolve, reject) => {
            // Loop through and create all the connections
            /**@type{Array.<Promise<ConnectionManager>>}*/let promises = [];
            for(/**@type{EntityConfig}*/const config of this._entityconfig) {
                let connection = this._connections[config.type];
                if(typeof connection === "undefined" || connection == null) {
                    // create and place the new connection
                }
                // if(config instanceof CosmosKeyCredential)
                //     promises.push(this._createClientUsingKey(config));
                // else
                //     promises.push(this._createClientUsingAccount(config));
            }

            Promise.all(promises)
                .then((results) => {
                    //
                })
                .catch((exception) => {
                    reject(exception);
                });

            resolve(this);
        });
    }

    /**
     * @param {BaseContext} context
     * @returns {Promise<ModuleContext>}
     */
    async newModuleContext(context) {
        return new Promise((resolve, reject) => {
            resolve(new CosmosModuleContext(context));
        });
    }
}









class ConnectionManager {
    /**
     * @param {string} endpoint
     * @param {CosmosClient} client
     */
    constructor(endpoint, client) {
        this._endpoint = endpoint;
        this._client = client;
    }
    /**@returns{string}*/get endpoint(){return this._endpoint;}
    /**@returns{CosmosClient}*/get client(){return this._client;};
}
class EntityManager {
    /**
     * @param {string} type
     * @param {string} partition
     * @param {Array.<string>} [keys=["id"]]
     * @param [version="1.0"]
     */
    constructor(type, partition, keys = ["id"], version = "1.0") {
        this._object = {_type: type, _version: version};
        this._partition = partition;
        this._keys = {};
        let fetch = "select * from e where e._object._type=\"" + this._object._type + "\" and e._object._version=\"" +
                     this._object._version + "\"";
        let kidx = 0;
        for(const key of keys) {
            fetch += " and e." + key + "=@kidx" + kidx;
            this._keys[kidx] = key;
            ++kidx;
        }
        this._fetchStatement = fetch;
        /**@type{Container}*/this._container = null;
    }

    /**
     * @param {object} entity
     * @param {string} key
     * @returns {*}
     * @private
     */
    _resolveKeyAttribute(entity, key) {
        const attributes = key.split(".");
        let value = entity;
        for(const attribute of attributes) {
            if(value.hasOwnProperty(attribute))
                value = value[attribute];
            else
                throw CelastrinaError.newError("Invalid " + this._object._type +
                    " entity. Missing required key.");
        }
        return value;
    }
    /**
     * @param {object} entity
     * @returns {Promise<boolean>}
     * @private
     */
    async _validateKeys(entity) {
        return new Promise((resolve, reject) => {
            try {
                let keyobj = null;
                for(const key in this._keys) {
                    keyobj = this._resolveKeyAttribute(entity, this._keys[key]);
                }
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<void>}
     * @private
     */
    async _validateEntity(entity) {
        return new Promise((resolve, reject) => {
            if(typeof entity === "undefined" || entity == null)
                reject(CelastrinaError.newError("Entity cannot be undefined or null."));
            else if(entity._object._type !== this._object._type)
                reject(CelastrinaError.newError("Expected Entity type '" + this._object._type + "'."));
            else if(entity._object._version !== this._object._version)
                reject(CelastrinaError.newError("Expected Entity type '" + this._object._type +
                    "' at version '" + this._object._version + "'."));
            else resolve();
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<void>}
     * @private
     */
    async _validate(entity) {
        return new Promise((resolve, reject) => {
            this._validateEntity(entity)
                .then(() => {
                    return this._validateKeys(entity);
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
     * @param {_CosmosQuery} statement
     * @param {object} entity
     * @returns {Promise<void>}
     * @private
     */
    async _loadKeys(statement, entity) {
        return new Promise((resolve, reject) => {
            try {
                let keyobj = null;
                for (const key in this._keys) {
                    keyobj = this._resolveKeyAttribute(entity, this._keys[key]);
                    statement.parameters.push({name: "@kidx" + key, value: keyobj});
                }
                resolve();
            }
            catch(exception) {
                reject(exception);
            }
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<_CosmosQuery>}
     * @private
     */
    async _createStatement(entity) {
        return new Promise((resolve, reject) => {
            /**@type{_CosmosQuery}*/let statement = {
                query: this._fetchStatement,
                parameters: []};
            this._loadKeys(statement, entity)
                .then(() => {
                    resolve(statement);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<object>}
     */
    async create(entity) {
        return new Promise((resolve, reject) => {
            this._validate(entity)
                .then(() => {
                    return this._container.items.create(entity);
                })
                .then((item) => {
                    Object.assign(entity, item);
                    resolve(entity);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<object>}
     */
    async read(entity) {
        return new Promise((resolve, reject) => {
            this._validate(entity)
                .then(() => {
                    return this._createStatement(entity);
                })
                .then((statement) => {
                    let iterator = this._container.items.query(statement);
                    if(iterator != null && iterator.hasMoreResults()) {
                        iterator.fetchNext()
                            .then((resolved) => {
                                if(resolved.resources.length === 0)
                                    reject(CelastrinaError.newError("Entity not found.", 404));
                                else if(resolved.resources.length > 1)
                                    reject(CelastrinaError.newError("Multiple entities returned for key."));
                                else {
                                    let value = resolved.resources[0];
                                    if((typeof value === "undefined" || value == null))
                                        reject(CelastrinaError.newError("Entity not found.", 404));
                                    else resolve(value);
                                }
                            })
                            .catch((rejected) => {
                                reject(rejected);
                            });
                    }
                    else
                        reject(CelastrinaError.newError("Entity not found.", 404));
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<object>}
     */
    async update(entity) {
        return new Promise((resolve, reject) => {
            this._validate(entity)
                .then(() => {
                    return this._container.items.upsert(entity);
                })
                .then((item) => {
                    Object.assign(entity, item);
                    resolve(entity);
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
    /**
     * @param {object} entity
     * @returns {Promise<object>}
     */
    async delete(entity) {
        return new Promise((resolve, reject) => {
            this._validate(entity)
                .then(() => {
                    try {
                        let value = this._resolveKeyAttribute(entity, this._partition);
                        return this._container.item(entity.id, value).delete().then((test) => {})
                    }
                    catch(exception) {
                        reject(exception);
                    }
                })
                .catch((exception) => {
                    reject(exception);
                });
        });
    }
}
module.exports = {
    CosmosModule: CosmosModule,
    CosmosModuleContext: CosmosModuleContext
};
