import config from '@beda.software/emr-config/config';

export enum AuthProvider {
    AuCoreAidbox = 'au-core-aidbox',
    ErequestingAidbox = 'e-requesting-aidbox',
    ErequestingSparked = 'e-requesting-sparked',
    ErequestingCallistemon = 'e-requesting-callistemon',
    SmartOnFhirAidbox = 'smart-on-fhir-aidbox',
    SparkedHAPI = 'sparked-hapi',
    BP = 'best-practice',
    IRIS = 'isris',
    MediRecords = 'medirecords',
    HaloConnect = 'halo-connect',
    MedtechGlobal = 'medtech-global',
    Sparked = 'sparked',
    DigitalHealth = 'digital-health',
    Epic = 'epic',
    OrionHealth = 'orion-health',
    OHSKeycloak = 'ohs-keycloak',
    OHSKeycloakLocal = 'ohs-keycloak-local',
}

export type Tier = 'develop' | 'production';

interface TierBaseConfig {
    baseUrl: string;
    fhirBaseUrl: string;
}

export interface SharedCredentials {
    accountDetails: SharedAccountDetails[];
    commonPassword?: string;
}
export interface SharedAccountDetails {
    login: string;
    accountDescription: string;
    password?: string;
}

export interface AuthClientConfigParams {
    clientId: string;
    authPath: string;
    tokenPath: string;
    responseType: 'code' | 'token';
    redirectURL: string;
    grantType: 'implicit' | 'authorization_code';
    scope?: string[];
    tabTitle: string;
    message: string;
    sharedCredentials?: SharedCredentials;
    headers?: { [key in string]: string };
}

type TierConfig = { [key in Tier]: TierBaseConfig };

