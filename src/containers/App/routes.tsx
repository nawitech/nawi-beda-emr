import { Navigate, Route, Routes } from 'react-router-dom';

import { CodeGrantAuth, OrganizationScheduling } from '@beda.software/emr/containers';

import { LocationResourceList } from 'src/containers/LocationResourceList';
import { OrganizationResourceList } from 'src/containers/OrganizationResourceList';
import { PatientDetails } from 'src/containers/PatientDetails';
import { PatientResourceList } from 'src/containers/PatientResourceList';
import { SignIn } from 'src/containers/SignIn';
import { AuthProvider } from 'src/services/auth';
import { matchCurrentUserRole, Role } from 'src/utils/role';

import { menuLayout } from './layout';

const AuthenticatedReceptionistRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
        <Route path="/scheduling" element={<OrganizationScheduling />} />
    </>
);

const AuthenticatedTriageNurseRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

const AuthenticatedClinicianRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

const AuthenticatedLabTechnicianRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

const AuthenticatedPharmacistRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

const AuthenticatedCashierRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

const AuthenticatedAdministratorRoutes = () => (
    <>
        <Route path="/patients" element={<PatientResourceList />} />
        <Route path="/patients/:id/*" element={<PatientDetails />} />
        <Route path="/scheduling" element={<OrganizationScheduling />} />
        <Route path="/organizations" element={<OrganizationResourceList />} />
        <Route path="/locations" element={<LocationResourceList />} />
    </>
);

const AuthenticatedPatientRoutes = () => (
    <>
        <Route path="/patients/:id/*" element={<PatientDetails />} />
    </>
);

function AuthenticatedRoutesContent() {
    const defaultPath = menuLayout()[0]?.path ?? '/patients';
    return (
        <Routes>
            {matchCurrentUserRole({
                [Role.Receptionist]: () => AuthenticatedReceptionistRoutes(),
                [Role.TriageNurse]: () => AuthenticatedTriageNurseRoutes(),
                [Role.Clinician]: () => AuthenticatedClinicianRoutes(),
                [Role.LabTechnician]: () => AuthenticatedLabTechnicianRoutes(),
                [Role.Pharmacist]: () => AuthenticatedPharmacistRoutes(),
                [Role.Cashier]: () => AuthenticatedCashierRoutes(),
                [Role.Administrator]: () => AuthenticatedAdministratorRoutes(),
                [Role.Patient]: () => AuthenticatedPatientRoutes(),
            })}
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
