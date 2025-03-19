import { useEffect, useMemo, useState } from 'react';

import { getToken } from '@beda.software/emr/services';

import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';
import { AuthProvider, getAuthProviderFromStorage } from 'src/services/auth';

export function useApp() {
    const [authProvider, setAuthProvider] = useState<AuthProvider | null>(getAuthProviderFromStorage());
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
