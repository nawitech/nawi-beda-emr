import { useCallback, useMemo, useState } from 'react';

import { ClientID } from 'src/services/auth';
import { getClientId } from 'src/services/storage';
import { clientSharedUserInitService } from 'src/populateUserInfoSharedState';

export function useApp() {
    const [clientId, setClientId] = useState<ClientID | null>(getClientId());
    const sharedUserInitService = useMemo(
        () => (clientId ? clientSharedUserInitService[clientId] : undefined),
        [clientId],
    );

    const onSwitchLoginService = useCallback(() => {
        setClientId(() => getClientId());
    }, []);

    return { sharedUserInitService, onSwitchLoginService };
}
