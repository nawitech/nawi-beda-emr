import { commonConfig } from './config.common.js';

const config = {
    ...commonConfig,

    clientId: window.localStorage.getItem('ClientId') || 'web',
    authTokenPath: window.localStorage.getItem('auth_token_path') || 'auth/token',
    authClientRedirectURL: window.localStorage.getItem('auth_client_redirect_url') || 'https://aidbox.emr.beda.software/auth-aidbox',

    tier: 'production',
    baseURL: window.localStorage.getItem('baseURL') || 'https://aidbox.emr.beda.software',
    fhirBaseURL: window.localStorage.getItem('fhirBaseURL') || 'https://aidbox.emr.beda.software/fhir',
    sdcIdeUrl: 'https://sdc.beda.software',
    aiQuestionnaireBuilderUrl: 'https://builder.emr.beda.software',

    sdcBackendUrl: null,
    webSentryDSN: null,
    mobileSentryDSN: null,
    jitsiMeetServer: null,
    wearablesDataStreamService: null,
    metriportIdentifierSystem: null,
    aiAssistantServiceUrl: 'https://scribe.emr.beda.software',
};

export { config as default };
