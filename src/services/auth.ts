import config from '@beda.software/emr-config';

export enum ClientID {
    Aidbox = 'web',
    Smile = 'beda-emr',
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
    clientId: ClientID;
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

export const tierConfigMap: { [key in ClientID]: TierConfig } = {
    [ClientID.Aidbox]: {
        develop: {
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            baseUrl: 'https://au-core.beda.software',
            fhirBaseUrl: 'https://au-core.beda.software/fhir',
        },
    },
    [ClientID.Smile]: {
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

export const authClientConfigMap: { [key in ClientID]: AuthClientConfigParams } = {
    [ClientID.Aidbox]: {
        clientId: ClientID.Aidbox,
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        responseType: 'token',
        redirectURL: `${window.location.origin}/auth-aidbox`,
        grantType: 'implicit',
        tabTitle: 'au-core.beda.software',
        message: 'On the next page, please, use one of the following credentials',
        sharedCredentials: {
            accountDetails: [{
                login: 'practitioner-tc',
                accountDescription: 'Practitioner has access to related patients'
            }],
            commonPassword: 'password',
        },
    },
    [ClientID.Smile]: {
        clientId: ClientID.Smile,
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

export interface AuthTokenSuccessResponse {
    access_token: string;
    token_type: string;
    refresh_token?: string;
    id_token?: string;
}

export async function exchangeAuthorizationCodeForToken(code: string) {
    // TODO: get scopes from the config
    const scopes = ['openid', 'fhirUser'];
    try {
        // TODO: move token path to config? Or auth params save as JSON in localStorage?
        const tokenEndpoint = `${config.baseURL}/smart/oauth/token`;
        const data = {
            grant_type: 'authorization_code',
            code,
            redirect_uri: `${window.location.origin}/auth`,
            client_id: `${config.clientId}`,
            scope: scopes.join(' '),
        };

        const response = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams(data),
        });

        const tokenData: AuthTokenSuccessResponse = await response.json();

        return tokenData;
    } catch (error) {
        console.error('Error:', error);
    }
}
