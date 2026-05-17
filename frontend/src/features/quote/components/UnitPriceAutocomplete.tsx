import { useQuery } from '@tanstack/react-query';
import { Select, Spin } from 'antd';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { unitPricesApi, type UnitPriceSummary } from '@/shared/api/unit-prices.api';

interface Props {
  onPick: (up: UnitPriceSummary) => void;
  className?: string;
}

export function UnitPriceAutocomplete({ onPick, className }: Props): JSX.Element {
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

  const byId = useMemo(() => {
    const m = new Map<string, UnitPriceSummary>();
    for (const up of data?.data ?? []) m.set(up.id, up);
    return m;
  }, [data]);

  const options = (data?.data ?? []).map((up) => ({
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
      onChange={(value: string | undefined) => {
        if (!value) return;
        const up = byId.get(value);
        if (up) onPick(up);
      }}
      notFoundContent={isFetching ? <Spin size="small" /> : null}
      options={options}
      value={undefined}
    />
  );
}
