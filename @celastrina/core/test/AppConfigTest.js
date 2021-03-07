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

const {MockAzureFunctionContext} = require("../../test/AzureFunctionContextMock");
const {CelastrinaError, CelastrinaValidationError, StringProperty, Configuration, ModuleContext, FunctionRoleContext,
       ResourceAuthorizationConfiguration, ResourceAuthorizationContext, AppConfigPropertyHandler} = require("../Core");
const assert = require("assert");

describe("Configuration", () => {
    describe("#async initialize(context)", () => {
        it("should initialize successfully with a name and loaded=true.", () => {
            let prop = new AppConfigPropertyHandler("d9183a46-f949-4952-a140-889d03827c74", "PROD_APP_SOUTHANDSUNSET_RENTALS-EU2-RG", "prod-app-sthnsnst-eu2-appcnfg", "production");
            prop.getProperty().then().catch();
        });
    });
});
