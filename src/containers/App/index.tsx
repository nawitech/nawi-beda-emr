import { Route } from 'react-router-dom';

import { App as OriginApp, Auth as AidboxAuth } from '@beda.software/emr/containers';

import { SmileAuth } from './auth/SmileAuth';
import { useApp } from './hooks';
import { SignIn } from '../SignIn';

export function App() {
    const { sharedUserInitService, onSwitchLoginService } = useApp();

    return (
        <OriginApp
            populateUserInfoSharedState={sharedUserInitService}
            anonymousRoutes={
                <>
                    <Route path="/signin" element={<SignIn onSwitchService={onSwitchLoginService} />} />
                    <Route path="/auth" element={<SmileAuth />} />
                    <Route path="/auth-aidbox" element={<AidboxAuth />} />
                </>
            }
        />
    );
}
