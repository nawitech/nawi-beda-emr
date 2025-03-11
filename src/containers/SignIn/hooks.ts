import { useEffect, useState } from 'react';

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
    clientId: string;
    baseUrl: string;
    fhirBaseUrl: string;
}

type AuthClientConfig = {[key in Tier]: AuthClientConfigParams}



export const configMap: { [key in SignInService]: AuthClientConfig } = {
    EMR: {
        develop: {
            clientId: 'web',
            baseUrl: 'http://localhost:8080',
            fhirBaseUrl: 'http://localhost:8080/fhir',
        },
        production: {
            clientId: 'web',
            baseUrl: 'https://au-core.beda.software',
            fhirBaseUrl: 'https://au-core.beda.software/fhir',
        },
    },
    Smile: {
        develop: {
            clientId: 'beda-emr',
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore',
        },
        production: {
            clientId: 'beda-emr',
            baseUrl: 'https://fhir.hl7.org.au/aucore',
            fhirBaseUrl: 'https://fhir.hl7.org.au/aucore',
        },
    },
};

export function useSignIn(_props: SignInProps) {
    const [signInService, setSignInService] = useState<SignInService>(SignInService.EMR);
    
    useEffect(() => {
        const tier = config.tier as Tier;
        const authConfig = configMap[signInService];
        setClientId(authConfig[tier].clientId);
        setBaseUrl(authConfig[tier].baseUrl);
    }, [signInService]);

    return { signInService, setSignInService };
}
