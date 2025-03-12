import config from '@beda.software/emr-config';

export type ClientID = 'web' | 'beda-emr';

export enum SignInService {
    Aidbox = 'Aidbox',
    Smile = 'Smile CDR',
}

export type Tier = 'develop' | 'production';

interface AuthClientConfigParams {
    baseUrl: string;
    fhirBaseUrl: string;
}

interface AuthClientCommonConfigParams {
    clientId: ClientID;
    authPath: string;
    tokenPath: string;
    authSearchParams: URLSearchParams;
}

type AuthClientConfig = { [key in Tier]: AuthClientConfigParams };

export const configMap: { [key in SignInService]: AuthClientConfig } = {
    [SignInService.Aidbox]: {
        develop: {
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            baseUrl: 'https://au-core.beda.software',
            fhirBaseUrl: 'https://au-core.beda.software/fhir',
        },
    },
    [SignInService.Smile]: {
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

export const commonConfigMap: { [key in SignInService]: AuthClientCommonConfigParams } = {
    [SignInService.Aidbox]: {
        clientId: 'web',
        authPath: 'auth/authorize',
        tokenPath: 'auth/token',
        authSearchParams: new URLSearchParams({ client_id: 'web', response_type: 'token' }),
    },
    [SignInService.Smile]: {
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

interface AuthTokenSuccessResponse {
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
