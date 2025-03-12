import { commonConfig } from './config.common.js';

const config = {
    ...commonConfig,

    clientId: window.localStorage.getItem('ClientId') || 'web',

    tier: 'develop',
    baseURL: window.localStorage.getItem('baseURL') || 'http://localhost:8080',
    fhirBaseURL: window.localStorage.getItem('fhirBaseURL') || 'http://localhost:8080/fhir',
    sdcIdeUrl: 'http://localhost:3001',
    aiQuestionnaireBuilderUrl: 'http://localhost:3002',
    sdcBackendUrl: null,

    webSentryDSN: null,
    mobileSentryDSN: null,

    jitsiMeetServer: null,

    wearablesDataStreamService: null,

    metriportIdentifierSystem: null,
    aiAssistantServiceUrl: null,
};

export { config as default };
