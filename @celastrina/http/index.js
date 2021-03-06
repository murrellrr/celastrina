/*
 * Copyright (c) 2021, KRI, LLC.
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
const {JwtSubject, Issuer, IssuerProperty, JwtValidator, AzureIDPJwtValidator,JwtConfiguration, HTTPContext, HTTPParameterFetch, HeaderParameterFetch,
       QueryParameterFetch, BodyParameterFetch, HTTPParameterFetchProperty, JwtSentry, CookieSessionResolver,
       CookieSessionResolverProperty, SecureCookieSessionResolver, SecureCookieSessionResolverProperty, HTTPFunction,
       JwtHTTPFunction, JSONHTTPContext, JSONHTTPFunction, JwtJSONHTTPFunction} = require("./HTTP");
const {Recaptcha, RecaptchaFunctionRole} = require("./Recaptcha");
module.exports = {
    JwtSubject: JwtSubject, Issuer: Issuer, IssuerProperty: IssuerProperty,
    JwtValidator: JwtValidator, AzureIDPJwtValidator: AzureIDPJwtValidator, JwtConfiguration: JwtConfiguration,
    HTTPContext: HTTPContext, HTTPParameterFetch: HTTPParameterFetch, HeaderParameterFetch: HeaderParameterFetch,
    QueryParameterFetch: QueryParameterFetch, BodyParameterFetch: BodyParameterFetch,
    HTTPParameterFetchProperty: HTTPParameterFetchProperty, CookieSessionResolver: CookieSessionResolver,
    CookieSessionResolverProperty: CookieSessionResolverProperty, SecureCookieSessionResolver: SecureCookieSessionResolver,
    SecureCookieSessionResolverProperty: SecureCookieSessionResolverProperty, JwtSentry: JwtSentry,
    HTTPFunction: HTTPFunction, JwtHTTPFunction: JwtHTTPFunction, JSONHTTPContext: JSONHTTPContext, JSONHTTPFunction: JSONHTTPFunction,
    JwtJSONHTTPFunction: JwtJSONHTTPFunction
};
