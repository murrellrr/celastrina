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

const error        = require("./CelastrinaError");
const dao          = require("./DAO");
const vault        = require("./Vault");
const base         = require("./BaseFunction");
const http         = require("./HTTPFunction");
const auth         = require("./Authorization");
const captcha      = require("./Recaptcha");
const message      = require("./Message");
const messaging    = require("./MessageFunction");
const notification = require("./Notification");

module.exports = {
    CelastrinaError:           error.CelastrinaError,
    CelastrinaValidationError: error.CelastrinaValidationError,
    
    CosmosStatement: dao.CosmosStatement,
    CosmosDAOConfig: dao.CosmosDAOConfig,
    DAO:             dao.DAO,
    
    Vault: vault.Vault,
    
    LOG_LEVEL:                    base.LOG_LEVEL,
    MonitorResponse:              base.MonitorResponse,
    DefaultSecurePropertyHandler: base.DefaultSecurePropertyHandler,
    VaultPropertyHandler:         base.VaultPropertyHandler,
    BaseContext:                  base.BaseContext,
    BaseFunction:                 base.BaseFunction,
    
    HTTPContext:      http.HTTPContext,
    HTTPFunction:     http.HTTPFunction,
    JSONHTTPContext:  http.JSONHTTPContext,
    JSONHTTPFunction: http.JSONHTTPFunction,
    
    ClaimsToken:               auth.ClaimsToken,
    SentryConfig:              auth.SentryConfig,
    Sentry:                    auth.Sentry,
    MATCH_TYPE:                auth.MATCH_TYPE,
    AuthorizationMatch:        auth.AuthorizationMatch,
    MatchAny:                  auth.MatchAny,
    MatchAll:                  auth.MatchAll,
    MatchNone:                 auth.MatchNone,
    AuthorizationQuery:        auth.AuthorizationQuery,
    Issuer:                    auth.Issuer,
    AuthorizationGroup:        auth.AuthorizationGroup,
    AuthorizedJSONFunction:    auth.AuthorizedJSONFunction,
    AuthenticatedJSONFunction: auth.AuthenticatedJSONFunction,
    
    Recaptcha:              captcha.Recaptcha,
    RECAPTCHA_TOKEN_METHOD: captcha.RECAPTCHA_TOKEN_METHOD,
    RecaptchaJSONFunction:  captcha.RecaptchaJSONFunction,
    
    Header:  message.Header,
    Message: message.Message,
    
    MessageContext:  messaging.MessageContext,
    MessageFunction: messaging.MessageFunction,
    
    EmailNotificationBody: notification.EmailNotificationBody
};
