/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class CelastrinaError {
    /**
     * @brief
     *
     * @param {Error} cause
     * @param {int} code
     * @param {boolean} drop
     */
    constructor(cause, code = 500, drop = false) {
        this.cause = cause;
        this.code  = code;
        this.drop  = drop;
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    toString() {
        return "[NDSERROR][" + this.code + "][" + this.drop + "]: " + this.cause.message;
    }

    toJSON() {
        return {message: this.cause.message, code: this.code, drop: this.drop};
    }

    /**
     * @brief
     *
     * @param {string} message
     * @param {int} code
     * @param {boolean} drop
     *
     * @returns {CelastrinaError}
     */
    static newError(message, code = 500, drop = false) {
        return new CelastrinaError(new Error(message), code, drop);
    }

    /**
     * @brief
     *
     * @param {Error} error
     * @param {int} code
     * @param {boolean} drop
     *
     * @returns {CelastrinaError}
     */
    static wrapError(error, code = 500, drop = false) {
        return new CelastrinaError(error, code, drop);
    }
}

/**
 * @brief
 *
 * @author Robert R Murrell
 */
class CelastrinaValidationError extends CelastrinaError {
    /**
     * @brief
     *
     * @param {Error} error
     * @param {int} code
     * @param {boolean} drop
     * @param {string} tag
     */
    constructor(error, code = 500, drop = false, tag = "") {
        super(error, code, drop);
        this.tag = tag;
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    toString() {
        return "[" + this.tag + "]" + super.toString();
    }

    toJSON() {
        return {message: this.cause.message, code: this.code, tag: this.tag, drop: this.drop};
    }

    /**
     * @brief
     *
     * @param {string} message
     * @param {int} code
     * @param {boolean} drop
     * @param {string} tag
     *
     * @returns {CelastrinaValidationError}
     */
    static newValidationError(message, tag = "", drop = false, code = 400) {
        return new CelastrinaValidationError(new Error(message), code, drop, tag);
    }

    /**
     * @brief
     *
     * @param {Error} error
     * @param {int} code
     * @param {boolean} drop
     * @param {string} tag
     *
     * @returns {CelastrinaValidationError}
     */
    static wrapValidationError(error, tag = "", drop = false, code = 400) {
        return new CelastrinaValidationError(error, code, drop, tag);
    }
}

module.exports = {
    CelastrinaError:           CelastrinaError,
    CelastrinaValidationError: CelastrinaValidationError
};