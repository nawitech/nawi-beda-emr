export enum AuthProvider {
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
    // OHS FHIR Gateway (HAPI FHIR + Keycloak)
    // baseUrl  → Keycloak host: used by getAuthorizeUrl() to build the browser auth redirect URL.
    // fhirBaseUrl → OHS Gateway: used for all FHIR API calls (Bearer token enforced by gateway).
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
    // OHS FHIR Gateway — Keycloak OIDC (authorization_code flow).
    // Auth endpoint strategy (Option A — baseUrl split):
    //   baseUrl is the Keycloak host, so getAuthorizeUrl() builds:
    //     http://35.202.40.190:8080/realms/beda-emr/protocol/openid-connect/auth?...
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

export async function doLogout() {
    const authProvider = getAuthProviderFromStorage();
    const isKeycloakProvider =
        authProvider === AuthProvider.OHSKeycloak || authProvider === AuthProvider.OHSKeycloakLocal;

    if (isKeycloakProvider) {
        const idToken = window.localStorage.getItem('id_token');
        if (idToken) {
            try {
                const payload = JSON.parse(atob(idToken.split('.')[1])) as { iss: string };
                const logoutUrl = new URL(`${payload.iss}/protocol/openid-connect/logout`);
                logoutUrl.searchParams.set('id_token_hint', idToken);
                logoutUrl.searchParams.set('post_logout_redirect_uri', `${window.location.origin}/`);
                logoutUrl.searchParams.set('client_id', authClientConfigMap[authProvider].clientId);
                window.localStorage.clear();
                window.location.href = logoutUrl.toString();
                return;
            } catch {
                // fall through to default
            }
        }
    }

    window.localStorage.clear();
    window.location.href = '/';
}

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
