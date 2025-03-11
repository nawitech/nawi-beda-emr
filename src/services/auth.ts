import config from '@beda.software/emr-config';

export enum SignInService {
    EMR = 'EMR',
    Smile = 'Smile',
}
export type Tier = 'develop' | 'production';

interface AuthClientConfigParams {
    baseUrl: string;
    fhirBaseUrl: string;
}

interface AuthClientCommonConfigParams {
    clientId: string;
    authPath: string;
    tokenPath: string;
    authSearchParams: URLSearchParams;
}

type AuthClientConfig = { [key in Tier]: AuthClientConfigParams };

export const configMap: { [key in SignInService]: AuthClientConfig } = {
    EMR: {
        develop: {
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            baseUrl: 'https://au-core.beda.software',
            fhirBaseUrl: 'https://au-core.beda.software/fhir',
        },
    },
    Smile: {
        develop: {
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore',
        },
        production: {
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore',
        },
    },
};

export const commonConfigMap: { [key in SignInService]: AuthClientCommonConfigParams } = {
    EMR: {
        clientId: 'web',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        authSearchParams: new URLSearchParams({ client_id: 'web', response_type: 'token' }),
    },
    Smile: {
        clientId: 'beda-emr',
        authPath: 'smart/oauth/authorize',
        tokenPath: 'smart/oauth/token',
        authSearchParams: new URLSearchParams({
            client_id: 'beda-emr',
            response_type: 'code',
            redirect_uri: `${window.location.origin}/auth`,
            scopes: 'openid fhirUser',
        }),
    },
};

export function setBaseUrl(value: string) {
    window.localStorage.setItem('baseURL', value)
}

export function setFhirBaseUrl(value: string) {
    window.localStorage.setItem('fhirBaseURL', value)
}

export function setClientId(value: string) {
    window.localStorage.setItem('ClientId', value)
}

export async function exchangeAuthorizationCodeForToken(code: string) {
    const scopes = ['openid', 'fhirUser']
    try {
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

        const tokenData = await response.json();

        return tokenData;
    } catch (error) {
        console.error('Error:', error);
    }
}

export function setRefreshToken(token: string) {
    window.localStorage.setItem('refresh_token', token);
}