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
const {MatchAlways, Cookie, JwtSubject, HTTPContext, JSONHTTPContext, BaseIssuer, LocalJwtIssuer, OpenIDJwtIssuer,
       HTTPParameter, HeaderParameter, QueryParameter, BodyParameter, CookieParameter, HTTPConfiguration,
       JwtConfiguration, HTTPSentry, OptimisticHTTPSentry, JwtSentry, Session, SessionManager, SecureSessionManager,
       AESSessionManager, HTTPFunction} = require("./HTTP");
module.exports = {
    MatchAlways: MatchAlways,
    Cookie: Cookie,
    JwtSubject: JwtSubject,
    HTTPContext: HTTPContext,
    JSONHTTPContext: JSONHTTPContext,
    BaseIssuer: BaseIssuer,
    LocalJwtIssuer: LocalJwtIssuer,
    OpenIDJwtIssuer: OpenIDJwtIssuer,
    HTTPParameter: HTTPParameter,
    HeaderParameter: HeaderParameter,
    QueryParameter: QueryParameter,
    BodyParameter: BodyParameter,
    CookieParameter: CookieParameter,
    Session: Session,
    SessionManager: SessionManager,
    SecureSessionManager: SecureSessionManager,
    AESSessionManager: AESSessionManager,
    HTTPConfiguration: HTTPConfiguration,
    JwtConfiguration: JwtConfiguration,
    HTTPSentry: HTTPSentry,
    OptimisticHTTPSentry: OptimisticHTTPSentry,
    JwtSentry: JwtSentry,
    HTTPFunction: HTTPFunction
};
