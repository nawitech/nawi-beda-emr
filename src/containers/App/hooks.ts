import { useCallback, useMemo, useState } from 'react';

import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';
import { AuthProvider } from 'src/services/auth';
import { getClientId } from 'src/services/storage';

export function useApp() {
    const [authProvider, setClientId] = useState<AuthProvider | null>(getClientId());
    const sharedUserInitService = useMemo(
        () => (authProvider ? clientSharedUserInitService[authProvider] : undefined),
        [authProvider],
    );

    const onSwitchLoginService = useCallback(() => {
        setClientId(() => getClientId());
    }, []);

    return { sharedUserInitService, onSwitchLoginService };
}
