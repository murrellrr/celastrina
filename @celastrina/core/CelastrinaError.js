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
        return "[" + this.code + "][" + this.drop + "]: " + this.cause.message;
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