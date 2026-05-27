import { commonConfig } from './config.common.js';

const config = {
    ...commonConfig,

    tier: 'production',
    baseURL: 'https://aidbox.emr.beda.software',
    sdcIdeUrl: 'https://sdc.beda.software',
    aiQuestionnaireBuilderUrl: 'https://builder.emr.beda.software',

    sdcBackendUrl: null,
    webSentryDSN: null,
    mobileSentryDSN: null,
    jitsiMeetServer: 'video.emr.beda.software/',
    wearablesDataStreamService: 'https://ingest.emr.beda.software/api/v1',
    aiAssistantServiceUrl: 'https://scribe.emr.beda.software',
};

export { config as default };
