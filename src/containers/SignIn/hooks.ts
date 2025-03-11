import { useCallback, useEffect, useMemo, useState } from 'react';

import { getAuthorizeUrl, OAuthState } from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { setBaseUrl, setClientId } from 'src/services/auth';
export interface SignInProps {
    originPathName?: string;
}

export enum SignInService {
    EMR = 'EMR',
    Smile = 'Smile',
}
type Tier = 'develop' | 'production';

interface AuthClientConfigParams {
    baseUrl: string;
    fhirBaseUrl: string;
}

interface AuthClientCommonConfigParams {
    clientId: string;
    authPath: string;
    authSearchParams: URLSearchParams;
}

type AuthClientConfig = { [key in Tier]: AuthClientConfigParams };

export const configMap: { [key in SignInService]: AuthClientConfig } = {
    EMR: {
        develop: {
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            baseUrl: 'https://au-core.beda.software',
            fhirBaseUrl: 'https://au-core.beda.software/fhir',
        },
    },
    Smile: {
        develop: {
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore',
        },
        production: {
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore',
        },
    },
};

export const commonConfigMap: { [key in SignInService]: AuthClientCommonConfigParams } = {
    EMR: {
        clientId: 'web',
        authPath: 'auth/authorize',
        authSearchParams: new URLSearchParams({ client_id: 'web', response_type: 'token' }),
    },
    Smile: {
        clientId: 'beda-emr',
        authPath: 'smart/oauth/authorize',
        authSearchParams: new URLSearchParams({
            client_id: 'beda-emr',
            response_type: 'code',
            redirect_uri: `${window.location.origin}/auth`,
            scopes: 'openid fhirUser',
        }),
    },
};

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
