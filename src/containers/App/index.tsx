import { Route } from 'react-router-dom';

import { App as OriginApp } from '@beda.software/emr/containers';

import { Auth } from './Auth';
import { SignIn } from '../SignIn';

export function App() {
    return (
        <OriginApp
            anonymousRoutes={
                <>
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/auth" element={<Auth />} />
                </>
            }
        />
    );
}
