import { Parameters, Questionnaire, QuestionnaireResponse } from 'fhir/r4b';

import { service } from '@beda.software/emr/services';
import config from '@beda.software/emr-config';
import { mapSuccess } from '@beda.software/remote-data';

export const sdcServiceProvider = {
    assemble: async (questionnaireId: string) => {
        return mapSuccess(
            await service<Questionnaire>({
                baseURL: config.sdcBackendUrl || undefined,
                method: 'GET',
                url: `/Questionnaire/${questionnaireId}/$assemble`,
            }),
            (questionnaire) => questionnaire,
        );
    },

    populate: async (params: Parameters) => {
        return service<QuestionnaireResponse>({
            baseURL: config.sdcBackendUrl || undefined,
            method: 'POST',
            url: '/Questionnaire/$populate',
            data: params,
        });
    },

    constraintCheck: async (params: Parameters) => {
        return service<any>({
            baseURL: config.sdcBackendUrl || undefined,
            method: 'POST',
            url: '/QuestionnaireResponse/$constraint-check',
            data: params,
        });
    },

    extract: async (params: Parameters) => {
        return service<QuestionnaireResponse>({
            baseURL: config.sdcBackendUrl || undefined,
            method: 'POST',
            url: '/Questionnaire/$extract',
            data: params,
        });
    },
};
