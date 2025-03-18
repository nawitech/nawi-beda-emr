import { useEffect, useMemo, useState } from 'react';

import config from '@beda.software/emr-config';

import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';
import { AuthProvider, Tier, tierConfigMap } from 'src/services/auth';

export function useApp() {
    const clientId = window.localStorage.getItem('ClientId');
    const [authProvider, setAuthProvider] = useState<AuthProvider | null>(
        clientId === 'beda-emr' ? AuthProvider.SparkedHAPI : null,
    );
    const sharedUserInitService = useMemo(
        () => (authProvider ? clientSharedUserInitService[authProvider] : undefined),
        [authProvider],
    );

    useEffect(() => {
        if (authProvider) {
            const authProviderHeader = document.getElementById('auth-provider-info');
            const tier = config.tier as Tier;
            const tierConfig = tierConfigMap[authProvider][tier];
            const baseUrlElement = document.createElement('span');
            baseUrlElement.textContent = tierConfig.baseUrl;
            baseUrlElement.style.color = '#3366ff';
            authProviderHeader?.replaceChildren(baseUrlElement);
        }
    }, [authProvider]);

    return { sharedUserInitService, setAuthProvider };
}
