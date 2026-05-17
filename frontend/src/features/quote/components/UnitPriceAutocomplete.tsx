import { useQuery } from '@tanstack/react-query';
import { Select, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { unitPricesApi, type UnitPriceSummary } from '@/shared/api/unit-prices.api';

interface Props {
  value?: string | null;
  onPick: (up: UnitPriceSummary) => void;
  onClear?: () => void;
  className?: string;
}

export function UnitPriceAutocomplete({ value, onPick, onClear, className }: Props): JSX.Element {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['unitPrices', 'autocomplete', search],
    queryFn: () =>
      unitPricesApi.list({
        search: search || undefined,
        isActive: true,
        pageSize: 30,
        sortBy: 'itemName',
        sortOrder: 'asc',
      }),
  });

  const linkedQuery = useQuery({
    queryKey: ['unitPrices', 'byId', value],
    queryFn: async () => {
      const res = await unitPricesApi.list({ search: value!, pageSize: 1 });
      return res.data.find((up) => up.id === value) ?? null;
    },
    enabled: Boolean(value) && !(data?.data ?? []).some((up) => up.id === value),
    staleTime: 5 * 60_000,
  });

  const byId = useMemo(() => {
    const m = new Map<string, UnitPriceSummary>();
    for (const up of data?.data ?? []) m.set(up.id, up);
    if (linkedQuery.data) m.set(linkedQuery.data.id, linkedQuery.data);
    return m;
  }, [data, linkedQuery.data]);

  const allEntries = useMemo(() => {
    const arr = [...(data?.data ?? [])];
    if (value && linkedQuery.data && !arr.some((up) => up.id === linkedQuery.data?.id)) {
      arr.unshift(linkedQuery.data);
    }
    return arr;
  }, [data, linkedQuery.data, value]);

  const options = allEntries.map((up) => ({
    value: up.id,
    label: `${up.code} — ${up.itemName} (¥${Number(up.defaultUnitPrice).toLocaleString('ja-JP')}/${up.unit})`,
  }));

  return (
    <Select
      className={className}
      showSearch
      allowClear
      placeholder={t('quote.line.unitPricePickerPlaceholder')}
      filterOption={false}
      onSearch={setSearch}
      onChange={(next: string | undefined) => {
        if (!next) {
          onClear?.();
          return;
        }
        const up = byId.get(next);
        if (up) onPick(up);
      }}
      notFoundContent={isFetching ? <Spin size="small" /> : null}
      options={options}
      value={value || undefined}
    />
  );
}
