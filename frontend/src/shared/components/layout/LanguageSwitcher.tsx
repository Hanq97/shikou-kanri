import { Dropdown, type MenuProps } from 'antd';
import { Check, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  LANGUAGE_DISPLAY,
  SUPPORTED_LANGUAGES,
  type AppLanguage,
} from '@/shared/i18n';

export function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation();
  const current = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as AppLanguage)
    : 'ja';

  const items: MenuProps['items'] = SUPPORTED_LANGUAGES.map((lng) => ({
    key: lng,
    label: (
      <div className="flex items-center justify-between gap-3 min-w-[140px]">
        <span className="flex items-center gap-2">
          <span>{LANGUAGE_DISPLAY[lng].flag}</span>
          <span>{LANGUAGE_DISPLAY[lng].nativeLabel}</span>
        </span>
        {lng === current && <Check size={14} className="text-brand-600" />}
      </div>
    ),
    onClick: () => {
      void i18n.changeLanguage(lng);
    },
  }));

  return (
    <Dropdown menu={{ items }} trigger={['click']} placement="bottomRight">
      <button
        type="button"
        aria-label={t('nav.language')}
        title={t('nav.language')}
        className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer"
      >
        <Languages size={18} />
      </button>
    </Dropdown>
  );
}
