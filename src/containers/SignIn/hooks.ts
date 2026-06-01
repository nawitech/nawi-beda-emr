import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    getAuthorizeUrl,
    OAuthState,
    setAuthClientRedirectURL,
    setAuthTokenURLpath,
} from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { authClientConfigMap, AuthProvider, saveAuthProviderToStorage, Tier, tierConfigMap } from 'src/services/auth';
import { setBaseUrl, setClientId, setFhirBaseUrl } from 'src/services/storage';

export interface SignInProps {
    originPathName?: string;
    onSwitchService?: (authProvider: AuthProvider) => void;
}

export function useSignIn(props: SignInProps) {
    const [activeAuthProvider, setAuthProvider] = useState<AuthProvider>(AuthProvider.OHSKeycloak);
    const tierConfig = useMemo(() => tierConfigMap[activeAuthProvider], [activeAuthProvider]);
    const authClientConfig = useMemo(() => authClientConfigMap[activeAuthProvider], [activeAuthProvider]);
    const tier = config.tier as Tier;

    useEffect(() => {
        setBaseUrl(tierConfig[tier].baseUrl);
        setFhirBaseUrl(tierConfig[tier].fhirBaseUrl);
        setClientId(authClientConfig.clientId);
        setAuthClientRedirectURL(authClientConfig.redirectURL);
        setAuthTokenURLpath(authClientConfig.tokenPath);
        saveAuthProviderToStorage(activeAuthProvider);
        if (props.onSwitchService) {
            props.onSwitchService(activeAuthProvider);
        }
    }, [props, authClientConfig, tierConfig, tier, activeAuthProvider]);

    const authorize = useCallback(() => {
        // Explicitly persist all config to localStorage right before any redirect.
        // This guarantees CodeGrantAuth and the FHIR client have correct values
        // regardless of whether the useEffect has already run.
        setBaseUrl(tierConfig[tier].baseUrl);
        setFhirBaseUrl(tierConfig[tier].fhirBaseUrl);
        setClientId(authClientConfig.clientId);
        setAuthClientRedirectURL(authClientConfig.redirectURL);
        setAuthTokenURLpath(authClientConfig.tokenPath);
        saveAuthProviderToStorage(activeAuthProvider);

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
    }, [props.originPathName, authClientConfig, tierConfig, tier, activeAuthProvider]);

    return { activeAuthProvider, authorize, setAuthProvider, authClientConfig };
}
