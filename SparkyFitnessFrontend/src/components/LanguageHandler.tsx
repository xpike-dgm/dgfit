import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageHandler = (): null => {
  const { i18n } = useTranslation();

  // DG FIT is Turkish-only, whatever language a profile preference holds.
  useEffect(() => {
    if (i18n.language !== 'tr') {
      i18n.changeLanguage('tr');
    }
  }, [i18n]);

  return null;
};

export default LanguageHandler;
