import axios from 'axios';
import { ValueSet } from 'fhir/r4b';
import { upperFirst } from 'lodash';

import { ValueSetOption } from '@beda.software/emr/dist/services/valueset-expand';
import { getCurrentLocale, service } from '@beda.software/emr/services';
import { isSuccess } from '@beda.software/remote-data';

/**
 * Where a questionnaire's `answerValueSet` gets expanded.
 *
 * This deployment defines its own ValueSets (OPD diagnoses, lab tests, medications, billable
 * services, payment methods) and seeds them into its own FHIR server. A public terminology
 * server has never heard of them, so expanding one there returns nothing and the choice item
 * renders an empty dropdown with no error.
 *
 * Local canonicals therefore expand against our own FHIR server; everything else still goes to
 * the public server, which is what it is there for.
 *
 * Use `service` from `@beda.software/emr/services` and NOT the package's own
 * `expandFHIRValueSet`. They look interchangeable and are not: `expandFHIRValueSet` goes
 * through aidbox-react's shared instance, whose base URL is `config.baseURL` — which in this
 * deployment is *Keycloak*, not the FHIR gateway (see `tierConfigMap` in `src/services/auth.ts`,
 * where `baseUrl` is the auth host and `fhirBaseUrl` is the gateway). `service` resolves
 * `fhirBaseURL`, so the request reaches the gateway with the user's bearer token.
 */

const LOCAL_VALUE_SET_PREFIX = 'https://emr.nawi.ke/fhir/';

const ontoserver = axios.create({
    baseURL: 'https://tx.dev.hl7.org.au',
    headers: {
        Accept: 'application/json;charset=UTF=8',
    },
});

function toOptions(contains: unknown): Array<ValueSetOption> {
    if (!Array.isArray(contains)) {
        return [];
    }

    return contains.map((item: { code: string; system: string; display: string }) => ({
        value: {
            Coding: {
                code: item.code,
                system: item.system,
                display: upperFirst(item.display),
            },
        },
    }));
}

async function expandLocally(answerValueSet: string, searchText: string): Promise<Array<ValueSetOption>> {
    const response = await service<ValueSet>({
        url: '/ValueSet/$expand',
        params: {
            url: answerValueSet,
            count: 50,
            // Omitted rather than sent empty. (HAPI happens to treat `filter=` the same as
            // no filter — both return the full 30 — but not every server does.)
            ...(searchText ? { filter: searchText } : {}),
        },
    });

    if (!isSuccess(response)) {
        console.error('ValueSet $expand failed', answerValueSet, response.error);
        return [];
    }

    return toOptions(response.data.expansion?.contains);
}

export async function expandValueSet(
    answerValueSet: string | undefined,
    searchText: string,
): Promise<Array<ValueSetOption>> {
    if (!answerValueSet) {
        return [];
    }

    if (answerValueSet.startsWith(LOCAL_VALUE_SET_PREFIX)) {
        return await expandLocally(answerValueSet, searchText);
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

    return toOptions(response.data?.expansion?.contains);
}
