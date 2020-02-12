/*
 * Copyright (c) 2020, Robert R Murrell, llc. All rights reserved.
 */

"use strict";

/**
 * @brief
 *
 * @author Robert R Murrell
 *
 * @type {{lat: number, lon: number}}
 */
class Point {
    /**
     * @brief
     *
     * @param {number} lat
     * @param {number} lon
     */
    constructor(lon, lat) {
        this.lat = lat;
        this.lon = lon;
    }

    /**
     * @brief
     *
     * @returns {string}
     */
    toString() {
        return "{type: 'Point', coordinates: [" + this.lon + ", " + this.lat + "]}";
    }

    toJSON() {
        return {type: "Point", coordinates: [this.lon, this.lat]};
    }
}

module.exports = {
    Point: Point
};