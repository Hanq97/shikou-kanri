import { DatePicker, Input, InputNumber, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ListQuotesParams, QuoteStatus } from '@/shared/api/quotes.api';

const STATUSES: QuoteStatus[] = [
  'draft',
  'submitted',
  'pending_admin',
  'approved',
  'rejected',
  'sent',
  'won',
  'lost',
];

interface Props {
  value: ListQuotesParams;
  onChange: (next: ListQuotesParams) => void;
}

export function QuoteFiltersPanel({ value, onChange }: Props): JSX.Element {
  const { t } = useTranslation();

  function patch(next: Partial<ListQuotesParams>): void {
    onChange({ ...value, ...next, page: 1 });
  }

  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Input
        prefix={<Search size={14} className="text-zinc-400" />}
        placeholder={t('quote.filters.searchPlaceholder')}
        allowClear
        value={value.search ?? ''}
        onChange={(e) => patch({ search: e.target.value || undefined })}
      />
      <Select<QuoteStatus[]>
        mode="multiple"
        allowClear
        placeholder={t('quote.filters.status')}
        value={value.status ?? []}
        onChange={(v) => patch({ status: v.length ? v : undefined })}
        options={STATUSES.map((s) => ({ value: s, label: t(`quote.status.${s}`) }))}
        maxTagCount="responsive"
      />
      <DatePicker.RangePicker
        className="w-full"
        value={
          value.from && value.to
            ? [dayjs(value.from), dayjs(value.to)]
            : value.from
              ? [dayjs(value.from), null]
              : value.to
                ? [null, dayjs(value.to)]
                : null
        }
        onChange={(range: [Dayjs | null, Dayjs | null] | null) => {
          patch({
            from: range?.[0]?.format('YYYY-MM-DD'),
            to: range?.[1]?.format('YYYY-MM-DD'),
          });
        }}
      />
      <Input
        placeholder={t('quote.filters.counterPartyPlaceholder')}
        allowClear
        value={value.counterPartySearch ?? ''}
        onChange={(e) => patch({ counterPartySearch: e.target.value || undefined })}
      />
      <InputNumber
        className="w-full"
        placeholder={t('quote.filters.minAmount')}
        min={0}
        step={10000}
        value={value.minAmount}
        onChange={(v) => patch({ minAmount: v ?? undefined })}
      />
      <InputNumber
        className="w-full"
        placeholder={t('quote.filters.maxAmount')}
        min={0}
        step={10000}
        value={value.maxAmount}
        onChange={(v) => patch({ maxAmount: v ?? undefined })}
      />
    </div>
  );
}
