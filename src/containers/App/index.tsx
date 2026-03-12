import { Navigate, Route } from 'react-router-dom';

import {
    Auth as ImplicitGrantAuth,
    CodeGrantAuth,
    EMR,
    HealthcareServiceList,
    PractitionerDetails,
    PractitionerList,
} from '@beda.software/emr/containers';
import { MenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';
import config from '@beda.software/emr-config';

import { AuthProvider, tierConfigMap } from 'src/services/auth.ts';

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
    const isDigitalHealth = config.baseURL === tierConfigMap[AuthProvider.DigitalHealth].develop.baseUrl;
    const isEpic = config.baseURL === tierConfigMap[AuthProvider.Epic].develop.baseUrl;
    const isOrionHealth = config.baseURL === tierConfigMap[AuthProvider.OrionHealth].develop.baseUrl;
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
        } else if (isOrionHealth) {
            return (
                <>
                    <Route path="/patients" element={<Navigate to="/patients/GE3DQMRZHE4UAU2ZKNPUC" />} />
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
                authenticatedRoutes={renderRoutes()}
                anonymousRoutes={
                    <>
                        <Route path="/signin" element={<SignIn onSwitchService={setAuthProvider} />} />
                        <Route path="/auth" element={<CodeGrantAuth />} />
                        <Route path="/auth-aidbox" element={<ImplicitGrantAuth />} />
                    </>
                }
                populateUserInfoSharedState={sharedUserInitService}
                menuLayout={getMenuLayout()}
            />
        </MenuLayout.Provider>
    );
}
