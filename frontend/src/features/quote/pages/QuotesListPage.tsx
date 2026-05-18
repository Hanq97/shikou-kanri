import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Dropdown, type MenuProps } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { Edit, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import {
  quotesApi,
  type ListQuotesParams,
  type QuoteStatus,
  type QuoteSummary,
} from '@/shared/api/quotes.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { ResponsiveTable } from '@/shared/components/responsive/ResponsiveTable';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { formatJpy } from '@/shared/utils/format';
import { QuoteFiltersPanel } from '../components/QuoteFiltersPanel';
import { QuoteStatusTag } from '../components/QuoteStatusTag';

export function QuotesListPage(): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [filters, setFilters] = useState<ListQuotesParams>({
    page: 1,
    pageSize: 20,
    sortBy: 'issuedAt',
    sortOrder: 'desc',
  });
  const [pendingDelete, setPendingDelete] = useState<QuoteSummary | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['quotes', 'list', filters],
    queryFn: () => quotesApi.list(filters),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      quotesApi.softDelete(id, reason),
    onSuccess: () => {
      message.success(t('quote.messages.deleted'));
      qc.invalidateQueries({ queryKey: ['quotes'] });
      setPendingDelete(null);
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const isAdmin = currentUser?.role === 'system_admin';
  const canCreate =
    currentUser?.role === 'system_admin' ||
    currentUser?.role === 'manager' ||
    currentUser?.role === 'employee';

  function confirmDelete(row: QuoteSummary): void {
    let reason = '';
    modal.confirm({
      title: t('quote.confirms.deleteTitle'),
      content: (
        <div className="space-y-2">
          <p className="text-sm text-zinc-700">
            {t('quote.confirms.deleteContent', { number: row.quoteNumber })}
          </p>
          <textarea
            className="w-full border border-zinc-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            rows={3}
            placeholder={t('quote.confirms.deleteReasonPlaceholder')}
            onChange={(e) => {
              reason = e.target.value;
            }}
          />
        </div>
      ),
      okText: t('quote.confirms.deleteOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => {
        if (!reason.trim()) {
          message.error(t('quote.errors.deleteReasonRequired'));
          return Promise.reject();
        }
        return deleteMutation.mutateAsync({ id: row.id, reason: reason.trim() });
      },
    });
    setPendingDelete(row);
  }

  function buildRowMenu(row: QuoteSummary): MenuProps['items'] {
    const items: MenuProps['items'] = [];
    if (canCreate && row.status === 'draft') {
      items.push({
        key: 'edit',
        icon: <Edit size={14} />,
        label: t('common.edit'),
        onClick: () => navigate(`/estimates/${row.id}/edit`),
      });
    }
    if (isAdmin && row.status !== 'won' && row.status !== 'sent') {
      items.push({ type: 'divider' });
      items.push({
        key: 'delete',
        icon: <Trash2 size={14} />,
        label: t('common.delete'),
        danger: true,
        onClick: () => confirmDelete(row),
      });
    }
    return items.length > 0
      ? items
      : [{ key: 'empty', disabled: true, label: t('common.noActions') }];
  }

  const columns: ColumnsType<QuoteSummary> = [
    {
      title: t('quote.columns.quoteNumber'),
      dataIndex: 'quoteNumber',
      key: 'quoteNumber',
      width: 150,
      render: (num: string, row) => (
        <button
          type="button"
          onClick={() => navigate(`/estimates/${row.id}`)}
          className="bg-transparent border-0 p-0 cursor-pointer text-left font-mono text-sm text-brand-600 hover:text-brand-700 hover:underline"
        >
          {num}
          {row.versionNo > 1 && <span className="text-zinc-400 ml-1">v{row.versionNo}</span>}
        </button>
      ),
    },
    {
      title: t('quote.columns.counterParty'),
      dataIndex: 'counterPartyName',
      key: 'counterPartyName',
      render: (name: string) => <span className="text-sm text-zinc-700">{name}</span>,
    },
    {
      title: t('quote.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: QuoteStatus) => <QuoteStatusTag status={status} />,
    },
    {
      title: t('quote.columns.issuedAt'),
      dataIndex: 'issuedAt',
      key: 'issuedAt',
      width: 120,
      render: (date: string) => (
        <span className="text-sm text-zinc-600">{dayjs(date).format('YYYY/MM/DD')}</span>
      ),
    },
    {
      title: t('quote.columns.amountTotal'),
      dataIndex: 'amountTotal',
      key: 'amountTotal',
      width: 140,
      align: 'right',
      render: (amount: string) => <span className="font-mono text-sm">{formatJpy(amount)}</span>,
    },
    {
      title: t('quote.columns.updatedAt'),
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 150,
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

  function renderMobileCard(row: QuoteSummary): JSX.Element {
    return (
      <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/estimates/${row.id}`)}
            className="bg-transparent border-0 p-0 cursor-pointer text-left flex-1 min-w-0"
          >
            <div className="font-mono text-xs text-brand-600">
              {row.quoteNumber}
              {row.versionNo > 1 && <span className="text-zinc-400 ml-1">v{row.versionNo}</span>}
            </div>
            <div className="font-medium text-zinc-900 truncate mt-0.5">{row.counterPartyName}</div>
            <div className="text-xs text-zinc-500 mt-0.5">
              {dayjs(row.issuedAt).format('YYYY/MM/DD')}
            </div>
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
        <div className="flex items-center justify-between mt-3 text-xs">
          <QuoteStatusTag status={row.status} />
          <span className="font-mono text-zinc-900">{formatJpy(row.amountTotal)}</span>
        </div>
      </div>
    );
  }

  void pendingDelete;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
              {t('quote.title')}
            </h1>
            <p className="m-0 mt-1 text-sm text-zinc-500">{t('quote.subtitle')}</p>
          </div>
          {canCreate && (
            <Button
              type="primary"
              icon={<Plus size={14} />}
              onClick={() => navigate('/estimates/new')}
            >
              {t('quote.createButton')}
            </Button>
          )}
        </div>

        <QuoteFiltersPanel value={filters} onChange={setFilters} />

        <div className="sm:bg-white sm:border sm:border-zinc-200/70 sm:rounded-xl sm:shadow-card sm:overflow-hidden">
          <ResponsiveTable<QuoteSummary>
            columns={columns}
            dataSource={data?.data ?? []}
            rowKey="id"
            loading={isFetching}
            mobileCard={renderMobileCard}
            mobileEmptyText={t('quote.empty')}
            pagination={{
              current: filters.page,
              pageSize: filters.pageSize,
              total: data?.total ?? 0,
              showSizeChanger: true,
              showTotal: (total) => t('quote.totalCount', { total }),
              onChange: (page, pageSize) => setFilters((f) => ({ ...f, page, pageSize })),
            }}
            size="middle"
            scroll={{ x: 1000 }}
          />
        </div>
      </div>
    </AppLayout>
  );
}
