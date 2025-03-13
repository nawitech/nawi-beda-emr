import { Route } from 'react-router-dom';

import { App as EMR, Auth as ImplicitGrantAuth, CodeGrantAuth } from '@beda.software/emr/containers';

import { useApp } from './hooks';
import { SignIn } from '../SignIn';

export function App() {
    const { sharedUserInitService, onSwitchLoginService } = useApp();

    return (
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
    );
}
