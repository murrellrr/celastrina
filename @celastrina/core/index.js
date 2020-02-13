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
 * @brief
 *
 * @type {{dao: {CosmosStatement: CosmosStatement, CosmosDAOConfig: CosmosDAOConfig, DAO: DAO}, util: {notification:
 *       {EmailNotificationBody: EmailNotificationBody}, vault: {Vault: Vault}, messaging: {Message: Message,
 *       Header: Header}}, functions: {aaa: {SentryConfig: SentryConfig, AuthorizationQuery: AuthorizationQuery,
 *       Issuer: Issuer, AuthorizationMatch: AuthorizationMatch, MatchAny: MatchAny, AuthorizedJSONFunction:
 *       AuthorizedJSONFunction, MATCH_TYPE: {OVERRIDE: {OVERRIDE_NONE: number, OVERRIDE_IF_SYSTEM: number},
 *       AUTHORIZATION: {MATCH_ALL: number, MATCH_NONE: number, MATCH_ANY: number}}, MatchAll: MatchAll, MatchNone:
 *       MatchNone, AuthorizationGroup: AuthorizationGroup, ClaimsToken: ClaimsToken, Sentry: Sentry,
 *       AuthenticatedJSONFunction: AuthenticatedJSONFunction}, recaptcha: {RECAPTCHA_TOKEN_METHOD: {QUERY: number,
 *       HEADER: number, BODY: number}, RecaptchaJSONFunction: RecaptchaJSONFunction, Recaptcha: Recaptcha},
 *       http: {HTTPFunction: HTTPFunction, JSONHTTPFunction: JSONHTTPFunction, HTTPContext: HTTPContext,
 *       JSONHTTPContext: JSONHTTPContext}, base: {BaseContext: BaseContext, BaseFunction: BaseFunction,
 *       DefaultSecurePropertyHandler: DefaultSecurePropertyHandler, LOG_LEVEL: {LEVEL_TRACE: number, LEVEL_INFO:
 *       number, LEVEL_VERBOSE: number, LEVEL_WARN: number, LEVEL_ERROR: number}, MonitorResponse: MonitorResponse,
 *       VaultPropertyHandler: VaultPropertyHandler}, messaging}, error: {CelastrinaError: CelastrinaError,
 *       CelastrinaValidationError: CelastrinaValidationError}}}
 */
module.exports = {
    error:         require("./CelastrinaError"),
    dao:           require("./DAO"),
    util:          {vault:        require("./Vault"),
                    messaging:    require("./Message"),
                    notification: require("./Notification")},
    functions:     {base:      require("./BaseFunction"),
                    http:      require("./HTTPFunction"),
                    messaging: require("./MessageFunction"),
                    recaptcha: require("./Recaptcha"),
                    aaa:       require("./Authorization")}
};
