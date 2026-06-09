import { EMR } from '@beda.software/emr/containers';
import { BottomMenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarBottom/context';
import { MenuLayout } from '@beda.software/emr/dist/components/BaseLayout/Sidebar/SidebarTop/context';

import { AnonymousRoutes, AuthenticatedRoutes } from 'src/containers/App/routes';

import { keycloakBottomMenuLayout } from './bottomMenuLayout';
import { useApp } from './hooks';
import { menuLayout } from './layout';

export function App() {
    const { sharedUserInitService, setAuthProvider } = useApp();

    return (
        <MenuLayout.Provider value={menuLayout}>
            <BottomMenuLayout.Provider value={keycloakBottomMenuLayout}>
                <EMR
                    authenticatedRoutes={AuthenticatedRoutes}
                    anonymousRoutes={AnonymousRoutes({ setAuthProvider })}
                    populateUserInfoSharedState={sharedUserInitService}
                    menuLayout={menuLayout}
                />
            </BottomMenuLayout.Provider>
        </MenuLayout.Provider>
    );
}
