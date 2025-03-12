import { Route } from 'react-router-dom';

import { App as OriginApp } from '@beda.software/emr/containers';

import { Auth } from './Auth';
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
                    <Route path="/auth" element={<Auth />} />
                </>
            }
        />
    );
}
