import queryString from 'query-string';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { setToken, parseOAuthState } from '@beda.software/emr/services';
import config from '@beda.software/emr-config';

import { authClientConfigMap, ClientID, exchangeAuthorizationCodeForToken } from 'src/services/auth';
import { setIdToken, setRefreshToken } from 'src/services/storage';

interface CodeGrantQueryParams {
    code?: string;
    state?: string;
}

export function SmileAuth() {
    const location = useLocation();
    const authConfig = authClientConfigMap[config.clientId as ClientID];

    useEffect(() => {
        (async () => {
            const queryParamsCodeGrant = queryString.parse(location.search) as CodeGrantQueryParams;

            if (queryParamsCodeGrant.code) {
                exchangeAuthorizationCodeForToken(
                    queryParamsCodeGrant.code,
                    authConfig.tokenPath,
                    authConfig.redirectURL,
                )
                    .then((response) => {
                        if (response) {
                            if (response.refresh_token) {
                                setRefreshToken(response.refresh_token);
                            }
                            if (response.id_token) {
                                setIdToken(response.id_token);
                            }
                            if (response.access_token) {
                                setToken(response.access_token as string);
                                const state = parseOAuthState(queryParamsCodeGrant.state as string | undefined);

                                window.location.href = state.nextUrl ?? '/';
                            }
                        }
                    })
                    .catch((error) => {
                        console.error('Error:', error);
                    });
            }
        })();
    }, [location.hash, location.search]);

    return null;
}
