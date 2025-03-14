export enum AuthProvider {
    AuCoreAidbox = 'au-core-aidbox',
    ErequestingAidbox = 'e-requesting-aidbox',
    SmartOnFhirAidbox = 'smart-on-fhir-aidbox',
    SparkedHAPI = 'sparked-hapi',
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
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            baseUrl: 'https://aucore.aidbox.beda.software',
            fhirBaseUrl: 'https://aucore.aidbox.beda.software/fhir',
        },
    },
    [AuthProvider.ErequestingAidbox]: {
        develop: {
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            baseUrl: 'https://erequesting.aidbox.beda.software',
            fhirBaseUrl: 'https://erequesting.aidbox.beda.software/fhir',
        },
    },
    [AuthProvider.SmartOnFhirAidbox]: {
        develop: {
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
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
};

export const authClientConfigMap: { [key in AuthProvider]: AuthClientConfigParams } = {
    [AuthProvider.AuCoreAidbox]: {
        clientId: 'web',
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
                    login: 'practitioner-tc',
                    accountDescription: 'Practitioner has access to related patients',
                },
            ],
            commonPassword: 'password',
        },
    },
    [AuthProvider.ErequestingAidbox]: {
        clientId: 'web',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        responseType: 'token',
        redirectURL: `${window.location.origin}/auth-aidbox`,
        grantType: 'implicit',
        tabTitle: 'erequesting.aidbox.beda.software',
        message: 'On the next page, please, use one of the following credentials',
        // sharedCredentials: {
        //     accountDetails: [
        //         {
        //             login: 'practitioner-tc',
        //             accountDescription: 'Practitioner has access to related patients',
        //         },
        //     ],
        //     commonPassword: 'password',
        // },
    },
    [AuthProvider.SmartOnFhirAidbox]: {
        clientId: 'web',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        responseType: 'token',
        redirectURL: `${window.location.origin}/auth-aidbox`,
        grantType: 'implicit',
        tabTitle: 'smartonfhir.aidbox.beda.software',
        message: 'On the next page, please, use one of the following credentials',
        // sharedCredentials: {
        //     accountDetails: [
        //         {
        //             login: 'practitioner-tc',
        //             accountDescription: 'Practitioner has access to related patients',
        //         },
        //     ],
        //     commonPassword: 'password',
        // },
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
};
