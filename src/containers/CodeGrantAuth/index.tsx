import queryString from 'query-string';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { Spinner } from '@beda.software/emr/components';
import {
    exchangeAuthorizationCodeForToken,
    parseOAuthState,
    setIdToken,
    setRefreshToken,
    setToken,
} from '@beda.software/emr/services';
import { isSuccess } from '@beda.software/remote-data';

/**
 * OAuth authorization-code callback, replacing Beda's `CodeGrantAuth`.
 *
 * The upstream component exchanges the code inside `useService` with no guard. Under React 18
 * StrictMode the effect runs twice in development, so the same authorization code is POSTed to
 * Keycloak twice. The second attempt fails with `invalid_code`, and Keycloak — correctly —
 * treats a replayed authorization code as an attack and revokes the user session.
 *
 * The damage is invisible at first: the tokens from the successful first exchange keep working,
 * so the user appears signed in. It surfaces roughly 15 minutes later (`accessTokenLifespan`),
 * when the access token expires and the refresh fails with "Session doesn't have required
 * client" because the session behind it is already gone. The interceptor in
 * src/services/tokenRefresh.ts then logs the user out, seemingly at random — in practice
 * whenever they next submitted a form.
 *
 * The fix is to make the exchange idempotent per code. The guard lives at module scope rather
 * than in a ref because StrictMode remounts the component, which would reset a ref.
 */

const exchangedCodes = new Set<string>();

export function CodeGrantAuth() {
    const location = useLocation();
    const [error, setError] = useState<string | null>(null);
    const startedRef = useRef(false);

    useEffect(() => {
        if (startedRef.current) {
            return;
        }
        startedRef.current = true;

        const { code, state } = queryString.parse(location.search);

        if (typeof code !== 'string' || !code) {
            setError('Authorization code is not provided');
            return;
        }

        if (exchangedCodes.has(code)) {
            return;
        }
        exchangedCodes.add(code);

        (async () => {
            const response = await exchangeAuthorizationCodeForToken(code);

            if (!isSuccess(response)) {
                // Leave the code marked as consumed. Retrying it would be the exact replay that
                // costs us the session, and the user needs to start a fresh sign-in anyway.
                setError('Sign-in could not be completed. Please try again.');
                return;
            }

            const { access_token, refresh_token, id_token } = response.data;
            if (refresh_token) {
                setRefreshToken(refresh_token);
            }
            if (id_token) {
                setIdToken(id_token);
            }
            setToken(access_token);

            window.location.href = parseOAuthState(typeof state === 'string' ? state : undefined).nextUrl ?? '/';
        })();
    }, [location.search]);

    if (error) {
        return <div style={{ padding: 24 }}>{error}</div>;
    }

    return <Spinner />;
}
