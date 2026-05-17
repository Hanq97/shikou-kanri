import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, Input, Select, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  Edit,
  Mail,
  MapPin,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload as UploadIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import {
  customersApi,
  type CustomerSummary,
  type ListCustomersParams,
} from '@/shared/api/customers.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { CustomerTypeTag } from '../components/CustomerTypeTag';
import { ObBadge } from '../components/ObBadge';

export function CustomersListPage(): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<ListCustomersParams>({
    page: 1,
    pageSize: 50,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['customers', 'list', filters],
    queryFn: () => customersApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.softDelete(id),
    onSuccess: () => {
      message.success(t('customer.messages.deleted'));
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const isAdmin = currentUser?.role === 'system_admin';

  function confirmDelete(row: CustomerSummary): void {
    modal.confirm({
      title: t('customer.confirms.deleteTitle'),
      content: t('customer.confirms.deleteContent', { name: row.name }),
      okText: t('customer.confirms.deleteOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteMutation.mutate(row.id),
    });
  }

  function buildRowMenu(row: CustomerSummary): MenuProps['items'] {
    const items: MenuProps['items'] = [
      {
        key: 'edit',
        icon: <Edit size={14} />,
        label: t('common.edit'),
        onClick: () => navigate(`/customers/${row.id}/edit`),
      },
    ];
    if (isAdmin) {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        icon: <Trash2 size={14} />,
        label: t('common.delete'),
        danger: true,
        onClick: () => confirmDelete(row),
      });
    }
    return items;
  }

  const columns: ColumnsType<CustomerSummary> = [
    {
      title: t('customer.columns.name'),
      dataIndex: 'name',
      key: 'name',
      render: (_: string, row) => (
        <button
          type="button"
          onClick={() => navigate(`/customers/${row.id}`)}
          className="bg-transparent border-0 p-0 cursor-pointer text-left"
        >
          <div className="font-medium text-zinc-900 hover:text-brand-600 transition-colors">
            {row.name}
          </div>
          {row.nameKana && <div className="text-xs text-zinc-500">{row.nameKana}</div>}
        </button>
      ),
    },
    {
      title: t('customer.columns.type'),
      dataIndex: 'customerType',
      key: 'customerType',
      width: 110,
      render: (type: CustomerSummary['customerType']) => <CustomerTypeTag type={type} />,
    },
    {
      title: t('customer.columns.phone'),
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (phone: string | null) =>
        phone ? (
          <span className="font-mono text-sm text-zinc-700">{phone}</span>
        ) : (
          <span className="text-zinc-400">{t('customer.phoneNotSet')}</span>
        ),
    },
    {
      title: t('customer.columns.address'),
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address: string | null) => address ?? '—',
    },
    {
      title: t('customer.columns.ob'),
      dataIndex: 'isOb',
      key: 'isOb',
      width: 70,
      align: 'center',
      render: (isOb: boolean) => (isOb ? <ObBadge /> : <span className="text-zinc-400">—</span>),
    },
    {
      title: t('customer.columns.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 160,
      render: (date: string) => (
        <span className="text-sm text-zinc-600">{dayjs(date).format('YYYY/MM/DD HH:mm')}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      align: 'right',
      render: (_, row) => (
        <Dropdown menu={{ items: buildRowMenu(row) }} trigger={['click']} placement="bottomRight">
          <button
            type="button"
            className="w-8 h-8 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer"
            aria-label={t('common.actions')}
          >
            <MoreVertical size={16} />
          </button>
        </Dropdown>
      ),
    },
  ];

  function renderMobileCard(row: CustomerSummary): JSX.Element {
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/customers/${row.id}`)}
            className="bg-transparent border-0 p-0 cursor-pointer text-left flex-1 min-w-0"
          >
            <div className="font-medium text-zinc-900 truncate">{row.name}</div>
            {row.nameKana && <div className="text-xs text-zinc-500 truncate">{row.nameKana}</div>}
          </button>
          <Dropdown menu={{ items: buildRowMenu(row) }} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors bg-transparent border-0 cursor-pointer shrink-0"
              aria-label={t('common.actions')}
            >
              <MoreVertical size={16} />
            </button>
          </Dropdown>
        </div>
        <div className="flex items-center gap-1.5 mt-2">
          <CustomerTypeTag type={row.customerType} />
          {row.isOb && <ObBadge />}
        </div>
        <div className="mt-3 space-y-1 text-sm text-zinc-600">
          {row.phone && (
            <div className="flex items-center gap-1.5">
              <Phone size={14} className="text-zinc-400 shrink-0" />
              <span className="font-mono">{row.phone}</span>
            </div>
          )}
          {row.email && (
            <div className="flex items-center gap-1.5">
              <Mail size={14} className="text-zinc-400 shrink-0" />
              <span className="truncate">{row.email}</span>
            </div>
          )}
          {row.address && (
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-zinc-400 shrink-0" />
              <span className="truncate">{row.address}</span>
            </div>
          )}
        </div>
        <div className="mt-2 text-[11px] text-zinc-400">
          {dayjs(row.updatedAt).format('YYYY/MM/DD HH:mm')}
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
              {t('customer.title')}
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{t('customer.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isAdmin && (
              <Button
                icon={<UploadIcon size={14} />}
                onClick={() => navigate('/admin/customer-import')}
              >
                <span className="hidden sm:inline">{t('customer.import.title')}</span>
              </Button>
            )}
            <Button
              type="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate('/customers/new')}
            >
              {t('customer.createButton')}
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
          <Input
            placeholder={t('customer.searchPlaceholder')}
            prefix={<Search size={14} className="text-zinc-400" />}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onPressEnter={() =>
              setFilters((f) => ({ ...f, search: searchInput.trim() || undefined, page: 1 }))
            }
            allowClear
            onClear={() => {
              setSearchInput('');
              setFilters((f) => ({ ...f, search: undefined, page: 1 }));
            }}
            className="sm:!max-w-[320px]"
          />
          <Select
            placeholder={t('customer.filterOb')}
            allowClear
            value={filters.isOb}
            onChange={(isOb) => setFilters((f) => ({ ...f, isOb, page: 1 }))}
            className="sm:!min-w-[160px]"
            options={[
              { value: true, label: 'OB' },
              { value: false, label: '新規' },
            ]}
          />
        </div>

        {/* Responsive table */}
        <div className="sm:bg-white sm:border sm:border-zinc-200/70 sm:rounded-xl sm:shadow-card sm:overflow-hidden">
          <ResponsiveTable<CustomerSummary>
            columns={columns}
            dataSource={data?.data ?? []}
            rowKey="id"
            loading={isFetching}
            mobileCard={renderMobileCard}
            mobileEmptyText={t('customer.empty')}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (total) => t('customer.totalCount', { total }),
              onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
            }}
            size="middle"
          />
        </div>
      </div>
    </AppLayout>
  );
}