export const tierConfigMap: { [key in AuthProvider]: TierConfig } = {
    [AuthProvider.AuCoreAidbox]: {
        develop: {
            baseUrl: 'https://aucore.aidbox.beda.software',
            fhirBaseUrl: 'https://aucore.aidbox.beda.software/fhir',
        },
        production: {
            baseUrl: 'https://aucore.aidbox.beda.software',
            fhirBaseUrl: 'https://aucore.aidbox.beda.software/fhir',
        },
    },
    [AuthProvider.ErequestingAidbox]: {
        develop: {
            baseUrl: 'https://erequesting.aidbox.beda.software',
            fhirBaseUrl: 'https://erequesting.aidbox.beda.software/fhir',
        },
        production: {
            baseUrl: 'https://erequesting.aidbox.beda.software',
            fhirBaseUrl: 'https://erequesting.aidbox.beda.software/fhir',
        },
    },
    [AuthProvider.ErequestingSparked]: {
        develop: {
            baseUrl: 'https://smile.sparked-fhir.com/ereq',
            fhirBaseUrl: 'https://smile.sparked-fhir.com/ereq/fhir/DEFAULT',
        },
        production: {
            baseUrl: 'https://smile.sparked-fhir.com/ereq',
            fhirBaseUrl: 'https://smile.sparked-fhir.com/ereq/fhir/DEFAULT',
        },
    },
    [AuthProvider.ErequestingCallistemon]: {
        develop: {
            baseUrl: 'https://server.callistemon.site/fhir',
            fhirBaseUrl: 'https://server.callistemon.site/fhir',
        },
        production: {
            baseUrl: 'https://server.callistemon.site/fhir',
            fhirBaseUrl: 'https://server.callistemon.site/fhir',
        },
    },
    [AuthProvider.SmartOnFhirAidbox]: {
        develop: {
            baseUrl: 'https://smartonfhir.aidbox.beda.software',
            fhirBaseUrl: 'https://smartonfhir.aidbox.beda.software/fhir',
        },
        production: {
            baseUrl: 'https://smartonfhir.aidbox.beda.software',
            fhirBaseUrl: 'https://smartonfhir.aidbox.beda.software/fhir',
        },
    },
    [AuthProvider.SparkedHAPI]: {
        develop: {
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore/fhir/DEFAULT',
        },
        production: {
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore/fhir/DEFAULT',
        },
    },
    [AuthProvider.BP]: {
        develop: {
            baseUrl:
                'https://bps-interop-practicegateway-connectathon-fhir-api.deva.svc.bpcloud.dev/api/interop/r4/fhir/',
            fhirBaseUrl:
                'https://bps-interop-practicegateway-connectathon-fhir-api.deva.svc.bpcloud.dev/api/interop/r4/fhir/',
        },
        production: {
            baseUrl:
                'https://bps-interop-practicegateway-connectathon-fhir-api.deva.svc.bpcloud.dev/api/interop/r4/fhir/',
            fhirBaseUrl:
                'https://bps-interop-practicegateway-connectathon-fhir-api.deva.svc.bpcloud.dev/api/interop/r4/fhir/',
        },
    },
    [AuthProvider.IRIS]: {
        develop: {
            baseUrl: 'https://fhirserver.intersystems.com.au/csp/fhir/r4',
            fhirBaseUrl: 'https://fhirserver.intersystems.com.au/csp/fhir/r4',
        },
        production: {
            baseUrl: 'https://fhirserver.intersystems.com.au/csp/fhir/r4',
            fhirBaseUrl: 'https://fhirserver.intersystems.com.au/csp/fhir/r4',
        },
    },
    [AuthProvider.MediRecords]: {
        develop: {
            baseUrl: 'https://api-v1.test.medirecords.com/fhir/v1',
            fhirBaseUrl: 'https://api-v1.test.medirecords.com/fhir/v1',
        },
        production: {
            baseUrl: 'https://api-v1.test.medirecords.com/fhir/v1',
            fhirBaseUrl: 'https://api-v1.test.medirecords.com/fhir/v1',
        },
    },
    [AuthProvider.HaloConnect]: {
        develop: {
            baseUrl: 'https://api.stage.haloconnect.io/integrator/sites/63255e8a-d04a-42a6-8c75-90aa880ad94e/fhir/R4/',
            fhirBaseUrl:
                'https://api.stage.haloconnect.io/integrator/sites/63255e8a-d04a-42a6-8c75-90aa880ad94e/fhir/R4/',
        },
        production: {
            baseUrl: 'https://api.stage.haloconnect.io/integrator/sites/63255e8a-d04a-42a6-8c75-90aa880ad94e/fhir/R4/',
            fhirBaseUrl:
                'https://api.stage.haloconnect.io/integrator/sites/63255e8a-d04a-42a6-8c75-90aa880ad94e/fhir/R4/',
        },
    },
    [AuthProvider.MedtechGlobal]: {
        develop: {
            baseUrl: 'https://alexapiuat.medtechglobal.com/FHIR',
            fhirBaseUrl: 'https://alexapiuat.medtechglobal.com/FHIR',
        },
        production: {
            baseUrl: 'https://alexapiuat.medtechglobal.com/FHIR',
            fhirBaseUrl: 'https://alexapiuat.medtechglobal.com/FHIR',
        },
    },
    [AuthProvider.Sparked]: {
        develop: {
            baseUrl: 'https://smile.sparked-fhir.com/aucore/fhir/DEFAULT/',
            fhirBaseUrl: 'https://smile.sparked-fhir.com/aucore/fhir/DEFAULT/',
        },
        production: {
            baseUrl: 'https://smile.sparked-fhir.com/aucore/fhir/DEFAULT/',
            fhirBaseUrl: 'https://smile.sparked-fhir.com/aucore/fhir/DEFAULT/',
        },
    },
    [AuthProvider.DigitalHealth]: {
        develop: {
            baseUrl: 'https://fhir-xrp.digitalhealth.gov.au/fhir/',
            fhirBaseUrl: 'https://fhir-xrp.digitalhealth.gov.au/fhir/',
        },
        production: {
            baseUrl: 'https://fhir-xrp.digitalhealth.gov.au/fhir/',
            fhirBaseUrl: 'https://fhir-xrp.digitalhealth.gov.au/fhir/',
        },
    },
    [AuthProvider.Epic]: {
        develop: {
            baseUrl: 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/',
            fhirBaseUrl: 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/',
        },
        production: {
            baseUrl: 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/',
            fhirBaseUrl: 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/',
        },
    },
    [AuthProvider.OrionHealth]: {
        develop: {
            baseUrl: 'https://interop-gateway.odl.io/fhir/4.0/',
            fhirBaseUrl: 'https://interop-gateway.odl.io/fhir/4.0/',
        },
        production: {
            baseUrl: 'https://interop-gateway.odl.io/fhir/4.0/',
            fhirBaseUrl: 'https://interop-gateway.odl.io/fhir/4.0/',
        },
    },
    // OHS FHIR Gateway (HAPI FHIR + Keycloak)
    // baseUrl  → Keycloak host: used by getAuthorizeUrl() to build the browser auth redirect URL.
    // fhirBaseUrl → OHS Gateway: used for all FHIR API calls (Bearer token enforced by gateway).
    // This split mirrors the MedtechGlobal pattern (absolute tokenPath, relative authPath off baseUrl).
    [AuthProvider.OHSKeycloak]: {
        develop: {
            baseUrl: 'http://35.202.40.190:8080',
            fhirBaseUrl: 'http://35.202.40.190:8084/fhir',
        },
        production: {
            baseUrl: 'http://35.202.40.190:8080',
            fhirBaseUrl: 'http://35.202.40.190:8084/fhir',
        },
    },
    [AuthProvider.OHSKeycloakLocal]: {
        develop: {
            baseUrl: 'http://host.docker.internal:8080',
            fhirBaseUrl: 'http://localhost:8084/fhir',
        },
        production: {
            baseUrl: 'http://35.202.40.190:8080',
            fhirBaseUrl: 'http://35.202.40.190:8084/fhir',
        },
    },
};

