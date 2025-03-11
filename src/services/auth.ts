export function setBaseUrl(value: string) {
    window.localStorage.setItem('baseURL', value)
}

export function setFhirBaseUrl(value: string) {
    window.localStorage.setItem('fhirBaseURL', value)
}

export function setClientId(value: string) {
    window.localStorage.setItem('ClientId', value)
}
