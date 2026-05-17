import { useQuery } from '@tanstack/react-query';
import { Button, Collapse, DatePicker, Input, Select } from 'antd';
import dayjs from 'dayjs';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { customersApi } from '@/shared/api/customers.api';
import type { ListProjectsParams, ProjectStatus, ProjectType } from '@/shared/api/projects.api';
import { usersApi } from '@/shared/api/users.api';

const STATUS_VALUES: ProjectStatus[] = [
  'quoting',
  'received',
  'construction',
  'completed',
  'handed_over',
  'cancelled',
];

const TYPE_VALUES: ProjectType[] = ['new_construction', 'remodel', 'repair', 'aftercare'];

interface Props {
  value: ListProjectsParams;
  onChange: (next: ListProjectsParams) => void;
}

export function ProjectFiltersPanel({ value, onChange }: Props): JSX.Element {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState(value.search ?? '');
  const [customerSearch, setCustomerSearch] = useState('');

  const { data: usersResp } = useQuery({
    queryKey: ['users', 'picker'],
    queryFn: () => usersApi.list({ status: 'active', pageSize: 100, sortBy: 'name' }),
  });

  const { data: customerList } = useQuery({
    queryKey: ['customers', 'picker', customerSearch],
    queryFn: () =>
      customersApi.list({
        search: customerSearch || undefined,
        pageSize: 20,
      }),
  });

  const ownerOptions = useMemo(
    () =>
      (usersResp?.data ?? [])
        .filter((u) => u.role !== 'invited')
        .map((u) => ({ value: u.id, label: u.name })),
    [usersResp],
  );

  const customerOptions = useMemo(
    () =>
      (customerList?.data ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
    [customerList],
  );

  function patch(next: Partial<ListProjectsParams>): void {
    onChange({ ...value, ...next, page: 1 });
  }

  function resetAll(): void {
    setSearchInput('');
    setCustomerSearch('');
    onChange({
      page: 1,
      pageSize: value.pageSize,
      sortBy: value.sortBy,
      sortOrder: value.sortOrder,
    });
  }

  const activeCount =
    (value.search ? 1 : 0) +
    (value.status?.length ? 1 : 0) +
    (value.projectType?.length ? 1 : 0) +
    (value.ownerUserId ? 1 : 0) +
    (value.customerId ? 1 : 0) +
    (value.from ? 1 : 0) +
    (value.to ? 1 : 0);

  return (
    <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
      <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
        <Input
          placeholder={t('project.searchPlaceholder')}
          prefix={<Search size={14} className="text-zinc-400" />}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onPressEnter={() => patch({ search: searchInput.trim() || undefined })}
          allowClear
          onClear={() => {
            setSearchInput('');
            patch({ search: undefined });
          }}
          className="sm:!max-w-[300px]"
        />
        <div className="flex gap-2 sm:contents">
          <Select
            placeholder={t('project.filters.status')}
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={value.status}
            onChange={(status) => patch({ status: status?.length ? status : undefined })}
            className="flex-1 sm:!min-w-[180px] sm:flex-none"
            options={STATUS_VALUES.map((s) => ({
              value: s,
              label: t(`project.status.${s}`),
            }))}
          />
          <Select
            placeholder={t('project.filters.type')}
            mode="multiple"
            allowClear
            maxTagCount="responsive"
            value={value.projectType}
            onChange={(types) => patch({ projectType: types?.length ? types : undefined })}
            className="flex-1 sm:!min-w-[180px] sm:flex-none"
            options={TYPE_VALUES.map((s) => ({
              value: s,
              label: t(`project.type.${s}`),
            }))}
          />
        </div>
        {activeCount > 0 && (
          <Button
            type="text"
            size="small"
            icon={<X size={14} />}
            onClick={resetAll}
            className="text-zinc-500 hover:text-red-600"
          >
            {t('project.filters.reset')}
          </Button>
        )}
      </div>

      <Collapse
        ghost
        items={[
          {
            key: 'advanced',
            label: (
              <span className="text-sm text-zinc-600">
                {t('project.filters.advanced')}
                {activeCount > 0 && (
                  <span className="ml-2 text-xs text-brand-600">
                    · {t('project.filters.activeCount', { count: activeCount })}
                  </span>
                )}
              </span>
            ),
            children: (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-1">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">{t('project.filters.owner')}</div>
                  <Select
                    showSearch
                    placeholder={t('project.filters.ownerPlaceholder')}
                    allowClear
                    value={value.ownerUserId}
                    onChange={(v) => patch({ ownerUserId: v ?? undefined })}
                    filterOption={(input, option) =>
                      (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    options={ownerOptions}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">{t('project.filters.customer')}</div>
                  <Select
                    showSearch
                    placeholder={t('project.filters.customerPlaceholder')}
                    allowClear
                    value={value.customerId}
                    onChange={(v) => patch({ customerId: v ?? undefined })}
                    filterOption={false}
                    onSearch={setCustomerSearch}
                    options={customerOptions}
                    notFoundContent={null}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">{t('project.filters.from')}</div>
                  <DatePicker
                    value={value.from ? dayjs(value.from) : null}
                    onChange={(d) => patch({ from: d ? d.format('YYYY-MM-DD') : undefined })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">{t('project.filters.to')}</div>
                  <DatePicker
                    value={value.to ? dayjs(value.to) : null}
                    onChange={(d) => patch({ to: d ? d.format('YYYY-MM-DD') : undefined })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