export const authClientConfigMap: { [key in AuthProvider]: AuthClientConfigParams } = {
    [AuthProvider.AuCoreAidbox]: {
        clientId: config.tier === 'production' ? 'web' : 'web-local',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        responseType: 'token',
        redirectURL: `${window.location.origin}/auth-aidbox`,
        grantType: 'implicit',
        tabTitle: 'aucore.aidbox.beda.software',
        message: 'On the next page, please, use one of the following credentials',
        sharedCredentials: {
            accountDetails: [
                {
                    login: 'alderson-helene',
                    accountDescription: 'Practitioner has access to related patients',
                },
            ],
            commonPassword: 'password',
        },
    },
    [AuthProvider.ErequestingAidbox]: {
        clientId: config.tier === 'production' ? 'web' : 'web-local',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        responseType: 'token',
        redirectURL: `${window.location.origin}/auth-aidbox`,
        grantType: 'implicit',
        tabTitle: 'erequesting.aidbox.beda.software',
        message: 'On the next page, please, use one of the following credentials',
        sharedCredentials: {
            accountDetails: [
                {
                    login: 'alderson-helene',
                    accountDescription: 'Practitioner has access to related patients',
                },
            ],
            commonPassword: 'password',
        },
    },
    [AuthProvider.ErequestingSparked]: {
        clientId: 'beda-emr',
        authPath: 'smartauth/oauth/authorize',
        tokenPath: 'smartauth/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        tabTitle: 'smile.sparked-fhir.com/ereq',
        message: 'Please contact https://github.com/aehrc/sparked-fhir-server-configuration for credentials',
    },
    [AuthProvider.ErequestingCallistemon]: {
        clientId: 'callistemon',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/callistemon-auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'eRequesting Callistemon (HAPI server)',
        message: 'No authorization required',
    },
    [AuthProvider.SmartOnFhirAidbox]: {
        clientId: config.tier === 'production' ? 'web' : 'web-local',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        responseType: 'token',
        redirectURL: `${window.location.origin}/auth-aidbox`,
        grantType: 'implicit',
        tabTitle: 'smartonfhir.aidbox.beda.software',
        message: 'On the next page, please, use one of the following credentials',
        sharedCredentials: {
            accountDetails: [
                {
                    login: 'alderson-helene',
                    accountDescription: 'Practitioner has access to related patients',
                },
            ],
            commonPassword: 'password',
        },
    },
    [AuthProvider.SparkedHAPI]: {
        clientId: 'beda-emr',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'fhir.hl7.org.au/aucore',
        message: 'Please contact Heath Frankel for credentials',
    },
    [AuthProvider.BP]: {
        clientId: 'bp',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/bp-auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Best practice facade',
        message: 'No authorization required',
    },
    [AuthProvider.IRIS]: {
        clientId: 'iris',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/isir-auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Intersystems',
        message: 'No authorization required',
    },
    [AuthProvider.MediRecords]: {
        clientId: 'mr',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Medirecords',
        message: 'No authorization required',
    },
    [AuthProvider.HaloConnect]: {
        clientId: 'halo-connect',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Halo Connect',
        message: 'No authorization required',
        headers: {
            'Ocp-Apim-Subscription-Key': '923b7ac4add44b02be0e93d3303e55e1',
        },
    },
    [AuthProvider.MedtechGlobal]: {
        clientId: 'meditech-global',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'https://login.microsoftonline.com/8a024e99-aba3-4b25-b875-28b0c0ca6096/oauth2/v2.0/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Medtech Global',
        message: 'No authorization required',
    },
    [AuthProvider.Sparked]: {
        clientId: 'sparked',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Sparked',
        message: 'No authorization required',
    },
    [AuthProvider.DigitalHealth]: {
        clientId: 'digital-health',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Digital Health',
        message: 'No authorization required',
    },
    [AuthProvider.Epic]: {
        clientId: 'epic',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Epic',
        message: 'No authorization required',
    },
    [AuthProvider.OrionHealth]: {
        clientId: 'orion-health',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Orion Health',
        message: 'No authorization required',
    },
    // OHS FHIR Gateway — Keycloak OIDC (authorization_code flow).
    // Auth endpoint strategy (Option A — baseUrl split):
    //   baseUrl is the Keycloak host, so getAuthorizeUrl() builds:
    //     http://35.202.40.190:8080/realms/beda-emr/protocol/openid-connect/auth?...
    //   tokenPath is absolute (same pattern as AuthProvider.MedtechGlobal) so setAuthTokenURLpath
    //   stores it directly — the code→token exchange POSTs straight to Keycloak.
    //   All FHIR API calls use fhirBaseUrl (the gateway at :8084), not baseUrl.
    //
    // Keycloak client 'fhir-emr' must have http://35.202.40.190:5000/* as a valid redirect URI.
    // Each Keycloak user needs a `patient_list` claim → FHIR List resource ID in HAPI
    // (required by ACCESS_CHECKER=list in docker-compose.yml).
    [AuthProvider.OHSKeycloak]: {
        clientId: 'beda-frontend',
        authPath: 'realms/beda-emr/protocol/openid-connect/auth',
        tokenPath: 'realms/beda-emr/protocol/openid-connect/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'profile'],
        tabTitle: 'OHS FHIR Gateway (HAPI + Keycloak)',
        message: 'Sign in with your institutional Keycloak account',
        sharedCredentials: {
            accountDetails: [
                {
                    login: 'practitioner@nawi-emr.com',
                    accountDescription: 'Test practitioner account',
                },
            ],
            commonPassword: 'password1',
        },
    },
    [AuthProvider.OHSKeycloakLocal]: {
        clientId: 'beda-frontend',
        authPath: 'realms/beda-emr/protocol/openid-connect/auth',
        tokenPath: 'realms/beda-emr/protocol/openid-connect/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'profile'],
        tabTitle: 'OHS FHIR Gateway (HAPI + Keycloak) - Local',
        message: 'Sign in with your institutional Keycloak account',
        sharedCredentials: {
            accountDetails: [
                {
                    login: 'practitioner',
                    accountDescription: 'Test practitioner account',
                },
            ],
            commonPassword: 'password',
        },
    },
};

export function saveAuthProviderToStorage(value: AuthProvider) {
    window.localStorage.setItem('auth_provider', value);
}

export function getAuthProviderFromStorage() {
    const authProvider = window.localStorage.getItem('auth_provider');

    if (authProvider) {
        return authProvider as AuthProvider;
    }

    return null;
}

