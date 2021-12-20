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
const jwt = require("jsonwebtoken");
const MockAdapter = require("axios-mock-adapter");
const axios = require("axios");
const {v4: uuidv4} = require("uuid");
const moment = require("moment");
const assert = require("assert");

class AzureManagedIdentityServerMock {
	constructor() {
		/**@type{MockAdapter}*/this._mock = null;
		/**@type{(null|string)}*/this.lastPrincipalId = null;
		/**@type{(null|string)}*/this.lastResourceName = null;
	}
	reset() {
		this.lastPrincipalId = null;
		this.lastResourceName = null;
	}
	async start() {
		let _this = this;
		process.env["IDENTITY_ENDPOINT"] = "https://localhost:8443";
		process.env["IDENTITY_HEADER"] = "ThatsMyLuggage12345";
		this._mock = new MockAdapter(axios);
		this._mock.onGet(/https:\/\/localhost:8443.*/).reply((config) => {
			if(config.headers["x-identity-header"] === "ThatsMyLuggage12345") {
				let _principal = config.params.get("principal_id");
				if(typeof _principal === "string") _this.lastPrincipalId = _principal;
				let _now = moment();
				_now.add(30, "minutes");
				let resource = config.params.get("resource");
				_this.lastResourceName = resource;
				return [200, {access_token: "access_token_" + resource, expires_on: _now.unix(), resource: resource, token_type: "Bearer", client_id: uuidv4()}];
			}
			else return [401, "Not Authorized."];
		});
	}
	async stop() {
		this._mock.restore();
		this._mock = null;
	}
}

module.exports = {
	AzureManagedIdentityServerMock: AzureManagedIdentityServerMock
};
