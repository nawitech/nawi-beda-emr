import { messages as enMessages } from '../../src/locale/en/messages.ts';
import { messages as deMessages } from '../../src/locale/de/messages.ts';
import { messages as esMessages } from '../../src/locale/es/messages.ts';
import { messages as ruMessages } from '../../src/locale/ru/messages.ts';
import enAntdLocale from 'antd/es/locale/en_US';
import deAntdLocale from 'antd/es/locale/de_DE';
import esAntdLocale from 'antd/es/locale/es_ES';
import ruAntdLocale from 'antd/es/locale/ru_RU';

export const localesConfig = {
    en: { label: 'English', messages: enMessages, antdLocale: enAntdLocale },
    ru: { label: 'Русский', messages: ruMessages, antdLocale: ruAntdLocale },
    es: { label: 'Español', messages: esMessages, antdLocale: esAntdLocale },
    de: { label: 'Deutsch', messages: deMessages, antdLocale: deAntdLocale },
};

export const commonConfig = {
    clientId: 'web',
    wearablesAccessConsentCodingSystem: 'https://fhir.emr.beda.software/CodeSystem/consent-subject',
    metriportIdentifierSystem: 'https://api.sandbox.metriport.com',
    localesConfig,
    defaultLocale: 'en',
};
