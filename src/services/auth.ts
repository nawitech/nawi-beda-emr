import config from "@beda.software/emr-config/config";

export enum AuthProvider {
    AuCoreAidbox = 'au-core-aidbox',
    ErequestingAidbox = 'e-requesting-aidbox',
    SmartOnFhirAidbox = 'smart-on-fhir-aidbox',
    SparkedHAPI = 'sparked-hapi',
    BP = 'best-practice',
    IRIS = 'isris',
    MediRecords = 'medirecords',
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
            baseUrl: 'https://bps-interop-practicegateway-fhir-test-api.deva.svc.bpcloud.dev/api/interop/r4/fhir',
            fhirBaseUrl: 'https://bps-interop-practicegateway-fhir-test-api.deva.svc.bpcloud.dev/api/interop/r4/fhir',
        },
        production: {
            baseUrl: 'https://bps-interop-practicegateway-fhir-test-api.deva.svc.bpcloud.dev/api/interop/r4/fhir',
            fhirBaseUrl: 'https://bps-interop-practicegateway-fhir-test-api.deva.svc.bpcloud.dev/api/interop/r4/fhir',
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
        redirectURL: `${window.location.origin}/isir-auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'fhirUser'],
        tabTitle: 'Medirecords',
        message: 'No authorization required',
    },
};
