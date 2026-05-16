import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Checkbox, DatePicker, Form, Input, Radio, Spin } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import {
  customersApi,
  type CreateCustomerInput,
  type DuplicateOf,
} from '@/shared/api/customers.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { DuplicateCustomerConfirmModal } from '../components/DuplicateCustomerConfirmModal';
import { CustomerSchema, type CustomerFormValues } from '../schemas/customer.schema';

export function CustomerFormPage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [submitting, setSubmitting] = useState(false);
  const [duplicateOf, setDuplicateOf] = useState<DuplicateOf | null>(null);
  const [pendingValues, setPendingValues] = useState<CreateCustomerInput | null>(null);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['customers', 'detail', id],
    queryFn: () => customersApi.get(id!),
    enabled: isEdit,
  });

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: {
      customerType: 'individual',
      name: '',
      nameKana: '',
      phone: '',
      email: '',
      address: '',
      isOb: false,
      acquiredAt: '',
      notes: '',
    },
  });

  const customerType = watch('customerType');

  useEffect(() => {
    if (existing) {
      reset({
        customerType: existing.customerType,
        name: existing.name,
        nameKana: existing.nameKana ?? '',
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        address: existing.address ?? '',
        isOb: existing.isOb,
        acquiredAt: existing.acquiredAt ? dayjs(existing.acquiredAt).format('YYYY-MM-DD') : '',
        notes: existing.notes ?? '',
      });
    }
  }, [existing, reset]);

  async function submit(values: CustomerFormValues, force = false): Promise<void> {
    setSubmitting(true);
    const input: CreateCustomerInput = {
      customerType: values.customerType,
      name: values.name.trim(),
      nameKana: values.nameKana?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      email: values.email?.trim() || undefined,
      address: values.address?.trim() || undefined,
      isOb: values.isOb,
      acquiredAt: values.acquiredAt || undefined,
      notes: values.notes?.trim() || undefined,
    };

    try {
      const result = isEdit
        ? await customersApi.update(id!, input, force)
        : await customersApi.create(input, force);

      if ('duplicateOf' in result && result.duplicateOf) {
        setDuplicateOf(result.duplicateOf);
        setPendingValues(input);
        setSubmitting(false);
        return;
      }

      qc.invalidateQueries({ queryKey: ['customers'] });
      message.success(isEdit ? t('customer.messages.updated') : t('customer.messages.created'));
      navigate(isEdit ? `/customers/${id}` : `/customers/${result.customer!.id}`);
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
      setSubmitting(false);
    }
  }

  async function confirmDuplicateContinue(): Promise<void> {
    if (!pendingValues) return;
    setSubmitting(true);
    try {
      const result = isEdit
        ? await customersApi.update(id!, pendingValues, true)
        : await customersApi.create(pendingValues, true);
      qc.invalidateQueries({ queryKey: ['customers'] });
      message.success(isEdit ? t('customer.messages.updated') : t('customer.messages.created'));
      const newId = 'customer' in result && result.customer ? result.customer.id : id!;
      navigate(`/customers/${newId}`);
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
      setDuplicateOf(null);
      setPendingValues(null);
    }
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <Link
          to={isEdit ? `/customers/${id}` : '/customers'}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 mb-4"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </Link>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200/70">
            <h1 className="m-0 text-lg sm:text-xl font-semibold text-zinc-900">
              {isEdit ? t('customer.form.editTitle') : t('customer.form.createTitle')}
            </h1>
          </div>
          <div className="p-4 sm:p-6">
            <Form layout="vertical" onFinish={handleSubmit((v) => submit(v))}>
              <Form.Item label={t('customer.form.labelType')} required>
                <Controller
                  name="customerType"
                  control={control}
                  render={({ field }) => (
                    <Radio.Group {...field}>
                      <Radio.Button value="individual">
                        {t('customer.type.individual')}
                      </Radio.Button>
                      <Radio.Button value="corporate">{t('customer.type.corporate')}</Radio.Button>
                    </Radio.Group>
                  )}
                />
              </Form.Item>

              <Form.Item
                label={
                  customerType === 'corporate'
                    ? t('customer.form.labelNameCorporate')
                    : t('customer.form.labelName')
                }
                required
                validateStatus={errors.name ? 'error' : ''}
                help={errors.name?.message}
              >
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      size="large"
                      placeholder={
                        customerType === 'corporate'
                          ? t('customer.form.namePlaceholderCorporate')
                          : t('customer.form.namePlaceholder')
                      }
                      maxLength={200}
                    />
                  )}
                />
              </Form.Item>

              <Form.Item
                label={t('customer.form.labelNameKana')}
                validateStatus={errors.nameKana ? 'error' : ''}
                help={errors.nameKana?.message}
              >
                <Controller
                  name="nameKana"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      size="large"
                      placeholder={t('customer.form.nameKanaPlaceholder')}
                      maxLength={200}
                    />
                  )}
                />
              </Form.Item>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item
                  label={t('customer.form.labelPhone')}
                  validateStatus={errors.phone ? 'error' : ''}
                  help={errors.phone?.message}
                >
                  <Controller
                    name="phone"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        size="large"
                        placeholder={t('customer.form.phonePlaceholder')}
                        maxLength={20}
                      />
                    )}
                  />
                </Form.Item>

                <Form.Item
                  label={t('customer.form.labelEmail')}
                  validateStatus={errors.email ? 'error' : ''}
                  help={errors.email?.message}
                >
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        type="email"
                        size="large"
                        placeholder={t('customer.form.emailPlaceholder')}
                        maxLength={255}
                      />
                    )}
                  />
                </Form.Item>
              </div>

              <Form.Item label={t('customer.form.labelAddress')}>
                <Controller
                  name="address"
                  control={control}
                  render={({ field }) => (
                    <Input.TextArea
                      {...field}
                      rows={2}
                      placeholder={t('customer.form.addressPlaceholder')}
                      maxLength={2000}
                    />
                  )}
                />
              </Form.Item>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 items-end">
                <Form.Item label=" " colon={false}>
                  <Controller
                    name="isOb"
                    control={control}
                    render={({ field: { value, onChange, ...rest } }) => (
                      <Checkbox
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        {...rest}
                      >
                        {t('customer.form.labelIsOb')}
                      </Checkbox>
                    )}
                  />
                </Form.Item>

                <Form.Item label={t('customer.form.labelAcquiredAt')}>
                  <Controller
                    name="acquiredAt"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        size="large"
                        style={{ width: '100%' }}
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(date) => field.onChange(date ? date.format('YYYY-MM-DD') : '')}
                      />
                    )}
                  />
                </Form.Item>
              </div>

              <Form.Item label={t('customer.form.labelNotes')}>
                <Controller
                  name="notes"
                  control={control}
                  render={({ field }) => <Input.TextArea {...field} rows={4} maxLength={5000} />}
                />
              </Form.Item>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  onClick={() => navigate(isEdit ? `/customers/${id}` : '/customers')}
                  block
                  className="sm:!w-auto"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting}
                  block
                  className="sm:!w-auto"
                >
                  {t('customer.form.submit')}
                </Button>
              </div>
            </Form>
          </div>
        </div>

        {duplicateOf && (
          <DuplicateCustomerConfirmModal
            open
            mode={isEdit ? 'update' : 'create'}
            duplicateOf={duplicateOf}
            onCancel={() => {
              setDuplicateOf(null);
              setPendingValues(null);
            }}
            onConfirm={confirmDuplicateContinue}
            loading={submitting}
          />
        )}
      </div>
    </AppLayout>
  );
}
