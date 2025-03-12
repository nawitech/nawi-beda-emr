import { ClientID } from './auth';

export function setBaseUrl(value: string) {
    window.localStorage.setItem('baseURL', value);
}

export function setFhirBaseUrl(value: string) {
    window.localStorage.setItem('fhirBaseURL', value);
}

export function setClientId(value: string) {
    window.localStorage.setItem('ClientId', value);
}

export function getClientId() {
    const clientID = window.localStorage.getItem('ClientId');

    if (clientID) {
        return clientID as ClientID;
    }

    return null;
}
export function setRefreshToken(token: string) {
    window.localStorage.setItem('refresh_token', token);
}

export function setIdToken(value: string) {
    window.localStorage.setItem('id_token', value);
}

export function getIdToken() {
    return window.localStorage.getItem('id_token');
}
