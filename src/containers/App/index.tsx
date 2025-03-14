import { Route } from 'react-router-dom';

import { App as EMR, Auth as ImplicitGrantAuth, CodeGrantAuth } from '@beda.software/emr/containers';
import { MenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';

import { useApp } from './hooks';
import { menuLayout } from './layout';
import { SignIn } from '../SignIn';

export function App() {
    const { sharedUserInitService, onSwitchLoginService } = useApp();

    return (
        <MenuLayout.Provider value={menuLayout}>
            <EMR
                populateUserInfoSharedState={sharedUserInitService}
                anonymousRoutes={
                    <>
                        <Route path="/signin" element={<SignIn onSwitchService={onSwitchLoginService} />} />
                        <Route path="/auth" element={<CodeGrantAuth />} />
                        <Route path="/auth-aidbox" element={<ImplicitGrantAuth />} />
                    </>
                }
            />
        </MenuLayout.Provider>
    );
}
