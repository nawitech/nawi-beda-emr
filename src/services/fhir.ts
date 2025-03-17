import { Bundle, Composition, DocumentReference, DomainResource, Patient } from 'fhir/r4b';

import { service } from '@beda.software/emr/services';
import { extractBundleResources } from '@beda.software/fhir-react';
import { failure, FetchError, isFailure, mapSuccess, sequenceMap, serviceFetch, success } from '@beda.software/remote-data';

interface GetPatientSummaryDocRefArgs {
    patient: Patient;
    onDemand?: boolean;
}

export async function getLatestPatientSummaryDocRef(args: GetPatientSummaryDocRefArgs) {
    const { patient, onDemand = false } = args;

    const response = await service<Bundle<DocumentReference>>({
        url: 'DocumentReference/$docref',
        params: { patient: patient.id!, 'on-demand': onDemand.toString() },
    });
    console.log('response', JSON.stringify(response));

    return mapSuccess(response, (bundle) => {
        const resources = extractBundleResources(bundle).DocumentReference;

        if (resources.length === 0) {
            return undefined;
        }

        resources.sort((currentItem, nextItem) => {
            const currentItemDate = new Date(currentItem.date!);
            const nextItemDate = new Date(nextItem.date!);

            if (currentItemDate > nextItemDate) {
                return -1;
            } else if (nextItemDate > currentItemDate) {
                return 1;
            } else {
                return 0;
            }
        });

        return resources[0];
    });
}

export async function fetchPatientSummary(args: GetPatientSummaryDocRefArgs) {
    const docRefResponse = await getLatestPatientSummaryDocRef(args);

    if (isFailure(docRefResponse)) {
        return docRefResponse;
    }

    if (!docRefResponse.data) {
        return failure<FetchError>({message: 'DocumentReference was not found'})
    }

    const patientSummaryResponse = mapSuccess(
        await serviceFetch<Bundle<Composition>>(docRefResponse.data.content![0].attachment.url!, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        }),
        (bundle) => {
            const composition = extractBundleResources(bundle).Composition;

            return composition?.[0]
        },
    );

    return sequenceMap({ docRef: docRefResponse, patientSummary: patientSummaryResponse });
}

// https://aupsdocrefdev.syd1.digitaloceanspaces.com/aupsdocrefdev/aiobotocore/202503171408_banks-mia-leanne_summary-20250317140837233640.json?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=DO003NG3LGXDN82CK2VN%2F20250317%2Fsyd1%2Fs3%2Faws4_request&X-Amz-Date=20250317T143408Z&X-Amz-Expires=600&X-Amz-SignedHeaders=host&X-Amz-Signature=c25de4da97e814a077bfeb0d588eddc31676b239da7900bd1efbc1c2434e9496
