import { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { CodeGrantAuth } from '@beda.software/emr/containers';

import { BillingQueue } from 'src/containers/BillingQueue';
import { ConsultationQueue } from 'src/containers/ConsultationQueue';
import { EncounterResourceList } from 'src/containers/EncounterResourceList';
import { HealthcareServiceResourceList } from 'src/containers/HealthcareServiceResourceList';
import { InvoiceResourceList } from 'src/containers/InvoiceResourceList';
import { LabQueue } from 'src/containers/LabQueue';
import { OrganizationResourceList } from 'src/containers/OrganizationResourceList';
import { PatientDetails } from 'src/containers/PatientDetails';
import { PatientResourceList } from 'src/containers/PatientResourceList';
import { PharmacyQueue } from 'src/containers/PharmacyQueue';
import { PriceListResourceList } from 'src/containers/PriceListResourceList';
import { SignIn } from 'src/containers/SignIn';
import { TriageQueue } from 'src/containers/TriageQueue';
import { AuthProvider } from 'src/services/auth';
import { matchCurrentUserRole, Role } from 'src/utils/role';

import { menuLayout } from './layout';

/**
 * Which pages each role may open.
 *
 * The sidebar is not an access control — a receptionist who types `/queue/triage` must not
 * land on the triage form either. Routes a role has no business on are simply not mounted,
 * so `*` sends them back to their own first menu entry. Keep this in step with `layout.tsx`.
 */

const PATIENT_ROUTES = (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

const ENCOUNTER_ROUTE = <Route path="/encounters" element={<EncounterResourceList />} />;
const INVOICE_ROUTE = <Route path="/invoices" element={<InvoiceResourceList />} />;
const PRICE_LIST_ROUTE = <Route path="/price-list" element={<PriceListResourceList />} />;

function routesForCurrentRole(): ReactElement {
    return matchCurrentUserRole<ReactElement>({
        [Role.Receptionist]: () => (
            <>
                {PATIENT_ROUTES}
                {ENCOUNTER_ROUTE}
            </>
        ),
        [Role.TriageNurse]: () => (
            <>
                <Route path="/queue/triage" element={<TriageQueue />} />
                {PATIENT_ROUTES}
            </>
        ),
        [Role.Clinician]: () => (
            <>
                <Route path="/queue/consultations" element={<ConsultationQueue />} />
                {PATIENT_ROUTES}
                {ENCOUNTER_ROUTE}
            </>
        ),
        [Role.LabTechnician]: () => (
            <>
                <Route path="/queue/laboratory" element={<LabQueue />} />
                {PATIENT_ROUTES}
            </>
        ),
        [Role.Pharmacist]: () => (
            <>
                <Route path="/queue/pharmacy" element={<PharmacyQueue />} />
                {PATIENT_ROUTES}
            </>
        ),
        [Role.Cashier]: () => (
            <>
                <Route path="/queue/billing" element={<BillingQueue />} />
                {PATIENT_ROUTES}
                {INVOICE_ROUTE}
                {PRICE_LIST_ROUTE}
            </>
        ),
        [Role.Administrator]: () => (
            <>
                {PATIENT_ROUTES}
                {ENCOUNTER_ROUTE}
                {INVOICE_ROUTE}
                {PRICE_LIST_ROUTE}
                <Route path="/healthcare-services" element={<HealthcareServiceResourceList />} />
                <Route path="/organizations" element={<OrganizationResourceList />} />
            </>
        ),
        [Role.Patient]: () => <>{PATIENT_ROUTES}</>,
    });
}

function AuthenticatedRoutesContent() {
    const menu = menuLayout();
    const defaultPath = menu[0]?.path ?? '/patients';

    let roleRoutes: ReactElement;
    try {
        roleRoutes = routesForCurrentRole();
    } catch {
        // Unknown or missing role: no application route is mounted at all, rather than
        // falling through to a page the user may not be entitled to.
        roleRoutes = <></>;
    }

    return (
        <Routes>
            {roleRoutes}
            <Route path="*" element={<Navigate to={defaultPath} replace />} />
        </Routes>
    );
}

export const AuthenticatedRoutes = <Route path="*" element={<AuthenticatedRoutesContent />} />;

export function AnonymousRoutes({ setAuthProvider }: { setAuthProvider: (authProvider: AuthProvider) => void }) {
    return (
        <>
            <Route path="/signin" element={<SignIn onSwitchService={setAuthProvider} />} />
            <Route path="/auth" element={<CodeGrantAuth />} />
        </>
    );
}
