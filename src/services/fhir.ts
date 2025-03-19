import { Bundle, DocumentReference, Patient } from 'fhir/r4b';

import { service } from '@beda.software/emr/services';
import { extractBundleResources } from '@beda.software/fhir-react';
import { failure, FetchError, isFailure, mapSuccess, sequenceMap, serviceFetch } from '@beda.software/remote-data';

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
        return failure<FetchError>({ message: 'No previously generated summary was not found' });
    }

    const patientSummaryResponse = await serviceFetch<Bundle>(
        docRefResponse.data.content![0].attachment.url!,
        {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        },
    );

    return sequenceMap({ docRef: docRefResponse, patientSummary: patientSummaryResponse });
}
