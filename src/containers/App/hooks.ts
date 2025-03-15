import { useMemo, useState } from 'react';

import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';
import { AuthProvider } from 'src/services/auth';

export function useApp() {
    const clientId = window.localStorage.getItem('ClientId')
    const [authProvider, setAuthProvider] = useState<AuthProvider | null>(
        clientId === 'beda-emr' ? AuthProvider.SparkedHAPI : null);
    const sharedUserInitService = useMemo(
        () => (authProvider ? clientSharedUserInitService[authProvider] : undefined),
        [authProvider],
    );;

    return { sharedUserInitService, setAuthProvider };
}
