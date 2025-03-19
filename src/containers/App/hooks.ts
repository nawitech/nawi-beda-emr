import { getToken } from '@beda.software/emr/services';
import { useEffect, useMemo, useState } from 'react';

import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';
import { AuthProvider } from 'src/services/auth';

export function useApp() {
    const clientId = window.localStorage.getItem('ClientId');
    const [authProvider, setAuthProvider] = useState<AuthProvider | null>(
        clientId === 'beda-emr' ? AuthProvider.SparkedHAPI :
            (clientId === 'bp' ? AuthProvider.BP : null),
    );
    const sharedUserInitService = useMemo(
        () => (authProvider ? clientSharedUserInitService[authProvider] : undefined),
        [authProvider],
    );

    useEffect(() => {
        const authProviderHeader = document.getElementById('auth-provider-info');
        if (authProviderHeader) {
            const token = getToken();
            if (!token) {
                authProviderHeader.style.display = 'none';
            }
        }
    }, []);

    return { sharedUserInitService, setAuthProvider };
}
