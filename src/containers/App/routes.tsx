import { Navigate, Route, Routes } from 'react-router-dom';

import { CodeGrantAuth } from '@beda.software/emr/containers';

import { Billing } from 'src/containers/Billing';
import { RejectionWorkqueue } from 'src/containers/Billing/RejectionWorkqueue';
import { MedicationsDue } from 'src/containers/Medications';
import { OrganizationResourceList } from 'src/containers/OrganizationResourceList';
import { PatientDetails } from 'src/containers/PatientDetails';
import { PatientResourceList } from 'src/containers/PatientResourceList';
import { Reports } from 'src/containers/Reports';
import { AdHocReport } from 'src/containers/Reports/AdHocReport';
import { ClinicActivityReport } from 'src/containers/Reports/ClinicActivityReport';
import { SignIn } from 'src/containers/SignIn';
import { AuthProvider } from 'src/services/auth';

import { menuLayout } from './layout';

function AuthenticatedRoutesContent() {
    const defaultPath = menuLayout()[0]?.path ?? '/patients';
    return (
        <Routes>
            <Route path="/patients" element={<PatientResourceList />} />
            <Route path="/patients/:id/*" element={<PatientDetails />} />
            <Route path="/organizations" element={<OrganizationResourceList />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/clinic-activity" element={<ClinicActivityReport />} />
            <Route path="/reports/ad-hoc" element={<AdHocReport />} />
            <Route path="/medications" element={<MedicationsDue />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/rejections" element={<RejectionWorkqueue />} />
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
