import { Route } from 'react-router-dom';

import { App as EMR, Auth as ImplicitGrantAuth, CodeGrantAuth } from '@beda.software/emr/containers';
import { MenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';

import { useApp } from './hooks';
import { menuLayout } from './layout';
import { PatientDetails } from '../PatientDetails';
import { EncounterPage } from '../PatientDetails/encounter';
import { PatientResourceList } from '../PatientResourceList';
import { SignIn } from '../SignIn';

export function App() {
    const { sharedUserInitService, setAuthProvider } = useApp();

    return (
        <MenuLayout.Provider value={menuLayout}>
            <EMR
                populateUserInfoSharedState={sharedUserInitService}
                anonymousRoutes={
                    <>
                        <Route path="/signin" element={<SignIn onSwitchService={setAuthProvider} />} />
                        <Route path="/auth" element={<CodeGrantAuth />} />
                        <Route path="/auth-aidbox" element={<ImplicitGrantAuth />} />
                    </>
                }
                authenticatedRoutes={
                    <>
                        <Route path="/patients" element={<PatientResourceList />} />
                        <Route path="/patients/:id/encounter/:encounter/*" element={<EncounterPage />} />
                        <Route path="/patients/:id/*" element={<PatientDetails />} />
                    </>
                }
            />
        </MenuLayout.Provider>
    );
}
