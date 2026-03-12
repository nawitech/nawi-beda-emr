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
    const [activeAuthProvider, setAuthProvider] = useState<AuthProvider>(AuthProvider.AuCoreAidbox);
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
        if (AuthProvider.MediRecords === activeAuthProvider) {
            window.localStorage.setItem('token', 'JOsWSrXQauWP6rC7dnexWfNtGH0');
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.BP, AuthProvider.IRIS].indexOf(activeAuthProvider) != -1) {
            //These providers don't need authorization
            window.localStorage.setItem('token', 'september_connectathon_2025');
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.HaloConnect].indexOf(activeAuthProvider) != -1) {
            //These provider doesn't need authorization
            window.localStorage.setItem('token', 'token');
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.ErequestingCallistemon].indexOf(activeAuthProvider) != -1) {
            //These provider doesn't need authorization
            window.localStorage.setItem('token', 'token');
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.MedtechGlobal].indexOf(activeAuthProvider) != -1) {
            //These provider doesn't need authorization
            window.localStorage.setItem(
                'token',
                'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsIng1dCI6IjVPZjlQNUY5Z0NDd0NtRjJCT0hIeEREUS1EayIsImtpZCI6IjVPZjlQNUY5Z0NDd0NtRjJCT0hIeEREUS1EayJ9',
            );
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.Sparked].indexOf(activeAuthProvider) != -1) {
            //These providers don't need authorization
            window.localStorage.setItem('token', 'token');
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.DigitalHealth].indexOf(activeAuthProvider) != -1) {
            //These providers don't need authorization
            window.localStorage.setItem('token', 'token');
            window.location.href = '/practitioners';
            return;
        } else if ([AuthProvider.Epic].indexOf(activeAuthProvider) != -1) {
            //These provider doesn't need authorization
            window.localStorage.setItem(
                'token',
                'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ1cm46QUNUSDpDRSIsImNsaWVudF9pZCI6IkNPTk5FQ0FUSE9OLTIwMjYwMzExIiwiZXBpYy5lY2kiOiJ1cm46ZXBpYzpBdXN0cmFsaWEtQ29ubmVjdGF0aG9uIiwiZXBpYy5tZXRhZGF0YSI6IkE5aGxFXy1hZWk3OG9QOFhlSUFHN042X0xfYzg1VHU4a3VOSHRoVmRGdHJxNllUU0J0QlNsWmZfSDc4V3JZRmJ3bEh3NGtFa19PRUlMQUZwbl8xaXVuTnRwdld6UTROUzRxdlhoUElxdmJITkhDbVRybktQQTBQSTBTZERmb0EyIiwiZXBpYy50b2tlbnR5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NzMxODM3OTEsImlhdCI6MTc3MzA5NzQwMSwiaXNzIjoidXJuOkFDVEg6Q0UiLCJqdGkiOiIyNjZmM2M2Yi0yZTVkLTQ1ZGQtYTUwYS0wY2VjYjcxOGU4OTkiLCJuYmYiOjE3NzMwOTc0MDEsInN1YiI6ImVtM1doWVJZR1RiTzltb3cwc2ducWlnMyJ9.bxoOzev5pctdoYbnGjpv_Uw5pAphCQ3ruvAkDBzgLcgrNoE_Aq6d7VhWpRGfgkaVeSfM4b4ElmXZZsyuCXzftzDdyUA_M18D4cGEhtnRQLzlG1x4gd9w8pQ4bXitU-Gwv8qgI44juHXnJZzOLMngSvfM44gD5CExmu5jWMkbZ7IN87bTIoVaWxmkdXvK31F0hN1UVGaYf6SadHWevNjGyFOz3C3r04bdBmyiw3idhR0tfhAaVxNQznVYOuygrE5pgJYPVl7ZtgMXr-fGE7FF61t-nRnpHtMFW3WUJQ278eN8gGRtrbVQDId6YS7Xyz7ufseQI8F4s2UcxqRYSJBDFg',
            );
            window.location.href = '/patients';
            return;
        } else if ([AuthProvider.OrionHealth].indexOf(activeAuthProvider) != -1) {
            //These providers don't need authorization
            window.localStorage.setItem('token', 'token');
            window.location.href = '/patients';
            return;
        }
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
