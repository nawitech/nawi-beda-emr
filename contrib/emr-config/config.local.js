import { commonConfig } from './config.common.js';

const config = {
    ...commonConfig,

    tier: 'develop',
    baseURL: 'http://localhost:8080',
    fhirBaseURL: 'http://localhost:8080/fhir',
    sdcIdeUrl: 'http://localhost:3001',
    aiQuestionnaireBuilderUrl: 'http://localhost:3002',
    sdcBackendUrl: null,

    webSentryDSN: null,
    mobileSentryDSN: null,

    jitsiMeetServer: 'localhost:8443',

    wearablesDataStreamService: 'http://localhost:8082/api/v1',

    aiAssistantServiceUrl: null,
};

export { config as default };
