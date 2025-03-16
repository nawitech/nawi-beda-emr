import axios from 'axios';
import { upperFirst } from 'lodash';
import { getCurrentLocale } from './i18n';
import { ValueSetOption } from '@beda.software/emr/dist/services/valueset-expand';

const ontoserver = axios.create({
    baseURL: 'https://tx.dev.hl7.org.au',
    headers: {
        Accept: 'application/json;charset=UTF=8',
    },
});

export async function expandValueSet(
    answerValueSet: string | undefined,
    searchText: string
): Promise<Array<ValueSetOption>> {
    if (!answerValueSet) {
        return [];
    }

    const response = await ontoserver.get('/fhir/ValueSet/$expand', {
        params: {
            url: answerValueSet,
            _format: 'json',
            filter: searchText,
            count: 50,
            displayLanguage: getCurrentLocale(),
        },
    });
    return response.data.expansion.contains.map((item: { code: string; system: string; display: string }) => ({
        value: {
            Coding: {
                code: item.code,
                system: item.system,
                display: upperFirst(item.display),
            },
        },
    }));
};
