import { ColumnsType } from 'antd/lib/table';
import {
    Resource,
    Bundle,
    AllergyIntolerance,
    Condition,
    Consent,
    Encounter,
    Observation,
    Immunization,
    MedicationStatement,
    MedicationRequest,
    Procedure,
    RelatedPerson,
    ServiceRequest,
} from 'fhir/r4b';

export type AvailableResourceTypesStr =
    | 'AllergyIntolerance'
    | 'Condition'
    | 'Consent'
    | 'Encounter'
    | 'Observation'
    | 'Immunization'
    | 'MedicationStatement'
    | 'MedicationRequest'
    | 'Procedure'
    | 'RelatedPerson'
    | 'ServiceRequest';
export type AvailableResourceTypes =
    | AllergyIntolerance
    | Condition
    | Consent
    | Encounter
    | Observation
    | Immunization
    | MedicationStatement
    | MedicationRequest
    | Procedure
    | RelatedPerson
    | ServiceRequest;

type RecordType<R extends Resource> = { resource: R; bundle: Bundle };

export interface UberListRT<T extends Resource> {
    title: string;
    icon: JSX.Element;
    columns: ColumnsType<RecordType<T>>;
}

export interface DashboardRT<T extends Resource> {
    title: string;
    icon: JSX.Element;
    columns: Array<{
        title: string;
        key: string;
        render: (resource: T) => React.ReactNode;
        width?: number;
    }>;
}

export type MapResourceConfigType = {
    AllergyIntolerance: UberListRT<AllergyIntolerance> | DashboardRT<AllergyIntolerance>;
    Condition: UberListRT<Condition> | DashboardRT<Condition>;
    Consent: UberListRT<Consent> | DashboardRT<Consent>;
    Encounter: UberListRT<Encounter> | DashboardRT<Encounter>;
    Observation: UberListRT<Observation> | DashboardRT<Observation>;
    Immunization: UberListRT<Immunization> | DashboardRT<Immunization>;
    MedicationStatement: UberListRT<MedicationStatement> | DashboardRT<MedicationStatement>;
    MedicationRequest: UberListRT<MedicationRequest> | DashboardRT<MedicationRequest>;
    Procedure: UberListRT<Procedure> | DashboardRT<Procedure>;
    RelatedPerson: UberListRT<RelatedPerson> | DashboardRT<RelatedPerson>;
    ServiceRequest: UberListRT<ServiceRequest> | DashboardRT<ServiceRequest>;
};
