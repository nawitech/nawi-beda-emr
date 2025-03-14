import { useMemo, useState } from 'react';

import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';
import { AuthProvider } from 'src/services/auth';

export function useApp() {
    const [authProvider, setAuthProvider] = useState<AuthProvider | null>(null);
    const sharedUserInitService = useMemo(
        () => (authProvider ? clientSharedUserInitService[authProvider] : undefined),
        [authProvider],
    );;

    return { sharedUserInitService, setAuthProvider };
}
