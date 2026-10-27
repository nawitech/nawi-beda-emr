import { commonConfig } from './config.common.js';

// Production config. Every backend URL is derived from the page origin, because the
// production stack (docker-compose.prod.yml) puts the whole system behind one reverse
// proxy at one public URL:
//
//   <origin>/        this frontend
//   <origin>/fhir    fhir-gateway (token-checked FHIR API)
//   <origin>/kc      Keycloak (KC_HTTP_RELATIVE_PATH=/kc)
//   <origin>/sdc     fhir-sdc, token-checked by the proxy
//
// One image therefore serves any deployment; nothing here needs editing per environment.
// See docs/deployment.md.
const origin = window.location.origin;

const config = {
    ...commonConfig,

    clientId: window.localStorage.getItem('ClientId') || 'beda-frontend',
    authTokenPath: window.localStorage.getItem('auth_token_path') || 'realms/beda-emr/protocol/openid-connect/token',
    authClientRedirectURL: window.localStorage.getItem('auth_client_redirect_url') || `${origin}/auth`,

    tier: 'production',
    baseURL: window.localStorage.getItem('baseURL') || `${origin}/kc`,
    fhirBaseURL: window.localStorage.getItem('fhirBaseURL') || `${origin}/fhir`,
    sdcIdeUrl: 'https://sdc.beda.software',
    aiQuestionnaireBuilderUrl: 'https://builder.emr.beda.software',
    sdcBackendUrl: `${origin}/sdc`,

    webSentryDSN: null,
    mobileSentryDSN: null,
    jitsiMeetServer: null,
    wearablesDataStreamService: null,
    metriportIdentifierSystem: null,
    aiAssistantServiceUrl: null,
};

export { config as default };
