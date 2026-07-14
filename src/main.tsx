import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import '@beda.software/emr/dist/services/initialize';
import 'antd/dist/reset.css';
import '@beda.software/emr/dist/style.css';

import { ValueSetExpandProvider } from '@beda.software/emr/contexts';
import { dynamicActivate, getCurrentLocale } from '@beda.software/emr/services';
import { ThemeProvider } from '@beda.software/emr/theme';
import { SdcServiceProviderContext } from '@beda.software/fhir-questionnaire/contexts';

import { sdcServiceProvider } from 'src/services/sdc';

import { App } from './containers/App';
import { expandValueSet } from './services/expand';
import { setupTokenRefreshInterceptor } from './services/tokenRefresh';

setupTokenRefreshInterceptor();

export const AppWithContext = () => {
    useEffect(() => {
        dynamicActivate(getCurrentLocale());
    }, []);

    return (
        <I18nProvider i18n={i18n}>
            <ThemeProvider>
                <SdcServiceProviderContext.Provider value={sdcServiceProvider}>
                    <ValueSetExpandProvider.Provider value={expandValueSet}>
                        <App />
                    </ValueSetExpandProvider.Provider>
                </SdcServiceProviderContext.Provider>
            </ThemeProvider>
        </I18nProvider>
    );
};

createRoot(document.getElementById('root')!).render(<AppWithContext />);
