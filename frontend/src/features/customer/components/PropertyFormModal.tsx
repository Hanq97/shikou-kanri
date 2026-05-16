import { zodResolver } from '@hookform/resolvers/zod';
import { App, Button, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { extractApiError } from '@/shared/api/client';
import {
  propertiesApi,
  type CreatePropertyInput,
  type PropertySummary,
} from '@/shared/api/properties.api';
import { mapErrorMessage } from '@/shared/utils/error-mapper';
import { PropertySchema, type PropertyFormValues } from '../schemas/property.schema';
import { PhotoUploadField } from './PhotoUploadField';

interface Props {
  open: boolean;
  customerId: string;
  property?: PropertySummary | null;
  onClose: () => void;
  onSuccess: () => void;
}

const PROPERTY_TYPES = [
  'new_construction',
  'remodel',
  'single_family',
  'multi_family',
  'commercial',
  'other',
] as const;
const STRUCTURES = ['wood', 'steel', 'rc', 'other'] as const;

export function PropertyFormModal({
  open,
  customerId,
  property,
  onClose,
  onSuccess,
}: Props): JSX.Element {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(property);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(PropertySchema),
    defaultValues: {
      address: '',
      propertyType: 'single_family',
      structure: 'wood',
      yearBuilt: undefined,
      handoverDate: '',
      floorAreaSqm: undefined,
      photoUrls: [],
      notes: '',
    },
  });

  const photos = watch('photoUrls') ?? [];

  useEffect(() => {
    if (!open) return;
    if (property) {
      reset({
        address: property.address,
        propertyType: property.propertyType,
        structure: property.structure,
        yearBuilt: property.yearBuilt ?? undefined,
        handoverDate: property.handoverDate
          ? dayjs(property.handoverDate).format('YYYY-MM-DD')
          : '',
        floorAreaSqm: property.floorAreaSqm ? Number(property.floorAreaSqm) : undefined,
        photoUrls: property.photoUrls ?? [],
        notes: property.notes ?? '',
      });
    } else {
      reset({
        address: '',
        propertyType: 'single_family',
        structure: 'wood',
        yearBuilt: undefined,
        handoverDate: '',
        floorAreaSqm: undefined,
        photoUrls: [],
        notes: '',
      });
    }
  }, [open, property, reset]);

  async function onSubmit(values: PropertyFormValues): Promise<void> {
    setSubmitting(true);
    try {
      const input: Omit<CreatePropertyInput, 'customerId'> = {
        address: values.address.trim(),
        propertyType: values.propertyType,
        structure: values.structure,
        yearBuilt: values.yearBuilt ?? undefined,
        handoverDate: values.handoverDate || undefined,
        floorAreaSqm: values.floorAreaSqm ?? undefined,
        photoUrls: values.photoUrls,
        notes: values.notes?.trim() || undefined,
      };

      if (isEdit && property) {
        await propertiesApi.update(property.id, input);
        message.success(t('property.messages.updated'));
      } else {
        await propertiesApi.create({ customerId, ...input });
        message.success(t('property.messages.created'));
      }
      onSuccess();
    } catch (err) {
      message.error(mapErrorMessage(extractApiError(err)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? t('property.form.editTitle') : t('property.form.createTitle')}
      onCancel={onClose}
      footer={null}
      destroyOnClose
      width={640}
    >
      <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
        <Form.Item
          label={t('property.fields.address')}
          required
          validateStatus={errors.address ? 'error' : ''}
          help={errors.address?.message}
        >
          <Controller
            name="address"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={2} maxLength={2000} autoFocus />
            )}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label={t('property.fields.propertyType')} required>
            <Controller
              name="propertyType"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={PROPERTY_TYPES.map((p) => ({
                    value: p,
                    label: t(`property.type.${p}`),
                  }))}
                />
              )}
            />
          </Form.Item>
          <Form.Item label={t('property.fields.structure')} required>
            <Controller
              name="structure"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={STRUCTURES.map((s) => ({
                    value: s,
                    label: t(`property.structure.${s}`),
                  }))}
                />
              )}
            />
          </Form.Item>
        </div>

        <div className="grid grid-cols-3 gap-x-4">
          <Form.Item label={t('property.fields.yearBuilt')}>
            <Controller
              name="yearBuilt"
              control={control}
              render={({ field: { value, onChange } }) => (
                <InputNumber
                  value={value ?? null}
                  onChange={(v) => onChange(v ?? undefined)}
                  min={1900}
                  max={2100}
                  style={{ width: '100%' }}
                />
              )}
            />
          </Form.Item>
          <Form.Item label={t('property.fields.handoverDate')}>
            <Controller
              name="handoverDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(d) => field.onChange(d ? d.format('YYYY-MM-DD') : '')}
                  style={{ width: '100%' }}
                />
              )}
            />
          </Form.Item>
          <Form.Item label={t('property.fields.floorAreaSqm')}>
            <Controller
              name="floorAreaSqm"
              control={control}
              render={({ field: { value, onChange } }) => (
                <InputNumber
                  value={value ?? null}
                  onChange={(v) => onChange(typeof v === 'number' ? v : undefined)}
                  min={0}
                  max={99999.99}
                  step={0.1}
                  style={{ width: '100%' }}
                />
              )}
            />
          </Form.Item>
        </div>

        <Form.Item label={t('property.fields.photos')}>
          <PhotoUploadField
            photos={photos}
            onChange={(newPhotos) => setValue('photoUrls', newPhotos)}
          />
        </Form.Item>

        <Form.Item label={t('property.fields.notes')}>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={3} maxLength={2000} />}
          />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {t('property.form.submit')}
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
