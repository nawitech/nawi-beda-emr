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

const OHS_HOSTED: TierBaseConfig = {
    baseUrl: 'http://35.202.40.190:8080',
    fhirBaseUrl: 'http://35.202.40.190:8084/fhir',
};

// Keycloak must be addressed by the same hostname from the browser and from the
// gateway container, because the gateway rejects any token whose `iss` differs from
// its TOKEN_ISSUER. `localhost` cannot do that: inside the container it resolves to
// the gateway itself. `host.docker.internal` resolves for both — via extra_hosts in
// the container, and via /etc/hosts on Linux.
const OHS_LOCAL: TierBaseConfig = {
    baseUrl: 'http://host.docker.internal:8080',
    fhirBaseUrl: 'http://localhost:8084/fhir',
};

export const tierConfigMap: { [key in AuthProvider]: TierConfig } = {
    [AuthProvider.OHSKeycloak]: {
        develop: OHS_HOSTED,
        production: OHS_HOSTED,
    },
    // Never falls back to the hosted server: a provider named "local" that quietly
    // authenticates against a remote Keycloak is the worst kind of surprise.
    [AuthProvider.OHSKeycloakLocal]: {
        develop: OHS_LOCAL,
        production: OHS_LOCAL,
    },
};

export const authClientConfigMap: { [key in AuthProvider]: AuthClientConfigParams } = {
    [AuthProvider.OHSKeycloak]: {
        clientId: 'beda-frontend',
        authPath: 'realms/beda-emr/protocol/openid-connect/auth',
        tokenPath: 'realms/beda-emr/protocol/openid-connect/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'profile'],
        tabTitle: 'OHS FHIR Gateway — hosted',
        message: 'Sign in with your institutional Keycloak account',
    },
    [AuthProvider.OHSKeycloakLocal]: {
        clientId: 'beda-frontend',
        authPath: 'realms/beda-emr/protocol/openid-connect/auth',
        tokenPath: 'realms/beda-emr/protocol/openid-connect/token',
        responseType: 'code',
        redirectURL: `${window.location.origin}/auth`,
        grantType: 'authorization_code',
        scope: ['openid', 'profile'],
        tabTitle: 'OHS FHIR Gateway — local docker stack',
        message: 'Sign in with the seeded Keycloak realm running in docker',
        sharedCredentials: {
            accountDetails: [
                { login: 'clinician', accountDescription: 'Dr. Amara Okafor — workflow 1' },
                { login: 'triage-nurse', accountDescription: 'Lena Torres, RN — workflow 2' },
                { login: 'administrator', accountDescription: 'Joan Rivera — workflow 3' },
                { login: 'cashier', accountDescription: 'Marcus Webb — workflow 4' },
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
