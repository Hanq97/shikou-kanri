import { useTranslation } from 'react-i18next';
import type { CustomerType } from '@/shared/api/customers.api';

const CLASS: Record<CustomerType, string> = {
  individual: 'bg-blue-50 text-blue-700 ring-blue-200',
  corporate: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function CustomerTypeTag({ type }: { type: CustomerType }): JSX.Element {
  const { t } = useTranslation();
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${CLASS[type]}`}
    >
      {t(`customer.type.${type}`)}
    </span>
  );
}
