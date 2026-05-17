import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Form, Input, InputNumber, Modal, Switch } from 'antd';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import {
  unitPricesApi,
  type CreateUnitPriceInput,
  type UnitPriceSummary,
  type UpdateUnitPriceInput,
} from '@/shared/api/unit-prices.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';

interface FormValues {
  code: string;
  itemName: string;
  category: string;
  unit: string;
  defaultUnitPrice: number;
  supplierName: string;
  description: string;
  isActive: boolean;
}

const EMPTY: FormValues = {
  code: '',
  itemName: '',
  category: '',
  unit: '式',
  defaultUnitPrice: 0,
  supplierName: '',
  description: '',
  isActive: true,
};

interface Props {
  open: boolean;
  initial: UnitPriceSummary | null;
  onClose: () => void;
}

export function UnitPriceFormModal({ open, initial, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const isEdit = Boolean(initial);

  const form = useForm<FormValues>({ defaultValues: EMPTY });

  useEffect(() => {
    if (open) {
      form.reset(
        initial
          ? {
              code: initial.code,
              itemName: initial.itemName,
              category: initial.category ?? '',
              unit: initial.unit,
              defaultUnitPrice: Number(initial.defaultUnitPrice),
              supplierName: initial.supplierName ?? '',
              description: initial.description ?? '',
              isActive: initial.isActive,
            }
          : EMPTY,
      );
    }
  }, [open, initial, form]);

  const createMutation = useMutation({
    mutationFn: (input: CreateUnitPriceInput) => unitPricesApi.create(input),
    onSuccess: () => {
      message.success(t('unitPrice.messages.created'));
      qc.invalidateQueries({ queryKey: ['unitPrices'] });
      onClose();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateUnitPriceInput) => unitPricesApi.update(initial!.id, input),
    onSuccess: () => {
      message.success(t('unitPrice.messages.updated'));
      qc.invalidateQueries({ queryKey: ['unitPrices'] });
      onClose();
    },
    onError: (err) => message.error(mapErrorMessage(extractApiError(err))),
  });

  async function onSubmit(values: FormValues): Promise<void> {
    if (isEdit) {
      await updateMutation.mutateAsync({
        code: values.code,
        itemName: values.itemName,
        category: values.category || null,
        unit: values.unit,
        defaultUnitPrice: values.defaultUnitPrice,
        supplierName: values.supplierName || null,
        description: values.description || null,
        isActive: values.isActive,
      });
    } else {
      await createMutation.mutateAsync({
        code: values.code,
        itemName: values.itemName,
        category: values.category || undefined,
        unit: values.unit,
        defaultUnitPrice: values.defaultUnitPrice,
        supplierName: values.supplierName || undefined,
        description: values.description || undefined,
        isActive: values.isActive,
      });
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? t('unitPrice.form.editTitle') : t('unitPrice.form.createTitle')}
      onCancel={onClose}
      onOk={form.handleSubmit(onSubmit)}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      okButtonProps={{
        loading: createMutation.isPending || updateMutation.isPending,
      }}
      destroyOnClose
      width={600}
    >
      <Form layout="vertical" className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        <Form.Item label={t('unitPrice.form.code')} required>
          <Controller
            control={form.control}
            name="code"
            rules={{ required: true, maxLength: 30 }}
            render={({ field }) => <Input {...field} placeholder="DEMO-001" />}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.category')}>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => <Input {...field} placeholder="基礎工事" />}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.itemName')} required className="sm:col-span-2">
          <Controller
            control={form.control}
            name="itemName"
            rules={{ required: true, maxLength: 200 }}
            render={({ field }) => <Input {...field} />}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.unit')} required>
          <Controller
            control={form.control}
            name="unit"
            rules={{ required: true, maxLength: 20 }}
            render={({ field }) => <Input {...field} placeholder="式" />}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.defaultUnitPrice')} required>
          <Controller
            control={form.control}
            name="defaultUnitPrice"
            rules={{ required: true, min: 0 }}
            render={({ field }) => (
              <InputNumber
                className="w-full"
                addonBefore="¥"
                min={0}
                step={1000}
                value={field.value}
                onChange={(v) => field.onChange(Math.round(Number(v ?? 0)))}
              />
            )}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.supplierName')} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="supplierName"
            render={({ field }) => <Input {...field} />}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.description')} className="sm:col-span-2">
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => <Input.TextArea {...field} rows={3} />}
          />
        </Form.Item>
        <Form.Item label={t('unitPrice.form.isActive')}>
          <Controller
            control={form.control}
            name="isActive"
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
