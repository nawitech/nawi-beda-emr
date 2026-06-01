import { Route } from 'react-router-dom';

import { Auth as ImplicitGrantAuth, CodeGrantAuth, EMR } from '@beda.software/emr/containers';
import { BottomMenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarBottom/context';
import { MenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';

import { keycloakBottomMenuLayout } from './bottomMenuLayout';
import { useApp } from './hooks';
import { menuLayout } from './layout';
import { PatientDetails } from '../PatientDetails';
import { EncounterPage } from '../PatientDetails/encounter';
import { PatientResourceList } from '../PatientResourceList';
import { SignIn } from '../SignIn';

export function App() {
    const { sharedUserInitService, setAuthProvider } = useApp();
    const renderRoutes = () => {
        return (
            <>
                <Route path="/patients" element={<PatientResourceList />} />
                <Route path="/patients/:id/encounter/:encounter/*" element={<EncounterPage />} />
                <Route path="/patients/:id/*" element={<PatientDetails />} />
            </>
        );
    };

    const getMenuLayout = () => {
        return menuLayout;
    };

    return (
        <MenuLayout.Provider value={getMenuLayout()}>
            <BottomMenuLayout.Provider value={keycloakBottomMenuLayout}>
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
            </BottomMenuLayout.Provider>
        </MenuLayout.Provider>
    );
}
