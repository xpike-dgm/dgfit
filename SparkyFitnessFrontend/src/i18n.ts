import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    // DG FIT is Turkish-only; English is the fallback for keys not yet
    // translated. Unit tests keep asserting the English defaults.
    lng: process.env['NODE_ENV'] === 'test' ? 'en' : 'tr',
    supportedLngs: ['tr', 'en'],
    fallbackLng: 'en',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n;
