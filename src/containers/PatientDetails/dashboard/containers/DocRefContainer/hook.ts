import { Patient } from 'fhir/r4b';
import { useCallback, useState } from 'react';

import { useService } from '@beda.software/fhir-react';
import { isFailure, isSuccess, loading, notAsked, RemoteData } from '@beda.software/remote-data';

import { fetchPatientSummary } from 'src/services/fhir';

export function useDocRefCard(patient: Patient) {
    const [latestSummaryDocRefResponse, manager] = useService(async () => await fetchPatientSummary({ patient }));

    const [docRefUpdateState, setDocRefUpdateState] = useState<RemoteData>(notAsked);

    const generateDocRef = useCallback(async () => {
        setDocRefUpdateState(loading);
        const newSummaryResponse = await fetchPatientSummary({ patient, onDemand: true });
        if (isSuccess(newSummaryResponse)) {
            setDocRefUpdateState(newSummaryResponse);
            await manager.softReloadAsync();
        }
        if (isFailure(newSummaryResponse)) {
            setDocRefUpdateState(newSummaryResponse);
        }
        return newSummaryResponse;
    }, [patient, manager]);

    return {
        latestSummaryDocRefResponse,
        generateDocRef,
        docRefUpdateState,
    };
}
