import { useTranslation } from 'react-i18next';

export function ObBadge(): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      {t('customer.obBadge')}
    </span>
  );
}
