import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAuthorizeUrl, OAuthState, setAuthClientRedirectURL, setAuthTokenURLpath } from '@beda.software/emr/services';
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

    useEffect(() => {
        setBaseUrl(tierConfig[tier].baseUrl);
        setFhirBaseUrl(tierConfig[tier].fhirBaseUrl);
        setClientId(authClientConfig.clientId);
        setAuthClientRedirectURL(authClientConfig.redirectURL);
        setAuthTokenURLpath(authClientConfig.tokenPath);
        if (props.onSwitchService) {
            props.onSwitchService();
        }
    }, [props, authClientConfig, tierConfig, tier]);

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
