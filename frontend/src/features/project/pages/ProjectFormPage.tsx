import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Checkbox, DatePicker, Form, Input, Radio, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import { customersApi } from '@/shared/api/customers.api';
import { propertiesApi } from '@/shared/api/properties.api';
import {
  projectsApi,
  type CreateProjectInput,
  type ProjectType,
  type UpdateProjectInput,
} from '@/shared/api/projects.api';
import { usersApi } from '@/shared/api/users.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { ProjectSchema, type ProjectFormValues } from '../schemas/project.schema';

const PROJECT_TYPES: ProjectType[] = ['new_construction', 'remodel', 'repair', 'aftercare'];

export function ProjectFormPage(): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const prefilledCustomerId = searchParams.get('customerId') ?? '';
  const isEdit = Boolean(id);

  const [submitting, setSubmitting] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const h = setTimeout(() => setDebouncedSearch(customerSearch), 300);
    return () => clearTimeout(h);
  }, [customerSearch]);

  const { data: existing, isLoading: isLoadingExisting } = useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: () => projectsApi.get(id!),
    enabled: isEdit,
  });

  const { data: customerList } = useQuery({
    queryKey: ['customers', 'picker', debouncedSearch],
    queryFn: () =>
      customersApi.list({
        search: debouncedSearch || undefined,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
  });

  const { data: prefilledCustomer } = useQuery({
    queryKey: ['customers', 'detail', prefilledCustomerId],
    queryFn: () => customersApi.get(prefilledCustomerId),
    enabled: Boolean(prefilledCustomerId) && !isEdit,
  });

  const { data: usersList } = useQuery({
    queryKey: ['users', 'picker'],
    queryFn: () => usersApi.list({ status: 'active', pageSize: 100, sortBy: 'name' }),
  });

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      preAcquisition: false,
      customerId: prefilledCustomerId,
      propertyId: '',
      projectType: 'new_construction',
      name: '',
      description: '',
      ownerUserId: '',
      scheduleStart: '',
      scheduleEnd: '',
    },
  });

  const preAcquisition = watch('preAcquisition');
  const customerId = watch('customerId');

  const { data: propertyList } = useQuery({
    queryKey: ['properties', 'byCustomer', customerId],
    queryFn: () => propertiesApi.listByCustomer(customerId!),
    enabled: Boolean(customerId) && !preAcquisition,
  });

  useEffect(() => {
    if (existing) {
      reset({
        preAcquisition: false,
        customerId: existing.customerId,
        propertyId: existing.propertyId ?? '',
        projectType: existing.projectType,
        name: existing.name,
        description: existing.description ?? '',
        ownerUserId: existing.ownerUserId,
        scheduleStart: existing.scheduleStart
          ? dayjs(existing.scheduleStart).format('YYYY-MM-DD')
          : '',
        scheduleEnd: existing.scheduleEnd ? dayjs(existing.scheduleEnd).format('YYYY-MM-DD') : '',
      });
    }
  }, [existing, reset]);

  useEffect(() => {
    if (preAcquisition) {
      setValue('customerId', '');
      setValue('propertyId', '');
    }
  }, [preAcquisition, setValue]);

  const ownerOptions = useMemo(
    () =>
      (usersList?.data ?? [])
        .filter((u) => u.role !== 'invited')
        .map((u) => ({
          value: u.id,
          label: `${u.name} (${u.email})`,
        })),
    [usersList],
  );

  const customerOptions = useMemo(() => {
    const opts = (customerList?.data ?? []).map((c) => ({
      value: c.id,
      label: `${c.name}${c.nameKana ? ` (${c.nameKana})` : ''}`,
    }));
    if (isEdit && existing && !opts.find((o) => o.value === existing.customerId)) {
      opts.unshift({
        value: existing.customerId,
        label: existing.customer.name,
      });
    }
    if (prefilledCustomer && !opts.find((o) => o.value === prefilledCustomer.id)) {
      opts.unshift({
        value: prefilledCustomer.id,
        label: prefilledCustomer.name,
      });
    }
    return opts;
  }, [customerList, existing, isEdit, prefilledCustomer]);

  const propertyOptions = useMemo(
    () =>
      (propertyList ?? []).map((p) => ({
        value: p.id,
        label: p.address,
      })),
    [propertyList],
  );

  async function submit(values: ProjectFormValues): Promise<void> {
    setSubmitting(true);
    try {
      if (isEdit) {
        const input: UpdateProjectInput = {
          projectType: values.projectType,
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          ownerUserId: values.ownerUserId,
          propertyId: values.propertyId || null,
          scheduleStart: values.scheduleStart || null,
          scheduleEnd: values.scheduleEnd || null,
        };
        const result = await projectsApi.update(id!, input);
        qc.invalidateQueries({ queryKey: ['projects'] });
        message.success(t('project.messages.updated'));
        navigate(`/projects/${result.id}`);
      } else {
        const input: CreateProjectInput = {
          preAcquisition: values.preAcquisition,
          ...(values.preAcquisition ? {} : { customerId: values.customerId }),
          ...(values.propertyId ? { propertyId: values.propertyId } : {}),
          projectType: values.projectType,
          name: values.name.trim(),
          description: values.description?.trim() || undefined,
          ownerUserId: values.ownerUserId,
          scheduleStart: values.scheduleStart || undefined,
          scheduleEnd: values.scheduleEnd || undefined,
        };
        const result = await projectsApi.create(input);
        qc.invalidateQueries({ queryKey: ['projects'] });
        message.success(t('project.messages.created'));
        navigate(`/projects/${result.id}`);
      }
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  if (isEdit && isLoadingExisting) {
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
          to={isEdit ? `/projects/${id}` : '/projects'}
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600 mb-4"
        >
          <ArrowLeft size={14} />
          {t('common.back')}
        </Link>

        <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card overflow-hidden">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-zinc-200/70">
            <h1 className="m-0 text-lg sm:text-xl font-semibold text-zinc-900">
              {isEdit ? t('project.form.editTitle') : t('project.form.createTitle')}
            </h1>
          </div>
          <div className="p-4 sm:p-6">
            <Form layout="vertical" onFinish={handleSubmit(submit)}>
              {!isEdit && (
                <Form.Item>
                  <Controller
                    name="preAcquisition"
                    control={control}
                    render={({ field: { value, onChange, ...rest } }) => (
                      <Checkbox
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        {...rest}
                      >
                        {t('project.form.labelPreAcquisition')}
                      </Checkbox>
                    )}
                  />
                  <p className="m-0 mt-1 text-xs text-zinc-500">
                    {t('project.form.preAcquisitionHint')}
                  </p>
                </Form.Item>
              )}

              {!preAcquisition && (
                <Form.Item
                  label={t('project.form.labelCustomer')}
                  required
                  validateStatus={errors.customerId ? 'error' : ''}
                  help={errors.customerId?.message}
                >
                  <Controller
                    name="customerId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        showSearch
                        size="large"
                        placeholder={t('project.form.customerPlaceholder')}
                        filterOption={false}
                        onSearch={setCustomerSearch}
                        options={customerOptions}
                        notFoundContent={null}
                        allowClear
                        onChange={(v) => {
                          field.onChange(v ?? '');
                          setValue('propertyId', '');
                        }}
                        disabled={isEdit}
                      />
                    )}
                  />
                </Form.Item>
              )}

              {!preAcquisition && customerId && propertyOptions.length > 0 && (
                <Form.Item label={t('project.form.labelProperty')}>
                  <Controller
                    name="propertyId"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        size="large"
                        placeholder={t('project.form.propertyPlaceholder')}
                        options={propertyOptions}
                        allowClear
                        onChange={(v) => field.onChange(v ?? '')}
                      />
                    )}
                  />
                </Form.Item>
              )}

              <Form.Item label={t('project.form.labelType')} required>
                <Controller
                  name="projectType"
                  control={control}
                  render={({ field }) => (
                    <Radio.Group {...field}>
                      {PROJECT_TYPES.map((typ) => (
                        <Radio.Button key={typ} value={typ}>
                          {t(`project.type.${typ}`)}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  )}
                />
              </Form.Item>

              <Form.Item
                label={t('project.form.labelName')}
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
                      placeholder={t('project.form.namePlaceholder')}
                      maxLength={200}
                    />
                  )}
                />
              </Form.Item>

              <Form.Item label={t('project.form.labelDescription')}>
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => <Input.TextArea {...field} rows={3} maxLength={5000} />}
                />
              </Form.Item>

              <Form.Item
                label={t('project.form.labelOwner')}
                required
                validateStatus={errors.ownerUserId ? 'error' : ''}
                help={errors.ownerUserId?.message}
              >
                <Controller
                  name="ownerUserId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      showSearch
                      size="large"
                      placeholder={t('project.form.ownerPlaceholder')}
                      filterOption={(input, option) =>
                        (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                      }
                      options={ownerOptions}
                      onChange={(v) => field.onChange(v ?? '')}
                    />
                  )}
                />
              </Form.Item>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Form.Item label={t('project.form.labelScheduleStart')}>
                  <Controller
                    name="scheduleStart"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        size="large"
                        style={{ width: '100%' }}
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                      />
                    )}
                  />
                </Form.Item>
                <Form.Item
                  label={t('project.form.labelScheduleEnd')}
                  validateStatus={errors.scheduleEnd ? 'error' : ''}
                  help={errors.scheduleEnd?.message}
                >
                  <Controller
                    name="scheduleEnd"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        size="large"
                        style={{ width: '100%' }}
                        value={field.value ? dayjs(field.value) : null}
                        onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                      />
                    )}
                  />
                </Form.Item>
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  onClick={() => navigate(isEdit ? `/projects/${id}` : '/projects')}
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
                  {t('project.form.submit')}
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
