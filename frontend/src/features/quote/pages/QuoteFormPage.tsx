import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, DatePicker, Form, Input, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { extractApiError } from '@/shared/api/client';
import { projectsApi, type ProjectSummary } from '@/shared/api/projects.api';
import { quotesApi, type CreateQuoteInput, type UpdateQuoteInput } from '@/shared/api/quotes.api';
import { AppLayout } from '@/shared/components/layout/AppLayout';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { QuoteFormSchema, type QuoteFormValues } from '../schemas/quote.schema';

const DEFAULT_LINE = {
  itemName: '',
  unit: '式',
  quantity: 1,
  unitPrice: 0,
  taxRate: 0.1,
  isOptional: false,
};

export function QuoteFormPage(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const qc = useQueryClient();

  const isEdit = Boolean(params.id);

  const presetProjectId = searchParams.get('projectId') ?? undefined;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['quotes', 'detail', params.id],
    queryFn: () => quotesApi.get(params.id as string),
    enabled: isEdit,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', 'forQuotePicker'],
    queryFn: () => projectsApi.list({ pageSize: 100, sortBy: 'updatedAt', sortOrder: 'desc' }),
    enabled: !isEdit,
  });

  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(QuoteFormSchema),
    defaultValues: {
      projectId: presetProjectId ?? '',
      issuedAt: dayjs().format('YYYY-MM-DD'),
      validUntil: '',
      notes: '',
      qualifiedInvoiceNumber: '',
      lines: [DEFAULT_LINE],
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      projectId: existing.projectId,
      issuedAt: dayjs(existing.issuedAt).format('YYYY-MM-DD'),
      validUntil: existing.validUntil ? dayjs(existing.validUntil).format('YYYY-MM-DD') : '',
      notes: existing.notes ?? '',
      qualifiedInvoiceNumber: existing.qualifiedInvoiceNumber ?? '',
      lines: existing.lines.map((l) => ({
        category: l.category ?? '',
        itemName: l.itemName,
        description: l.description ?? '',
        unit: l.unit,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        taxRate: Number(l.taxRate),
        isOptional: l.isOptional,
        unitPriceMasterId: l.unitPriceMasterId ?? '',
      })),
    });
  }, [existing, form]);

  const createMutation = useMutation({
    mutationFn: (input: CreateQuoteInput) => quotesApi.create(input),
    onSuccess: (q) => {
      message.success(t('quote.messages.created'));
      qc.invalidateQueries({ queryKey: ['quotes'] });
      navigate(`/estimates/${q.id}`);
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateQuoteInput) => quotesApi.update(params.id as string, input),
    onSuccess: (q) => {
      message.success(t('quote.messages.updated'));
      qc.invalidateQueries({ queryKey: ['quotes'] });
      navigate(`/estimates/${q.id}`);
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  function toLines(values: QuoteFormValues): CreateQuoteInput['lines'] {
    return values.lines.map((l, i) => ({
      sortOrder: i,
      category: l.category || undefined,
      itemName: l.itemName,
      description: l.description || undefined,
      unit: l.unit,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      taxRate: Number(l.taxRate),
      isOptional: l.isOptional,
      unitPriceMasterId: l.unitPriceMasterId || undefined,
    }));
  }

  async function onSubmit(values: QuoteFormValues): Promise<void> {
    if (isEdit && existing) {
      await updateMutation.mutateAsync({
        issuedAt: values.issuedAt,
        validUntil: values.validUntil || null,
        notes: values.notes || null,
        qualifiedInvoiceNumber: values.qualifiedInvoiceNumber || null,
        lines: toLines(values),
        version: existing.version,
      });
    } else {
      await createMutation.mutateAsync({
        projectId: values.projectId,
        issuedAt: values.issuedAt,
        validUntil: values.validUntil || undefined,
        notes: values.notes || undefined,
        qualifiedInvoiceNumber: values.qualifiedInvoiceNumber || undefined,
        lines: toLines(values),
      });
    }
  }

  const projectOptions = useMemo(
    () =>
      (projects?.data ?? []).map((p: ProjectSummary) => ({
        value: p.id,
        label: `${p.projectCode} — ${p.name}`,
      })),
    [projects],
  );

  if (isEdit && loadingExisting) {
    return (
      <AppLayout>
        <div className="grid place-items-center py-20">
          <Spin />
        </div>
      </AppLayout>
    );
  }

  const errors = form.formState.errors;
  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg grid place-items-center text-zinc-500 hover:bg-zinc-100 transition-colors bg-transparent border-0 cursor-pointer"
            aria-label={t('common.back')}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="m-0 text-xl sm:text-2xl font-semibold text-zinc-900 tracking-tight">
              {isEdit ? t('quote.form.editTitle') : t('quote.form.createTitle')}
            </h1>
            {isEdit && existing && (
              <p className="m-0 mt-1 text-sm text-zinc-500 font-mono">
                {existing.quoteNumber}
                {existing.versionNo > 1 && ` v${existing.versionNo}`}
              </p>
            )}
          </div>
        </div>

        <Form layout="vertical" onFinish={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              label={t('quote.form.labelProject')}
              required
              validateStatus={errors.projectId ? 'error' : ''}
              help={errors.projectId?.message}
            >
              <Controller
                name="projectId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    showSearch
                    placeholder={t('quote.form.projectPlaceholder')}
                    options={projectOptions}
                    value={field.value || undefined}
                    onChange={field.onChange}
                    disabled={isEdit}
                    optionFilterProp="label"
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={t('quote.form.labelIssuedAt')}
              required
              validateStatus={errors.issuedAt ? 'error' : ''}
              help={errors.issuedAt?.message}
            >
              <Controller
                name="issuedAt"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    className="w-full"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={t('quote.form.labelValidUntil')}
              validateStatus={errors.validUntil ? 'error' : ''}
              help={errors.validUntil?.message}
            >
              <Controller
                name="validUntil"
                control={form.control}
                render={({ field }) => (
                  <DatePicker
                    className="w-full"
                    value={field.value ? dayjs(field.value) : null}
                    onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={t('quote.form.labelQualifiedInvoiceNumber')}
              validateStatus={errors.qualifiedInvoiceNumber ? 'error' : ''}
              help={errors.qualifiedInvoiceNumber?.message}
            >
              <Controller
                name="qualifiedInvoiceNumber"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder={t('quote.form.qualifiedInvoicePlaceholder')}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label={t('quote.form.labelNotes')}
              className="sm:col-span-2"
              validateStatus={errors.notes ? 'error' : ''}
              help={errors.notes?.message}
            >
              <Controller
                name="notes"
                control={form.control}
                render={({ field }) => (
                  <Input.TextArea
                    {...field}
                    value={field.value ?? ''}
                    rows={3}
                    placeholder={t('quote.form.notesPlaceholder')}
                  />
                )}
              />
            </Form.Item>
          </div>

          <div className="bg-white border border-zinc-200/70 rounded-xl shadow-card p-4 sm:p-6">
            <h2 className="m-0 text-base font-semibold text-zinc-800 mb-1">
              {t('quote.form.linesTitle')}
            </h2>
            <p className="m-0 mb-3 text-xs text-zinc-500">
              {t('quote.form.linesEditorComingSoon')}
            </p>
            {errors.lines && (
              <p className="m-0 text-xs text-red-600">
                {(errors.lines as { message?: string }).message}
              </p>
            )}
            <div className="text-xs text-zinc-400 italic">{t('quote.form.linesPlaceholder')}</div>
          </div>

          <div className="flex justify-end gap-2">
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
            <Button type="primary" htmlType="submit" loading={submitting} icon={<Save size={14} />}>
              {t('quote.form.submit')}
            </Button>
          </div>
        </Form>
      </div>
    </AppLayout>
  );
}
