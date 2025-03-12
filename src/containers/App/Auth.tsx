import queryString from 'query-string';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { setToken, parseOAuthState } from '@beda.software/emr/services';

import { exchangeAuthorizationCodeForToken, setIdToken, setRefreshToken } from 'src/services/auth';

interface CodeGrantQueryParams {
    code?: string;
    state?: string;
}
export function Auth() {
    const location = useLocation();

    useEffect(() => {
        (async () => {
            const queryParamsImplicitGrant = queryString.parse(location.hash);
            const queryParamsCodeGrant = queryString.parse(location.search) as CodeGrantQueryParams;

            if (queryParamsImplicitGrant.access_token) {
                setToken(queryParamsImplicitGrant.access_token as string);
                const state = parseOAuthState(queryParamsImplicitGrant.state as string | undefined);

                window.location.href = state.nextUrl ?? '/';
            } else if (queryParamsCodeGrant.code) {
                exchangeAuthorizationCodeForToken(queryParamsCodeGrant.code)
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
