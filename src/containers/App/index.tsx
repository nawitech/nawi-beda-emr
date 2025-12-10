import { Route, Navigate } from 'react-router-dom';

import {
    App as EMR,
    Auth as ImplicitGrantAuth,
    CodeGrantAuth,
    PractitionerList,
    PractitionerDetails,
    HealthcareServiceList,
} from '@beda.software/emr/containers';
import { MenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';
import config from '@beda.software/emr-config';

import { useApp } from './hooks';
import { digitalHealthMenuLayout, menuLayout } from './layout';
import { LocationResourceList } from '../LocationResourceList';
import { OrganizationResourceList } from '../OrganizationResourceList';
import { PatientDetails } from '../PatientDetails';
import { EncounterPage } from '../PatientDetails/encounter';
import { PatientResourceList } from '../PatientResourceList';
import { SignIn } from '../SignIn';

export function App() {
    const { sharedUserInitService, setAuthProvider } = useApp();
    const isDigitalHealth = config.baseURL === 'https://fhir-xrp.digitalhealth.gov.au/fhir/';
    const isEpic = config.baseURL === 'https://connectathon-au.epic.com/Interconnect-connectathon-au/api/FHIR/R4/';
    const digitalHealthRoutes = (
        <>
            <Route path="/practitioners" element={<PractitionerList />} />
            <Route path="/practitioners/:id/*" element={<PractitionerDetails />} />
            <Route path="/healthcare-services" element={<HealthcareServiceList />} />
            <Route path="/organizations" element={<OrganizationResourceList />} />
            <Route path="/locations" element={<LocationResourceList />} />
        </>
    );

    const renderRoutes = () => {
        if (isDigitalHealth) {
            return digitalHealthRoutes;
        } else if (isEpic) {
            return (
                <>
                    <Route path="/patients" element={<Navigate to="/patients/e0lof40pd7mW6R7f0v.4POw3" />} />
                    <Route path="/patients/:id/*" element={<PatientDetails />} />
                </>
            );
        }

        return (
            <>
                <Route path="/patients" element={<PatientResourceList />} />
                <Route path="/patients/:id/encounter/:encounter/*" element={<EncounterPage />} />
                <Route path="/patients/:id/*" element={<PatientDetails />} />
            </>
        );
    };

    const getMenuLayout = () => {
        if (isDigitalHealth) {
            return digitalHealthMenuLayout;
        }

        return menuLayout;
    };

    return (
        <MenuLayout.Provider value={getMenuLayout()}>
            <EMR
                populateUserInfoSharedState={sharedUserInitService}
                anonymousRoutes={
                    <>
                        <Route path="/signin" element={<SignIn onSwitchService={setAuthProvider} />} />
                        <Route path="/auth" element={<CodeGrantAuth />} />
                        <Route path="/auth-aidbox" element={<ImplicitGrantAuth />} />
                    </>
                }
                authenticatedRoutes={renderRoutes()}
            />
        </MenuLayout.Provider>
    );
}
