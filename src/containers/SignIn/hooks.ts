import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    getAuthorizeUrl,
    OAuthState,
    setAuthClientRedirectURL,
    setAuthTokenURLpath,
} from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { authClientConfigMap, tierConfigMap, AuthProvider, Tier, saveAuthProviderToStorage } from 'src/services/auth';
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
                'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJ1cm46QUNUSDpDRSIsImNsaWVudF9pZCI6IkNPTk5FQ0FUSE9OLTIwMjUxMjA5IiwiZXBpYy5lY2kiOiJ1cm46ZXBpYzpBdXN0cmFsaWEtQ29ubmVjdGF0aG9uIiwiZXBpYy5tZXRhZGF0YSI6Ii1RUnJjOWx3ZXVRS0Y1cFVQUHhKSGctb0VVRTJ3c21KcHZtcHZUOHVWTEpwcF93N0VmSlppbWstb2NzbWtOYzc2NkduejhUcG41T2w0TXYwUFBKTkFIcHRqdU1fZUV1aF9zMUVwcEFNZ094aHpxblVENkludk81a0x2bFNnRzBlIiwiZXBpYy50b2tlbnR5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NjUzNDEyMjksImlhdCI6MTc2NTI1NDgzOSwiaXNzIjoidXJuOkFDVEg6Q0UiLCJqdGkiOiI3ZDk0YjI1NS1kYTZlLTRlY2QtYTU0MC05OTFmOTY5YWM2NGMiLCJuYmYiOjE3NjUyNTQ4MzksInN1YiI6ImVpUVBJdFduOUphSnN0c2VQS2pJM1JBMyJ9.BQsM8Q28cPBNgOVphF_lWfd6XhjaVjXuI5dhx98FHyWJyK_b8UEjzvYhvu1tXCJLlakhBjbNmBa1-JrjpSvdpX461onXdWqpBiFvxyHeTARlY8Q9d87DkBN5gN1jjWWXIeMiI8XANsIk0oWKHBbQSMPuxSdNomzHO8WV0nUNNeD7l-SO97qjyOKZ0ojgbLH1gLxQAC0bGnOR73uZL5mBGbv-GbRqhed4rSr_58-J5UH3l9rtk_XRjYKl0gjKmLQ73di28okB7ghL5_uN7VUbNxM0-DsIrMmy1B_dyzAPYTOsNuIpRGjT4cU_frnNJNSDV_sT_5FMDsR_Mj94faXUlw',
            );
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
