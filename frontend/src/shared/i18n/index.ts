import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import 'dayjs/locale/vi';
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import vi from '@/locales/vi.json';

export const SUPPORTED_LANGUAGES = ['ja', 'en', 'vi'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_DISPLAY: Record<
  AppLanguage,
  { label: string; nativeLabel: string; flag: string }
> = {
  ja: { label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  en: { label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  vi: { label: 'Vietnamese', nativeLabel: 'Tiếng Việt', flag: '🇻🇳' },
};

const DAYJS_LOCALE: Record<AppLanguage, string> = {
  ja: 'ja',
  en: 'en',
  vi: 'vi',
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ja',
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    resources: {
      ja: { translation: ja },
      en: { translation: en },
      vi: { translation: vi },
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'shikou-kanri.lang',
      caches: ['localStorage'],
    },
  });

// Sync dayjs locale on initial + language change
function syncDayjs(lng: string): void {
  const key = (SUPPORTED_LANGUAGES as readonly string[]).includes(lng)
    ? (lng as AppLanguage)
    : 'ja';
  dayjs.locale(DAYJS_LOCALE[key]);
}
syncDayjs(i18n.language);
i18n.on('languageChanged', syncDayjs);

export default i18n;
