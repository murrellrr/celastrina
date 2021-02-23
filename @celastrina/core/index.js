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
const {CelastrinaError, CelastrinaValidationError, ResourceAuthorization, ManagedIdentityAuthorization, AppRegistrationAuthorization,
       ResourceAuthorizationConfiguration, Vault, PropertyHandler, AppSettingsPropertyHandler, VaultAppSettingPropertyHandler,
       AppConfigPropertyHandler, CachedProperty, CachePropertyHandler,
       CacheHandlerProperty, VaultAppSettingHandlerProperty, AppConfigHandlerProperty, Property, JsonProperty,
       StringProperty, BooleanProperty, NumericProperty, ValueMatch, MatchAny, MatchAll, MatchNone, ModuleContext,
       Module, FunctionRole, Configuration, Algorithm, AES256Algorithm, Cryptography, LOG_LEVEL, BaseSubject,
       MonitorResponse, RoleResolver, BaseSentry, BaseContext, BaseFunction, ApplicationAuthorizationProperty,
       FunctionRoleProperty} = require("./Core");
module.exports = {
    CelastrinaError: CelastrinaError, CelastrinaValidationError: CelastrinaValidationError, ResourceAuthorization: ResourceAuthorization,
    ManagedIdentityAuthorization: ManagedIdentityAuthorization, AppRegistrationAuthorization: AppRegistrationAuthorization,
    ResourceAuthorizationConfiguration: ResourceAuthorizationConfiguration, Vault: Vault, PropertyHandler: PropertyHandler,
    AppSettingsPropertyHandler: AppSettingsPropertyHandler,
    VaultAppSettingPropertyHandler: VaultAppSettingPropertyHandler, AppConfigPropertyHandler: AppConfigPropertyHandler,
    CachedProperty: CachedProperty, CachePropertyHandler: CachePropertyHandler, CacheHandlerProperty: CacheHandlerProperty,
    VaultAppSettingHandlerProperty: VaultAppSettingHandlerProperty, AppConfigHandlerProperty: AppConfigHandlerProperty,
    Property: Property, StringProperty: StringProperty, BooleanProperty: BooleanProperty, NumericProperty: NumericProperty,
    JsonProperty: JsonProperty, ModuleContext: ModuleContext, Module: Module,
    ApplicationAuthorizationProperty: ApplicationAuthorizationProperty, ValueMatch: ValueMatch, MatchAny: MatchAny, MatchAll: MatchAll,
    MatchNone: MatchNone, FunctionRole: FunctionRole, FunctionRoleProperty: FunctionRoleProperty, Configuration: Configuration,
    Algorithm: Algorithm, AES256Algorithm: AES256Algorithm, Cryptography: Cryptography, LOG_LEVEL: LOG_LEVEL,
    BaseSubject: BaseSubject, MonitorResponse: MonitorResponse, RoleResolver: RoleResolver, BaseSentry: BaseSentry,
    BaseContext: BaseContext, BaseFunction: BaseFunction
};
