import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Spin, Tabs } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft, Edit, Mail, MapPin, Phone, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import { customersApi } from '@/shared/api/customers.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { useAuth } from '@/shared/hooks/useAuth';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { CustomerTypeTag } from '../components/CustomerTypeTag';
import { ObBadge } from '../components/ObBadge';
import { PropertyListTab } from '../components/PropertyListTab';

export function CustomerDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => customersApi.get(id!),
    enabled: Boolean(id),
  });

  const deleteMutation = useMutation({
    mutationFn: (cid: string) => customersApi.softDelete(cid),
    onSuccess: () => {
      message.success(t('customer.messages.deleted'));
      qc.invalidateQueries({ queryKey: ['customers'] });
      navigate('/customers');
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  function confirmDelete(): void {
    if (!customer) return;
    modal.confirm({
      title: t('customer.confirms.deleteTitle'),
      content: t('customer.confirms.deleteContent', { name: customer.name }),
      okText: t('customer.confirms.deleteOk'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: () => deleteMutation.mutate(customer.id),
    });
  }

  if (isLoading || !customer) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  const isAdmin = currentUser?.role === 'system_admin';

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-5">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </Link>

        {/* Header card */}
        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-6 flex justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CustomerTypeTag type={customer.customerType} />
              {customer.isOb && <ObBadge />}
            </div>
            <h1 className="m-0 text-2xl font-semibold text-zinc-900 tracking-tight">
              {customer.name}
            </h1>
            {customer.nameKana && (
              <p className="m-0 mt-0.5 text-sm text-zinc-500">{customer.nameKana}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-zinc-600">
              {customer.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone size={14} className="text-zinc-400" />
                  <span className="font-mono">{customer.phone}</span>
                </span>
              )}
              {customer.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail size={14} className="text-zinc-400" />
                  {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-zinc-400" />
                  {customer.address}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Button
              icon={<Edit size={14} />}
              onClick={() => navigate(`/customers/${customer.id}/edit`)}
            >
              {t('common.edit')}
            </Button>
            {isAdmin && (
              <Button danger icon={<Trash2 size={14} />} onClick={confirmDelete}>
                {t('common.delete')}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: t('customer.tabs.overview'),
              children: (
                <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-200/70">
                    <h2 className="m-0 text-base font-semibold text-zinc-900">
                      {t('customer.detail.overviewTitle')}
                    </h2>
                  </div>
                  <dl className="divide-y divide-zinc-100">
                    <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
                      <dt className="text-zinc-500">{t('customer.detail.labelEmail')}</dt>
                      <dd className="col-span-2 m-0 text-zinc-900">{customer.email ?? '—'}</dd>
                    </div>
                    <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
                      <dt className="text-zinc-500">{t('customer.detail.labelAddress')}</dt>
                      <dd className="col-span-2 m-0 text-zinc-900">{customer.address ?? '—'}</dd>
                    </div>
                    <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
                      <dt className="text-zinc-500">{t('customer.detail.labelAcquiredAt')}</dt>
                      <dd className="col-span-2 m-0 text-zinc-900">
                        {customer.acquiredAt
                          ? dayjs(customer.acquiredAt).format('YYYY/MM/DD')
                          : '—'}
                      </dd>
                    </div>
                    <div className="px-6 py-3.5 grid grid-cols-3 gap-4 text-sm">
                      <dt className="text-zinc-500">{t('customer.detail.labelNotes')}</dt>
                      <dd className="col-span-2 m-0 text-zinc-900 whitespace-pre-wrap">
                        {customer.notes || (
                          <span className="text-zinc-400">{t('customer.detail.noNotes')}</span>
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              ),
            },
            {
              key: 'properties',
              label: t('customer.tabs.properties'),
              children: <PropertyListTab customerId={customer.id} />,
            },
            {
              key: 'history',
              label: t('customer.tabs.history'),
              children: (
                <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-8 text-center text-sm text-zinc-500">
                  P7 で実装予定 (Project timeline)
                </div>
              ),
            },
          ]}
        />
      </div>
    </AppLayout>
  );
}
