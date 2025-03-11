import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAuthorizeUrl, OAuthState } from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { commonConfigMap, configMap, setBaseUrl, setClientId, SignInService, Tier } from 'src/services/auth';
export interface SignInProps {
    originPathName?: string;
}

export function useSignIn(props: SignInProps) {
    const [signInService, setSignInService] = useState<SignInService>(SignInService.EMR);
    const authConfig = useMemo(() => configMap[signInService], [signInService]);
    const commonAuthConfig = useMemo(() => commonConfigMap[signInService], [signInService]);
    const tier = config.tier as Tier;

    useEffect(() => {
        setClientId(commonAuthConfig.clientId);
        setBaseUrl(authConfig[tier].baseUrl);
    }, [commonAuthConfig.clientId, authConfig, tier]);

    const authorize = useCallback(() => {
        const authState: OAuthState | undefined = props.originPathName ? { nextUrl: props.originPathName } : undefined;

        window.location.href = getAuthorizeUrl({
            baseUrl: authConfig[tier].baseUrl,
            authPath: commonAuthConfig.authPath,
            params: new URLSearchParams(commonAuthConfig.authSearchParams),
            state: authState,
        });
    }, [props.originPathName, commonAuthConfig, authConfig, tier]);

    return { signInService, setSignInService, authorize };
}
