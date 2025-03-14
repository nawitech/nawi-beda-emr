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
        return clientID;
    }

    return null;
}
