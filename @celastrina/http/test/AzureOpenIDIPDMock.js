const jwt = require("jsonwebtoken");
const MockAdapter = require("axios-mock-adapter");
const axios = require("axios");
const {v4: uuidv4} = require("uuid");
const moment = require("moment");
const assert = require("assert");
const {OpenIDJwtIssuer} = require("../HTTP");

const PRIVATE_PEM =
    "-----BEGIN RSA PRIVATE KEY-----\n" +
    "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\n" +
    "-----END RSA PRIVATE KEY-----";
const JWKS_TOKEN = {
    kid: "",
    kty: "RSA",
    n: "3_hOZuwBCpoPqxzaRfziud4j7XI_CcUngHdc3QfCDrquHEZYe4O4G2y7sB7bSf02KEj7v80yNbZmVUUSX5BXP_f0rLUrzQ2M_v6ernGune7usaqi_UPaBDH1S8VbfO9FvS_0L2Hph_4TphvRpPDomGH5cdEAZZus-W61LMVqOCdDjud9cmlnncketL-8eUMd_8YgnMJ5Z0ieUFJ9tBiBxdOGOMEe5cSGFR0AkzTZ7iO-eEzus04kH9GWs8_8lJLTjC0t_JQA9bp1A5UZx4ww5ZZdX39SfcgZBXUotqjMMcKCDpnfroLhGnaTZdAn4o1DNupcQVRrwGUETRJHXKewDV2A2Sky30NPJL6q60H3jw53IhhAtrLWl_m2EuBA-W7lAlmbEW8NowTyHJGLQsQmWwu0qEPXy1PH7Di7IfdCpyU_-S6cLDtLGnIwyymEBXWZROpzU3uDEfz3DMIUQWID7lz38j1sF7y4hNpivdrKLxNBU7jTBOEiozy5qIzofHnbxxRBmbWL7M-MT5LmM7SFb_8iiPQXsrkufXzII5uU7QzYMuvfGmKGztEWAtQIETQxhe1VLB9dx0NgrtdmI6Q_tHpp7z3Nl4Jg30wMizH1FnB_JXyNFkcresGSAPNTYOtyRx0wWp65xd4WTwgTGkoilGmHZs2FSF_6LH9GJnFPbY0",
    e: "AQAB",
    x5c: "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEA3/hOZuwBCpoPqxzaRfziud4j7XI/CcUngHdc3QfCDrquHEZYe4O4G2y7sB7bSf02KEj7v80yNbZmVUUSX5BXP/f0rLUrzQ2M/v6ernGune7usaqi/UPaBDH1S8VbfO9FvS/0L2Hph/4TphvRpPDomGH5cdEAZZus+W61LMVqOCdDjud9cmlnncketL+8eUMd/8YgnMJ5Z0ieUFJ9tBiBxdOGOMEe5cSGFR0AkzTZ7iO+eEzus04kH9GWs8/8lJLTjC0t/JQA9bp1A5UZx4ww5ZZdX39SfcgZBXUotqjMMcKCDpnfroLhGnaTZdAn4o1DNupcQVRrwGUETRJHXKewDV2A2Sky30NPJL6q60H3jw53IhhAtrLWl/m2EuBA+W7lAlmbEW8NowTyHJGLQsQmWwu0qEPXy1PH7Di7IfdCpyU/+S6cLDtLGnIwyymEBXWZROpzU3uDEfz3DMIUQWID7lz38j1sF7y4hNpivdrKLxNBU7jTBOEiozy5qIzofHnbxxRBmbWL7M+MT5LmM7SFb/8iiPQXsrkufXzII5uU7QzYMuvfGmKGztEWAtQIETQxhe1VLB9dx0NgrtdmI6Q/tHpp7z3Nl4Jg30wMizH1FnB/JXyNFkcresGSAPNTYOtyRx0wWp65xd4WTwgTGkoilGmHZs2FSF/6LH9GJnFPbY0CAwEAAQ=="
};
class MockMicrosoftOpenIDIDPServer {
    constructor(tenant = uuidv4(),
                kid = uuidv4(),
                domain = "login.microsoftonline.com", version = "v2.0",
                configPath = "https://{domain}/common/{version}/.well-known/openid-configuration",
                issuerPath = "https://{domain}/{tenant}/{version}",
                jwksUriPath = "https://{domain}/common/discovery/{version}/keys",
                privateKey = PRIVATE_PEM, jwk = JWKS_TOKEN) {
        this._mock = null;
        this._kid = kid;
        this._tenant = tenant;
        this._domain = domain;
        this._version = version;
        this._privateKey = privateKey;
        this._jwkToken = JSON.parse(JSON.stringify(jwk));
        this._jwkToken.kid = this._kid;
        this._issuerPath = issuerPath;
        this._configurl = configPath.split("{domain}").join(this._domain).split("{tenant}")
            .join(this._tenant).split("{version}").join(this._version);
        this._issuer = this._issuerPath.split("{domain}").join(this._domain).split("{tenant}")
            .join(this._tenant).split("{version}").join(this._version);
        this._jwksUri = jwksUriPath.split("{domain}").join(this._domain).split("{tenant}")
            .join(this._tenant).split("{version}").join(this._version);
    }
    set tenant(tenant) {this._tenant = tenant;}
    get domain() {return this._domain;}
    get tenant() {return this._tenant;}
    get version() {return this._version;}
    get configPath() {return this._configurl;}
    get issuerPath() {return this._issuer;}
    get jwksPath() {return this._jwksUri;}
    rebuildIssuer() {
        this._issuer = this._issuerPath.split("{domain}").join(this._domain).split("{tenant}")
            .join(this._tenant).split("{version}").join(this._version);
    }
    async createOpenIDIssuer(aud = [uuidv4()], foozleIssuer = false, assigments = ["mock_user_role"]) {
        let _lissuer = this._issuer;
        if(foozleIssuer) _lissuer += "_foozled";
        return new OpenIDJwtIssuer(_lissuer, this._configurl, aud, assigments);
    }
    async setHeader(headers, foozle = false, sub = uuidv4(), aud = uuidv4(), expiresIn = 1800,
                    name = "authorization", scheme = "Bearer") {
        if(typeof headers === "undefined" || headers == null)
            assert.fail("MockMicrosoftOpenIDIDPServer.setHeader(headers): Invalid argument 'headers', cannot be null or 'undefined'.");
        else {
            let _response = await this.issueJWT(sub, aud, expiresIn);
            headers[name] = scheme + " " + _response.access_token;
            if(foozle) headers[name] += headers[name] + "_foozled";
            return _response;
        }
    }
    async issueJWT(sub = uuidv4(), aud = uuidv4(), expiresIn = 1800) {
        let _iat = moment();
        let _exp = moment(_iat);
        _exp = _exp.add(expiresIn, "seconds");
        let diff = _exp.diff(_iat, "seconds");
        let _token = jwt.sign({sub: sub, iat: _iat.unix(), exp: _exp.unix(), nbf: _iat.unix(),
                                      iss: this._issuer, aud: aud},
            this._privateKey, {algorithm: "RS256", header: {kid: this._kid, x5t: this._kid}});
        return {token_type: "Bearer", expires_in: diff, ext_expires_in: diff, access_token: _token, iss: this._issuer,
                sub: sub, aud: aud};
    }
    async start(useX5T = false) {
        let _this = this;
        this._mock = new MockAdapter(axios);
        let _localjwks = JSON.parse(JSON.stringify(_this._jwkToken));
        if(!useX5T) delete _localjwks.x5c;
        this._mock.onGet(this._configurl).reply((config) => {
            return [200, {issuer: _this._issuer, jwks_uri: _this._jwksUri}];
        });
        this._mock.onGet(this._jwksUri).reply((config) => {
            return [200, {keys: [_localjwks]}];
        });
    }
    async stop() {
        this._mock.restore();
        this._mock = null;
    }
}

module.exports = {
    MockMicrosoftOpenIDIDPServer: MockMicrosoftOpenIDIDPServer
};
