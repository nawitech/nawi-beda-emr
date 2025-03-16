import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import '@beda.software/emr/dist/services/initialize';
import 'antd/dist/reset.css';
import '@beda.software/emr/dist/style.css';

// You can copy dashboard into your project workspace and adjust appearance and widgets.
// Use https://github.com/beda-software/fhir-emr/blob/master/src/dashboard.config.ts as example;

// You can specify your own theme to ajdust color,
// Use you https://github.com/beda-software/fhir-emr/blob/master/src/theme/ThemeProvider.tsx as example
import { ThemeProvider } from '@beda.software/emr/theme';
import { ValueSetExpandProvider } from '@beda.software/emr/contexts';

import { App } from './containers/App';
import { dynamicActivate, getCurrentLocale } from './services/i18n';
import { expandValueSet } from './services/expand';

export const AppWithContext = () => {
    useEffect(() => {
        dynamicActivate(getCurrentLocale());
    }, []);

    return (
        <I18nProvider i18n={i18n}>
            <ThemeProvider>
                <ValueSetExpandProvider.Provider value={expandValueSet}>
                    <App />
                </ValueSetExpandProvider.Provider>
            </ThemeProvider>
        </I18nProvider>
    );
};

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AppWithContext />
    </React.StrictMode>,
);
