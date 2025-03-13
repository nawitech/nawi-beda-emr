import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAuthorizeUrl, OAuthState } from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { authClientConfigMap, tierConfigMap, ClientID, Tier } from 'src/services/auth';
import { setBaseUrl, setClientId, setFhirBaseUrl } from 'src/services/storage';
export interface SignInProps {
    originPathName?: string;
    onSwitchService?: () => void;
}

export function useSignIn(props: SignInProps) {
    const [activeClientID, setClientID] = useState<ClientID>(ClientID.Aidbox);
    const tierConfig = useMemo(() => tierConfigMap[activeClientID], [activeClientID]);
    const authClientConfig = useMemo(() => authClientConfigMap[activeClientID], [activeClientID]);
    const tier = config.tier as Tier;
    console.log('tierConfig', tierConfig);
    console.log('authClientConfig', authClientConfig);

    useEffect(() => {
        setClientId(authClientConfig.clientId);
        setBaseUrl(tierConfig[tier].baseUrl);
        setFhirBaseUrl(tierConfig[tier].fhirBaseUrl);
        if (props.onSwitchService) {
            props.onSwitchService();
        }
    }, [authClientConfig.clientId, tierConfig, tier, props]);

    const authorize = useCallback(() => {
        const authState: OAuthState | undefined = props.originPathName ? { nextUrl: props.originPathName } : undefined;

        window.location.href = getAuthorizeUrl({
            baseUrl: tierConfig[tier].baseUrl,
            authPath: authClientConfig.authPath,
            params: new URLSearchParams({
                client_id: authClientConfig.clientId,
                response_type: authClientConfig.responseType,
                redirect_uri: authClientConfig.redirectURL,
                ...(authClientConfig.scope ? { scope: authClientConfig.scope.join(' ') } : {}),
            }),
            state: authState,
        });
    }, [props.originPathName, authClientConfig, tierConfig, tier]);

    return { activeClientID, authorize, setClientID, authClientConfig };
}
