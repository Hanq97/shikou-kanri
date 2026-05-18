import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Input, Segmented, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Edit, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import {
  unitPricesApi,
  type ListUnitPricesParams,
  type UnitPriceSummary,
} from '@/shared/api/unit-prices.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { UnitPriceFormModal } from '../components/UnitPriceFormModal';

type ActiveFilter = 'all' | 'active' | 'inactive';

export function UnitPricesListPage(): JSX.Element {
  const { t } = useTranslation();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();

  const [filters, setFilters] = useState<ListUnitPricesParams>({
    page: 1,
    pageSize: 30,
    sortBy: 'itemName',
    sortOrder: 'asc',
  });
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [editing, setEditing] = useState<UnitPriceSummary | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const effectiveFilters: ListUnitPricesParams = {
    ...filters,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
  };

  const { data, isFetching } = useQuery({
    queryKey: ['unitPrices', 'list', effectiveFilters],
    queryFn: () => unitPricesApi.list(effectiveFilters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unitPricesApi.softDelete(id),
    onSuccess: () => {
      message.success(t('unitPrice.messages.deleted'));
      qc.invalidateQueries({ queryKey: ['unitPrices'] });
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  function openCreate(): void {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(row: UnitPriceSummary): void {
    setEditing(row);
    setModalOpen(true);
  }

  function confirmDelete(row: UnitPriceSummary): void {
    modal.confirm({
      title: t('unitPrice.confirms.deleteTitle'),
      content: t('unitPrice.confirms.deleteContent', { code: row.code, name: row.itemName }),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteMutation.mutate(row.id),
    });
  }

  function rowMenu(row: UnitPriceSummary): MenuProps['items'] {
    return [
      {
        key: 'edit',
        icon: <Edit size={14} />,
        label: t('common.edit'),
        onClick: () => openEdit(row),
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <Trash2 size={14} />,
        label: t('common.delete'),
        danger: true,
        onClick: () => confirmDelete(row),
      },
    ];
  }

  const columns: ColumnsType<UnitPriceSummary> = [
    {
      title: t('unitPrice.columns.code'),
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string) => <span className="font-mono text-sm">{code}</span>,
    },
    {
      title: t('unitPrice.columns.category'),
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (c: string | null) =>
        c ? (
          <span className="text-sm text-zinc-700">{c}</span>
        ) : (
          <span className="text-zinc-400">—</span>
        ),
    },
    {
      title: t('unitPrice.columns.itemName'),
      dataIndex: 'itemName',
      key: 'itemName',
      render: (n: string, r) => (
        <button
          type="button"
          onClick={() => openEdit(r)}
          className="bg-transparent border-0 p-0 cursor-pointer text-left text-sm text-zinc-900 hover:text-brand-600"
        >
          {n}
        </button>
      ),
    },
    {
      title: t('unitPrice.columns.unit'),
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
      align: 'center',
    },
    {
      title: t('unitPrice.columns.defaultUnitPrice'),
      dataIndex: 'defaultUnitPrice',
      key: 'defaultUnitPrice',
      width: 120,
      align: 'right',
      render: (p: string) => (
        <span className="font-mono text-sm">¥{Number(p).toLocaleString('ja-JP')}</span>
      ),
    },
    {
      title: t('unitPrice.columns.isActive'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      align: 'center',
      render: (a: boolean) => (
        <span
          className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${
            a
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-zinc-100 text-zinc-500 ring-zinc-200'
          }`}
        >
          {t(`unitPrice.isActive.${a ? 'true' : 'false'}`)}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'right',
      render: (_, row) => (
        <Dropdown menu={{ items: rowMenu(row) }} trigger={['click']} placement="bottomRight">
          <button
            type="button"
            className="w-8 h-8 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 bg-transparent border-0 cursor-pointer"
            aria-label={t('common.actions')}
          >
            <MoreVertical size={16} />
          </button>
        </Dropdown>
      ),
    },
  ];

  function renderMobileCard(row: UnitPriceSummary): JSX.Element {
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="bg-transparent border-0 p-0 cursor-pointer text-left flex-1 min-w-0"
          >
            <div className="font-mono text-xs text-brand-600">{row.code}</div>
            <div className="font-medium text-zinc-900 truncate mt-0.5">{row.itemName}</div>
            {row.category && <div className="text-xs text-zinc-500 truncate">{row.category}</div>}
          </button>
          <Dropdown menu={{ items: rowMenu(row) }} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 bg-transparent border-0 cursor-pointer shrink-0"
              aria-label={t('common.actions')}
            >
              <MoreVertical size={16} />
            </button>
          </Dropdown>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">
            ¥{Number(row.defaultUnitPrice).toLocaleString('ja-JP')} / {row.unit}
          </span>
          <span
            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full ring-1 ${
              row.isActive
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-zinc-100 text-zinc-500 ring-zinc-200'
            }`}
          >
            {t(`unitPrice.isActive.${row.isActive ? 'true' : 'false'}`)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
              {t('unitPrice.title')}
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{t('unitPrice.subtitle')}</p>
          </div>
          <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
            {t('unitPrice.createButton')}
          </Button>
        </div>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Input
            prefix={<Search size={14} className="text-zinc-400" />}
            placeholder={t('unitPrice.filters.searchPlaceholder')}
            allowClear
            value={filters.search ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, search: e.target.value || undefined, page: 1 }))
            }
            className="sm:max-w-sm"
          />
          <Segmented<ActiveFilter>
            value={activeFilter}
            onChange={(v) => {
              setActiveFilter(v);
              setFilters((f) => ({ ...f, page: 1 }));
            }}
            options={[
              { value: 'all', label: t('unitPrice.filters.all') },
              { value: 'active', label: t('unitPrice.filters.activeOnly') },
              { value: 'inactive', label: t('unitPrice.filters.inactiveOnly') },
            ]}
          />
        </div>

        <div className="sm:bg-white sm:border sm:border-zinc-200/70 sm:rounded-xl sm:shadow-card sm:overflow-hidden">
          <ResponsiveTable<UnitPriceSummary>
            columns={columns}
            dataSource={data?.data ?? []}
            rowKey="id"
            loading={isFetching}
            mobileCard={renderMobileCard}
            mobileEmptyText={t('unitPrice.empty')}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (total) => t('unitPrice.totalCount', { total }),
              onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
            }}
            size="middle"
          />
        </div>
      </div>

      <UnitPriceFormModal open={modalOpen} initial={editing} onClose={() => setModalOpen(false)} />
    </AppLayout>
  );
}
